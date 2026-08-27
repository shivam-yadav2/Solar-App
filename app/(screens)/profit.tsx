import React from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../src/lib/api';
import { useFetch } from '../../src/hooks/useFetch';
import { formatINR, formatNumber } from '../../src/lib/formatters';
import { Card, EmptyState, ErrorState, Loading, Screen, StatCard } from '../../src/components/ui';

export default function ProfitScreen() {
  const router = useRouter();
  const state = useFetch(() => api.getCustomerProfitability());
  const customers = state.data?.customers ?? [];
  const summary = state.data?.summary;
  return <Screen title="Profit & Margins" subtitle="Actual profitability by customer" onBack={() => router.back()} refreshing={state.isRefreshing} onRefresh={state.refresh}>
    {state.isLoading ? <Loading /> : state.error ? <ErrorState message={state.error} onRetry={state.reload} /> : <>
      <StatCard label="Actual Net Profit" value={formatINR(summary?.realizedNetProfit)} hint={`${summary?.customerCount ?? 0} customers · ${summary?.projectCount ?? 0} sites`} accent={(summary?.realizedNetProfit ?? 0) >= 0 ? 'text-emerald-700' : 'text-rose-600'} />
      <View className="flex-row gap-3"><View className="flex-1"><StatCard label="Contracts" value={formatINR(summary?.totalContractValue)} /></View><View className="flex-1"><StatCard label="Site Cost" value={formatINR(summary?.totalSiteExpenses)} accent="text-rose-600" /></View></View>
      {customers.length === 0 ? <EmptyState message="No customer margin data yet." /> : customers.map((item: any) => (
        <Card key={item.customerId}>
          <View className="flex-row justify-between gap-3"><View className="flex-1"><Text className="text-sm font-bold text-slate-900">{item.customerName}</Text><Text className="text-[10px] font-mono text-slate-400 mt-1">{item.customerCustomId} · {item.projectCount} sites · {formatNumber(item.totalCapacityKw)} kWp</Text></View><Text className={`text-sm font-bold ${item.margin >= 25 ? 'text-emerald-700' : 'text-amber-700'}`}>{Number(item.margin).toFixed(1)}%</Text></View>
          <View className="flex-row mt-3 pt-3 border-t border-slate-100"><View className="flex-1"><Text className="text-[10px] text-slate-400">CONTRACT</Text><Text className="text-xs font-bold text-slate-700">{formatINR(item.contractValue)}</Text></View><View className="flex-1"><Text className="text-[10px] text-slate-400">COST</Text><Text className="text-xs font-bold text-rose-600">{formatINR(item.totalSiteCost)}</Text></View><View className="flex-1"><Text className="text-[10px] text-slate-400">PROFIT</Text><Text className={`text-xs font-bold ${item.actualProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>{formatINR(item.actualProfit)}</Text></View></View>
          {item.projects?.length ? <View className="mt-3 rounded-xl bg-slate-50 p-3"><Text className="mb-2 text-[10px] font-bold text-slate-400">PROJECT CONTRIBUTION</Text>{item.projects.map((project: any) => <View key={project.id} className="flex-row justify-between border-b border-slate-100 py-1.5 last:border-b-0"><Text className="flex-1 text-xs text-slate-600">{project.projectName}</Text><Text className="text-xs font-semibold text-emerald-700">{formatINR(project.actualProfit)}</Text></View>)}</View> : null}
        </Card>
      ))}
    </>}
  </Screen>;
}
