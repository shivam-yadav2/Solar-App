import React, { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../src/lib/api';
import { loadProjects, toOptions } from '../../src/lib/pickers';
import { formatINR } from '../../src/lib/formatters';
import { Button, DateField, ErrorState, FormSection, ListSkeleton, Screen, SelectField, T, TextField, haptic, num, todayISO, useOverlay } from '../../src/ds';
import { AttachField, Attached } from '../../src/components/AttachField';

const CATEGORIES = ['Solar Panels', 'Inverter', 'Mounting Structure & Civil', 'Wiring & Electricals', 'Labour', 'Transportation / Freight', 'DISCOM / Liaison Fees', 'Other Sundry'];

export default function ExpenseForm() {
  const router = useRouter();
  const params = useLocalSearchParams<{ projectId?: string; customerId?: string }>();
  const { toast } = useOverlay();
  const settings = useQuery({ queryKey: ['settings'], queryFn: api.getSettings, staleTime: 10 * 60_000 });
  const [f, setF] = useState({ projectId: params.projectId || '', projectName: '', customerId: params.customerId || '', expenseName: '', expenseCategory: '', amount: '', date: todayISO(), vendor: '', remark: '' });
  const [bill, setBill] = useState<Attached | null>(null);
  const [loading, setLoading] = useState(!!params.projectId);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!params.projectId) return;
    api.getProject(params.projectId).then((r) => setF((s) => ({ ...s, projectName: r.project.projectName, customerId: r.project.customerId }))).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [params.projectId]);

  const cats = toOptions(settings.data?.settings?.expenseCategories, CATEGORIES);
  const save = async () => {
    const e: Record<string, string> = {};
    if (!f.projectId) e.project = 'Choose the project this cost belongs to.';
    if (!f.expenseName.trim()) e.name = 'What was it for?';
    if (!f.expenseCategory) e.category = 'Choose a category.';
    if (num(f.amount) <= 0) e.amount = 'Enter the amount.';
    setErrors(e);
    if (Object.keys(e).length) { haptic.error(); return; }
    setSaving(true);
    try {
      await api.createExpense({ projectId: f.projectId, customerId: f.customerId, expenseName: f.expenseName.trim(), expenseCategory: f.expenseCategory, amount: num(f.amount), date: f.date, vendor: f.vendor || undefined, remark: f.remark || undefined, receiptFileId: bill?.fileId, receiptFileName: bill?.fileName });
      toast(`${formatINR(num(f.amount))} added — waiting for approval`);
      router.back();
    } catch (err: any) { toast(err.message, 'error'); } finally { setSaving(false); }
  };

  return (
    <Screen title="Add expense" large={false} back backLabel="Cancel" right={<Button title="Save" size="s" loading={saving} onPress={save} />}>
      {error ? <ErrorState message={error} /> : loading ? <ListSkeleton rows={3} avatar={false} /> : (
        <>
          <FormSection>
            <SelectField label="Project" required value={f.projectId} display={f.projectName} load={loadProjects()} queryKey="projects-all" error={errors.project}
              onChange={async (o) => { setF((s) => ({ ...s, projectId: o?.value || '', projectName: o?.label || '' })); if (o) { const r = await api.getProject(o.value).catch(() => null); if (r) setF((s) => ({ ...s, customerId: r.project.customerId })); } }} />
          </FormSection>
          <FormSection header="Expense">
            <TextField label="What for" value={f.expenseName} onChange={(v) => setF((s) => ({ ...s, expenseName: v }))} placeholder="e.g. Structure material, crane hire" error={errors.name} required autoFocus={!!params.projectId} />
            <SelectField label="Category" value={f.expenseCategory} options={cats} onChange={(o) => o && setF((s) => ({ ...s, expenseCategory: o.value }))} error={errors.category} required />
            <TextField label="Amount" kind="money" value={f.amount} onChange={(v) => setF((s) => ({ ...s, amount: v }))} error={errors.amount} required />
            <DateField label="Date" value={f.date} onChange={(v) => setF((s) => ({ ...s, date: v }))} maximumDate={new Date()} />
            <TextField label="Vendor / paid to" kind="name" value={f.vendor} onChange={(v) => setF((s) => ({ ...s, vendor: v }))} placeholder="Optional" />
          </FormSection>
          <FormSection>
            <AttachField label="Bill or receipt" value={bill} onChange={setBill} />
            <TextField label="Remark" value={f.remark} onChange={(v) => setF((s) => ({ ...s, remark: v }))} multiline />
          </FormSection>
          <Button title="Add expense" loading={saving} onPress={save} full />
          <T variant="footnote" color="secondary" align="center">Expenses count towards project cost once approved.</T>
        </>
      )}
    </Screen>
  );
}
