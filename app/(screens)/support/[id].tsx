import React, { useState } from 'react';
import { Alert, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { CheckCircle2, MessageCircle } from 'lucide-react-native';
import { account } from '../../../src/lib/apis/account';
import { useFetch } from '../../../src/hooks/useFetch';
import { formatDateTime } from '../../../src/lib/formatters';
import { Attached, AttachField } from '../../../src/components/AttachField';
import { Badge, Button, Card, ErrorState, FormSection, InfoRow, Screen, Spinner, T, TextField, useTheme } from '../../../src/ds';

export default function SupportTicketScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const p = useTheme();
  const state = useFetch(() => account.supportTicket(String(id)), [id]);
  const [body, setBody] = useState('');
  const [attachment, setAttachment] = useState<Attached | null>(null);
  const [busy, setBusy] = useState(false);
  const ticket = state.data?.ticket;
  const send = async () => {
    if (!body.trim()) { Alert.alert('Write a reply first'); return; }
    setBusy(true); try { await account.replySupportTicket(String(id), body.trim(), attachment ? [attachment.fileId] : []); setBody(''); setAttachment(null); await state.reload(); } catch (e: any) { Alert.alert('Could not send reply', e.message); } finally { setBusy(false); }
  };
  const setStatus = async (status: 'open' | 'resolved') => { setBusy(true); try { await account.setSupportTicketStatus(String(id), status); await state.reload(); } catch (e: any) { Alert.alert('Could not update ticket', e.message); } finally { setBusy(false); } };
  return <Screen title={ticket?.number || 'Support ticket'} subtitle={ticket?.subject} back large={false} refreshing={state.isRefreshing} onRefresh={state.refresh}>
    {state.isLoading ? <Spinner /> : state.error ? <ErrorState message={state.error} onRetry={state.reload} /> : ticket ? <>
      <Card style={{ gap: 12 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><MessageCircle size={22} color={p.blue} /><View style={{ flex: 1 }}><T variant="title3">{ticket.subject}</T><T variant="footnote" color="secondary">Opened {formatDateTime(ticket.createdAt)}</T></View><Badge text={ticket.status.replaceAll('_', ' ')} /></View><InfoRow label="Category" value={ticket.category} /><InfoRow label="Priority" value={ticket.priority} /><InfoRow label="Assigned to" value={ticket.assignedToName || 'SolarOS support queue'} /></Card>
      <View style={{ gap: 12 }}><T variant="footnote" color="secondary" style={{ textTransform: 'uppercase', paddingHorizontal: 16 }}>Conversation</T>{(state.data?.messages || []).map((message) => <View key={message.id} style={{ alignSelf: message.side === 'company' ? 'flex-end' : 'flex-start', maxWidth: '88%', backgroundColor: message.side === 'company' ? p.accent : p.surface, borderRadius: 16, padding: 13, gap: 6 }}><T variant="body" style={{ color: message.side === 'company' ? p.onAccent : p.label }}>{message.body}</T><T variant="caption2" style={{ color: message.side === 'company' ? p.onAccent : p.secondary }}>{message.authorName} · {formatDateTime(message.createdAt)}</T>{message.attachments?.map((a) => <T key={a.fileId} variant="caption" style={{ color: message.side === 'company' ? p.onAccent : p.blue }}>📎 {a.name}</T>)}</View>)}</View>
      {ticket.status !== 'closed' ? <FormSection header="Reply"><TextField label="Message" value={body} onChange={setBody} multiline placeholder="Add a clear update or question" /><AttachField label="Optional attachment" value={attachment} onChange={setAttachment} /><View style={{ padding: 12 }}><Button title="Send reply" full loading={busy} onPress={() => void send()} /></View></FormSection> : null}
      <Button title={ticket.status === 'resolved' ? 'Reopen ticket' : 'Mark resolved'} kind={ticket.status === 'resolved' ? 'gray' : 'tinted'} icon={<CheckCircle2 size={18} color={ticket.status === 'resolved' ? p.label : p.accentText} />} loading={busy} onPress={() => void setStatus(ticket.status === 'resolved' ? 'open' : 'resolved')} />
    </> : null}
  </Screen>;
}
