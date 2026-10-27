import React, { useEffect, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check, Plus, X } from 'lucide-react-native';
import { api } from '../../src/lib/api';
import { ops } from '../../src/lib/apis/ops';
import { loadCustomers, loadProjects } from '../../src/lib/pickers';
import { formatINR } from '../../src/lib/formatters';
import {
  Button, DateField, ErrorState, FormSection, ListSkeleton, Screen, Section, SelectField, Segmented, space, T, Tap, TextField, Switch, haptic, num, todayISO, useOverlay, useTheme, radius, type,
} from '../../src/ds';
import type { Quotation, QuotationSettings, QuotationTemplateKey } from '../../src/types';

interface Row { key: string; category: string; brand: string; spec: string; highlight?: boolean; included: boolean; custom: boolean; autoSpec: boolean }
const rk = () => Math.random().toString(36).slice(2, 10);
const addDays = (d: string, n: number) => { const x = new Date(`${d}T00:00:00`); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
const autoSpec = (category: string, kw: number) => { if (!kw) return null; const c = category.toLowerCase(); if (c.includes('panel') || c.includes('module')) return `${Math.round(kw * 1000)}w`; if (c.includes('inverter')) return `${kw} kw`; return null; };
const autoTitle = (kw: number) => (kw ? `${kw} Kw Plant- On Grid` : 'Solar Rooftop Plant- On Grid');
const TEMPLATES: { value: QuotationTemplateKey; label: string }[] = [{ value: 'classic', label: 'Classic' }, { value: 'modern', label: 'Modern' }, { value: 'minimal', label: 'Minimal' }, { value: 'bold', label: 'Dark' }];

export default function QuotationForm() {
  const router = useRouter();
  const p = useTheme();
  const params = useLocalSearchParams<{ id?: string; leadId?: string; customerId?: string; projectId?: string }>();
  const { toast } = useOverlay();
  const editing = !!params.id;
  const [settings, setSettings] = useState<QuotationSettings | null>(null);
  const [f, setF] = useState<any>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [newFeature, setNewFeature] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const st = (await ops.quotationSettings()).settings;
        setSettings(st);
        const rows = (existing: any[] = [], fresh = true): Row[] => {
          const used = new Set<number>();
          const out: Row[] = st.components.map((c) => {
            const i = existing.findIndex((e, j) => !used.has(j) && e.category.toLowerCase() === c.category.toLowerCase());
            if (i >= 0) { used.add(i); const e = existing[i]; return { key: rk(), category: c.category, brand: e.brand, spec: e.spec, highlight: e.highlight ?? c.highlight, included: true, custom: false, autoSpec: false }; }
            return { key: rk(), category: c.category, brand: c.options[0] || '', spec: c.defaultSpec, highlight: c.highlight, included: fresh, custom: false, autoSpec: fresh && !c.defaultSpec };
          });
          existing.forEach((e, j) => { if (!used.has(j)) out.push({ key: rk(), ...e, included: true, custom: true, autoSpec: false }); });
          return out;
        };
        if (editing) {
          const q: Quotation = (await ops.quotation(params.id!)).quotation;
          setF({ ...q, systemCapacityKw: String(q.systemCapacityKw || ''), totalAmount: String(q.totalAmount || ''), titleTouched: true, featureOptions: [...new Set([...st.features, ...q.features])], components: rows(q.components, false), quotationDate: q.quotationDate || todayISO() });
          return;
        }
        const date = todayISO();
        let base: any = { leadId: params.leadId || '', customerId: '', customerName: '', projectId: '', projectName: '', recipientName: '', recipientPhone: '', recipientAddress: '', quotationDate: date, validUntil: addDays(date, st.validityDays || 15), systemCapacityKw: '', title: autoTitle(0), titleTouched: false,
          featureOptions: [...st.features], features: [...st.features], components: rows(), totalAmount: '', priceLabel: st.priceLabel, paymentTerms: st.paymentTerms, termsConditions: st.termsConditions, notes: '', preparedByName: st.preparedByName, preparedByPhone: st.preparedByPhone, templateKey: st.defaultTemplate, status: 'Draft' };
        if (params.leadId) {
          const l = (await api.getLead(params.leadId)).lead;
          base = withKw({ ...base, recipientName: l.prospectName, recipientPhone: l.phone, recipientAddress: [l.address, l.city, l.state, l.pincode].filter(Boolean).join(', ') }, l.proposedCapacityKw ? String(l.proposedCapacityKw) : '');
        } else if (params.projectId) {
          base = await fromProject(base, params.projectId);
        } else if (params.customerId) {
          base = await fromCustomer(base, params.customerId);
        }
        setF(base);
      } catch (e: any) { setError(e.message); }
    })();
  }, [editing, params.id, params.leadId, params.projectId, params.customerId]);

  const withKw = (s: any, kwText: string) => {
    const kw = num(kwText);
    return { ...s, systemCapacityKw: kwText, title: s.titleTouched ? s.title : autoTitle(kw), components: s.components.map((r: Row) => { if (!r.autoSpec) return r; const sp = autoSpec(r.category, kw); return sp === null ? r : { ...r, spec: sp }; }) };
  };
  const fromCustomer = async (s: any, id: string) => {
    const r = await api.getCustomer(id);
    const c = r.customer;
    return { ...s, customerId: c.id, customerName: c.name, recipientName: c.name, recipientPhone: c.mobile, recipientAddress: [c.address, c.city, c.state, c.pincode].filter(Boolean).join(', ') };
  };
  const fromProject = async (s: any, id: string) => {
    const r = await api.getProject(id);
    const x = r.project;
    let next = await fromCustomer(s, x.customerId);
    next = withKw({ ...next, projectId: x.id, projectName: x.projectName, totalAmount: String(x.finalDealAmount || x.dealAmount || ''), recipientAddress: [x.installationAddress, x.city, x.state, x.pincode].filter(Boolean).join(', ') || next.recipientAddress }, String(x.capacityKw || ''));
    const setBrand = (match: (c: string) => boolean, brand?: string) => { if (brand) next.components = next.components.map((row: Row) => (match(row.category.toLowerCase()) ? { ...row, brand, included: true } : row)); };
    setBrand((c) => c.includes('panel'), [x.panelBrand, x.panelModel].filter(Boolean).join(' '));
    setBrand((c) => c.includes('inverter'), [x.inverterBrand, x.inverterModel].filter(Boolean).join(' '));
    return next;
  };
  const up = (patch: any) => setF((s: any) => ({ ...s, ...patch }));
  const row = (key: string, patch: Partial<Row>) => setF((s: any) => ({ ...s, components: s.components.map((r: Row) => (r.key === key ? { ...r, ...patch } : r)) }));

  const save = async () => {
    if (!f.recipientName.trim()) { toast('Enter the customer name', 'error'); haptic.error(); return; }
    if (!(num(f.totalAmount) > 0)) { toast('Enter the total price', 'error'); haptic.error(); return; }
    setSaving(true);
    const payload: any = {
      leadId: f.leadId || undefined, customerId: f.customerId || undefined, projectId: f.projectId || undefined, recipientName: f.recipientName.trim(), recipientAddress: f.recipientAddress, recipientPhone: f.recipientPhone,
      quotationDate: f.quotationDate, validUntil: f.validUntil, systemCapacityKw: num(f.systemCapacityKw), title: f.title,
      features: f.featureOptions.filter((x: string) => f.features.includes(x)),
      components: f.components.filter((r: Row) => r.included && (r.category || r.brand)).map(({ category, brand, spec, highlight }: Row) => ({ category, brand, spec, highlight })),
      totalAmount: num(f.totalAmount), priceLabel: f.priceLabel, paymentTerms: f.paymentTerms, termsConditions: f.termsConditions, notes: f.notes, preparedByName: f.preparedByName, preparedByPhone: f.preparedByPhone, templateKey: f.templateKey, status: f.status,
    };
    try {
      const r = editing ? await ops.updateQuotation(params.id!, payload) : await api.createQuotation(payload);
      toast(editing ? 'Quotation saved' : `Quotation ${r.quotation.quotationNumber} created`);
      if (editing) router.back(); else router.replace({ pathname: '/quotation/[id]', params: { id: r.quotation.id } });
    } catch (e: any) { toast(e.message, 'error'); } finally { setSaving(false); }
  };

  const optionsFor = (category: string) => settings?.components.find((c) => c.category.toLowerCase() === category.toLowerCase())?.options || [];

  return (
    <Screen title={editing ? 'Edit quotation' : 'New quotation'} large={false} back backLabel="Cancel" right={f ? <Button title="Save" size="s" loading={saving} onPress={save} /> : undefined}>
      {error ? <ErrorState message={error} /> : !f ? <ListSkeleton rows={5} avatar={false} /> : (
        <>
          <FormSection header="For">
            {!f.leadId ? (
              <>
                <SelectField label="Customer (optional)" value={f.customerId} display={f.customerName} load={loadCustomers} queryKey="customers" allowClear placeholder="Choose or type below"
                  onChange={async (o) => { if (!o) return up({ customerId: '', customerName: '', projectId: '', projectName: '' }); setF(await fromCustomer(f, o.value)); }} />
                {f.customerId ? <SelectField label="Project (optional)" value={f.projectId} display={f.projectName} load={loadProjects(f.customerId)} queryKey={`projects-${f.customerId}`} allowClear onChange={async (o) => { if (!o) return up({ projectId: '', projectName: '' }); setF(await fromProject(f, o.value)); }} /> : null}
              </>
            ) : null}
            <TextField label="Name" kind="name" value={f.recipientName} onChange={(v) => up({ recipientName: v })} required />
            <TextField label="Phone" kind="phone" value={f.recipientPhone} onChange={(v) => up({ recipientPhone: v })} />
            <TextField label="Site address" value={f.recipientAddress} onChange={(v) => up({ recipientAddress: v })} multiline />
          </FormSection>

          <FormSection header="System & price" footer={num(f.totalAmount) > 0 ? `${formatINR(num(f.totalAmount))}${num(f.systemCapacityKw) ? ` · ${formatINR(num(f.totalAmount) / num(f.systemCapacityKw))} per kW` : ''}` : undefined}>
            <View style={{ flexDirection: 'row' }}>
              <View style={{ width: 130 }}><TextField label="Capacity (kW)" kind="decimal" value={f.systemCapacityKw} onChange={(v) => setF((s: any) => withKw(s, v))} /></View>
              <View style={{ flex: 1 }}><TextField label="Total price" kind="money" value={f.totalAmount} onChange={(v) => up({ totalAmount: v })} required /></View>
            </View>
            <TextField label="Title" value={f.title} onChange={(v) => up({ title: v, titleTouched: true })} />
            <TextField label="Price label" value={f.priceLabel} onChange={(v) => up({ priceLabel: v })} />
          </FormSection>

          <Section header="Components" footer="Switch off what's not in this quote. Brands come from your quotation settings.">
            {f.components.map((r: Row) => (
              <View key={r.key} style={{ paddingHorizontal: space.l, paddingVertical: 10, gap: 6, opacity: r.included ? 1 : 0.5 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.m }}>
                  {r.custom ? <TextInput value={r.category} onChangeText={(v) => row(r.key, { category: v })} placeholder="Item" placeholderTextColor={p.tertiary} style={[type.headline, { flex: 1, color: p.label, paddingVertical: 0 }]} /> : <T variant="headline" style={{ flex: 1 }}>{r.category}</T>}
                  {r.custom ? <Tap onPress={() => setF((s: any) => ({ ...s, components: s.components.filter((x: Row) => x.key !== r.key) }))} hitSlop={10}><X size={18} color={p.secondary} /></Tap> : <Switch value={r.included} onChange={(v) => row(r.key, { included: v })} />}
                </View>
                {r.included ? (
                  <View style={{ flexDirection: 'row', gap: space.s }}>
                    <TextInput value={r.brand} onChangeText={(v) => row(r.key, { brand: v })} placeholder="Brand" placeholderTextColor={p.tertiary} style={[type.subhead, { flex: 1, color: p.label, backgroundColor: p.fill, borderRadius: radius.s, paddingHorizontal: 10, paddingVertical: 7 }]} />
                    <TextInput value={r.spec} onChangeText={(v) => row(r.key, { spec: v, autoSpec: false })} placeholder="Spec" placeholderTextColor={p.tertiary} style={[type.subhead, { width: 110, color: p.label, backgroundColor: p.fill, borderRadius: radius.s, paddingHorizontal: 10, paddingVertical: 7 }]} />
                  </View>
                ) : null}
                {r.included && optionsFor(r.category).length > 1 ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                    {optionsFor(r.category).map((o) => <Tap key={o} onPress={() => row(r.key, { brand: o })} style={{ paddingHorizontal: 10, height: 28, borderRadius: 14, justifyContent: 'center', backgroundColor: r.brand === o ? p.accentSoft : p.fill }}><T variant="footnote" style={{ color: r.brand === o ? p.accentText : p.label }}>{o}</T></Tap>)}
                  </ScrollView>
                ) : null}
              </View>
            ))}
            <Tap onPress={() => setF((s: any) => ({ ...s, components: [...s.components, { key: rk(), category: '', brand: '', spec: '', included: true, custom: true, autoSpec: false }] }))} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: space.l }}>
              <Plus size={18} color={p.accentText} /><T variant="body" color="accent">Add item</T>
            </Tap>
          </Section>

          <Section header="What's included">
            <View style={{ padding: space.l, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {f.featureOptions.map((x: string) => {
                const on = f.features.includes(x);
                return (
                  <Tap key={x} onPress={() => up({ features: on ? f.features.filter((y: string) => y !== x) : [...f.features, x] })} scaleTo={0.95}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: on ? p.accentSoft : p.fill }}>
                    {on ? <Check size={14} color={p.accentText} strokeWidth={3} /> : null}
                    <T variant="footnote" style={{ color: on ? p.accentText : p.secondary }}>{x}</T>
                  </Tap>
                );
              })}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.l, paddingBottom: space.m, gap: space.s }}>
              <TextInput value={newFeature} onChangeText={setNewFeature} placeholder="Add a line…" placeholderTextColor={p.tertiary} onSubmitEditing={() => { const v = newFeature.trim(); if (v) { up({ featureOptions: f.featureOptions.includes(v) ? f.featureOptions : [...f.featureOptions, v], features: [...new Set([...f.features, v])] }); setNewFeature(''); } }}
                style={[type.subhead, { flex: 1, color: p.label, backgroundColor: p.fill, borderRadius: radius.s, paddingHorizontal: 10, paddingVertical: 8 }]} />
            </View>
          </Section>

          <FormSection header="Terms">
            <TextField label="Payment terms" value={f.paymentTerms} onChange={(v) => up({ paymentTerms: v })} multiline />
            <TextField label="Terms & conditions" value={f.termsConditions} onChange={(v) => up({ termsConditions: v })} multiline />
            <TextField label="Note to customer" value={f.notes} onChange={(v) => up({ notes: v })} multiline placeholder="Optional" />
          </FormSection>

          <FormSection header="Document">
            <DateField label="Date" value={f.quotationDate} onChange={(v) => up({ quotationDate: v })} />
            <DateField label="Valid until" value={f.validUntil} onChange={(v) => up({ validUntil: v })} />
            <View style={{ paddingHorizontal: space.l, paddingVertical: 10, gap: 8 }}>
              <T variant="footnote" color="secondary">Design</T>
              <Segmented<QuotationTemplateKey> value={f.templateKey} onChange={(v) => up({ templateKey: v })} options={TEMPLATES} />
            </View>
            <View style={{ flexDirection: 'row' }}>
              <View style={{ flex: 1 }}><TextField label="Prepared by" kind="name" value={f.preparedByName} onChange={(v) => up({ preparedByName: v })} /></View>
              <View style={{ flex: 1 }}><TextField label="Phone" kind="phone" value={f.preparedByPhone} onChange={(v) => up({ preparedByPhone: v })} /></View>
            </View>
          </FormSection>

          <Button title={editing ? 'Save quotation' : 'Create quotation'} loading={saving} onPress={save} full />
        </>
      )}
    </Screen>
  );
}
