import React, { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../src/lib/api';
import { loadEmployees } from '../../src/lib/pickers';
import { Button, DateField, FormSection, ListSkeleton, Screen, SelectField, TextField, ToggleField, haptic, num, todayISO, useOverlay } from '../../src/ds';

export default function SalaryAdvanceFormScreen() {
  const router = useRouter(); const { id } = useLocalSearchParams<{ id?: string }>(); const { toast } = useOverlay();
  const [employee, setEmployee] = useState<{ value: string; label: string } | null>(null);
  const [f, setF] = useState({ amount: '5000', disbursedDate: todayISO(), reason: 'Festival / Emergency Advance', recoveryMonth: new Date().toISOString().slice(0, 7), isRecovered: false, notes: '' });
  const [loading, setLoading] = useState(!!id); const [saving, setSaving] = useState(false); const [errors, setErrors] = useState<Record<string, string>>({});
  useEffect(() => { if (!id) return; api.getSalaryAdvances({ limit: '500' }).then((result) => { const item = result.advances.find((value) => value.id === id); if (item) { setEmployee({ value: item.employeeId, label: item.employeeName }); setF({ amount: String(item.amount), disbursedDate: item.disbursedDate.slice(0, 10), reason: item.reason, recoveryMonth: item.recoveryMonth, isRecovered: item.isRecovered, notes: item.notes || '' }); } }).catch((e) => toast(e.message, 'error')).finally(() => setLoading(false)); }, [id, toast]);
  const save = async () => {
    const validation: Record<string, string> = {}; if (!employee) validation.employee = 'Choose an employee.'; if (num(f.amount) <= 0) validation.amount = 'Enter the advance amount.'; if (!f.recoveryMonth.match(/^\d{4}-\d{2}$/)) validation.month = 'Use YYYY-MM.';
    setErrors(validation); if (Object.keys(validation).length || !employee) { haptic.error(); return; }
    setSaving(true); try { const payload = { ...f, employeeId: employee.value, amount: num(f.amount) }; if (id) await api.updateSalaryAdvance(id, payload); else await api.createSalaryAdvance(payload); toast(id ? 'Advance updated' : 'Advance granted'); router.back(); } catch (e: any) { toast(e.message, 'error'); } finally { setSaving(false); }
  };
  return <Screen title={id ? 'Edit salary advance' : 'Grant salary advance'} subtitle="Schedule recovery through payroll" large={false} back backLabel="Cancel" right={<Button title="Save" size="s" loading={saving} onPress={save} />}>
    {loading ? <ListSkeleton rows={4} avatar={false} /> : <>
      <FormSection>
        <SelectField label="Employee" value={employee?.value} display={employee?.label} load={loadEmployees} queryKey="employees-active" onChange={setEmployee} required error={errors.employee} disabled={!!id} />
      </FormSection>
      <FormSection header="Advance">
        <TextField label="Amount" kind="money" value={f.amount} onChange={(value) => setF((state) => ({ ...state, amount: value }))} required error={errors.amount} />
        <DateField label="Disbursal date" value={f.disbursedDate} onChange={(value) => setF((state) => ({ ...state, disbursedDate: value }))} />
        <TextField label="Recovery month" value={f.recoveryMonth} onChange={(value) => setF((state) => ({ ...state, recoveryMonth: value }))} placeholder="YYYY-MM" error={errors.month} required />
        <TextField label="Reason" value={f.reason} onChange={(value) => setF((state) => ({ ...state, reason: value }))} required />
        {id ? <ToggleField label="Recovered in payroll" value={f.isRecovered} onChange={(value) => setF((state) => ({ ...state, isRecovered: value }))} /> : null}
        <TextField label="Notes" value={f.notes} onChange={(value) => setF((state) => ({ ...state, notes: value }))} multiline />
      </FormSection>
      <Button title={id ? 'Update advance' : 'Grant advance'} loading={saving} onPress={save} full />
    </>}
  </Screen>;
}
