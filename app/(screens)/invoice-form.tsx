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
const FALLBACK: GstSettings = { enabled: true, registrationType: 'Regular', stateCode: '', defaultHsnSacCode: '85414011', defaultTaxRate: 5, priceIncludesTax: true, invoicePrefix: 'INV' };
const plusDays = (iso: string, days: number) => { const date = new Date(`${iso}T00:00:00`); date.setDate(date.getDate() + days); return date.toISOString().slice(0, 10); };
type DraftLine = { key: string; description: string; hsn: string; quantity: string; rate: string };
const newLine = (hsn: string, description = ''): DraftLine => ({ key: `${Date.now()}-${Math.random()}`, description, hsn, quantity: '1', rate: '' });

export default function InvoiceForm() {
  const router = useRouter();
  const params = useLocalSearchParams<{ customerId?: string; projectId?: string }>();
  const { toast } = useOverlay();
  const settings = useQuery({ queryKey: ['settings'], queryFn: api.getSettings, staleTime: 10 * 60_000 });
  const next = useQuery({ queryKey: ['invoices', 'next-number'], queryFn: ops.nextInvoiceNumber });
  const gst: GstSettings = { ...FALLBACK, ...(settings.data?.settings?.gstSettings || {}) };
  const [f, setF] = useState({ customerId: params.customerId || '', customerName: '', projectId: params.projectId || '', projectName: '', projectState: '', amount: '', description: '', invoiceType: 'Tax Invoice' as InvoiceType, invoiceDate: todayISO(), dueDate: plusDays(todayISO(), 15), status: 'Issued' as 'Issued' | 'Paid', customNumber: false, invoiceNumber: '', itemized: false });
  const [lines, setLines] = useState<DraftLine[]>([newLine(FALLBACK.defaultHsnSacCode)]);
  const [loading, setLoading] = useState(!!params.projectId || !!params.customerId);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const fromProject = (project: any) => ({
    projectId: project.id, projectName: project.projectName, projectState: project.state || '',
    amount: String(Number(project.pendingBalance) > 0 ? project.pendingBalance : project.finalDealAmount || project.dealAmount || ''),
    description: `Turnkey Solar Rooftop Power Plant (${project.capacityKw || ''} KW${project.panelBrand ? ` - ${project.panelBrand}` : ''})`,
  });
  useEffect(() => {
    (async () => {
      try {
        if (params.projectId) {
          const result = await api.getProject(params.projectId);
          setF((state) => ({ ...state, customerId: result.project.customerId, customerName: result.customer?.name || '', ...fromProject(result.project) }));
        } else if (params.customerId) {
          const result = await api.getCustomer(params.customerId);
          const only = (result.projects || []).length === 1 ? result.projects[0] : null;
          setF((state) => ({ ...state, customerName: result.customer.name, ...(only ? fromProject(only) : {}) }));
        }
      } catch (e: any) { setError(e.message); } finally { setLoading(false); }
    })();
  }, [params.projectId, params.customerId]);

  const taxable = gst.enabled && gst.registrationType === 'Regular';
  const taxRate = taxable ? Number(gst.defaultTaxRate || 0) : 0;
  const sellerState = settings.data?.settings?.state || '';
  const interState = Boolean(taxable && sellerState && f.projectState && sellerState.trim().toLowerCase() !== f.projectState.trim().toLowerCase());
  const calc = useMemo(() => {
    const lineBase = lines.reduce((sum, line) => sum + num(line.quantity) * num(line.rate), 0);
    const entered = f.itemized ? lineBase : num(f.amount);
    const base = f.itemized ? lineBase : gst.priceIncludesTax && taxRate ? Math.round((entered * 100 / (100 + taxRate)) * 100) / 100 : entered;
    const tax = Math.round((base * taxRate / 100) * 100) / 100;
    return { base, tax, total: f.itemized || !gst.priceIncludesTax ? base + tax : entered };
  }, [f.amount, f.itemized, lines, gst.priceIncludesTax, taxRate]);

  const save = async () => {
    const validation: Record<string, string> = {};
    if (!f.customerId) validation.customer = 'Choose the customer.';
    if (!f.projectId) validation.project = 'Choose the project.';
    if (!f.itemized && num(f.amount) <= 0) validation.amount = 'Enter the invoice value.';
    if (f.itemized && lines.some((line) => !line.description.trim() || num(line.quantity) <= 0 || num(line.rate) < 0)) validation.lines = 'Every line needs a description, quantity and valid rate.';
    if (f.itemized && calc.base <= 0) validation.lines = 'The itemized taxable value must be above zero.';
    if (f.customNumber && !f.invoiceNumber.trim()) validation.number = 'Enter the invoice number.';
    setErrors(validation);
    if (Object.keys(validation).length) { haptic.error(); return; }
    setSaving(true);
    try {
      const result = await api.createInvoice({
        customerId: f.customerId, projectId: f.projectId, invoiceType: f.invoiceType, invoiceDate: f.invoiceDate, dueDate: f.dueDate, status: f.status,
        amount: f.itemized ? calc.total : num(f.amount), taxAmount: calc.tax, description: f.description, applyGstSettings: true,
        ...(f.itemized ? { items: lines.map((line) => ({ itemDescription: line.description.trim(), hsnSacCode: line.hsn.trim() || gst.defaultHsnSacCode, quantity: num(line.quantity), unitOfMeasure: 'Nos', ratePerUnit: num(line.rate) })) } : {}),
        ...(f.customNumber ? { invoiceNumber: f.invoiceNumber.trim() } : { autoNumber: true }),
      } as any);
      toast('Invoice created');
      router.replace({ pathname: '/invoice/[id]', params: { id: result.invoice.id } });
    } catch (e: any) { toast(e.message || 'Could not create invoice', 'error'); } finally { setSaving(false); }
  };

  return (
    <Screen title="New invoice" large={false} back backLabel="Cancel" right={<Button title="Create" size="s" loading={saving} onPress={save} />}>
      {error ? <ErrorState message={error} /> : loading ? <ListSkeleton rows={4} avatar={false} /> : <>
        <FormSection header="Bill to">
          <SelectField label="Customer" required value={f.customerId} display={f.customerName} load={loadCustomers} queryKey="customers" error={errors.customer}
            onChange={(option) => setF((state) => ({ ...state, customerId: option?.value || '', customerName: option?.label || '', projectId: '', projectName: '', projectState: '' }))} />
          <SelectField label="Project" required value={f.projectId} display={f.projectName} load={loadProjects(f.customerId || undefined)} queryKey={`projects-${f.customerId}`} disabled={!f.customerId} error={errors.project}
            onChange={async (option) => { if (!option) return; const result = await api.getProject(option.value).catch(() => null); setF((state) => ({ ...state, ...(result ? fromProject(result.project) : { projectId: option.value, projectName: option.label }) })); }} />
        </FormSection>
        <FormSection header="Invoice" footer={!f.customNumber && next.data ? `Number ${next.data.invoiceNumber} will be assigned when saved.` : undefined}>
          <SelectField label="Type" value={f.invoiceType} options={TYPES.map((value) => ({ value, label: value }))} onChange={(option) => option && setF((state) => ({ ...state, invoiceType: option.value as InvoiceType }))} />
          <ToggleField label="Enter my own number" value={f.customNumber} onChange={(value) => setF((state) => ({ ...state, customNumber: value, invoiceNumber: value ? next.data?.invoiceNumber || '' : '' }))} />
          {f.customNumber ? <TextField label="Invoice number" value={f.invoiceNumber} onChange={(value) => setF((state) => ({ ...state, invoiceNumber: value }))} error={errors.number} /> : null}
          <DateField label="Invoice date" value={f.invoiceDate} onChange={(value) => setF((state) => ({ ...state, invoiceDate: value }))} />
          <DateField label="Due date" value={f.dueDate} onChange={(value) => setF((state) => ({ ...state, dueDate: value }))} minimumDate={new Date(`${f.invoiceDate}T00:00:00`)} />
        </FormSection>
        <FormSection header="Amount" footer={taxable ? `GST ${taxRate}% · ${interState ? 'IGST' : 'CGST + SGST'} · HSN ${gst.defaultHsnSacCode}` : 'GST is not applied for your company.'}>
          <ToggleField label="Itemized invoice" hint="Separate goods/services by quantity, HSN and taxable rate." value={f.itemized} onChange={(value) => {
            setF((state) => ({ ...state, itemized: value }));
            if (value && lines.length === 1 && !lines[0].description) setLines([newLine(gst.defaultHsnSacCode, f.description)]);
          }} />
          {!f.itemized ? <>
            <TextField label={gst.priceIncludesTax || !taxable ? 'Invoice value (including GST)' : 'Value before GST'} kind="money" value={f.amount} onChange={(value) => setF((state) => ({ ...state, amount: value }))} error={errors.amount} required />
            <TextField label="Description" value={f.description} onChange={(value) => setF((state) => ({ ...state, description: value }))} multiline />
          </> : null}
          <ChoiceField label="Status" value={f.status} onChange={(value) => setF((state) => ({ ...state, status: value }))} options={[{ value: 'Issued', label: 'Unpaid' }, { value: 'Paid', label: 'Already paid' }]} />
        </FormSection>
        {f.itemized ? <>
          {lines.map((line, index) => <FormSection key={line.key} header={`Line ${index + 1}`} footer={index === lines.length - 1 ? errors.lines : undefined}>
            <TextField label="Description" value={line.description} onChange={(value) => setLines((current) => current.map((item) => item.key === line.key ? { ...item, description: value } : item))} required />
            <TextField label="HSN / SAC" value={line.hsn} onChange={(value) => setLines((current) => current.map((item) => item.key === line.key ? { ...item, hsn: value } : item))} />
            <TextField label="Quantity" kind="decimal" value={line.quantity} onChange={(value) => setLines((current) => current.map((item) => item.key === line.key ? { ...item, quantity: value } : item))} />
            <TextField label="Rate before GST" kind="money" value={line.rate} onChange={(value) => setLines((current) => current.map((item) => item.key === line.key ? { ...item, rate: value } : item))} />
            {lines.length > 1 ? <Button title="Remove line" kind="destructive" size="s" onPress={() => setLines((current) => current.filter((item) => item.key !== line.key))} /> : null}
          </FormSection>)}
          <Button title="Add another line" kind="gray" onPress={() => setLines((current) => [...current, newLine(gst.defaultHsnSacCode)])} full />
        </> : null}
        {(f.itemized ? calc.base > 0 : num(f.amount) > 0) ? <Section header="Tax preview">
          <InfoRow label="Taxable value" value={formatINR(calc.base)} />
          {taxRate && interState ? <InfoRow label={`IGST ${taxRate}%`} value={formatINR(calc.tax)} /> : null}
          {taxRate && !interState ? <InfoRow label={`CGST ${taxRate / 2}%`} value={formatINR(calc.tax / 2)} /> : null}
          {taxRate && !interState ? <InfoRow label={`SGST ${taxRate / 2}%`} value={formatINR(calc.tax / 2)} /> : null}
          <InfoRow label="Total" value={<T variant="headline" num>{formatINR(calc.total)}</T>} />
        </Section> : null}
        <Button title="Create invoice" loading={saving} onPress={save} full />
        <T variant="footnote" color="secondary" align="center">The server stores an immutable GST snapshot and validates all totals when this invoice is created.</T>
      </>}
    </Screen>
  );
}
