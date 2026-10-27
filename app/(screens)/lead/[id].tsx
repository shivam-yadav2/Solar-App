import React, { useState } from 'react';
import { Alert, Platform, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ellipsis, FileText, MessageSquarePlus, Pencil, Trash2, UserPlus } from 'lucide-react-native';
import { api } from '../../../src/lib/api';
import { ops } from '../../../src/lib/apis/ops';
import { useApi } from '../../../src/lib/query';
import { useAuth } from '../../../src/context/AuthContext';
import { useCanOpen } from '../../../src/lib/access';
import { formatDate, formatINR, formatPhone, timeAgo } from '../../../src/lib/formatters';
import { INTERACTIONS, LEAD_STAGES } from '../../../src/lib/constants';
import {
  Avatar, Badge, Button, Card, DateField, ErrorState, FormSection, GUTTER, IconButton, InfoRow, ListSkeleton, Screen, Section, SelectField, Sheet, space, T, Tap, TextField,
  useOverlay, useTheme, haptic, radius, statusTone, toneColors,
} from '../../../src/ds';
import { ContactBar } from '../../../src/components/kit';
import { Timeline } from '../../../src/components/timeline';
import type { InteractionType, Lead, LeadStatus } from '../../../src/types';

export default function LeadDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const p = useTheme();
  const { hasPermission: can } = useAuth();
  const canOpen = useCanOpen();
  const { actions, toast } = useOverlay();
  const q = useApi(['leads', 'detail', id], () => api.getLead(id!), { enabled: !!id });
  const [follow, setFollow] = useState(false);
  const [converting, setConverting] = useState(false);
  const x: Lead | undefined = q.data?.lead;
  const ups = [...(q.data?.followUps || [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const nextDue = ups.find((u) => u.nextFollowUpDate)?.nextFollowUpDate;
  const manage = can('leads.manage');

  const setStatus = async (status: LeadStatus) => {
    if (!x || status === x.status) return;
    try { await api.updateLead(x.id, { status }); haptic.success(); toast(`Moved to ${status}`); void q.refresh(); } catch (e: any) { toast(e.message, 'error'); }
  };
  const convert = async () => {
    if (!x) return;
    setConverting(true);
    try {
      const r = await ops.convertLeadCustomer(x);
      await api.updateLead(x.id, { status: 'Won', notes: [x.notes, `Converted to customer ${r.customer.customId}`].filter(Boolean).join('\n') });
      haptic.success();
      toast('Customer created');
      router.replace({ pathname: '/customer/[id]', params: { id: r.customer.id } });
    } catch (e: any) { toast(e.message, 'error'); } finally { setConverting(false); }
  };
  const del = () => {
    const run = async () => { try { await api.deleteLead(id!); toast('Lead moved to recycle bin'); router.back(); } catch (e: any) { toast(e.message, 'error'); } };
    if (Platform.OS === 'web') return void run();
    Alert.alert('Delete lead?', 'It moves to the recycle bin for 30 days.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => void run() }]);
  };
  const menu = () => actions({
    title: x?.prospectName,
    items: [
      manage && { label: 'Edit lead', icon: <Pencil size={20} color={p.accentText} />, onPress: () => router.push({ pathname: '/lead-form', params: { id } }) },
      canOpen('quotations') && can('quotations.manage') && { label: 'New quotation', icon: <FileText size={20} color={p.accentText} />, onPress: () => router.push({ pathname: '/quotation-form', params: { leadId: id } }) },
      manage && can('customers.create') && x?.status !== 'Won' && { label: 'Convert to customer', icon: <UserPlus size={20} color={p.accentText} />, onPress: () => void convert() },
      manage && { label: 'Delete lead', destructive: true, icon: <Trash2 size={20} color={p.red} />, onPress: del },
    ].filter(Boolean) as any,
  });

  return (
    <Screen title={x?.prospectName || 'Lead'} large={false} back right={x && manage ? <IconButton icon={<Ellipsis size={18} color={p.label} />} label="More actions" onPress={menu} /> : undefined} refreshing={q.refreshing} onRefresh={q.refresh}
      footer={x && manage ? <><Button title="Log follow-up" kind="tinted" icon={<MessageSquarePlus size={18} color={p.accentText} />} onPress={() => setFollow(true)} style={{ flex: 1 }} />{can('customers.create') && x.status !== 'Won' ? <Button title="Convert" loading={converting} onPress={convert} style={{ flex: 1 }} /> : null}</> : undefined}>
      {q.error ? <ErrorState message={q.error} onRetry={q.refresh} /> : q.loading || !x ? <ListSkeleton rows={4} avatar={false} /> : (
        <>
          <View style={{ alignItems: 'center', gap: 6, paddingTop: space.s }}>
            <Avatar name={x.prospectName} size={76} />
            <T variant="title2" align="center">{x.prospectName}</T>
            <View style={{ flexDirection: 'row', gap: 8 }}><T variant="subhead" color="secondary">{x.customId} · {x.leadSource}</T><Badge text={x.status} /></View>
            {nextDue ? <T variant="footnote" color={nextDue.slice(0, 10) <= new Date().toISOString().slice(0, 10) ? 'red' : 'secondary'}>Next follow-up {formatDate(nextDue)}</T> : null}
          </View>
          <ContactBar phone={x.phone} email={x.email} address={[x.address, x.city, x.state].filter(Boolean).join(', ')} whatsappText={`Hello ${x.prospectName},`} />

          {manage ? (
            <View>
              <T variant="footnote" color="secondary" style={{ paddingHorizontal: space.l, marginBottom: 6, textTransform: 'uppercase' }}>Stage</T>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.s, paddingHorizontal: 2 }}>
                {LEAD_STAGES.map((s) => {
                  const on = s === x.status;
                  const c = toneColors(p, statusTone(s));
                  return (
                    <Tap key={s} onPress={() => void setStatus(s as LeadStatus)} scaleTo={0.94} style={{ paddingHorizontal: 14, height: 34, borderRadius: radius.pill, justifyContent: 'center', backgroundColor: on ? c.fg : p.surface }}>
                      <T variant="subhead" weight={on ? '600' : '400'} style={{ color: on ? '#fff' : p.label }}>{s}</T>
                    </Tap>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}

          <Section header="Requirement">
            <InfoRow label="Monthly bill" value={x.monthlyElectricityBill ? formatINR(x.monthlyElectricityBill) : undefined} />
            <InfoRow label="Sanctioned load" value={x.sanctionedLoadKw ? `${x.sanctionedLoadKw} kW` : undefined} />
            <InfoRow label="Proposed system" value={x.proposedCapacityKw ? `${x.proposedCapacityKw} kW` : undefined} />
            {x.status === 'Lost' && x.lostReason ? <InfoRow label="Lost because" value={x.lostReason} multiline /> : null}
          </Section>

          <Card style={{ gap: space.m }}>
            <T variant="headline">Follow-ups · {ups.length}</T>
            {ups.length ? (
              <Timeline steps={ups.map((u, i) => ({ title: `${u.interactionType} · ${timeAgo(u.createdAt)}`, subtitle: `${u.summary}${u.nextFollowUpDate ? `\nNext: ${formatDate(u.nextFollowUpDate)}` : ''}`, state: i === 0 ? 'current' : 'done' }))} />
            ) : <T variant="subhead" color="secondary">No follow-ups yet. Log every call and visit so the team knows where this stands.</T>}
          </Card>

          <Section header="Contact">
            <InfoRow label="Phone" value={formatPhone(x.phone)} />
            <InfoRow label="Email" value={x.email} />
            <InfoRow label="Address" value={[x.address, x.city, x.state, x.pincode].filter(Boolean).join(', ')} multiline />
            <InfoRow label="Added" value={formatDate(x.createdAt)} />
            {x.notes ? <InfoRow label="Notes" value={x.notes} multiline /> : null}
          </Section>
        </>
      )}
      {x ? <FollowUpSheet visible={follow} leadId={x.id} onClose={() => setFollow(false)} onSaved={() => { setFollow(false); void q.refresh(); }} /> : null}
    </Screen>
  );
}

function FollowUpSheet({ visible, leadId, onClose, onSaved }: { visible: boolean; leadId: string; onClose: () => void; onSaved: () => void }) {
  const { toast } = useOverlay();
  const [type, setType] = useState<InteractionType>('Call');
  const [summary, setSummary] = useState(''); const [next, setNext] = useState('');
  const [busy, setBusy] = useState(false);
  React.useEffect(() => { if (visible) { setType('Call'); setSummary(''); setNext(''); } }, [visible]);
  const save = async () => {
    if (!summary.trim()) { toast('Write what was discussed', 'error'); return; }
    setBusy(true);
    try { await api.createLeadFollowUp(leadId, { interactionType: type, summary: summary.trim(), nextFollowUpDate: next || undefined }); haptic.success(); toast('Follow-up saved'); onSaved(); } catch (e: any) { toast(e.message, 'error'); } finally { setBusy(false); }
  };
  return (
    <Sheet visible={visible} onClose={onClose} title="Log follow-up" footer={<Button title="Save" loading={busy} onPress={save} style={{ flex: 1 }} />}>
      <View style={{ paddingHorizontal: GUTTER, gap: space.m }}>
        <FormSection>
          <SelectField label="How" value={type} options={INTERACTIONS.map((i) => ({ value: i, label: i }))} onChange={(o) => o && setType(o.value as InteractionType)} />
          <TextField label="What happened" value={summary} onChange={setSummary} multiline autoFocus placeholder="e.g. Wants 5 kW, asked for EMI options" />
          <DateField label="Next follow-up" value={next} onChange={setNext} minimumDate={new Date()} placeholder="Optional" />
        </FormSection>
      </View>
    </Sheet>
  );
}

