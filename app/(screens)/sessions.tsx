import React from 'react';
import { Alert, Platform } from 'react-native';
import { Laptop, Smartphone } from 'lucide-react-native';
import { account } from '../../src/lib/apis/account';
import { useApi } from '../../src/lib/query';
import { timeAgo } from '../../src/lib/formatters';
import { Badge, Button, ErrorState, IconTile, ListSkeleton, Row, Screen, Section, useOverlay, useTheme } from '../../src/ds';

/** Where you're signed in; sign other devices out. */
export default function SessionsScreen() {
  const p = useTheme();
  const { toast } = useOverlay();
  const q = useApi(['security', 'sessions'], account.sessions);
  const others = (q.data?.sessions || []).filter((s) => !s.isCurrent && s.isActive);
  const revoke = async (id: string) => { try { await account.revokeSession(id); await q.refresh(); toast('Signed out'); } catch (e: any) { toast(e.message, 'error'); } };
  const ask = (id: string, label: string) => (Platform.OS === 'web' ? void revoke(id) : Alert.alert(`Sign out ${label}?`, undefined, [{ text: 'Cancel', style: 'cancel' }, { text: 'Sign out', style: 'destructive', onPress: () => void revoke(id) }]));
  const icon = (d: string) => (/(android|iphone|ios|mobile|okhttp|expo)/i.test(d) ? <Smartphone size={17} color={p.blue} /> : <Laptop size={17} color={p.purple} />);
  return (
    <Screen title="Devices & sessions" large={false} back refreshing={q.refreshing} onRefresh={q.refresh}
      footer={others.length > 1 ? <Button title={`Sign out ${others.length} other devices`} kind="destructive" style={{ flex: 1 }} onPress={() => others.forEach((s) => void revoke(s.id))} /> : undefined}>
      {q.error ? <ErrorState message={q.error} onRetry={q.refresh} /> : q.loading ? <ListSkeleton rows={3} /> : (
        <Section header="Signed in" footer="Signing a device out ends its session immediately.">
          {(q.data?.sessions || []).filter((s) => s.isActive).map((s) => (
            <Row key={s.id} icon={<IconTile icon={icon(s.device)} tone={/(android|iphone|mobile)/i.test(s.device) ? 'blue' : 'purple'} />}
              title={s.device || 'Unknown device'} subtitle={`${s.ipAddress || ''} · active ${timeAgo(s.lastSeenAt)}`}
              accessory={s.isCurrent ? <Badge text="This device" tone="green" /> : undefined}
              onPress={s.isCurrent ? undefined : () => ask(s.id, s.device)} />
          ))}
        </Section>
      )}
    </Screen>
  );
}
