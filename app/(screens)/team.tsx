import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../src/lib/api';
import { useFetch } from '../../src/hooks/useFetch';
import { formatDateTime } from '../../src/lib/formatters';
import { Badge, Card, EmptyState, ErrorState, HeaderButton, Loading, Screen, StatCard } from '../../src/components/ui';

export default function TeamScreen() {
  const router = useRouter(); const state = useFetch(() => api.getStaffUsers()); const items = state.data?.users ?? [];
  return <Screen title="Team Members" subtitle="Staff accounts and assigned roles" onBack={() => router.back()} action={<HeaderButton onPress={() => router.push('/team-form')} />} refreshing={state.isRefreshing} onRefresh={state.refresh}>
    {state.isLoading ? <Loading /> : state.error ? <ErrorState message={state.error} onRetry={state.reload} /> : <><StatCard label="Active Staff" value={String(items.filter(i => i.isActive).length)} hint={`${items.length} accounts`} />{items.length === 0 ? <EmptyState message="No staff accounts yet." /> : items.map(item => <Pressable key={item.id} onPress={() => router.push({ pathname: '/team-form', params: { id: item.id } })}><Card>
      <View className="flex-row justify-between gap-3"><View className="flex-1"><Text className="text-sm font-bold text-slate-900">{item.username}</Text><Text className="text-xs text-slate-500 mt-1">{item.email}</Text></View><Badge text={item.isActive ? 'Active' : 'Inactive'} tone={item.isActive ? 'green' : 'rose'} /></View><Text className="text-xs text-slate-600 mt-3">Role: {item.roleName || item.role}</Text>{item.lastLoginAt ? <Text className="text-[10px] text-slate-400 mt-1">Last login {formatDateTime(item.lastLoginAt)}</Text> : null}
    </Card></Pressable>)}</>}
  </Screen>;
}
