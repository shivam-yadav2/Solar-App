import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../src/lib/api';
import { Card, ChoiceField, ErrorState, FormField, Loading, OptionField, PrimaryButton, Screen } from '../../src/components/ui';

const GST_RATE = 0.138;

export default function InvoiceFormScreen() {
  const router = useRouter();
  const { customerId, projectId } = useLocalSearchParams<{ customerId?: string; projectId?: string }>();
  const [customers, setCustomers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [form, setForm] = useState<any>({
    customerId: customerId || '', projectId: projectId || '', invoiceNumber: '',
    invoiceDate: new Date().toISOString().slice(0, 10), dueDate: '', amount: '', taxAmount: '0',
    invoiceType: 'Tax Invoice', status: 'Issued', description: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const applyProject = (project: any, current: any) => {
    if (!project) return current;
    const amount = Number(project.finalDealAmount || project.dealAmount || 0);
    return {
      ...current,
      projectId: project.id,
      amount: amount ? String(amount) : current.amount,
      taxAmount: amount ? String(Math.round(amount * GST_RATE)) : current.taxAmount,
      description: `Turnkey Solar Rooftop Power Plant (${project.capacityKw || ''} KW - ${project.panelBrand || 'Solar panels'})`,
    };
  };

  useEffect(() => {
    Promise.all([api.getCustomers({ limit: '200' }), api.getProjects({ limit: '200' })])
      .then(([cusData, projData]) => {
        setCustomers(cusData.customers || []);
        setProjects(projData.projects || []);
        const selectedProject = projectId ? projData.projects.find((item: any) => item.id === projectId) : undefined;
        const targetCustomerId = customerId || selectedProject?.customerId || cusData.customers?.[0]?.id || '';
        const firstProject = selectedProject || projData.projects.find((item: any) => item.customerId === targetCustomerId);
        setForm((current: any) => ({
          ...applyProject(firstProject, current),
          customerId: targetCustomerId,
          projectId: projectId || firstProject?.id || '',
        }));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [customerId, projectId]);

  const set = (key: string) => (value: string) => setForm((current: any) => ({ ...current, [key]: value }));
  const customerProjects = projects.filter((project) => project.customerId === form.customerId);
  const setCustomer = (nextCustomerId: string) => {
    const firstProject = projects.find((project) => project.customerId === nextCustomerId);
    setForm((current: any) => ({ ...applyProject(firstProject, current), customerId: nextCustomerId, projectId: firstProject?.id || '' }));
  };

  const save = async () => {
    if (!form.customerId || !form.projectId || !Number(form.amount)) {
      Alert.alert('Missing details', 'Customer, project, and a positive amount are required.');
      return;
    }
    setSaving(true);
    try {
      await api.createInvoice({ ...form, amount: Number(form.amount), taxAmount: Number(form.taxAmount) });
      router.back();
    } catch (e: any) {
      Alert.alert('Could not create invoice', e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen title="Create Invoice" subtitle="Issue a customer billing document · HSN 85414011" onBack={() => router.back()}>
      {loading ? <Loading /> : error ? <ErrorState message={error} /> : (
        <Card>
          <OptionField label="Customer *" value={form.customerId} onChange={setCustomer} options={customers.map(item => ({ value: item.id, label: `${item.name} · ${item.customId}` }))} />
          <OptionField label="Project *" value={form.projectId} onChange={(value) => { const project = customerProjects.find(item => item.id === value); setForm((current: any) => applyProject(project, current)); }} options={customerProjects.map(item => ({ value: item.id, label: `${item.projectName} · ${item.customId}` }))} />
          <FormField label="Invoice number" value={form.invoiceNumber} onChangeText={set('invoiceNumber')} placeholder="Auto-generated when blank" />
          <FormField label="Invoice date" value={form.invoiceDate} onChangeText={set('invoiceDate')} />
          <FormField label="Due date" value={form.dueDate} onChangeText={set('dueDate')} />
          <FormField label="Total invoice value (₹)" value={form.amount} onChangeText={(value) => setForm((current: any) => ({ ...current, amount: value, taxAmount: value ? String(Math.round(Number(value) * GST_RATE)) : '0' }))} keyboardType="numeric" required />
          <FormField label="GST component (₹)" value={form.taxAmount} onChangeText={set('taxAmount')} keyboardType="numeric" />
          <ChoiceField label="Invoice type" value={form.invoiceType} options={['Tax Invoice', 'Proforma', 'Advance Receipt', 'Final Bill']} onChange={set('invoiceType')} />
          <ChoiceField label="Status" value={form.status} options={['Issued', 'Paid', 'Cancelled']} onChange={set('status')} />
          <FormField label="Description" value={form.description} onChangeText={set('description')} multiline />
          <PrimaryButton label={saving ? 'Saving…' : 'Create Invoice'} onPress={() => void save()} disabled={saving} />
        </Card>
      )}
    </Screen>
  );
}
