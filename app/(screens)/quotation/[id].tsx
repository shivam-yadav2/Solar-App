import React from 'react';
import { Alert, Platform, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Copy, Ellipsis, Pencil, Target, Trash2, UserRound, Zap, Check } from 'lucide-react-native';
import { api } from '../../../src/lib/api';
import { ops } from '../../../src/lib/apis/ops';
import { useApi } from '../../../src/lib/query';
import { useAuth } from '../../../src/context/AuthContext';
import { quotationHtml } from '../../../src/lib/docs';
import { formatDate, formatINR } from '../../../src/lib/formatters';
import { ErrorState, Hero, IconButton, IconTile, InfoRow, ListSkeleton, Row, Screen, Section, space, statusTone, T, Tap, toneColors, useOverlay, useTheme, radius, Badge } from '../../../src/ds';
import { DocumentActions } from '../../../src/components/DocumentActions';
import type { QuotationStatus } from '../../../src/types';

const STATUSES: QuotationStatus[] = ['Draft', 'Sent', 'Viewed', 'Accepted', 'Rejected', 'Expired'];

export default function QuotationDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const p = useTheme();
  const { tenant, hasPermission: can } = useAuth();
  const { actions, toast } = useOverlay();
  const q = useApi(['quotations', 'detail', id], () => ops.quotation(id!), { enabled: !!id });
  const settings = useQuery({ queryKey: ['quotations', 'settings'], queryFn: ops.quotationSettings, staleTime: 10 * 60_000 });
  const x = q.data?.quotation;
  const manage = can('quotations.manage');

  const setStatus = async (s: QuotationStatus) => { if (!x || s === x.status) return; try { await api.updateQuotationStatus(x.id, s); toast(`Marked ${s}`); void q.refresh(); } catch (e: any) { toast(e.message, 'error'); } };
  const duplicate = async () => {
    if (!x) return;
    try {
      const { id: _i, customId: _c, quotationNumber: _n, createdAt: _a, updatedAt: _u, status: _s, ...rest } = x as any;
      const r = await api.createQuotation({ ...rest, status: 'Draft', quotationDate: new Date().toISOString().slice(0, 10) });
      toast(`Copied as ${r.quotation.quotationNumber}`);
      router.replace({ pathname: '/quotation/[id]', params: { id: r.quotation.id } });
    } catch (e: any) { toast(e.message, 'error'); }
  };
  const del = () => {
    const run = async () => { try { await api.deleteQuotation(id!); toast('Quotation moved to recycle bin'); router.back(); } catch (e: any) { toast(e.message, 'error'); } };
    if (Platform.OS === 'web') return void run();
    Alert.alert('Delete quotation?', undefined, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => void run() }]);
  };
  const menu = () => actions({ title: x?.quotationNumber, items: [
    { label: 'Edit', icon: <Pencil size={20} color={p.accentText} />, onPress: () => router.push({ pathname: '/quotation-form', params: { id } }) },
    { label: 'Duplicate', icon: <Copy size={20} color={p.accentText} />, onPress: () => void duplicate() },
    { label: 'Delete', destructive: true, icon: <Trash2 size={20} color={p.red} />, onPress: del },
  ] });

  return (
    <Screen title={x?.quotationNumber || 'Quotation'} large={false} back right={x && manage ? <IconButton icon={<Ellipsis size={18} color={p.label} />} label="More actions" onPress={menu} /> : undefined} refreshing={q.refreshing} onRefresh={q.refresh}>
      {q.error ? <ErrorState message={q.error} onRetry={q.refresh} /> : q.loading || !x ? <ListSkeleton rows={4} avatar={false} /> : (
        <>
          <Hero label={`${x.title} · ${formatDate(x.quotationDate || x.createdAt)}`} value={formatINR(x.totalAmount)} caption={`${x.systemCapacityKw} kW · valid until ${formatDate(x.validUntil)}`} />
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: -space.m }}><Badge text={x.status} size="m" /></View>

          {settings.data ? <DocumentActions kind="quotation" id={x.id} data={x} fileName={`Quotation ${x.quotationNumber} - ${x.recipientName || ''}`.trim()} html={() => quotationHtml(x, tenant, settings.data!.settings)} /> : null}

          {manage ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.s }}>
              {STATUSES.map((s) => {
                const on = s === x.status; const c = toneColors(p, statusTone(s));
                return <Tap key={s} onPress={() => void setStatus(s)} scaleTo={0.94} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, height: 34, borderRadius: radius.pill, backgroundColor: on ? c.fg : p.surface }}>{on ? <Check size={14} color="#fff" strokeWidth={3} /> : null}<T variant="subhead" weight={on ? '600' : '400'} style={{ color: on ? '#fff' : p.label }}>{s}</T></Tap>;
              })}
            </ScrollView>
          ) : null}

          <Section header="For">
            <Row icon={<IconTile icon={<UserRound size={17} color={p.blue} />} tone="blue" />} title={x.recipientName || '—'} subtitle={[x.recipientPhone, x.recipientAddress].filter(Boolean).join(' · ')} numberOfLines={2} />
            {x.leadId ? <Row icon={<IconTile icon={<Target size={17} color={p.purple} />} tone="purple" />} title="Open lead" action onPress={() => router.push({ pathname: '/lead/[id]', params: { id: x.leadId! } })} /> : null}
            {x.customerId ? <Row icon={<IconTile icon={<UserRound size={17} color={p.teal} />} tone="teal" />} title="Open customer" action onPress={() => router.push({ pathname: '/customer/[id]', params: { id: x.customerId! } })} /> : null}
            {x.projectId ? <Row icon={<IconTile icon={<Zap size={17} color={p.orange} />} tone="orange" />} title="Open project" action onPress={() => router.push({ pathname: '/project/[id]', params: { id: x.projectId! } })} /> : null}
          </Section>

          {x.components?.length ? (
            <Section header="Components">
              {x.components.map((c, i) => <InfoRow key={`${c.category}${i}`} label={c.category} value={[c.brand, c.spec].filter(Boolean).join(' · ')} />)}
            </Section>
          ) : null}
          {x.features?.length ? (
            <Section header="Included">
              {x.features.map((f) => <Row key={f} icon={<Check size={16} color={p.green} strokeWidth={3} />} title={f} numberOfLines={3} />)}
            </Section>
          ) : null}
          {x.paymentTerms || x.termsConditions ? (
            <Section header="Terms">
              {x.paymentTerms ? <InfoRow label="Payment" value={x.paymentTerms} multiline /> : null}
              {x.termsConditions ? <InfoRow label="Conditions" value={x.termsConditions} multiline /> : null}
            </Section>
          ) : null}
          <T variant="footnote" color="secondary" align="center">Prepared by {x.preparedByName || '—'}{x.preparedByPhone ? ` · ${x.preparedByPhone}` : ''}</T>
        </>
      )}
    </Screen>
  );
}
