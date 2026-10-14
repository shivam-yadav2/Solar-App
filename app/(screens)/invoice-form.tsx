import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FileText } from 'lucide-react-native';
import { api } from '../../src/lib/api';
import { formatINR } from '../../src/lib/formatters';
import { Card, ChoiceField, ErrorState, FormField, Loading, OptionField, PrimaryButton, Screen } from '../../src/components/ui';
import type { GstSettings } from '../../src/types';

const fallbackGstSettings: GstSettings = { enabled: true, registrationType: 'Regular', stateCode: '', defaultHsnSacCode: '85414011', defaultTaxRate: 5, priceIncludesTax: true, invoicePrefix: 'INV' };

export default function InvoiceFormScreen() {
  const router = useRouter();
  const { customerId, projectId } = useLocalSearchParams<{ customerId?: string; projectId?: string }>();
  const [customers, setCustomers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [gstSettings, setGstSettings] = useState<GstSettings>(fallbackGstSettings);
  const [form, setForm] = useState<any>({ customerId: customerId || '', projectId: projectId || '', invoiceNumber: '', invoiceDate: new Date().toISOString().slice(0, 10), dueDate: '', amount: '', invoiceType: 'Tax Invoice', status: 'Issued', description: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const applyProject = (project: any, current: any) => {
    if (!project) return current;
    const amount = Number(project.finalDealAmount || project.dealAmount || 0);
    return { ...current, projectId: project.id, amount: amount ? String(amount) : current.amount, description: `Turnkey Solar Rooftop Power Plant (${project.capacityKw || ''} KW - ${project.panelBrand || 'Solar panels'})` };
  };

  useEffect(() => {
    Promise.all([api.getCustomers({ limit: '200' }), api.getProjects({ limit: '200' }), api.getSettings()])
      .then(([cusData, projData, settingsData]) => {
        const nextSettings = settingsData.settings?.gstSettings || fallbackGstSettings;
        setCustomers(cusData.customers || []); setProjects(projData.projects || []); setGstSettings(nextSettings);
        const selectedProject = projectId ? projData.projects.find((item: any) => item.id === projectId) : undefined;
        const targetCustomerId = customerId || selectedProject?.customerId || cusData.customers?.[0]?.id || '';
        const firstProject = selectedProject || projData.projects.find((item: any) => item.customerId === targetCustomerId);
        setForm((current: any) => ({ ...applyProject(firstProject, current), customerId: targetCustomerId, projectId: projectId || firstProject?.id || '', invoiceNumber: current.invoiceNumber || `${nextSettings.invoicePrefix || 'INV'}-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}` }));
      }).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [customerId, projectId]);

  const isTaxable = gstSettings.enabled && gstSettings.registrationType === 'Regular';
  const gstRate = isTaxable ? Number(gstSettings.defaultTaxRate || 0) : 0;
  const calculation = useMemo(() => {
    const enteredValue = Number(form.amount) || 0;
    const taxableValue = gstSettings.priceIncludesTax && gstRate > 0 ? Math.round((enteredValue * 100 / (100 + gstRate)) * 100) / 100 : enteredValue;
    const taxAmount = Math.round((taxableValue * gstRate / 100) * 100) / 100;
    return { taxableValue, taxAmount, total: gstSettings.priceIncludesTax ? enteredValue : taxableValue + taxAmount };
  }, [form.amount, gstRate, gstSettings.priceIncludesTax]);

  const set = (key: string) => (value: string) => setForm((current: any) => ({ ...current, [key]: value }));
  const customerProjects = projects.filter((project) => project.customerId === form.customerId);
  const setCustomer = (nextCustomerId: string) => { const firstProject = projects.find((project) => project.customerId === nextCustomerId); setForm((current: any) => ({ ...applyProject(firstProject, current), customerId: nextCustomerId, projectId: firstProject?.id || '' })); };
  const save = async () => {
    if (!form.customerId || !form.projectId || !Number(form.amount)) { Alert.alert('Missing details', 'Customer, project, and a positive invoice value are required.'); return; }
    setSaving(true);
    try { await api.createInvoice({ ...form, amount: Number(form.amount), taxAmount: calculation.taxAmount, applyGstSettings: true }); router.back(); }
    catch (e: any) { Alert.alert('Could not create invoice', e.message); }
    finally { setSaving(false); }
  };

  return <Screen title="Create GST Invoice" subtitle="Tenant GST defaults and invoice calculations" onBack={() => router.back()}>{loading ? <Loading /> : error ? <ErrorState message={error} /> : <>
    <Card className="bg-[#0b1b31] border-[#173554]"><View className="flex-row items-center"><View className="h-11 w-11 items-center justify-center rounded-2xl bg-amber-400"><FileText size={21} color="#0b1b31" /></View><View className="ml-3 flex-1"><Text className="text-[10px] font-bold uppercase tracking-[1.2px] text-amber-300">GST billing</Text><Text className="mt-1 text-base font-extrabold text-white">{isTaxable ? `${gstRate}% GST is ready to apply` : 'GST is not applied'}</Text><Text className="mt-1 text-[11px] leading-4 text-slate-300">HSN/SAC {gstSettings.defaultHsnSacCode || 'not configured'} · {gstSettings.priceIncludesTax ? 'prices include GST' : 'GST is added extra'}</Text></View></View><Text onPress={() => router.push('/settings')} className="mt-4 self-start text-xs font-bold text-amber-300">Manage GST settings →</Text></Card>
    <Card><OptionField label="Customer *" value={form.customerId} onChange={setCustomer} options={customers.map(item => ({ value: item.id, label: `${item.name} · ${item.customId}` }))} /><OptionField label="Solar project *" value={form.projectId} onChange={(value) => { const project = customerProjects.find(item => item.id === value); setForm((current: any) => applyProject(project, current)); }} options={customerProjects.map(item => ({ value: item.id, label: `${item.projectName} · ${item.customId}` }))} /><ChoiceField label="Invoice type" value={form.invoiceType} options={['Tax Invoice', 'Proforma', 'Advance Receipt', 'Final Bill']} onChange={set('invoiceType')} /><FormField label="Invoice number" value={form.invoiceNumber} onChangeText={set('invoiceNumber')} placeholder="Auto-generated when blank" /><FormField label="Invoice date" value={form.invoiceDate} onChangeText={set('invoiceDate')} /><FormField label="Due date" value={form.dueDate} onChangeText={set('dueDate')} placeholder="YYYY-MM-DD" /><FormField label="Invoice value (₹) *" value={form.amount} onChangeText={set('amount')} keyboardType="numeric" required /></Card>
    <Card><View className="mb-3 flex-row items-center"><View className="h-9 w-9 items-center justify-center rounded-xl bg-amber-50"><FileText size={17} color="#d97706" /></View><View className="ml-3"><Text className="text-sm font-extrabold text-slate-900">Calculation preview</Text><Text className="text-[11px] text-slate-500">Saved using your configured GST rules</Text></View></View><View className="rounded-2xl bg-slate-50 px-4 py-2"><View className="flex-row justify-between border-b border-slate-200 py-2.5"><Text className="text-xs text-slate-500">Taxable value</Text><Text className="text-xs font-bold text-slate-800">{formatINR(calculation.taxableValue)}</Text></View><View className="flex-row justify-between border-b border-slate-200 py-2.5"><Text className="text-xs text-slate-500">GST {isTaxable ? `(${gstRate}%)` : ''}</Text><Text className="text-xs font-bold text-emerald-700">{formatINR(calculation.taxAmount)}</Text></View><View className="flex-row justify-between py-3"><Text className="text-sm font-extrabold text-slate-900">Invoice total</Text><Text className="text-lg font-extrabold text-slate-950">{formatINR(calculation.total)}</Text></View></View></Card>
    <Card><ChoiceField label="Status" value={form.status} options={['Issued', 'Paid', 'Cancelled']} onChange={set('status')} /><FormField label="Description" value={form.description} onChangeText={set('description')} multiline /><PrimaryButton label={saving ? 'Generating…' : 'Generate Invoice'} onPress={() => void save()} disabled={saving} /></Card>
  </>}</Screen>;
}
