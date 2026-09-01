import React, { useState } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../src/lib/api';
import { useFetch } from '../../src/hooks/useFetch';
import { formatINR, formatNumber } from '../../src/lib/formatters';
import { Card, ErrorState, Loading, PrimaryButton, Screen, StatCard } from '../../src/components/ui';
import { shareCsv } from '../../src/lib/export';

export default function ReportsScreen() {
  const router = useRouter();
  const state = useFetch(async () => {
    const [dashboard, charts] = await Promise.all([api.getDashboardKpis(), api.getCharts()]);
    return { kpis: dashboard?.kpis ?? {}, charts: charts ?? {} };
  });
  const k = state.data?.kpis ?? {};
  const charts: any = state.data?.charts ?? {};
  const [exporting, setExporting] = useState<string | null>(null);

  const exportData = async (type: 'customers' | 'projects' | 'payments') => {
    setExporting(type);
    try {
      if (type === 'customers') {
        const data = await api.getCustomers({ limit: '1000' });
        await shareCsv('SolarOS_Customers', (data?.customers ?? []) as any);
      } else if (type === 'projects') {
        const data = await api.getProjects({ limit: '1000' });
        await shareCsv('SolarOS_Projects', (data?.projects ?? []) as any);
      } else {
        const data = await api.getPayments({ limit: '1000' });
        await shareCsv('SolarOS_Payments', (data?.payments ?? []) as any);
      }
    } catch (e: any) {
      Alert.alert('Export failed', e?.message || 'Could not prepare this export.');
    } finally {
      setExporting(null);
    }
  };
  return <Screen title="Reports" subtitle="Portfolio and collection summary" onBack={() => router.back()} refreshing={state.isRefreshing} onRefresh={state.refresh}>
    {state.isLoading ? <Loading /> : state.error ? <ErrorState message={state.error} onRetry={state.reload} /> : <>
      <StatCard label="Deal Value" value={formatINR(k?.totalDealValue)} hint={`${k?.totalProjects ?? 0} projects · ${formatNumber(k?.totalCapacityKw)} kWp`} />
      <StatCard label="Collections" value={formatINR(k?.totalReceived)} hint={`${k?.collectionRate ?? 0}% collection rate`} accent="text-emerald-700" />
      <StatCard label="Receivables" value={formatINR(k?.pendingReceivables)} accent="text-amber-600" />
      <View className="flex-row gap-3"><View className="flex-1"><StatCard label="Customers" value={String(k?.totalCustomers ?? 0)} /></View><View className="flex-1"><StatCard label="Tickets" value={String(k?.openComplaints ?? 0)} accent="text-rose-600" /></View></View>
      <BarList title="MONTHLY REVENUE" items={(charts.monthlyData ?? []).map((item: any) => ({ label: item.month, value: Number(item.revenue ?? item.dealValue ?? 0) }))} money />
      <BarList title="PROJECT STATUS" items={(charts.statusDistribution ?? []).map((item: any) => ({ label: item.name ?? item.status ?? 'Unknown', value: Number(item.value ?? item.count ?? 0) }))} />
      <BarList title="CAPACITY MIX" items={(charts.capacityDistribution ?? []).map((item: any) => ({ label: item.name ?? item.range ?? 'Unknown', value: Number(item.value ?? item.count ?? 0) }))} />
      <Card>
        {(['customers', 'projects', 'payments'] as const).map((type, index) => (
          <React.Fragment key={type}>
            {index > 0 ? <View className="h-2" /> : null}
            <PrimaryButton label={exporting === type ? 'Preparing export…' : `Export ${type[0].toUpperCase()}${type.slice(1)} CSV`} onPress={() => void exportData(type)} disabled={!!exporting} />
            {exporting === type ? <ActivityIndicator className="absolute right-5" color="#f59e0b" /> : null}
          </React.Fragment>
        ))}
      </Card>
    </>}
  </Screen>;
}

function BarList({ title, items, money = false }: { title: string; items: { label: string; value: number }[]; money?: boolean }) {
  const max = Math.max(1, ...items.map(item => item.value));
  return <Card>
    <Text className="mb-3 text-xs font-bold tracking-wide text-slate-500">{title}</Text>
    {items.length === 0 ? <Text className="text-sm text-slate-500">No data available.</Text> : items.map(item => <View key={item.label} className="mb-3">
      <View className="mb-1 flex-row justify-between gap-3">
        <Text className="flex-1 text-xs text-slate-600">{item.label}</Text>
        <Text className="text-xs font-bold text-slate-900">{money ? formatINR(item.value) : String(item.value)}</Text>
      </View>
      <View className="h-2 overflow-hidden rounded-full bg-slate-100"><View className="h-2 rounded-full bg-amber-500" style={{ width: `${Math.max(2, (item.value / max) * 100)}%` }} /></View>
    </View>)}
  </Card>;
}
