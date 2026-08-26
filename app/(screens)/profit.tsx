import React from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../src/lib/api';
import { useFetch } from '../../src/hooks/useFetch';
import { formatINR } from '../../src/lib/formatters';
import { Card, EmptyState, ErrorState, Loading, Screen, StatCard } from '../../src/components/ui';
import type { SolarProject } from '../../src/types';

export default function ProfitScreen() {
  const router = useRouter();
  const state = useFetch(() => api.getProjects({ limit: '100' }));
  const projects: SolarProject[] = state.data?.projects ?? [];
  const totalProfit = projects.reduce((sum, item) => sum + Number(item.actualProfit || 0), 0);
  return <Screen title="Profit & Margins" subtitle="Actual profitability by project" onBack={() => router.back()} refreshing={state.isRefreshing} onRefresh={state.refresh}>
    {state.isLoading ? <Loading /> : state.error ? <ErrorState message={state.error} onRetry={state.reload} /> : <>
      <StatCard label="Actual Net Profit" value={formatINR(totalProfit)} hint={`${projects.length} projects`} accent={totalProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'} />
      {projects.length === 0 ? <EmptyState message="No project margin data yet." /> : projects.map((item) => (
        <Card key={item.id}>
          <Text className="text-sm font-bold text-slate-900">{item.projectName}</Text><Text className="text-[10px] font-mono text-slate-400 mt-1">{item.customId}</Text>
          <View className="flex-row mt-3 pt-3 border-t border-slate-100"><View className="flex-1"><Text className="text-[10px] text-slate-400">DEAL</Text><Text className="text-xs font-bold text-slate-700">{formatINR(item.finalDealAmount)}</Text></View><View className="flex-1"><Text className="text-[10px] text-slate-400">COST</Text><Text className="text-xs font-bold text-slate-700">{formatINR(item.totalCost)}</Text></View><View className="flex-1"><Text className="text-[10px] text-slate-400">PROFIT</Text><Text className={`text-xs font-bold ${(item.actualProfit ?? 0) >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>{formatINR(item.actualProfit)}{item.profitMargin != null ? ` (${item.profitMargin}%)` : ''}</Text></View></View>
        </Card>
      ))}
    </>}
  </Screen>;
}
