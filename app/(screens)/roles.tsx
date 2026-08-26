import React from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../src/lib/api';
import { useFetch } from '../../src/hooks/useFetch';
import { Badge, Card, EmptyState, ErrorState, HeaderButton, Loading, Screen } from '../../src/components/ui';

export default function RolesScreen() {
  const router = useRouter(); const state = useFetch(async () => { const [roles, permissions] = await Promise.all([api.getRoles(), api.getPermissions()]); return { roles: roles.roles, permissions: permissions.permissions }; }); const roles = state.data?.roles ?? [];
  const remove = (item: any) => Alert.alert('Delete role?', item.name, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => { try { await api.deleteRole(item.id); await state.reload(); } catch (e: any) { Alert.alert('Could not delete role', e.message); } } }]);
  return <Screen title="Roles & Permissions" subtitle={`${state.data?.permissions.length ?? 0} available permissions`} onBack={() => router.back()} action={<HeaderButton onPress={() => router.push('/role-form')} />} refreshing={state.isRefreshing} onRefresh={state.refresh}>
    {state.isLoading ? <Loading /> : state.error ? <ErrorState message={state.error} onRetry={state.reload} /> : roles.length === 0 ? <EmptyState message="No roles configured." /> : roles.map(item => <Card key={item.id}>
      <Pressable onPress={() => router.push({ pathname: '/role-form', params: { id: item.id } })}><View className="flex-row justify-between gap-3"><View className="flex-1"><Text className="text-sm font-bold text-slate-900">{item.name}</Text>{item.description ? <Text className="text-xs text-slate-500 mt-1">{item.description}</Text> : null}</View>{item.isSystem ? <Badge text="System" tone="amber" /> : null}</View><Text className="text-xs text-slate-600 mt-3">{item.permissionKeys.length} permissions · {item.userCount ?? 0} users</Text></Pressable>
      {!item.isSystem && !(item.userCount ?? 0) ? <Pressable onPress={() => remove(item)} className="mt-3 self-end"><Text className="text-xs font-semibold text-rose-600">Delete</Text></Pressable> : null}
    </Card>)}
  </Screen>;
}
