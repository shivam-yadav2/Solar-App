import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../src/lib/api';
import { LEAD_SOURCES, LEAD_STAGES } from '../../src/lib/constants';
import { Button, ErrorState, FormSection, ListSkeleton, Screen, SelectField, space, T, TextField, haptic, num, useOverlay } from '../../src/ds';
import type { LeadSource, LeadStatus } from '../../src/types';

const blank = { prospectName: '', phone: '', email: '', address: '', city: 'Lucknow', state: 'Uttar Pradesh', pincode: '', monthlyElectricityBill: '', sanctionedLoadKw: '', proposedCapacityKw: '', leadSource: 'Referral' as LeadSource, status: 'New' as LeadStatus, lostReason: '', notes: '' };

/** Rough rooftop size from the monthly bill (₹8/unit, 120 units per kW per month). */
const suggestKw = (bill: number) => (bill > 0 ? Math.max(1, Math.round((bill / 8 / 120) * 2) / 2) : 0);

export default function LeadForm() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { toast } = useOverlay();
  const editing = !!id;
  const [f, setF] = useState(blank);
  const [loading, setLoading] = useState(editing);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!id) return;
    api.getLead(id).then(({ lead: l }) => setF({ ...blank, ...l, email: l.email || '', address: l.address || '', pincode: l.pincode || '', lostReason: l.lostReason || '', notes: l.notes || '', monthlyElectricityBill: String(l.monthlyElectricityBill || ''), sanctionedLoadKw: String(l.sanctionedLoadKw || ''), proposedCapacityKw: String(l.proposedCapacityKw || '') }))
      .catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [id]);
  const set = (k: keyof typeof blank) => (v: string) => { setF((s) => ({ ...s, [k]: v })); setErrors((e) => ({ ...e, [k]: '' })); };
  const kw = suggestKw(num(f.monthlyElectricityBill));

  const save = async () => {
    const e: Record<string, string> = {};
    if (!f.prospectName.trim()) e.prospectName = 'Enter the name.';
    if (f.phone.replace(/\D/g, '').length < 10) e.phone = 'Enter a 10-digit number.';
    if (!f.city.trim()) e.city = 'Enter the city.';
    if (f.status === 'Lost' && !f.lostReason.trim()) e.lostReason = 'Why was it lost?';
    setErrors(e);
    if (Object.keys(e).length) { haptic.error(); return; }
    setSaving(true);
    try {
      const body: any = { ...f, prospectName: f.prospectName.trim(), phone: f.phone.replace(/\D/g, '').slice(-10), email: f.email.trim() || undefined,
        monthlyElectricityBill: num(f.monthlyElectricityBill) || undefined, sanctionedLoadKw: num(f.sanctionedLoadKw) || undefined, proposedCapacityKw: num(f.proposedCapacityKw) || kw || undefined };
      if (editing) { await api.updateLead(id!, body); toast('Saved'); router.back(); }
      else { const r = await api.createLead(body); toast('Lead added'); router.replace({ pathname: '/lead/[id]', params: { id: r.lead.id } }); }
    } catch (err: any) { toast(err.message, 'error'); } finally { setSaving(false); }
  };

  return (
    <Screen title={editing ? 'Edit lead' : 'New lead'} large={false} back backLabel="Cancel" right={<Button title="Save" size="s" loading={saving} onPress={save} />}>
      {error ? <ErrorState message={error} /> : loading ? <ListSkeleton rows={4} avatar={false} /> : (
        <>
          <FormSection header="Prospect">
            <TextField label="Name" kind="name" value={f.prospectName} onChange={set('prospectName')} required error={errors.prospectName} autoFocus={!editing} />
            <TextField label="Mobile" kind="phone" value={f.phone} onChange={set('phone')} required error={errors.phone} />
            <TextField label="Email" kind="email" value={f.email} onChange={set('email')} placeholder="Optional" />
            <SelectField label="Source" value={f.leadSource} options={LEAD_SOURCES.map((s) => ({ value: s, label: s }))} onChange={(o) => o && setF((s) => ({ ...s, leadSource: o.value as LeadSource }))} />
          </FormSection>
          <FormSection header="Requirement" footer={kw && !f.proposedCapacityKw ? `About ${kw} kW would cover this bill.` : undefined}>
            <TextField label="Monthly electricity bill" kind="money" value={f.monthlyElectricityBill} onChange={set('monthlyElectricityBill')} />
            <View style={{ flexDirection: 'row' }}>
              <View style={{ flex: 1 }}><TextField label="Sanctioned load (kW)" kind="decimal" value={f.sanctionedLoadKw} onChange={set('sanctionedLoadKw')} /></View>
              <View style={{ flex: 1 }}><TextField label="System (kW)" kind="decimal" value={f.proposedCapacityKw} onChange={set('proposedCapacityKw')} placeholder={kw ? String(kw) : ''} /></View>
            </View>
          </FormSection>
          <FormSection header="Address">
            <TextField label="Street / locality" value={f.address} onChange={set('address')} />
            <View style={{ flexDirection: 'row' }}>
              <View style={{ flex: 1 }}><TextField label="City" kind="name" value={f.city} onChange={set('city')} required error={errors.city} /></View>
              <View style={{ width: 120 }}><TextField label="Pincode" kind="number" value={f.pincode} onChange={set('pincode')} maxLength={6} /></View>
            </View>
          </FormSection>
          {editing ? (
            <FormSection header="Stage">
              <SelectField label="Status" value={f.status} options={LEAD_STAGES.map((s) => ({ value: s, label: s }))} onChange={(o) => o && setF((s) => ({ ...s, status: o.value as LeadStatus }))} />
              {f.status === 'Lost' ? <TextField label="Lost reason" value={f.lostReason} onChange={set('lostReason')} error={errors.lostReason} /> : null}
            </FormSection>
          ) : null}
          <FormSection><TextField label="Notes" value={f.notes} onChange={set('notes')} multiline /></FormSection>
          <Button title={editing ? 'Save changes' : 'Add lead'} loading={saving} onPress={save} full />
          <T variant="footnote" color="secondary" align="center" style={{ marginTop: -space.s }}>Log calls and visits from the lead's page.</T>
        </>
      )}
    </Screen>
  );
}
