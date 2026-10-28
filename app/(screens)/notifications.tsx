import React from 'react';
import { View } from 'react-native';
import { BellOff } from 'lucide-react-native';
import { api } from '../../src/lib/api';
import { useApi } from '../../src/lib/query';
import { timeAgo } from '../../src/lib/formatters';
import { Button, EmptyState, ErrorState, GroupedItem, ListScreen, ListSkeleton, space, T, Tap, useOverlay, useTheme } from '../../src/ds';
import type { Notification } from '../../src/types';

export default function NotificationsScreen() {
  const p = useTheme();
  const { toast } = useOverlay();
  const q = useApi(['notifications', 'list'], api.getNotifications);
  const items: Notification[] = q.data?.notifications || [];
  const unread = q.data?.unreadCount || 0;
  const markOne = async (n: Notification) => { if (n.isRead) return; try { await api.markNotificationRead(n.id); void q.refresh(); } catch (e: any) { toast(e.message, 'error'); } };
  const markAll = async () => { try { await api.markAllNotificationsRead(); void q.refresh(); } catch (e: any) { toast(e.message, 'error'); } };
  const dot = (t: Notification['type']) => (t === 'error' ? p.red : t === 'warning' ? p.orange : t === 'success' ? p.green : p.blue);
  return (
    <ListScreen<Notification>
      title="Notifications" subtitle={unread ? `${unread} unread` : undefined} back large={false}
      right={unread ? <Button title="Read all" size="s" kind="plain" onPress={markAll} /> : undefined}
      header={q.loading ? <ListSkeleton avatar={false} /> : q.error ? <ErrorState message={q.error} onRetry={q.refresh} /> : null}
      data={q.loading || q.error ? [] : items}
      keyExtractor={(n) => n.id}
      refreshing={q.refreshing}
      onRefresh={q.refresh}
      ListEmptyComponent={!q.loading && !q.error ? <EmptyState icon={<BellOff size={44} color={p.tertiary} />} title="No notifications" message="Payments, approvals and ticket replies will show up here." /> : null}
      renderItem={({ item: n, index }) => (
        <GroupedItem index={index} count={items.length} inset={36}>
          <Tap onPress={() => void markOne(n)} scaleTo={0.99} accessibilityRole="button" accessibilityLabel={`${n.isRead ? '' : 'Unread. '}${n.title}. ${n.message}`}
            style={{ flexDirection: 'row', gap: space.m, paddingHorizontal: space.l, paddingVertical: 12, minHeight: 52 }}>
            <View style={{ width: 8, paddingTop: 7 }}>{!n.isRead ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dot(n.type) }} /> : null}</View>
            <View style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: 'row', gap: space.s }}>
                <T variant="headline" weight={n.isRead ? '400' : '600'} style={{ flex: 1 }} numberOfLines={2}>{n.title}</T>
                <T variant="footnote" color="secondary">{timeAgo(n.createdAt)}</T>
              </View>
              <T variant="subhead" color="secondary">{n.message}</T>
            </View>
          </Tap>
        </GroupedItem>
      )}
    />
  );
}
