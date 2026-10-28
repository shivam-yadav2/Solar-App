import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../src/lib/api';
import { Button, ChoiceField, ErrorState, FormSection, ListSkeleton, Screen, TextField, ToggleField, haptic, num, useOverlay } from '../../src/ds';

const MODULES: Record<string, string> = { customerManagement: 'Customers', solarProjects: 'Projects', paymentsMilestones: 'Payments', expenseTracking: 'Expenses', profitAndMargins: 'Profit & margins', payroll: 'Payroll', warrantyCards: 'Warranties', invoices: 'Invoices', serviceTickets: 'Service tickets', documentCenter: 'Documents', reportsExport: 'Reports', activityLogs: 'Audit log', aiAssistant: 'AI assistant' };
const allOn = Object.fromEntries(Object.keys(MODULES).map((k) => [k, true]));

export default function PlanForm() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { toast } = useOverlay();
  const [f, setF] = useState<any>({ key: '', name: '', description: '', pricePerMonth: '', billingCycle: 'monthly', maxProjectsLimit: '25', maxUsersLimit: '5', trialDays: '14', isActive: true, sortOrder: '0', enabledModules: allOn });
  const [loading, setLoading] = useState(!!id);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!id) return;
    api.getPlans().then((d) => { const x = d.plans.find((v) => v.id === id); if (x) setF({ ...x, description: x.description || '', pricePerMonth: String(x.pricePerMonth), maxProjectsLimit: String(x.maxProjectsLimit), maxUsersLimit: String(x.maxUsersLimit), trialDays: String(x.trialDays), sortOrder: String(x.sortOrder ?? 0), enabledModules: { ...allOn, ...(x.enabledModules || {}) } }); })
      .catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [id]);
  const set = (k: string) => (v: any) => setF((s: any) => ({ ...s, [k]: v }));
  const save = async () => {
    if (!f.key.trim() || !f.name.trim()) { toast('Enter the plan key and name', 'error'); haptic.error(); return; }
    setSaving(true);
    try {
      const body: any = { ...f, pricePerMonth: num(f.pricePerMonth), maxProjectsLimit: num(f.maxProjectsLimit), maxUsersLimit: num(f.maxUsersLimit), trialDays: num(f.trialDays), sortOrder: num(f.sortOrder) };
      if (id) await api.updatePlan(id, body); else await api.createPlan(body);
      toast(id ? 'Plan saved' : 'Plan created');
      router.back();
    } catch (e: any) { toast(e.message, 'error'); } finally { setSaving(false); }
  };
  return (
    <Screen title={id ? 'Edit plan' : 'New plan'} large={false} back backLabel="Cancel" right={<Button title="Save" size="s" loading={saving} onPress={save} />}>
      {error ? <ErrorState message={error} /> : loading ? <ListSkeleton rows={4} avatar={false} /> : (
        <>
          <FormSection header="Plan">
            {!id ? <TextField label="Key" value={f.key} onChange={set('key')} required placeholder="e.g. growth" /> : null}
            <TextField label="Name" value={f.name} onChange={set('name')} required />
            <TextField label="Description" value={f.description} onChange={set('description')} multiline />
            <ToggleField label="Available for new companies" value={!!f.isActive} onChange={set('isActive')} />
          </FormSection>
          <FormSection header="Price">
            <TextField label="Price per month" kind="money" value={f.pricePerMonth} onChange={set('pricePerMonth')} />
            <ChoiceField label="Billing" value={f.billingCycle} onChange={set('billingCycle')} options={[{ value: 'monthly', label: 'Monthly' }, { value: 'yearly', label: 'Yearly' }]} />
            <TextField label="Trial days" kind="number" value={f.trialDays} onChange={set('trialDays')} />
          </FormSection>
          <FormSection header="Limits" footer="0 means unlimited.">
            <View style={{ flexDirection: 'row' }}>
              <View style={{ flex: 1 }}><TextField label="Projects" kind="number" value={f.maxProjectsLimit} onChange={set('maxProjectsLimit')} /></View>
              <View style={{ flex: 1 }}><TextField label="Staff logins" kind="number" value={f.maxUsersLimit} onChange={set('maxUsersLimit')} /></View>
            </View>
          </FormSection>
          <FormSection header="Modules">
            {Object.entries(MODULES).map(([k, label]) => <ToggleField key={k} label={label} value={!!f.enabledModules[k]} onChange={(v) => setF((s: any) => ({ ...s, enabledModules: { ...s.enabledModules, [k]: v } }))} />)}
          </FormSection>
          <Button title={id ? 'Save plan' : 'Create plan'} loading={saving} onPress={save} full />
        </>
      )}
    </Screen>
  );
}
