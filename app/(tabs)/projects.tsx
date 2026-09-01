import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Plus, Receipt } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { api } from '../../src/lib/api';
import { useFetch } from '../../src/hooks/useFetch';
import { formatINR, formatNumber } from '../../src/lib/formatters';
import { Screen, Card, Badge, Loading, ErrorState, EmptyState, HeaderButton } from '../../src/components/ui';
import type { SolarProject } from '../../src/types';
import { useAuth } from '../../src/context/AuthContext';

const statusTone = (status?: string) => {
  if (!status) return 'slate' as const;
  if (/installed|complete/i.test(status)) return 'green' as const;
  if (/progress|survey|approved/i.test(status)) return 'amber' as const;
  return 'slate' as const;
};

export default function ProjectsScreen() {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const { data, error, isLoading, isRefreshing, refresh, reload } = useFetch(
    () => api.getProjects({ limit: '50' })
  );
  const projects: SolarProject[] = data?.projects ?? [];

  return (
    <Screen
      title="Solar Projects"
      subtitle="Rooftop installations & milestones"
      refreshing={isRefreshing}
      onRefresh={refresh}
      action={hasPermission('projects.create') ? <HeaderButton onPress={() => router.push('/project-form')} /> : undefined}
    >
      {isLoading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : projects.length === 0 ? (
        <EmptyState message="No solar projects yet." />
      ) : (
        projects.map((p) => (
          <Pressable key={p.id} onPress={() => router.push({ pathname: '/project/[id]', params: { id: p.id } })}>
          <Card>
            <View className="flex-row justify-between items-start mb-2">
              <Text className="text-[10px] font-mono text-slate-400">{p.customerCustomId || p.customId}</Text>
              <Badge text={p.status ?? 'Draft'} tone={statusTone(p.status)} />
            </View>

            <Text className="text-base font-bold text-slate-900">{p.customerName || 'Unknown Customer'}</Text>
            <Text className="text-xs font-semibold text-slate-600 mt-0.5">{p.customId} · {p.projectName}</Text>
            <Text className="text-xs text-slate-500 mt-0.5">
              {p.city}
              {p.state ? `, ${p.state}` : ''}
            </Text>

            <View className="flex-row mt-3 pt-3 border-t border-slate-100">
              <View className="flex-1">
                <Text className="text-[10px] text-slate-400 uppercase">Capacity</Text>
                <Text className="text-sm font-bold text-slate-900 mt-0.5">
                  {formatNumber(p.capacityKw)} kW
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-[10px] text-slate-400 uppercase">Deal Value</Text>
                <Text className="text-sm font-bold text-slate-900 mt-0.5">
                  {formatINR(p.finalDealAmount)}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-[10px] text-slate-400 uppercase">Balance</Text>
                <Text
                  className={`text-sm font-bold mt-0.5 ${
                    (p.pendingBalance ?? 0) > 0 ? 'text-rose-600' : 'text-emerald-700'
                  }`}
                >
                  {formatINR(p.pendingBalance)}
                </Text>
              </View>
            </View>
            <View className="flex-row gap-2 mt-3 pt-3 border-t border-slate-100"><Pressable onPress={() => router.push({ pathname: '/payment-form', params: { projectId: p.id } })} className="flex-1 min-h-11 rounded-xl bg-emerald-50 border border-emerald-200 items-center justify-center flex-row active:bg-emerald-100"><Receipt size={14} color="#047857" /><Text className="text-xs font-bold text-emerald-700 ml-1">Pay</Text></Pressable><Pressable onPress={() => router.push({ pathname: '/expense-form', params: { projectId: p.id, customerId: p.customerId } })} className="flex-1 min-h-11 rounded-xl bg-rose-50 border border-rose-200 items-center justify-center flex-row active:bg-rose-100"><Plus size={14} color="#be123c" /><Text className="text-xs font-bold text-rose-700 ml-1">Cost</Text></Pressable></View>
          </Card></Pressable>
        ))
      )}
    </Screen>
  );
}
