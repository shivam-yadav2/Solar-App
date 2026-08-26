import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../src/lib/api';
import { useFetch } from '../../src/hooks/useFetch';
import { formatDateTime } from '../../src/lib/formatters';
import { Badge, Card, EmptyState, ErrorState, HeaderButton, Loading, Screen } from '../../src/components/ui';

export default function NotificationsScreen() {
  const router = useRouter(); const state = useFetch(() => api.getNotifications()); const items = state.data?.notifications ?? [];
  const markOne = async (id: string) => { await api.markNotificationRead(id); await state.reload(); };
  const markAll = async () => { await api.markAllNotificationsRead(); await state.reload(); };
  return <Screen title="Notifications" subtitle={`${state.data?.unreadCount ?? 0} unread`} onBack={() => router.back()} action={(state.data?.unreadCount ?? 0) > 0 ? <HeaderButton label="Read all" onPress={() => void markAll()} /> : undefined} refreshing={state.isRefreshing} onRefresh={state.refresh}>
    {state.isLoading ? <Loading /> : state.error ? <ErrorState message={state.error} onRetry={state.reload} /> : items.length === 0 ? <EmptyState message="No notifications yet." /> : items.map(item => <Pressable key={item.id} onPress={() => !item.isRead ? void markOne(item.id) : undefined}><Card className={item.isRead ? 'opacity-60' : ''}><View className="flex-row justify-between gap-3"><Text className="flex-1 text-sm font-bold text-slate-900">{item.title}</Text><Badge text={item.isRead ? 'Read' : item.type} tone={item.type === 'success' ? 'green' : item.type === 'error' ? 'rose' : item.type === 'warning' ? 'amber' : 'slate'} /></View><Text className="text-xs text-slate-600 mt-2 leading-5">{item.message}</Text><Text className="text-[10px] text-slate-400 mt-2">{formatDateTime(item.createdAt)}</Text></Card></Pressable>)}
  </Screen>;
}
