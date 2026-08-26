import React, { useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../../src/lib/api';
import { useAuth } from '../../../src/context/AuthContext';
import { useFetch } from '../../../src/hooks/useFetch';
import { formatDateTime } from '../../../src/lib/formatters';
import { Badge, Card, DetailRow, ErrorState, Loading, PrimaryButton, Screen } from '../../../src/components/ui';

const STATUSES = ['Acknowledged', 'Assigned', 'In Progress', 'Waiting for Customer', 'Resolved', 'Closed'] as const;

export default function TicketDetailScreen() {
  const router = useRouter(); const { id } = useLocalSearchParams<{ id: string }>(); const { user } = useAuth(); const state = useFetch(() => api.getComplaint(String(id)), [id]); const [message, setMessage] = useState(''); const [saving, setSaving] = useState(false); const data = state.data; const item = data?.complaint;
  const addComment = async () => { if (!message.trim()) return; setSaving(true); try { await api.addComplaintComment(String(id), message.trim()); setMessage(''); await state.reload(); } catch (error: any) { Alert.alert('Could not add comment', error.message); } finally { setSaving(false); } };
  const changeStatus = (status: string) => Alert.alert('Update ticket', `Change status to “${status}”?`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Update', onPress: async () => { try { await api.updateComplaintStatus(String(id), { status }); await state.reload(); } catch (error: any) { Alert.alert('Update failed', error.message); } } }]);
  return <Screen title={item?.subject || 'Service Ticket'} subtitle={item?.customId} onBack={() => router.back()} refreshing={state.isRefreshing} onRefresh={state.refresh}>
    {state.isLoading ? <Loading /> : state.error ? <ErrorState message={state.error} onRetry={state.reload} /> : item ? <>
      <View className="flex-row gap-2 mb-3"><Badge text={item.status} tone={/resolved|closed/i.test(item.status) ? 'green' : 'amber'} /><Badge text={item.priority} tone={/high|critical/i.test(item.priority) ? 'rose' : 'slate'} /></View>
      <Card><Text className="text-sm text-slate-700 leading-5">{item.description}</Text><View className="mt-3"><DetailRow label="Type" value={item.complaintType} /><DetailRow label="Customer" value={data.customer?.name} /><DetailRow label="Project" value={data.project?.projectName} /><DetailRow label="Assigned to" value={item.assignedStaff} /><DetailRow label="Created" value={formatDateTime(item.createdAt)} /></View></Card>
      {user?.role !== 'CUSTOMER' ? <Card><Text className="text-xs font-semibold text-slate-400 mb-3">UPDATE STATUS</Text><View className="flex-row flex-wrap gap-2">{STATUSES.map(status => <Pressable key={status} onPress={() => changeStatus(status)} className="bg-slate-100 rounded-lg px-3 py-2"><Text className="text-xs font-semibold text-slate-700">{status}</Text></Pressable>)}</View></Card> : null}
      <Text className="text-xs font-bold text-slate-500 mb-2 px-1">CONVERSATION</Text>{(data.comments ?? []).map((comment: any) => <Card key={comment.id}><View className="flex-row justify-between"><Text className="text-xs font-bold text-slate-800">{comment.senderName}</Text>{comment.isInternalNote ? <Badge text="Internal" tone="amber" /> : null}</View><Text className="text-sm text-slate-700 mt-2">{comment.message}</Text><Text className="text-[10px] text-slate-400 mt-2">{formatDateTime(comment.createdAt)}</Text></Card>)}
      <Card><TextInput value={message} onChangeText={setMessage} placeholder="Add a comment…" placeholderTextColor="#94a3b8" multiline className="min-h-20 text-base text-slate-900 bg-slate-50 rounded-xl px-3 py-3 mb-3" /><PrimaryButton label={saving ? 'Sending…' : 'Send Comment'} onPress={() => void addComment()} disabled={saving || !message.trim()} /></Card>
    </> : null}
  </Screen>;
}
