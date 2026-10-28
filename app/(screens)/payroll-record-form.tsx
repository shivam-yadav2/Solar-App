import React, { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../src/lib/api';
import { loadEmployees, loadProjects } from '../../src/lib/pickers';
import { formatINR } from '../../src/lib/formatters';
import { Button, DateField, FormSection, InfoRow, ListSkeleton, Screen, Section, SelectField, T, TextField, haptic, num, todayISO, useOverlay } from '../../src/ds';

const METHODS = ['Bank Transfer', 'Cash', 'UPI', 'Cheque', 'NEFT / RTGS'];
const STATUSES = ['Pending', 'Processing', 'Paid'];
const NUMBER_FIELDS = ['baseSalary', 'hra', 'siteAllowance', 'projectCommission', 'bonus', 'providentFund', 'professionalTax', 'tds', 'advanceDeduction', 'leaveDeductions'] as const;

export default function PayrollRecordFormScreen() {
  const router = useRouter(); const { id } = useLocalSearchParams<{ id?: string }>(); const { toast } = useOverlay();
  const [employee, setEmployee] = useState<{ value: string; label: string } | null>(null);
  const [project, setProject] = useState<{ value: string; label: string } | null>(null);
  const [f, setF] = useState<any>({ month: new Date().toISOString().slice(0, 7), baseSalary: '', hra: '0', siteAllowance: '0', projectCommission: '0', bonus: '0', providentFund: '0', professionalTax: '200', tds: '0', advanceDeduction: '0', leaveDeductions: '0', status: 'Pending', paymentDate: '', paymentMethod: 'Bank Transfer', transactionRef: '', paymentNotes: '' });
  const [loading, setLoading] = useState(!!id); const [saving, setSaving] = useState(false); const [errors, setErrors] = useState<Record<string, string>>({});
  useEffect(() => { if (!id) return; api.getPayrollRecords({ limit: '500' }).then((result) => { const record = result.records.find((item) => item.id === id); if (!record) { toast('Payroll record not found', 'error'); return; } setEmployee({ value: record.employeeId, label: record.employeeName }); if (record.linkedProjectId) setProject({ value: record.linkedProjectId, label: record.linkedProjectName || 'Linked project' }); setF({ ...record, ...Object.fromEntries(NUMBER_FIELDS.map((key) => [key, String(record[key] || 0)])), paymentDate: record.paymentDate?.slice(0, 10) || '' }); }).catch((e) => toast(e.message, 'error')).finally(() => setLoading(false)); }, [id, toast]);
  const totals = useMemo(() => { const gross = num(f.baseSalary) + num(f.hra) + num(f.siteAllowance) + num(f.projectCommission) + num(f.bonus); const deductions = num(f.providentFund) + num(f.professionalTax) + num(f.tds) + num(f.advanceDeduction) + num(f.leaveDeductions); return { gross, deductions, net: Math.max(0, gross - deductions) }; }, [f]);
  const set = (key: string) => (value: string) => setF((state: any) => ({ ...state, [key]: value }));
  const selectEmployee = async (option: { value: string; label: string } | null) => {
    setEmployee(option); if (!option) return;
    const result = await api.getEmployees({ limit: '500' }).catch(() => null); const found = result?.employees.find((item) => item.id === option.value); if (found) set('baseSalary')(String(found.baseSalary));
  };
  const save = async () => {
    const validation: Record<string, string> = {}; if (!employee) validation.employee = 'Choose an employee.'; if (!f.month.match(/^\d{4}-\d{2}$/)) validation.month = 'Use YYYY-MM.'; if (num(f.baseSalary) < 0) validation.salary = 'Enter a valid salary.';
    setErrors(validation); if (Object.keys(validation).length || !employee) { haptic.error(); return; }
    setSaving(true); try { const payload: any = { ...f, employeeId: employee.value, linkedProjectId: project?.value, linkedProjectName: project?.label }; NUMBER_FIELDS.forEach((key) => { payload[key] = num(f[key]); }); if (f.status === 'Paid' && !f.paymentDate) payload.paymentDate = todayISO(); if (id) await api.updatePayrollRecord(id, payload); else await api.createPayrollRecord(payload); toast(id ? 'Payroll updated' : 'Payroll record created'); router.back(); } catch (e: any) { toast(e.message, 'error'); } finally { setSaving(false); }
  };
  return <Screen title={id ? 'Edit payroll' : 'Create payroll'} subtitle="One employee salary settlement" large={false} back backLabel="Cancel" right={<Button title="Save" size="s" loading={saving} onPress={save} />}>
    {loading ? <ListSkeleton rows={6} avatar={false} /> : <>
      <FormSection header="Pay period">
        <SelectField label="Employee" value={employee?.value} display={employee?.label} load={loadEmployees} queryKey="employees-active" onChange={selectEmployee} required error={errors.employee} disabled={!!id} />
        <TextField label="Month" value={f.month} onChange={set('month')} placeholder="YYYY-MM" error={errors.month} required />
        <SelectField label="Incentive project" value={project?.value} display={project?.label} load={loadProjects()} queryKey="projects-all" onChange={setProject} allowClear />
      </FormSection>
      <FormSection header="Earnings">
        <TextField label="Base salary" kind="money" value={String(f.baseSalary)} onChange={set('baseSalary')} error={errors.salary} />
        <TextField label="HRA" kind="money" value={String(f.hra)} onChange={set('hra')} />
        <TextField label="Site / travel allowance" kind="money" value={String(f.siteAllowance)} onChange={set('siteAllowance')} />
        <TextField label="Project commission" kind="money" value={String(f.projectCommission)} onChange={set('projectCommission')} />
        <TextField label="Bonus" kind="money" value={String(f.bonus)} onChange={set('bonus')} />
      </FormSection>
      <FormSection header="Deductions">
        <TextField label="Provident fund" kind="money" value={String(f.providentFund)} onChange={set('providentFund')} />
        <TextField label="Professional tax" kind="money" value={String(f.professionalTax)} onChange={set('professionalTax')} />
        <TextField label="TDS" kind="money" value={String(f.tds)} onChange={set('tds')} />
        <TextField label="Advance recovery" kind="money" value={String(f.advanceDeduction)} onChange={set('advanceDeduction')} />
        <TextField label="Leave / LOP" kind="money" value={String(f.leaveDeductions)} onChange={set('leaveDeductions')} />
      </FormSection>
      <Section header="Calculated salary">
        <InfoRow label="Gross" value={formatINR(totals.gross)} /><InfoRow label="Deductions" value={formatINR(totals.deductions)} /><InfoRow label="Net take-home" value={<T variant="headline" num color="green">{formatINR(totals.net)}</T>} />
      </Section>
      <FormSection header="Settlement">
        <SelectField label="Status" value={f.status} options={STATUSES.map((value) => ({ value, label: value }))} onChange={(o) => o && set('status')(o.value)} />
        {f.status === 'Paid' ? <DateField label="Payment date" value={f.paymentDate || todayISO()} onChange={set('paymentDate')} /> : null}
        {f.status === 'Paid' ? <SelectField label="Payment method" value={f.paymentMethod} options={METHODS.map((value) => ({ value, label: value }))} onChange={(o) => o && set('paymentMethod')(o.value)} /> : null}
        {f.status === 'Paid' ? <TextField label="UTR / transaction ref" value={f.transactionRef || ''} onChange={set('transactionRef')} /> : null}
        <TextField label="Finance notes" value={f.paymentNotes || ''} onChange={set('paymentNotes')} multiline />
      </FormSection>
      <Button title={id ? 'Update payroll' : 'Create payroll'} loading={saving} onPress={save} full />
    </>}
  </Screen>;
}
