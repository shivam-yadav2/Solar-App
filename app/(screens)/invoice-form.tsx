import React, { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../src/lib/api';
import { ops } from '../../src/lib/apis/ops';
import { loadCustomers, loadProjects } from '../../src/lib/pickers';
import { formatINR } from '../../src/lib/formatters';
import { Button, ChoiceField, DateField, ErrorState, FormSection, InfoRow, ListSkeleton, Screen, Section, SelectField, T, TextField, ToggleField, haptic, num, todayISO, useOverlay } from '../../src/ds';
import type { GstSettings, InvoiceType } from '../../src/types';

const TYPES: InvoiceType[] = ['Tax Invoice', 'Proforma', 'Advance Receipt', 'Final Bill'];
const FALLBACK: GstSettings = { enabled: true, registrationType: 'Regular', stateCode: '', defaultHsnSacCode: '85414011', defaultTaxRate: 5, priceIncludesTax: true, invoicePrefix: 'INV' } as GstSettings;
const plusDays = (iso: string, d: number) => { const x = new Date(`${iso}T00:00:00`); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10); };

export default function InvoiceForm() {
  const router = useRouter();
  const params = useLocalSearchParams<{ customerId?: string; projectId?: string }>();
  const { toast } = useOverlay();
  const settings = useQuery({ queryKey: ['settings'], queryFn: api.getSettings, staleTime: 10 * 60_000 });
  const next = useQuery({ queryKey: ['invoices', 'next-number'], queryFn: ops.nextInvoiceNumber });
  const gst: GstSettings = { ...FALLBACK, ...(settings.data?.settings?.gstSettings || {}) };
  const [f, setF] = useState({ customerId: params.customerId || '', customerName: '', projectId: params.projectId || '', projectName: '', amount: '', description: '', invoiceType: 'Tax Invoice' as InvoiceType, invoiceDate: todayISO(), dueDate: plusDays(todayISO(), 15), status: 'Issued' as 'Issued' | 'Paid', customNumber: false, invoiceNumber: '' });
  const [loading, setLoading] = useState(!!params.projectId || !!params.customerId);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const fromProject = (x: any) => ({ projectId: x.id, projectName: x.projectName, amount: String(Number(x.pendingBalance) > 0 ? x.pendingBalance : x.finalDealAmount || x.dealAmount || ''), description: `Turnkey Solar Rooftop Power Plant (${x.capacityKw || ''} KW${x.panelBrand ? ` - ${x.panelBrand}` : ''})` });
  useEffect(() => {
    (async () => {
      try {
        if (params.projectId) {
          const r = await api.getProject(params.projectId);
          setF((s) => ({ ...s, customerId: r.project.customerId, customerName: r.customer?.name || '', ...fromProject(r.project) }));
        } else if (params.customerId) {
          const r = await api.getCustomer(params.customerId);
          const only = (r.projects || []).length === 1 ? r.projects[0] : null;
          setF((s) => ({ ...s, customerName: r.customer.name, ...(only ? fromProject(only) : {}) }));
        }
      } catch (e: any) { setError(e.message); } finally { setLoading(false); }
    })();
  }, [params.projectId, params.customerId]);

  const taxable = gst.enabled && gst.registrationType === 'Regular';
  const rate = taxable ? Number(gst.defaultTaxRate || 0) : 0;
  const calc = useMemo(() => {
    const v = num(f.amount);
    const base = gst.priceIncludesTax && rate ? Math.round(((v * 100) / (100 + rate)) * 100) / 100 : v;
    const tax = Math.round(((base * rate) / 100) * 100) / 100;
    return { base, tax, total: gst.priceIncludesTax ? v : base + tax };
  }, [f.amount, rate, gst.priceIncludesTax]);

  const save = async () => {
    const e: Record<string, string> = {};
    if (!f.customerId) e.customer = 'Choose the customer.';
    if (!f.projectId) e.project = 'Choose the project.';
    if (num(f.amount) <= 0) e.amount = 'Enter the invoice value.';
    if (f.customNumber && !f.invoiceNumber.trim()) e.number = 'Enter the invoice number.';
    setErrors(e);
    if (Object.keys(e).length) { haptic.error(); return; }
    setSaving(true);
    try {
      const r = await api.createInvoice({
        customerId: f.customerId, projectId: f.projectId, invoiceType: f.invoiceType, invoiceDate: f.invoiceDate, dueDate: f.dueDate, status: f.status,
        amount: num(f.amount), taxAmount: calc.tax, description: f.description, applyGstSettings: true,
        ...(f.customNumber ? { invoiceNumber: f.invoiceNumber.trim() } : { autoNumber: true }),
      } as any);
      toast('Invoice created');
      router.replace({ pathname: '/invoice/[id]', params: { id: r.invoice.id } });
    } catch (err: any) { toast(err.message, 'error'); } finally { setSaving(false); }
  };

  return (
    <Screen title="New invoice" large={false} back backLabel="Cancel" right={<Button title="Create" size="s" loading={saving} onPress={save} />}>
      {error ? <ErrorState message={error} /> : loading ? <ListSkeleton rows={4} avatar={false} /> : (
        <>
          <FormSection header="Bill to">
            <SelectField label="Customer" required value={f.customerId} display={f.customerName} load={loadCustomers} queryKey="customers" error={errors.customer}
              onChange={(o) => setF((s) => ({ ...s, customerId: o?.value || '', customerName: o?.label || '', projectId: '', projectName: '' }))} />
            <SelectField label="Project" required value={f.projectId} display={f.projectName} load={loadProjects(f.customerId || undefined)} queryKey={`projects-${f.customerId}`} disabled={!f.customerId} error={errors.project}
              onChange={async (o) => { if (!o) return; const r = await api.getProject(o.value).catch(() => null); setF((s) => ({ ...s, ...(r ? fromProject(r.project) : { projectId: o.value, projectName: o.label }) })); }} />
          </FormSection>
          <FormSection header="Invoice" footer={!f.customNumber && next.data ? `Number ${next.data.invoiceNumber} will be used.` : undefined}>
            <SelectField label="Type" value={f.invoiceType} options={TYPES.map((t) => ({ value: t, label: t }))} onChange={(o) => o && setF((s) => ({ ...s, invoiceType: o.value as InvoiceType }))} />
            <ToggleField label="Enter my own number" value={f.customNumber} onChange={(v) => setF((s) => ({ ...s, customNumber: v, invoiceNumber: v ? next.data?.invoiceNumber || '' : '' }))} />
            {f.customNumber ? <TextField label="Invoice number" value={f.invoiceNumber} onChange={(v) => setF((s) => ({ ...s, invoiceNumber: v }))} error={errors.number} /> : null}
            <DateField label="Invoice date" value={f.invoiceDate} onChange={(v) => setF((s) => ({ ...s, invoiceDate: v }))} />
            <DateField label="Due date" value={f.dueDate} onChange={(v) => setF((s) => ({ ...s, dueDate: v }))} />
          </FormSection>
          <FormSection header="Amount" footer={taxable ? `GST ${rate}% · prices ${gst.priceIncludesTax ? 'include' : 'exclude'} GST (Settings → Invoicing).` : 'GST is not applied for your company.'}>
            <TextField label={gst.priceIncludesTax || !taxable ? 'Invoice value (incl. GST)' : 'Value before GST'} kind="money" value={f.amount} onChange={(v) => setF((s) => ({ ...s, amount: v }))} error={errors.amount} required />
            <TextField label="Description" value={f.description} onChange={(v) => setF((s) => ({ ...s, description: v }))} multiline />
            <ChoiceField label="Status" value={f.status} onChange={(v) => setF((s) => ({ ...s, status: v }))} options={[{ value: 'Issued', label: 'Unpaid' }, { value: 'Paid', label: 'Already paid' }]} />
          </FormSection>
          {num(f.amount) > 0 ? (
            <Section header="Preview">
              <InfoRow label="Taxable value" value={formatINR(calc.base)} />
              {rate ? <InfoRow label={`CGST ${rate / 2}%`} value={formatINR(calc.tax / 2)} /> : null}
              {rate ? <InfoRow label={`SGST ${rate / 2}%`} value={formatINR(calc.tax / 2)} /> : null}
              <InfoRow label="Total" value={<T variant="headline" num>{formatINR(calc.total)}</T>} />
            </Section>
          ) : null}
          <Button title="Create invoice" loading={saving} onPress={save} full />
          <T variant="footnote" color="secondary" align="center">The server applies your GST rules; for a customer in another state it uses IGST.</T>
        </>
      )}
    </Screen>
  );
}

