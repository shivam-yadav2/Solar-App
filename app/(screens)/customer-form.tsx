import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../src/lib/api';
import { Card, ChoiceField, ErrorState, FormField, Loading, PrimaryButton, Screen } from '../../src/components/ui';

const initial = { name: '', mobile: '', email: '', address: '', city: 'Lucknow', state: 'Uttar Pradesh', pincode: '', status: 'Active', notes: '', createLogin: false };

export default function CustomerFormScreen() {
  const router = useRouter(); const { id } = useLocalSearchParams<{ id?: string }>(); const editing = Boolean(id); const [form, setForm] = useState<any>(initial); const [loading, setLoading] = useState(editing); const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  useEffect(() => { if (!id) return; api.getCustomer(String(id)).then(({ customer }) => setForm({ ...initial, ...customer })).catch((e) => setError(e.message)).finally(() => setLoading(false)); }, [id]);
  const set = (key: string) => (value: string) => setForm((current: any) => ({ ...current, [key]: value }));
  const save = async () => { if (!form.name.trim() || !form.mobile.trim() || !form.email.trim()) { Alert.alert('Missing details', 'Name, mobile, and email are required.'); return; } setSaving(true); try { if (id) await api.updateCustomer(String(id), form); else await api.createCustomer(form); router.back(); } catch (e: any) { Alert.alert('Could not save customer', e.message); } finally { setSaving(false); } };
  return <Screen title={editing ? 'Edit Customer' : 'New Customer'} subtitle="Contact and portal information" onBack={() => router.back()}>
    {loading ? <Loading /> : error ? <ErrorState message={error} /> : <Card>
      <FormField label="Full name" value={form.name} onChangeText={set('name')} required /><FormField label="Mobile" value={form.mobile} onChangeText={set('mobile')} keyboardType="phone-pad" required /><FormField label="Email" value={form.email} onChangeText={set('email')} keyboardType="email-address" required /><FormField label="Address" value={form.address} onChangeText={set('address')} multiline /><FormField label="City" value={form.city} onChangeText={set('city')} /><FormField label="State" value={form.state} onChangeText={set('state')} /><FormField label="Pincode" value={form.pincode} onChangeText={set('pincode')} keyboardType="numeric" />{editing ? <ChoiceField label="Status" value={form.status} options={['Active', 'Inactive', 'Archived']} onChange={set('status')} /> : <ChoiceField label="Create portal login" value={form.createLogin ? 'Yes' : 'No'} options={['No', 'Yes']} onChange={(value) => setForm((current: any) => ({ ...current, createLogin: value === 'Yes' }))} />}<FormField label="Notes" value={form.notes} onChangeText={set('notes')} multiline /><PrimaryButton label={saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Customer'} onPress={() => void save()} disabled={saving} />
    </Card>}
  </Screen>;
}
