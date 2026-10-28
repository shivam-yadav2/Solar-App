import React from 'react';
import { Alert, View } from 'react-native';
import { useRouter } from 'expo-router';
import { KeyRound, Plus, Trash2 } from 'lucide-react-native';
import { api } from '../../src/lib/api';
import { useFetch } from '../../src/hooks/useFetch';
import { Badge, EmptyState, ErrorState, GroupedItem, IconButton, IconTile, ListScreen, ListSkeleton, Row, T, useTheme } from '../../src/ds';

export default function RolesScreen() {
  const router = useRouter(); const p = useTheme();
  const state = useFetch(async () => { const [r, permissions] = await Promise.all([api.getRoles(), api.getPermissions()]); return { roles: r.roles, permissions: permissions.permissions }; });
  const roles = state.data?.roles || [];
  const remove = (item: any) => Alert.alert('Delete this role?', `“${item.name}” will be removed permanently.`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete role', style: 'destructive', onPress: async () => { try { await api.deleteRole(item.id); await state.reload(); } catch (e: any) { Alert.alert('Could not delete role', e.message); } } }]);
  return <ListScreen<any> title="Roles & permissions" subtitle={`${state.data?.permissions.length || 0} fine-grained permissions available`} back right={<IconButton tinted label="Create role" icon={<Plus size={18} color={p.accentText} />} onPress={() => router.push('/role-form')} />}
    header={state.isLoading ? <ListSkeleton avatar={false} /> : state.error ? <ErrorState message={state.error} onRetry={state.reload} /> : null}
    data={state.isLoading || state.error ? [] : roles} keyExtractor={(x) => x.id} refreshing={state.isRefreshing} onRefresh={state.refresh}
    ListEmptyComponent={!state.isLoading && !state.error ? <EmptyState icon={<KeyRound size={44} color={p.tertiary} />} title="No roles" message="Create a role and grant only the access needed for that job." /> : null}
    renderItem={({ item, index }) => <GroupedItem index={index} count={roles.length} inset={58}><Row icon={<IconTile tone={item.isSystem ? 'accent' : 'purple'} icon={<KeyRound size={17} color={item.isSystem ? p.accentText : p.purple} />} />} title={item.name} subtitle={item.description || `${item.permissionKeys.length} permissions`} accessory={<View style={{ alignItems: 'flex-end', gap: 3 }}>{item.isSystem ? <Badge text="System" tone="accent" /> : <T variant="caption" color="secondary">{item.userCount || 0} members</T>}</View>} onPress={item.canEdit === false ? undefined : () => router.push({ pathname: '/role-form', params: { id: item.id } })} onLongPress={!item.isSystem && !(item.userCount || 0) ? () => remove(item) : undefined} /></GroupedItem>}
  />;
}
