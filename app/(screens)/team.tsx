import React, { useState } from 'react';
import { Alert, View } from 'react-native';
import { useRouter } from 'expo-router';
import { KeyRound, LogOut, Plus, ShieldCheck, Users } from 'lucide-react-native';
import { api } from '../../src/lib/api';
import { useAuth } from '../../src/context/AuthContext';
import { useFetch } from '../../src/hooks/useFetch';
import { formatDateTime } from '../../src/lib/formatters';
import { Badge, Button, EmptyState, ErrorState, GroupedItem, IconButton, IconTile, ListScreen, ListSkeleton, Row, Section, Sheet, T, useTheme } from '../../src/ds';

export default function TeamScreen() {
  const router = useRouter(); const p = useTheme(); const { user } = useAuth();
  const state = useFetch(() => api.getStaffUsers()); const items: any[] = state.data?.users || [];
  const [selected, setSelected] = useState<any>(null); const [busy, setBusy] = useState(false);
  const resetPassword = async () => { if (!selected) return; setBusy(true); try { const r = await api.resetStaffPassword(selected.id); Alert.alert('Temporary password created', `${r.username}\n${r.tempPassword}\n\nThe user must change this at their next sign-in.`); setSelected(null); } catch (e: any) { Alert.alert('Could not reset password', e.message); } finally { setBusy(false); } };
  const signOut = () => selected && Alert.alert('Sign out every device?', `${selected.username} will need to sign in again.`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Sign out', style: 'destructive', onPress: async () => { setBusy(true); try { const r = await api.signOutStaffEverywhere(selected.id); Alert.alert('Devices signed out', `${r.revoked} session${r.revoked === 1 ? '' : 's'} revoked.`); setSelected(null); await state.reload(); } catch (e: any) { Alert.alert('Could not sign out devices', e.message); } finally { setBusy(false); } } }]);
  const resetMfa = () => selected && Alert.alert('Reset two-factor sign-in?', `${selected.username} will need to set up two-factor sign-in again.`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Reset', style: 'destructive', onPress: async () => { setBusy(true); try { await api.resetStaffMfa(selected.id); setSelected(null); await state.reload(); } catch (e: any) { Alert.alert('Could not reset MFA', e.message); } finally { setBusy(false); } } }]);
  return <>
    <ListScreen<any> title="Team" subtitle={`${items.filter((x) => x.isActive).length} active of ${items.length} staff accounts`} back right={<IconButton tinted label="Add team member" icon={<Plus size={18} color={p.accentText} />} onPress={() => router.push('/team-form')} />}
      header={state.isLoading ? <ListSkeleton /> : state.error ? <ErrorState message={state.error} onRetry={state.reload} /> : null}
      data={state.isLoading || state.error ? [] : items} keyExtractor={(x) => x.id} refreshing={state.isRefreshing} onRefresh={state.refresh}
      ListEmptyComponent={!state.isLoading && !state.error ? <EmptyState icon={<Users size={44} color={p.tertiary} />} title="No team members" message="Add staff and assign only the permissions they need." /> : null}
      renderItem={({ item, index }) => <GroupedItem index={index} count={items.length} inset={58}><Row icon={<IconTile tone={item.isOwner ? 'accent' : 'blue'} icon={<Users size={17} color={item.isOwner ? p.accentText : p.blue} />} />} title={item.username} subtitle={`${item.roleName || 'No role'} · ${item.email}`} accessory={<View style={{ alignItems: 'flex-end', gap: 3 }}><Badge text={item.isActive ? 'Active' : 'Inactive'} />{item.mfaEnabled ? <T variant="caption" color="green">2FA on</T> : null}</View>} onPress={() => router.push({ pathname: '/team-form', params: { id: item.id } })} onLongPress={item.canManage === false ? undefined : () => setSelected(item)} /></GroupedItem>}
    />
    <Sheet visible={!!selected} onClose={() => setSelected(null)} title={selected?.username || 'Team member'}>
      {selected ? <View style={{ padding: 16, gap: 16 }}><Section header="Account"><Row title="Edit profile and role" onPress={() => { const id = selected.id; setSelected(null); router.push({ pathname: '/team-form', params: { id } }); }} /><Row title="Last active" value={selected.lastSeenAt ? formatDateTime(selected.lastSeenAt) : 'Never'} /><Row title="Active devices" value={String(selected.activeSessions || 0)} /></Section>{selected.id !== user?.id ? <Section header="Security"><Row icon={<KeyRound size={19} color={p.orange} />} title="Issue temporary password" onPress={() => void resetPassword()} /><Row icon={<LogOut size={19} color={p.red} />} title="Sign out every device" destructive onPress={signOut} />{selected.mfaEnabled ? <Row icon={<ShieldCheck size={19} color={p.red} />} title="Reset two-factor sign-in" destructive onPress={resetMfa} /> : null}</Section> : <T variant="footnote" color="secondary" align="center">Manage your own password, two-factor sign-in and devices from My security.</T>}</View> : null}
    </Sheet>
  </>;
}
