import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../src/lib/api';
import { Button, ErrorState, FormSection, ListSkeleton, Screen, SelectField, TextField, haptic, useOverlay } from '../../src/ds';
import { CredentialsSheet, Credentials } from '../../src/components/CredentialsSheet';

const blank: any = { name: '', slug: '', adminEmail: '', adminPassword: '', planId: '', status: 'active', supportPhone: '', companyTagline: '', legalEntityName: '', gstin: '', pan: '', address: '', city: '', state: '', pincode: '' };

export default function TenantForm() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { toast } = useOverlay();
  const [plans, setPlans] = useState<any[]>([]);
  const [f, setF] = useState(blank);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [creds, setCreds] = useState<Credentials | null>(null);
  useEffect(() => {
    Promise.all([api.getPlans(), id ? api.getSaaSTenant(id) : Promise.resolve(null)]).then(([pd, td]) => {
      setPlans(pd.plans.filter((x) => x.isActive || x.id === td?.tenant.subscription?.planId));
      const t: any = td?.tenant;
      if (t) setF({ ...blank, name: t.name, slug: t.slug, adminEmail: t.adminEmail, status: t.status, planId: t.subscription?.planId || '', supportPhone: t.branding?.supportPhone || '', companyTagline: t.branding?.companyTagline || '',
        legalEntityName: t.businessProfile?.legalEntityName || '', gstin: t.businessProfile?.gstin || '', pan: t.businessProfile?.pan || '', address: t.businessProfile?.address || '', city: t.businessProfile?.city || '', state: t.businessProfile?.state || '', pincode: t.businessProfile?.pincode || '' });
    }).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [id]);
  const set = (k: string) => (v: string) => setF((s: any) => ({ ...s, [k]: v }));
  const profile = () => ({ branding: { supportPhone: f.supportPhone, companyTagline: f.companyTagline }, businessProfile: { legalEntityName: f.legalEntityName, gstin: f.gstin, pan: f.pan, address: f.address, city: f.city, state: f.state, pincode: f.pincode } });
  const save = async () => {
    if (!f.name.trim() || (!id && (!f.slug.trim() || !f.adminEmail.trim() || !f.planId))) { toast('Name, company code, admin email and plan are needed', 'error'); haptic.error(); return; }
    setSaving(true);
    try {
      if (id) { await api.updateSaaSTenant(id, { name: f.name, adminEmail: f.adminEmail, status: f.status, ...profile() } as any); toast('Company saved'); router.back(); }
      else {
        const r = await api.createSaaSTenant({ name: f.name, slug: f.slug.trim().toLowerCase(), adminEmail: f.adminEmail.trim(), adminPassword: f.adminPassword || undefined, planId: f.planId, ...profile() } as any);
        toast('Company created');
        setCreds({ name: f.name, login: r.initialCredentials.email, password: r.initialCredentials.tempPassword || f.adminPassword, phone: f.supportPhone, company: 'SolarOS' });
      }
    } catch (e: any) { toast(e.message, 'error'); } finally { setSaving(false); }
  };
  return (
    <Screen title={id ? 'Edit company' : 'New company'} large={false} back backLabel="Cancel" right={<Button title="Save" size="s" loading={saving} onPress={save} />}>
      {error ? <ErrorState message={error} /> : loading ? <ListSkeleton rows={4} avatar={false} /> : (
        <>
          <FormSection header="Company">
            <TextField label="Company name" value={f.name} onChange={set('name')} required />
            {!id ? <TextField label="Company code" kind="email" value={f.slug} onChange={set('slug')} required placeholder="e.g. suryapower" hint="Used in the customer login link. Letters and numbers only." /> : null}
            <TextField label="Admin email" kind="email" value={f.adminEmail} onChange={set('adminEmail')} required />
            {!id ? <TextField label="Admin password" kind="password" value={f.adminPassword} onChange={set('adminPassword')} placeholder="Leave empty for a temporary password" /> : null}
            {!id ? <SelectField label="Plan" required value={f.planId} options={plans.map((x) => ({ value: x.id, label: x.name, subtitle: `₹${x.pricePerMonth}/${x.billingCycle}` }))} onChange={(o) => o && setF((s: any) => ({ ...s, planId: o.value }))} />
              : <SelectField label="Status" value={f.status} options={['active', 'trial', 'suspended', 'expired'].map((x) => ({ value: x, label: x.charAt(0).toUpperCase() + x.slice(1) }))} onChange={(o) => o && setF((s: any) => ({ ...s, status: o.value }))} />}
          </FormSection>
          <FormSection header="Legal & invoicing">
            <TextField label="Legal entity name" value={f.legalEntityName} onChange={set('legalEntityName')} />
            <View style={{ flexDirection: 'row' }}><View style={{ flex: 3 }}><TextField label="GSTIN" value={f.gstin} onChange={set('gstin')} /></View><View style={{ flex: 2 }}><TextField label="PAN" value={f.pan} onChange={set('pan')} /></View></View>
            <TextField label="Address" value={f.address} onChange={set('address')} multiline />
            <View style={{ flexDirection: 'row' }}><View style={{ flex: 1 }}><TextField label="City" kind="name" value={f.city} onChange={set('city')} /></View><View style={{ width: 120 }}><TextField label="Pincode" kind="number" value={f.pincode} onChange={set('pincode')} maxLength={6} /></View></View>
            <TextField label="State" kind="name" value={f.state} onChange={set('state')} />
          </FormSection>
          <FormSection header="Contact">
            <TextField label="Support phone" kind="phone" value={f.supportPhone} onChange={set('supportPhone')} />
            <TextField label="Tagline" value={f.companyTagline} onChange={set('companyTagline')} />
          </FormSection>
          <Button title={id ? 'Save company' : 'Create company'} loading={saving} onPress={save} full />
        </>
      )}
      <CredentialsSheet creds={creds} onClose={() => { setCreds(null); router.back(); }} />
    </Screen>
  );
}
