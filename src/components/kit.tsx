import React from 'react';
import { Linking, Platform, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Bell, Mail, MapPin, MessageCircle, Phone } from 'lucide-react-native';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Avatar, IconButton, Progress, radius, space, T, Tap, toneColors, Tone, useTheme, haptic, Spinner, GUTTER, elevation } from '../ds';
import { formatINR } from '../lib/formatters';

// ---------------------------------------------------------------- contact

const digits = (phone?: string) => (phone || '').replace(/\D/g, '');
export const callNumber = (phone?: string) => { const d = digits(phone); if (d) void Linking.openURL(`tel:${d.length === 10 ? `+91${d}` : `+${d}`}`); };
export const openWhatsApp = (phone?: string, text = '') => {
  const d = digits(phone);
  if (!d) return;
  const n = d.length === 10 ? `91${d}` : d;
  void Linking.openURL(`https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ''}`);
};
export const sendEmail = (email?: string, subject = '') => { if (email) void Linking.openURL(`mailto:${email}${subject ? `?subject=${encodeURIComponent(subject)}` : ''}`); };
export const openMap = (address?: string) => {
  if (!address) return;
  const q = encodeURIComponent(address);
  void Linking.openURL(Platform.OS === 'ios' ? `http://maps.apple.com/?q=${q}` : `https://www.google.com/maps/search/?api=1&query=${q}`);
};

/** Call / WhatsApp / Email / Map buttons (iOS Contacts style). */
export const ContactBar: React.FC<{ phone?: string; email?: string; address?: string; whatsappText?: string }> = ({ phone, email, address, whatsappText }) => {
  const p = useTheme();
  const items = [
    { label: 'Call', icon: Phone, on: () => callNumber(phone), ok: !!digits(phone) },
    { label: 'WhatsApp', icon: MessageCircle, on: () => openWhatsApp(phone, whatsappText), ok: !!digits(phone) },
    { label: 'Email', icon: Mail, on: () => sendEmail(email), ok: !!email },
    { label: 'Map', icon: MapPin, on: () => openMap(address), ok: !!address },
  ];
  return (
    <View style={{ flexDirection: 'row', gap: space.s }}>
      {items.map(({ label, icon: Icon, on, ok }) => (
        <Tap key={label} onPress={ok ? () => { haptic.light(); on(); } : undefined} scaleTo={0.94}
          style={{ flex: 1, backgroundColor: p.surface, borderRadius: radius.m, paddingVertical: 10, alignItems: 'center', gap: 4, opacity: ok ? 1 : 0.4 }}>
          <Icon size={20} color={p.accentText} />
          <T variant="caption" style={{ color: p.accentText }} weight="500">{label}</T>
        </Tap>
      ))}
    </View>
  );
};

// ---------------------------------------------------------------- header actions on tab roots

export const HeaderActions: React.FC = () => {
  const router = useRouter();
  const p = useTheme();
  const { user } = useAuth();
  const n = useQuery({ queryKey: ['notifications', 'list'], queryFn: api.getNotifications, staleTime: 60_000, refetchInterval: 120_000 });
  const unread = n.data?.unreadCount || 0;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <View>
        <IconButton icon={<Bell size={18} color={p.label} />} label={`Notifications${unread ? `, ${unread} unread` : ''}`} onPress={() => router.push('/notifications')} />
        {unread ? (
          <View style={{ position: 'absolute', top: -3, right: -3, minWidth: 17, height: 17, borderRadius: 9, backgroundColor: p.red, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
            <T variant="caption2" weight="700" color="white">{unread > 99 ? '99+' : unread}</T>
          </View>
        ) : null}
      </View>
      <Tap onPress={() => router.push('/account')} scaleTo={0.9} accessibilityLabel="Your account" hitSlop={6}>
        <Avatar name={user?.username || user?.email || '?'} size={34} />
      </Tap>
    </View>
  );
};

// ---------------------------------------------------------------- quick actions

export interface QuickAction { label: string; icon: React.ComponentType<{ size?: number; color?: string }>; tone: Tone; onPress: () => void }
export const QuickActions: React.FC<{ items: QuickAction[] }> = ({ items }) => {
  const p = useTheme();
  if (!items.length) return null;
  const rows: QuickAction[][] = [];
  items.forEach((it, i) => { if (i % 4 === 0) rows.push([]); rows[rows.length - 1].push(it); });
  return (
    <View style={{ gap: space.s }}>
      {rows.map((row, r) => (
        <View key={r} style={{ flexDirection: 'row', gap: space.s }}>
          {row.map(({ label, icon: Icon, tone, onPress }) => {
            const c = toneColors(p, tone);
            return (
              <View key={label} style={{ flex: 1 }}>
                <Tap onPress={() => { haptic.light(); onPress(); }} scaleTo={0.94}
                  style={[{ backgroundColor: p.surface, borderRadius: radius.l, paddingVertical: space.m, alignItems: 'center', gap: 6 }, elevation(p, 1)]}>
                  <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}><Icon size={20} color={c.fg} /></View>
                  <T variant="caption" weight="500" align="center" numberOfLines={1} style={{ paddingHorizontal: 2 }}>{label}</T>
                </Tap>
              </View>
            );
          })}
          {Array.from({ length: 4 - row.length }).map((_, i) => <View key={`pad${i}`} style={{ flex: 1 }} />)}
        </View>
      ))}
    </View>
  );
};

// ---------------------------------------------------------------- money

/** Total / paid / balance with a collection bar. */
export const MoneySummary: React.FC<{ total: number; paid: number; label?: string }> = ({ total, paid, label = 'Collected' }) => {
  const p = useTheme();
  const balance = Math.max(0, total - paid);
  const ratio = total > 0 ? paid / total : 0;
  return (
    <View style={[{ backgroundColor: p.surface, borderRadius: radius.l, padding: space.l, gap: space.m }, elevation(p, 1)]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <View>
          <T variant="footnote" color="secondary">Balance due</T>
          <T variant="title1" num color={balance > 0 ? 'label' : 'green'}>{formatINR(balance)}</T>
        </View>
        <T variant="footnote" color="secondary" num>{Math.round(ratio * 100)}% {label.toLowerCase()}</T>
      </View>
      <Progress value={ratio} tone={ratio >= 1 ? 'green' : 'accent'} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <T variant="footnote" color="secondary" num>Total {formatINR(total)}</T>
        <T variant="footnote" color="secondary" num>Paid {formatINR(paid)}</T>
      </View>
    </View>
  );
};

/** Bottom of a paged list. */
export const LoadMoreFooter: React.FC<{ loading: boolean; hasMore: boolean; count: number; total: number; noun?: string }> = ({ loading, hasMore, count, total, noun = 'items' }) =>
  loading ? <Spinner /> : count > 0 ? <T variant="footnote" color="secondary" align="center" style={{ paddingVertical: space.l }}>{hasMore ? `Showing ${count} of ${total}` : `${total} ${noun}`}</T> : null;

export const SectionTitle: React.FC<{ title: string; action?: { label: string; onPress: () => void } }> = ({ title, action }) => (
  <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 4, marginBottom: -space.s }}>
    <T variant="title3">{title}</T>
    {action ? <T variant="subhead" color="accent" onPress={action.onPress} suppressHighlighting>{action.label}</T> : null}
  </View>
);

export const PADDING = GUTTER;
