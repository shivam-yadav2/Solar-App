import React, { useState } from 'react';
import { Image, Linking, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowUp, Lock, UserRound, Zap, Paperclip } from 'lucide-react-native';
import { api } from '../../../src/lib/api';
import { ops } from '../../../src/lib/apis/ops';
import { useApi } from '../../../src/lib/query';
import { useAuth } from '../../../src/context/AuthContext';
import { formatDateTime } from '../../../src/lib/formatters';
import {
  Badge, Button, ErrorState, FormSection, GUTTER, IconTile, ListSkeleton, Row, Screen, Section, SelectField, Sheet, space, T, Tap, TextField, useOverlay, useTheme, radius, type, haptic,
} from '../../../src/ds';
import type { ComplaintStatus } from '../../../src/types';

const STATUSES: ComplaintStatus[] = ['Submitted', 'Acknowledged', 'Assigned', 'In Progress', 'Technician Visit Scheduled', 'Waiting for Customer', 'Resolved', 'Closed', 'Reopened'];

function Attachment({ a }: { a: any }) {
  const p = useTheme();
  const url = useQuery({ queryKey: ['file-url', a.fileId], queryFn: () => api.getFileUrl(a.fileId), staleTime: 30 * 60_000 });
  const img = /^image\//.test(a.mimeType || '') || /\.(jpe?g|png|webp)$/i.test(a.fileName || '');
  return (
    <Tap onPress={() => url.data && Linking.openURL(url.data)} style={{ marginTop: 6 }}>
      {img && url.data ? <Image source={{ uri: url.data }} style={{ width: 160, height: 120, borderRadius: radius.s }} /> : <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}><Paperclip size={14} color={p.secondary} /><T variant="footnote" color="accent">{a.fileName}</T></View>}
    </Tap>
  );
}

