import React, { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../src/lib/api';
import { Button, DateField, FormSection, ListSkeleton, Screen, SelectField, TextField, haptic, num, todayISO, useOverlay } from '../../src/ds';

const ROLES = ['Solar EPC Engineer', 'Site Supervisor', 'Solar Technician', 'Electrician', 'Sales & Marketing', 'Liaison Officer', 'Operations Manager', 'Helper / Laborer', 'Accountant'];
const TYPES = ['Full-Time', 'Contract', 'Daily Wage', 'Commission'];
const STATUSES = ['Active', 'On Leave', 'Inactive', 'Terminated'];

export default function EmployeeFormScreen() {
  const router = useRouter(); const { id } = useLocalSearchParams<{ id?: string }>(); const { toast } = useOverlay();
  const [f, setF] = useState<any>({ name: '', email: '', phone: '', role: 'Solar Technician', department: 'Operations', employmentType: 'Full-Time', joiningDate: todayISO(), baseSalary: '', bankAccount: '', bankName: '', ifscCode: '', upiId: '', panNumber: '', aadhaarNumber: '', status: 'Active', notes: '' });
  const [loading, setLoading] = useState(!!id); const [saving, setSaving] = useState(false); const [errors, setErrors] = useState<Record<string, string>>({});
  useEffect(() => { if (!id) return; api.getEmployees({ limit: '500' }).then((result) => { const employee = result.employees.find((item) => item.id === id); if (employee) setF({ ...employee, baseSalary: String(employee.baseSalary) }); else toast('Employee not found', 'error'); }).catch((e) => toast(e.message, 'error')).finally(() => setLoading(false)); }, [id, toast]);
  const set = (key: string) => (value: string) => setF((state: any) => ({ ...state, [key]: value }));
  const save = async () => {
    const validation: Record<string, string> = {};
    if (!f.name.trim()) validation.name = 'Enter the employee name.'; if (!f.role) validation.role = 'Choose a role.'; if (num(f.baseSalary) < 0) validation.salary = 'Enter a valid salary.';
    setErrors(validation); if (Object.keys(validation).length) { haptic.error(); return; }
    setSaving(true); try { const payload = { ...f, baseSalary: num(f.baseSalary) }; if (id) await api.updateEmployee(id, payload); else await api.createEmployee(payload); toast(id ? 'Employee updated' : 'Employee added'); router.back(); } catch (e: any) { toast(e.message, 'error'); } finally { setSaving(false); }
  };
  return <Screen title={id ? 'Edit employee' : 'Add employee'} subtitle="Payroll, identity and settlement information" large={false} back backLabel="Cancel" right={<Button title="Save" size="s" loading={saving} onPress={save} />}>
    {loading ? <ListSkeleton rows={5} avatar={false} /> : <>
      <FormSection header="Employee">
        <TextField label="Full name" kind="name" value={f.name} onChange={set('name')} error={errors.name} required />
        <TextField label="Email" kind="email" value={f.email} onChange={set('email')} />
        <TextField label="Phone" kind="phone" value={f.phone} onChange={set('phone')} />
        <SelectField label="Role" value={f.role} options={ROLES.map((value) => ({ value, label: value }))} onChange={(o) => o && set('role')(o.value)} error={errors.role} required />
        <TextField label="Department" value={f.department} onChange={set('department')} />
        <SelectField label="Employment type" value={f.employmentType} options={TYPES.map((value) => ({ value, label: value }))} onChange={(o) => o && set('employmentType')(o.value)} />
        <SelectField label="Status" value={f.status} options={STATUSES.map((value) => ({ value, label: value }))} onChange={(o) => o && set('status')(o.value)} />
        <DateField label="Joining date" value={f.joiningDate} onChange={set('joiningDate')} />
        <TextField label="Base salary" kind="money" value={String(f.baseSalary)} onChange={set('baseSalary')} error={errors.salary} required />
      </FormSection>
      <FormSection header="Bank settlement">
        <TextField label="Bank name" value={f.bankName} onChange={set('bankName')} />
        <TextField label="Account number" kind="number" value={f.bankAccount} onChange={set('bankAccount')} />
        <TextField label="IFSC" value={f.ifscCode} onChange={(value) => set('ifscCode')(value.toUpperCase())} />
        <TextField label="UPI ID" value={f.upiId || ''} onChange={set('upiId')} />
      </FormSection>
      <FormSection header="Compliance">
        <TextField label="PAN" value={f.panNumber || ''} onChange={(value) => set('panNumber')(value.toUpperCase())} />
        <TextField label="Aadhaar" kind="number" value={f.aadhaarNumber || ''} onChange={set('aadhaarNumber')} />
        <TextField label="Notes / skills" value={f.notes || ''} onChange={set('notes')} multiline />
      </FormSection>
      <Button title={id ? 'Update employee' : 'Add employee'} loading={saving} onPress={save} full />
    </>}
  </Screen>;
}
