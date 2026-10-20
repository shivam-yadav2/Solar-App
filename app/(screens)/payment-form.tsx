import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../src/lib/api';
import { ops } from '../../src/lib/apis/ops';
import { loadCustomers, loadProjects, toOptions } from '../../src/lib/pickers';
import { formatINR } from '../../src/lib/formatters';
import { Button, ChoiceField, DateField, ErrorState, FormSection, ListSkeleton, Screen, SelectField, T, TextField, haptic, num, todayISO, useOverlay, space } from '../../src/ds';
import { AttachField, Attached } from '../../src/components/AttachField';

const METHODS = ['UPI', 'Bank Transfer', 'Cash', 'Cheque', 'Card', 'Bank Wire / NEFT', 'Finance / Loan'];

export default function PaymentForm() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; customerId?: string; projectId?: string; amount?: string }>();
  const { toast } = useOverlay();
  const editing = !!params.id;
  const settings = useQuery({ queryKey: ['settings'], queryFn: api.getSettings, staleTime: 10 * 60_000 });
  const [f, setF] = useState({ customerId: params.customerId || '', customerName: '', projectId: params.projectId || '', projectName: '', balance: undefined as number | undefined, amount: params.amount || '', paymentDate: todayISO(), paymentMethod: 'UPI', status: 'Successful' as 'Successful' | 'Pending', transactionRef: '', notes: '' });
  const [receipt, setReceipt] = useState<Attached | null>(null);
  const [loading, setLoading] = useState(editing || !!params.projectId || !!params.customerId);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        if (editing) {
          const r = await ops.payment(params.id!);
          const x = r.payment;
          setF((s) => ({ ...s, customerId: x.customerId, customerName: r.customer?.name || '', projectId: x.projectId, projectName: r.project?.projectName || '', balance: r.project?.pendingBalance, amount: String(x.amount), paymentDate: String(x.paymentDate).slice(0, 10), paymentMethod: x.paymentMethod, status: x.status === 'Pending' ? 'Pending' : 'Successful', transactionRef: x.transactionRef || '', notes: x.notes || '' }));
          if (x.receiptFileId) setReceipt({ fileId: x.receiptFileId, fileName: x.receiptFileName || 'Receipt' });
        } else if (params.projectId) {
          const r = await api.getProject(params.projectId);
          setF((s) => ({ ...s, customerId: r.project.customerId, customerName: r.customer?.name || '', projectName: r.project.projectName, balance: r.project.pendingBalance }));
        } else if (params.customerId) {
          const r = await api.getCustomer(params.customerId);
          const open = (r.projects || []).filter((x: any) => Number(x.pendingBalance) > 0);
          const only = open.length === 1 ? open[0] : (r.projects || []).length === 1 ? r.projects[0] : null;
          setF((s) => ({ ...s, customerName: r.customer.name, ...(only ? { projectId: only.id, projectName: only.projectName, balance: only.pendingBalance } : {}) }));
        }
      } catch (e: any) { setError(e.message); } finally { setLoading(false); }
    })();
  }, [editing, params.id, params.projectId, params.customerId]);

  const methods = toOptions(settings.data?.settings?.paymentMethods, METHODS);
  const save = async () => {
    const e: Record<string, string> = {};
    if (!f.customerId) e.customer = 'Choose the customer.';
    if (!f.projectId) e.project = 'Choose the project.';
    const amount = num(f.amount);
    if (amount <= 0) e.amount = 'Enter the amount received.';
    setErrors(e);
    if (Object.keys(e).length) { haptic.error(); return; }
    setSaving(true);
    try {
      const body: any = { amount, paymentDate: f.paymentDate, paymentMethod: f.paymentMethod, status: f.status, transactionRef: f.transactionRef || undefined, notes: f.notes || undefined, receiptFileId: receipt?.fileId, receiptFileName: receipt?.fileName };
      if (editing) await api.updatePayment(params.id!, body);
      else await api.createPayment({ ...body, customerId: f.customerId, projectId: f.projectId });
      toast(editing ? 'Payment updated' : `${formatINR(amount)} recorded`);
      router.back();
    } catch (err: any) { toast(err.message, 'error'); } finally { setSaving(false); }
  };

  return (
    <Screen title={editing ? 'Edit payment' : 'Record payment'} large={false} back backLabel="Cancel" right={<Button title="Save" size="s" loading={saving} onPress={save} />}>
      {error ? <ErrorState message={error} /> : loading ? <ListSkeleton rows={4} avatar={false} /> : (
        <>
          <FormSection header="From">
            <SelectField label="Customer" required value={f.customerId} display={f.customerName} load={loadCustomers} queryKey="customers" disabled={editing} error={errors.customer}
              onChange={(o) => setF((s) => ({ ...s, customerId: o?.value || '', customerName: o?.label || '', projectId: '', projectName: '', balance: undefined }))} />
            <SelectField label="Project" required value={f.projectId} display={f.projectName} load={loadProjects(f.customerId || undefined)} queryKey={`projects-${f.customerId}`} disabled={editing || !f.customerId} error={errors.project}
              hint={f.balance !== undefined ? `Balance due ${formatINR(f.balance)}` : undefined}
              onChange={async (o) => { setF((s) => ({ ...s, projectId: o?.value || '', projectName: o?.label || '' })); if (o) { const r = await api.getProject(o.value).catch(() => null); setF((s) => ({ ...s, balance: r?.project?.pendingBalance })); } }} />
          </FormSection>
          <FormSection header="Payment">
            <TextField label="Amount" kind="money" value={f.amount} onChange={(v) => setF((s) => ({ ...s, amount: v }))} error={errors.amount} required />
            {!editing && f.balance && f.balance > 0 && num(f.amount) !== f.balance ? (
              <View style={{ paddingHorizontal: space.l, paddingBottom: 10 }}><T variant="subhead" color="accent" onPress={() => setF((s) => ({ ...s, amount: String(s.balance) }))}>Use full balance {formatINR(f.balance)}</T></View>
            ) : null}
            <DateField label="Date received" value={f.paymentDate} onChange={(v) => setF((s) => ({ ...s, paymentDate: v }))} maximumDate={new Date()} />
            <SelectField label="Method" value={f.paymentMethod} options={methods} onChange={(o) => o && setF((s) => ({ ...s, paymentMethod: o.value }))} />
            <TextField label="UTR / cheque / reference" value={f.transactionRef} onChange={(v) => setF((s) => ({ ...s, transactionRef: v }))} placeholder="Optional" />
            <ChoiceField label="Status" value={f.status} onChange={(v) => setF((s) => ({ ...s, status: v }))} options={[{ value: 'Successful', label: 'Received' }, { value: 'Pending', label: 'Pending clearance' }]} />
          </FormSection>
          <FormSection>
            <AttachField label="Receipt or bank screenshot" value={receipt} onChange={setReceipt} />
            <TextField label="Notes" value={f.notes} onChange={(v) => setF((s) => ({ ...s, notes: v }))} multiline placeholder="e.g. 2nd milestone after installation" />
          </FormSection>
          <Button title={editing ? 'Save changes' : 'Record payment'} loading={saving} onPress={save} full />
        </>
      )}
    </Screen>
  );
}