export default function TicketDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const p = useTheme();
  const insets = useSafeAreaInsets();
  const { user, hasPermission: can } = useAuth();
  const { toast } = useOverlay();
  const q = useApi(['complaints', 'detail', id], () => api.getComplaint(id!), { enabled: !!id });
  const [msg, setMsg] = useState('');
  const [internal, setInternal] = useState(false);
  const [sending, setSending] = useState(false);
  const [edit, setEdit] = useState(false);
  const isCustomer = user?.role === 'CUSTOMER';
  const manage = can('complaints.manage');
  const c = q.data?.complaint;
  const feed = [
    ...(q.data?.comments || []).map((m: any) => ({ kind: 'msg' as const, at: m.createdAt, m })),
    ...(q.data?.timeline || []).map((t: any) => ({ kind: 'event' as const, at: t.timestamp, t })),
  ].sort((a, b) => String(a.at).localeCompare(String(b.at)));

  const send = async () => {
    if (!msg.trim()) return;
    setSending(true);
    try { await api.addComplaintComment(id!, { message: msg.trim(), isInternalNote: internal }); setMsg(''); haptic.light(); void q.refresh(); } catch (e: any) { toast(e.message, 'error'); } finally { setSending(false); }
  };
  const canWrite = isCustomer || manage;

  return (
    <View style={{ flex: 1 }}>
      <Screen title={c?.customId || 'Ticket'} large={false} back right={c && manage ? <Button title="Update" size="s" kind="tinted" onPress={() => setEdit(true)} /> : undefined} refreshing={q.refreshing} onRefresh={q.refresh}>
        {q.error ? <ErrorState message={q.error} onRetry={q.refresh} /> : q.loading || !c ? <ListSkeleton rows={4} avatar={false} /> : (
          <>
            <View style={{ gap: 6 }}>
              <T variant="title2">{c.subject}</T>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                <Badge text={c.status} size="m" /><Badge text={c.priority} tone={c.priority === 'High' || c.priority === 'Critical' ? 'red' : 'gray'} size="m" /><Badge text={c.complaintType} tone="gray" size="m" />
              </View>
              {c.assignedStaff ? <T variant="footnote" color="secondary">Assigned to {c.assignedStaff}</T> : null}
            </View>
            {!isCustomer ? (
              <Section>
                {q.data?.customer ? <Row icon={<IconTile icon={<UserRound size={17} color={p.blue} />} tone="blue" />} title={q.data.customer.name} subtitle={q.data.customer.mobile} onPress={() => router.push({ pathname: '/customer/[id]', params: { id: q.data.customer.id } })} /> : null}
                {q.data?.project ? <Row icon={<IconTile icon={<Zap size={17} color={p.orange} />} tone="orange" />} title={q.data.project.projectName} subtitle={`${q.data.project.capacityKw} kW${c.relatedItem ? ` · ${c.relatedItem}` : ''}`} onPress={() => router.push({ pathname: '/project/[id]', params: { id: q.data.project.id } })} /> : null}
              </Section>
            ) : null}
            <View style={{ backgroundColor: p.surface, borderRadius: radius.l, padding: space.l }}>
              <T variant="body">{c.description}</T>
              {(c.attachments || []).map((a: any) => <Attachment key={a.fileId || a.id} a={a} />)}
              <T variant="caption" color="secondary" style={{ marginTop: 6 }}>{formatDateTime(c.createdAt)}</T>
            </View>
            {c.resolution ? <View style={{ backgroundColor: p.greenSoft, borderRadius: radius.l, padding: space.l, gap: 2 }}><T variant="headline" color="green">Resolution</T><T variant="body">{c.resolution}</T></View> : null}

            <View style={{ gap: space.s, paddingBottom: 90 }}>
              {feed.map((f, i) => f.kind === 'event' ? (
                <T key={`e${i}`} variant="caption" color="secondary" align="center" style={{ paddingHorizontal: space.xl }}>{f.t.title} · {formatDateTime(f.at)}</T>
              ) : (() => {
                const mine = f.m.senderId === user?.id;
                const staffSide = f.m.senderRole !== 'CUSTOMER';
                const right = isCustomer ? !staffSide : staffSide;
                return (
                  <View key={f.m.id} style={{ alignItems: right ? 'flex-end' : 'flex-start' }}>
                    <View style={{ maxWidth: '82%', backgroundColor: f.m.isInternalNote ? p.orangeSoft : right ? p.accent : p.surface, borderRadius: 18, borderBottomRightRadius: right ? 6 : 18, borderBottomLeftRadius: right ? 18 : 6, paddingHorizontal: 14, paddingVertical: 9 }}>
                      {!mine ? <T variant="caption" weight="600" style={{ color: right && !f.m.isInternalNote ? p.onAccent : p.secondary }}>{f.m.senderName}{f.m.isInternalNote ? ' · internal' : ''}</T> : f.m.isInternalNote ? <T variant="caption" weight="600" color="orange">Internal note</T> : null}
                      <T variant="body" style={{ color: right && !f.m.isInternalNote ? p.onAccent : p.label }}>{f.m.message}</T>
                      {(f.m.attachments || []).map((a: any) => <Attachment key={a.fileId} a={a} />)}
                    </View>
                    <T variant="caption2" color="secondary" style={{ marginTop: 2, marginHorizontal: 6 }}>{formatDateTime(f.at)}</T>
                  </View>
                );
              })())}
            </View>
          </>
        )}
      </Screen>
      {c && canWrite && c.status !== 'Closed' ? (
        <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }} style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
          <View style={{ backgroundColor: p.dark ? '#121214' : '#F8F8FA', borderTopWidth: 0.5, borderTopColor: p.separator, paddingHorizontal: GUTTER, paddingTop: 8, paddingBottom: insets.bottom + 8, gap: 6 }}>
            {manage ? (
              <Tap onPress={() => setInternal((v) => !v)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' }}>
                <Lock size={13} color={internal ? p.orange : p.tertiary} /><T variant="caption" style={{ color: internal ? p.orange : p.secondary }}>{internal ? 'Internal note — the customer won’t see it' : 'Reply to customer · tap for internal note'}</T>
              </Tap>
            ) : null}
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
              <TextInput value={msg} onChangeText={setMsg} placeholder={isCustomer ? 'Message the service team' : 'Message'} placeholderTextColor={p.tertiary} multiline
                style={[type.body, { flex: 1, maxHeight: 120, color: p.label, backgroundColor: p.surface, borderRadius: 20, borderWidth: 0.5, borderColor: p.separator, paddingHorizontal: 14, paddingTop: 9, paddingBottom: 9 }]} />
              <Tap onPress={send} scaleTo={0.9} disabled={sending || !msg.trim()} accessibilityLabel="Send"
                style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: msg.trim() ? (internal ? p.orange : p.accent) : p.fillStrong, alignItems: 'center', justifyContent: 'center', marginBottom: 2 }}>
                <ArrowUp size={20} color={msg.trim() ? '#fff' : p.secondary} strokeWidth={2.8} />
              </Tap>
            </View>
          </View>
        </KeyboardStickyView>
      ) : null}
      {c ? <UpdateSheet visible={edit} complaint={c} onClose={() => setEdit(false)} onSaved={() => { setEdit(false); void q.refresh(); }} /> : null}
    </View>
  );
}

