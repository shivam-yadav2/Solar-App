import React, { useState } from 'react';
import { Alert, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LifeBuoy, MessageCirclePlus } from 'lucide-react-native';
import { account } from '../../src/lib/apis/account';
import { useFetch } from '../../src/hooks/useFetch';
import { formatDateTime } from '../../src/lib/formatters';
import type { SupportTicket } from '../../src/types';
import { Attached, AttachField } from '../../src/components/AttachField';
import { Badge, Button, ChoiceField, EmptyState, ErrorState, FormSection, GroupedItem, IconButton, IconTile, ListScreen, ListSkeleton, Row, SelectField, Sheet, T, TextField, useTheme } from '../../src/ds';

export default function SupportScreen() {
  const router = useRouter();
  const p = useTheme();
  const state = useFetch(account.supportTickets);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ subject: '', category: 'Question', priority: 'normal' as SupportTicket['priority'], message: '' });
  const [attachment, setAttachment] = useState<Attached | null>(null);
  const [saving, setSaving] = useState(false);
  const categories = state.data?.categories?.length ? state.data.categories : ['Question', 'Billing', 'Technical issue', 'Feature request'];
  const items = state.data?.tickets || [];
  const create = async () => {
    if (!form.subject.trim() || !form.message.trim()) { Alert.alert('Missing details', 'Subject and message are required.'); return; }
    setSaving(true);
    try {
      const result = await account.createSupportTicket({ ...form, attachmentIds: attachment ? [attachment.fileId] : [] });
      setOpen(false); setAttachment(null); setForm({ subject: '', category: categories[0], priority: 'normal', message: '' });
      await state.reload(); router.push({ pathname: '/support/[id]', params: { id: result.ticket.id } });
    } catch (e: any) { Alert.alert('Could not create ticket', e.message); } finally { setSaving(false); }
  };
  return <>
    <ListScreen<SupportTicket> title="SolarOS support" subtitle="Questions, billing and technical help from our team" back right={<IconButton tinted label="New support ticket" icon={<MessageCirclePlus size={18} color={p.accentText} />} onPress={() => setOpen(true)} />}
      header={state.isLoading ? <ListSkeleton avatar={false} /> : state.error ? <ErrorState message={state.error} onRetry={state.reload} /> : undefined}
      data={state.isLoading || state.error ? [] : items} keyExtractor={(x) => x.id} refreshing={state.isRefreshing} onRefresh={state.refresh}
      ListEmptyComponent={!state.isLoading && !state.error ? <EmptyState icon={<LifeBuoy size={44} color={p.tertiary} />} title="No support tickets" message="Raise a ticket and keep the entire conversation in one place." action={{ title: 'New ticket', onPress: () => setOpen(true) }} /> : null}
      renderItem={({ item, index }) => <GroupedItem index={index} count={items.length} inset={58}><Row icon={<IconTile tone={item.priority === 'urgent' || item.priority === 'high' ? 'red' : 'blue'} icon={<LifeBuoy size={17} color={item.priority === 'urgent' || item.priority === 'high' ? p.red : p.blue} />} />} title={item.subject} subtitle={`${item.number} · ${item.category} · ${formatDateTime(item.lastReplyAt)}`} accessory={<View style={{ alignItems: 'flex-end', gap: 3 }}><Badge text={item.status.replaceAll('_', ' ')} /><T variant="caption" color="secondary">{item.messageCount || 0} messages</T></View>} onPress={() => router.push({ pathname: '/support/[id]', params: { id: item.id } })} /></GroupedItem>}
    />
    <Sheet visible={open} onClose={() => setOpen(false)} title="New support ticket" full footer={<Button title="Send to SolarOS" full loading={saving} onPress={() => void create()} style={{ flex: 1 }} />}>
      <View style={{ padding: 16, gap: 16 }}><FormSection header="Request"><TextField label="Subject" value={form.subject} onChange={(subject) => setForm({ ...form, subject })} required /><SelectField label="Type" value={form.category} options={categories.map((x) => ({ value: x, label: x }))} onChange={(x) => x && setForm({ ...form, category: x.value })} /><ChoiceField label="Priority" value={form.priority} onChange={(priority) => setForm({ ...form, priority })} options={[{ value: 'low', label: 'Low' }, { value: 'normal', label: 'Normal' }, { value: 'high', label: 'High' }, { value: 'urgent', label: 'Urgent' }]} /><TextField label="Message" value={form.message} onChange={(message) => setForm({ ...form, message })} multiline required /></FormSection><FormSection header="Attachment"><AttachField label="Screenshot or document" value={attachment} onChange={setAttachment} /></FormSection></View>
    </Sheet>
  </>;
}
