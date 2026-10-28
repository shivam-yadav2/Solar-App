import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../src/lib/api';
import { useAuth } from '../../src/context/AuthContext';
import { Button, ChoiceField, ErrorState, FormSection, ListSkeleton, Screen, T, TextField, ToggleField, haptic, useOverlay, useUnsavedChanges } from '../../src/ds';
import { CredentialsSheet, Credentials } from '../../src/components/CredentialsSheet';
import type { CustomerStatus } from '../../src/types';

const blank = { name: '', mobile: '', email: '', address: '', city: 'Lucknow', state: 'Uttar Pradesh', pincode: '', status: 'Active' as CustomerStatus, notes: '', createLogin: false };
type Form = typeof blank;

export default function CustomerForm() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { tenant } = useAuth();
  const { toast } = useOverlay();
  const editing = !!id;
  const [form, setForm] = useState<Form>(blank);
  const [loading, setLoading] = useState(editing);
  const [loadError, setLoadError] = useState('');
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [saving, setSaving] = useState(false);
  const [creds, setCreds] = useState<Credentials | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const baseline = useRef(JSON.stringify(blank));

  useEffect(() => {
    if (!id) return;
    api.getCustomer(id).then(({ customer }) => {
      const next = { ...blank, ...customer, notes: customer.notes || '' };
      setForm(next);
      baseline.current = JSON.stringify(next);
    }).catch((e) => setLoadError(e.message)).finally(() => setLoading(false));
  }, [id]);
  const dirty = useMemo(() => !loading && JSON.stringify(form) !== baseline.current, [form, loading]);
  const allowNavigation = useUnsavedChanges(dirty);
  const set = <K extends keyof Form>(k: K) => (v: Form[K]) => { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => ({ ...e, [k]: undefined })); };

  const validate = () => {
    const e: typeof errors = {};
    if (!form.name.trim()) e.name = 'Enter the customer name.';
    if (form.mobile.replace(/\D/g, '').length < 10) e.mobile = 'Enter a 10-digit mobile number.';
    if (form.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) e.email = 'This email looks wrong.';
    if (form.createLogin && !form.email.trim()) e.email = 'An email is needed for a portal login.';
    if (form.pincode && !/^\d{6}$/.test(form.pincode)) e.pincode = '6 digits.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = async () => {
    if (!validate()) { haptic.error(); return; }
    setSaving(true);
    try {
      const body = { ...form, name: form.name.trim(), mobile: form.mobile.replace(/\D/g, '').slice(-10), email: form.email.trim().toLowerCase() };
      if (editing) {
        await api.updateCustomer(id!, body);
        toast('Saved');
        allowNavigation();
        router.back();
      } else {
        const r = await api.createCustomer(body);
        toast('Customer added');
        allowNavigation();
        if (r.tempPassword) {
          setCreatedId(r.customer.id);
          setCreds({ name: r.customer.name, login: r.customer.email, password: r.tempPassword, phone: r.customer.mobile, company: tenant?.name, notified: r.notified });
        } else {
          router.replace({ pathname: '/customer/[id]', params: { id: r.customer.id } });
        }
      }
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen title={editing ? 'Edit customer' : 'New customer'} large={false} back backLabel="Cancel"
      right={<Button title={editing ? 'Save' : 'Add'} size="s" kind="filled" loading={saving} onPress={save} />}>
      {loadError ? <ErrorState message={loadError} /> : loading ? <ListSkeleton rows={4} avatar={false} /> : (
        <>
          <FormSection header="Contact">
            <TextField label="Full name" kind="name" value={form.name} onChange={set('name')} required error={errors.name} autoFocus={!editing} />
            <TextField label="Mobile" kind="phone" value={form.mobile} onChange={set('mobile')} required error={errors.mobile} placeholder="10-digit number" />
            <TextField label="Email" kind="email" value={form.email} onChange={set('email')} error={errors.email} placeholder="Optional" />
          </FormSection>
          <FormSection header="Address">
            <TextField label="Street / locality" value={form.address} onChange={set('address')} multiline />
            <View style={{ flexDirection: 'row' }}>
              <View style={{ flex: 1 }}><TextField label="City" kind="name" value={form.city} onChange={set('city')} /></View>
              <View style={{ width: 120 }}><TextField label="Pincode" kind="number" value={form.pincode} onChange={set('pincode')} maxLength={6} error={errors.pincode} /></View>
            </View>
            <TextField label="State" kind="name" value={form.state} onChange={set('state')} />
          </FormSection>
          {editing ? (
            <FormSection>
              <ChoiceField<CustomerStatus> label="Status" value={form.status} onChange={set('status')} options={[{ value: 'Active', label: 'Active' }, { value: 'Inactive', label: 'Inactive' }]} />
            </FormSection>
          ) : (
            <FormSection footer="The customer gets a temporary password to see progress, payments and invoices. You can also do this later.">
              <ToggleField label="Create portal login" value={form.createLogin} onChange={set('createLogin')} />
            </FormSection>
          )}
          <FormSection header="Notes">
            <TextField label="Internal notes" value={form.notes} onChange={set('notes')} multiline placeholder="Only your team sees this" />
          </FormSection>
          <Button title={editing ? 'Save changes' : 'Add customer'} loading={saving} onPress={save} full />
          {!editing ? <T variant="footnote" color="secondary" align="center">You can add a project for this customer next.</T> : null}
        </>
      )}
      <CredentialsSheet creds={creds} onClose={() => { setCreds(null); if (createdId) router.replace({ pathname: '/customer/[id]', params: { id: createdId } }); }} />
    </Screen>
  );
}
