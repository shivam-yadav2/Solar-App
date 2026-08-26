import React from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../../src/lib/api';
import { useFetch } from '../../../src/hooks/useFetch';
import { formatDate, formatINR, formatPhone } from '../../../src/lib/formatters';
import { Badge, Card, DetailRow, EmptyState, ErrorState, HeaderButton, Loading, Screen, StatCard } from '../../../src/components/ui';
import { useAuth } from '../../../src/context/AuthContext';

export default function CustomerDetailScreen() {
  const router = useRouter(); const { id } = useLocalSearchParams<{ id: string }>(); const state = useFetch(() => api.getCustomer(String(id)), [id]); const data = state.data; const item = data?.customer;
  const { user, hasPermission } = useAuth();
  const received = (data?.payments ?? []).reduce((sum: number, value: any) => sum + Number(value.amount || 0), 0);
  const resetCredentials = async () => { try { const result = await api.resetCustomerPassword(item.id, 'solar123'); Alert.alert('Customer credentials reset', `Username: ${result.username}\nTemporary password: ${result.tempPassword}`); } catch (e: any) { Alert.alert('Could not reset credentials', e.message); } };
  const archive = () => Alert.alert('Archive customer?', 'The customer and portal access will be archived.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Archive', style: 'destructive', onPress: async () => { try { await api.archiveCustomer(item.id); router.back(); } catch (e: any) { Alert.alert('Could not archive customer', e.message); } } }]);
  return <Screen title={item?.name || 'Customer'} subtitle={item?.customId} onBack={() => router.back()} action={item && hasPermission('customers.edit') ? <HeaderButton label="Edit" onPress={() => router.push({ pathname: '/customer-form', params: { id: item.id } })} /> : undefined} refreshing={state.isRefreshing} onRefresh={state.refresh}>
    {state.isLoading ? <Loading /> : state.error ? <ErrorState message={state.error} onRetry={state.reload} /> : item ? <>
      <View className="flex-row gap-3"><View className="flex-1"><StatCard label="Projects" value={String(data.projects?.length ?? 0)} /></View><View className="flex-1"><StatCard label="Received" value={formatINR(received)} accent="text-emerald-700" /></View></View>
      <Card><View className="mb-2"><Badge text={item.status} tone={item.status === 'Active' ? 'green' : 'slate'} /></View><DetailRow label="Mobile" value={formatPhone(item.mobile)} /><DetailRow label="Email" value={item.email} /><DetailRow label="Address" value={[item.address, item.city, item.state, item.pincode].filter(Boolean).join(', ')} /><DetailRow label="Portal" value={item.accountStatus} /><DetailRow label="Created" value={formatDate(item.createdAt)} />{hasPermission('customers.edit') ? <Pressable onPress={() => void resetCredentials()} className="mt-3 bg-amber-50 border border-amber-200 rounded-xl py-3 items-center"><Text className="text-xs font-semibold text-amber-800">Reset Portal Credentials</Text></Pressable> : null}</Card>
      {hasPermission('customers.delete') && item.status !== 'Archived' ? <Pressable onPress={archive} className="rounded-xl border border-rose-200 bg-rose-50 py-3 items-center"><Text className="text-xs font-semibold text-rose-700">Archive Customer</Text></Pressable> : null}
      {item.notes ? <Card><Text className="text-xs font-semibold text-slate-400 mb-2">NOTES</Text><Text className="text-sm text-slate-700">{item.notes}</Text></Card> : null}
      <Card><DetailRow label="Warranties" value={String(data.warranties?.length ?? 0)} /><DetailRow label="Invoices" value={String(data.invoices?.length ?? 0)} /><DetailRow label="Tickets" value={String(data.complaints?.length ?? 0)} /><DetailRow label="Documents" value={String(data.documents?.length ?? 0)} /></Card>
      {!data.projects?.length ? <EmptyState message="This customer has no projects yet." /> : data.projects.map((project: any) => <Card key={project.id}><Text className="text-sm font-bold text-slate-900">{project.projectName}</Text><Text className="text-xs text-slate-500 mt-1">{project.customId} · {project.status}</Text><Text className="text-sm font-bold text-emerald-700 mt-2">{formatINR(project.finalDealAmount)}</Text></Card>)}
    </> : null}
  </Screen>;
}
