import React, { useState } from 'react';
import { Alert, View } from 'react-native';
import { RotateCcw, Trash2 } from 'lucide-react-native';
import { account, RecycleBinItem } from '../../src/lib/apis/account';
import { useFetch } from '../../src/hooks/useFetch';
import { formatDateTime } from '../../src/lib/formatters';
import { Badge, Button, EmptyState, ErrorState, IconTile, Row, Screen, Section, Spinner, T, useTheme } from '../../src/ds';

export default function RecycleBinScreen() {
  const p = useTheme();
  const state = useFetch(account.recycleBin);
  const [busy, setBusy] = useState('');
  const items = state.data?.items || [];
  const restore = (item: RecycleBinItem) => Alert.alert('Restore this item?', `${item.label} and its related records will return to the workspace.`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Restore', onPress: async () => { setBusy(item.id); try { await account.restoreFromBin(item.id); await state.reload(); } catch (e: any) { Alert.alert('Could not restore', e.message); } finally { setBusy(''); } } }]);
  const purge = (item: RecycleBinItem) => Alert.alert('Delete forever?', `${item.label} and ${item.rowCount} related database record${item.rowCount === 1 ? '' : 's'} cannot be recovered.`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete forever', style: 'destructive', onPress: async () => { setBusy(item.id); try { await account.purgeFromBin(item.id); await state.reload(); } catch (e: any) { Alert.alert('Could not delete', e.message); } finally { setBusy(''); } } }]);
  return <Screen title="Recycle bin" subtitle={`Deleted records are kept for ${state.data?.retentionDays || 30} days`} back refreshing={state.isRefreshing} onRefresh={state.refresh}>
    {state.isLoading ? <Spinner /> : state.error ? <ErrorState message={state.error} onRetry={state.reload} /> : !items.length ? <EmptyState icon={<Trash2 size={44} color={p.tertiary} />} title="Recycle bin is empty" message="Deleted customers, projects, leads, quotations and expenses appear here before permanent removal." /> : items.map((item) => <Section key={item.id} header={item.type} footer={`Deleted ${formatDateTime(item.deletedAt)}${item.deletedBy ? ` by ${item.deletedBy}` : ''} · Auto-purge ${formatDateTime(item.purgeAfter)}`}>
      <Row icon={<IconTile tone="gray" icon={<Trash2 size={17} color={p.secondary} />} />} title={item.label} subtitle={`${item.rowCount} related record${item.rowCount === 1 ? '' : 's'}${item.reason ? ` · ${item.reason}` : ''}`} accessory={<Badge text="Deleted" tone="red" />} />
      <View style={{ flexDirection: 'row', gap: 8, padding: 12 }}><Button title="Restore" kind="tinted" size="m" icon={<RotateCcw size={17} color={p.accentText} />} onPress={() => restore(item)} loading={busy === item.id} style={{ flex: 1 }} /><Button title="Delete forever" kind="destructive" size="m" onPress={() => purge(item)} disabled={!!busy} style={{ flex: 1 }} /></View>
    </Section>)}
  </Screen>;
}
