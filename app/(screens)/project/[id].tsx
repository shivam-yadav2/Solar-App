import React from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../../src/lib/api';
import { useFetch } from '../../../src/hooks/useFetch';
import { formatDate, formatINR, formatNumber } from '../../../src/lib/formatters';
import { Badge, Card, DetailRow, ErrorState, HeaderButton, Loading, Screen, StatCard } from '../../../src/components/ui';
import { useAuth } from '../../../src/context/AuthContext';

export default function ProjectDetailScreen() {
  const router = useRouter(); const { id } = useLocalSearchParams<{ id: string }>(); const state = useFetch(() => api.getProject(String(id)), [id]); const data = state.data; const item = data?.project;
  const { hasPermission } = useAuth();
  return <Screen title={item?.projectName || 'Project'} subtitle={item?.customId} onBack={() => router.back()} action={item && hasPermission('projects.edit') ? <HeaderButton label="Edit" onPress={() => router.push({ pathname: '/project-form', params: { id: item.id } })} /> : undefined} refreshing={state.isRefreshing} onRefresh={state.refresh}>
    {state.isLoading ? <Loading /> : state.error ? <ErrorState message={state.error} onRetry={state.reload} /> : item ? <>
      <View className="mb-3"><Badge text={item.status} tone={/complete|installed/i.test(item.status) ? 'green' : 'amber'} /></View>
      <View className="flex-row gap-3"><View className="flex-1"><StatCard label="Capacity" value={`${formatNumber(item.capacityKw)} kW`} /></View><View className="flex-1"><StatCard label="Balance" value={formatINR(item.pendingBalance)} accent={(item.pendingBalance ?? 0) > 0 ? 'text-rose-600' : 'text-emerald-700'} /></View></View>
      <Card><DetailRow label="Customer" value={data.customer?.name} /><DetailRow label="Site" value={[item.installationAddress, item.city, item.state, item.pincode].filter(Boolean).join(', ')} /><DetailRow label="Start date" value={formatDate(item.startDate)} /><DetailRow label="Completion" value={formatDate(item.completionDate)} /></Card>
      <Card><DetailRow label="Panels" value={`${item.panelsCount || 0} · ${item.panelBrand || ''} ${item.panelModel || ''}`} /><DetailRow label="Inverter" value={`${item.inverterBrand || ''} ${item.inverterModel || ''}`} /><DetailRow label="Structure" value={item.structureType} /><DetailRow label="Mounting" value={item.mountingType} /><DetailRow label="Net metering" value={item.netMeteringStatus} /></Card>
      <Card><DetailRow label="Deal amount" value={formatINR(item.dealAmount)} /><DetailRow label="Discount" value={formatINR(item.discount)} /><DetailRow label="Final deal" value={formatINR(item.finalDealAmount)} /><DetailRow label="Received" value={formatINR(item.totalReceived)} /><DetailRow label="Actual profit" value={formatINR(item.actualProfit)} /></Card>
      <Card><DetailRow label="Payments" value={String(data.payments?.length ?? 0)} /><DetailRow label="Expenses" value={String(data.expenses?.length ?? 0)} /><DetailRow label="Warranties" value={String(data.warranties?.length ?? 0)} /><DetailRow label="Invoices" value={String(data.invoices?.length ?? 0)} /><DetailRow label="Tickets" value={String(data.complaints?.length ?? 0)} /><DetailRow label="Documents" value={String(data.documents?.length ?? 0)} /></Card>
      {item.notes || item.technicalNotes ? <Card><Text className="text-xs font-semibold text-slate-400 mb-2">PROJECT NOTES</Text><Text className="text-sm text-slate-700">{item.notes || item.technicalNotes}</Text></Card> : null}
    </> : null}
  </Screen>;
}