function UpdateSheet({ visible, complaint, onClose, onSaved }: { visible: boolean; complaint: any; onClose: () => void; onSaved: () => void }) {
  const { toast } = useOverlay();
  const staff = useQuery({ queryKey: ['users', 'staff'], queryFn: api.getStaffUsers, enabled: visible, staleTime: 5 * 60_000 });
  const [status, setStatus] = useState<ComplaintStatus>(complaint.status);
  const [assigned, setAssigned] = useState(complaint.assignedStaff || '');
  const [resolution, setResolution] = useState(complaint.resolution || '');
  const [remark, setRemark] = useState('');
  const [busy, setBusy] = useState(false);
  React.useEffect(() => { if (visible) { setStatus(complaint.status); setAssigned(complaint.assignedStaff || ''); setResolution(complaint.resolution || ''); setRemark(''); } }, [visible, complaint]);
  const save = async () => {
    if ((status === 'Resolved' || status === 'Closed') && !resolution.trim()) { toast('Write how it was fixed', 'error'); return; }
    setBusy(true);
    try {
      await ops.updateComplaint(complaint.id, { status, assignedStaff: assigned, resolution, remark: remark || undefined } as any);
      haptic.success(); toast('Ticket updated'); onSaved();
    } catch (e: any) { toast(e.message, 'error'); } finally { setBusy(false); }
  };
  const people = (staff.data?.users || []).filter((u: any) => u.isActive !== false).map((u: any) => ({ value: u.username || u.email, label: u.username || u.email, subtitle: u.roleName }));
  return (
    <Sheet visible={visible} onClose={onClose} title="Update ticket" footer={<Button title="Save" loading={busy} onPress={save} style={{ flex: 1 }} />}>
      <View style={{ paddingHorizontal: GUTTER }}>
        <FormSection>
          <SelectField label="Status" value={status} options={STATUSES.map((s) => ({ value: s, label: s }))} onChange={(o) => o && setStatus(o.value as ComplaintStatus)} />
          <SelectField label="Technician" value={assigned} display={assigned} options={people} allowClear onChange={(o) => setAssigned(o?.value || '')} placeholder="Not assigned" />
          {status === 'Resolved' || status === 'Closed' ? <TextField label="How it was fixed" value={resolution} onChange={setResolution} multiline /> : null}
          <TextField label="Note for the timeline" value={remark} onChange={setRemark} placeholder="Optional" />
        </FormSection>
      </View>
    </Sheet>
  );
}
