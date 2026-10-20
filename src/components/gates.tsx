import React, { useEffect, useState } from 'react';
import { Linking, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import * as Clipboard from 'expo-clipboard';
import { store } from '../lib/storage';
import { useQuery } from '@tanstack/react-query';
import { Construction, Lock, Megaphone, ShieldAlert, X } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { account } from '../lib/apis/account';
import { getServerState, onServerState, patchServerState, ServerState } from '../lib/serverState';
import { subscriptionLifecycle } from '../lib/subscription';
import { getUpdateState, onUpdateState } from '../lib/appConfig';
import { Button, Card, GUTTER, haptic, radius, Section, Sheet, space, T, Tap, TextField, toneColors, useOverlay, useTheme } from '../ds';

export function useServerState(): ServerState {
  const [s, setS] = useState(getServerState());
  useEffect(() => onServerState(setS), []);
  return s;
}

const FullPage: React.FC<{ icon: React.ReactNode; title: string; message: string; children?: React.ReactNode }> = ({ icon, title, message, children }) => {
  const p = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: p.bg, justifyContent: 'center', paddingHorizontal: GUTTER + 12, paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <View style={{ alignItems: 'center', gap: space.m }}>
        <View style={{ width: 76, height: 76, borderRadius: 22, backgroundColor: p.accentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: space.s }}>{icon}</View>
        <T variant="title1" align="center">{title}</T>
        <T variant="body" color="secondary" align="center">{message}</T>
      </View>
      <View style={{ marginTop: space.xxxl, gap: space.s }}>{children}</View>
    </View>
  );
};

/** SolarOS is being updated (platform admins keep working and never see this). */
export function MaintenanceScreen({ onRetry }: { onRetry: () => Promise<unknown> }) {
  const p = useTheme();
  const s = useServerState();
  const [busy, setBusy] = useState(false);
  const until = s.maintenance?.until ? new Date(s.maintenance.until).toLocaleString('en-IN', { hour: 'numeric', minute: '2-digit', day: 'numeric', month: 'short' }) : null;
  return (
    <FullPage icon={<Construction size={36} color={p.accentText} />} title="We'll be right back" message={`${s.maintenance?.message || 'SolarOS is being updated.'}${until ? `\n\nExpected back by ${until}.` : ''}`}>
      <Button title="Check again" loading={busy} onPress={async () => { setBusy(true); patchServerState({ maintenance: undefined }); await onRetry().catch(() => undefined); setBusy(false); }} full />
    </FullPage>
  );
}

/** The company's account can't be used (expired, suspended, archived, demo over). */
export function BlockedScreen() {
  const p = useTheme();
  const s = useServerState();
  const { logout, user } = useAuth();
  const title = { TENANT_EXPIRED: 'Subscription ended', TENANT_SUSPENDED: 'Account paused', TENANT_ARCHIVED: 'Account closed', DEMO_EXPIRED: 'Demo has ended' }[s.blocked?.code || ''] || 'Account unavailable';
  return (
    <FullPage icon={<Lock size={34} color={p.accentText} />} title={title} message={s.blocked?.message || ''}>
      {user?.role === 'ADMIN' ? <Button title="Contact SolarOS" kind="tinted" onPress={() => Linking.openURL('mailto:hello@voidlayer.in?subject=SolarOS%20account')} full /> : null}
      <Button title="Sign out" kind="gray" onPress={() => { patchServerState({ blocked: undefined }); void logout(); }} full />
    </FullPage>
  );
}

/** Temporary / expired password: choose a new one before anything else. */
export function SetPasswordScreen() {
  const p = useTheme();
  const insets = useSafeAreaInsets();
  const { user, applyToken, logout } = useAuth();
  const { toast } = useOverlay();
  const rules = useQuery({ queryKey: ['security', 'me'], queryFn: account.security });
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const r = rules.data?.passwordRules;
  const problems = [
    pw.length < (r?.minLength || 8) ? `at least ${r?.minLength || 8} characters` : '',
    r?.requireNumber && !/\d/.test(pw) ? 'a number' : '',
    r?.requireSymbol && !/[^A-Za-z0-9]/.test(pw) ? 'a symbol' : '',
    r?.requireMixedCase && !(/[a-z]/.test(pw) && /[A-Z]/.test(pw)) ? 'upper and lower case' : '',
  ].filter(Boolean);
  const save = async () => {
    if (problems.length) { setError(`Use ${problems.join(', ')}.`); haptic.error(); return; }
    if (pw !== confirm) { setError("The two passwords don't match."); haptic.error(); return; }
    setBusy(true);
    setError('');
    try {
      const res = await account.changePassword(pw);
      if (res.token) await applyToken(res.token);
      toast('Password saved');
    } catch (e: any) {
      setError(e.message);
      haptic.error();
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <KeyboardAwareScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: GUTTER + 4, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }} keyboardShouldPersistTaps="handled" bottomOffset={24}>
        <View style={{ alignItems: 'center', gap: space.s, marginBottom: space.xxl }}>
          <View style={{ width: 72, height: 72, borderRadius: 20, backgroundColor: p.accentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: space.s }}><ShieldAlert size={34} color={p.accentText} /></View>
          <T variant="title1" align="center">Choose your password</T>
          <T variant="subhead" color="secondary" align="center">{user?.temporaryPassword ? 'You signed in with a temporary password. Set your own to continue.' : 'Your password has expired. Set a new one to continue.'}</T>
        </View>
        <Section footer={r ? `At least ${r.minLength} characters${r.requireNumber ? ', a number' : ''}${r.requireSymbol ? ', a symbol' : ''}${r.requireMixedCase ? ', upper and lower case' : ''}.${r.history ? ` Can't be one of your last ${r.history}.` : ''}` : undefined}>
          <TextField label="New password" value={pw} onChange={setPw} kind="password" autoFocus />
          <TextField label="Confirm password" value={confirm} onChange={setConfirm} kind="password" onSubmit={save} />
        </Section>
        {error ? <T variant="footnote" color="red" align="center" style={{ marginTop: space.m }}>{error}</T> : null}
        <Button title="Save and continue" loading={busy} onPress={save} full style={{ marginTop: space.xl }} />
        <Button title="Sign out" kind="plain" size="m" onPress={() => void logout()} style={{ alignSelf: 'center', marginTop: space.s }} />
      </KeyboardAwareScrollView>
    </View>
  );
}

/** Shown once after two-factor was turned on at sign-in. */
export function BackupCodesSheet() {
  const { freshBackupCodes, clearBackupCodes } = useAuth();
  const { toast } = useOverlay();
  const p = useTheme();
  return (
    <Sheet visible={!!freshBackupCodes} onClose={clearBackupCodes} title="Save your backup codes" footer={<Button title="I've saved them" onPress={clearBackupCodes} full style={{ flex: 1 }} />}>
      <View style={{ paddingHorizontal: GUTTER, gap: space.m }}>
        <T variant="subhead" color="secondary">Each code works once if you lose your phone. Keep them somewhere safe — they won't be shown again.</T>
        <View style={{ backgroundColor: p.surface, borderRadius: radius.m + 2, padding: space.l, flexDirection: 'row', flexWrap: 'wrap', gap: space.m }}>
          {(freshBackupCodes || []).map((c) => <T key={c} variant="headline" num selectable style={{ width: '45%' }}>{c}</T>)}
        </View>
        <Button title="Copy all" kind="gray" size="m" onPress={async () => { await Clipboard.setStringAsync((freshBackupCodes || []).join('\n')); toast('Copied'); }} />
      </View>
    </Sheet>
  );
}

/** Owners must accept new Terms / Privacy before using the workspace. */
export function LegalSheet() {
  const { user, tenant } = useAuth();
  const { toast } = useOverlay();
  const isOwner = user?.role === 'ADMIN' && !!tenant;
  const me = useQuery({ queryKey: ['me', 'platform'], queryFn: account.platformMe, enabled: isOwner, staleTime: 10 * 60_000 });
  const pending = me.data?.legalPending || [];
  const [open, setOpen] = useState<string | null>(null);
  const doc = useQuery({ queryKey: ['legal', open], queryFn: () => account.legalPage(open!), enabled: !!open });
  const [busy, setBusy] = useState(false);
  return (
    <Sheet visible={isOwner && pending.length > 0} onClose={() => {}} title="Updated terms" full={!!open}
      footer={<Button title="Accept and continue" loading={busy} full style={{ flex: 1 }} onPress={async () => { setBusy(true); try { await account.acceptLegal(); await me.refetch(); toast('Thank you'); } catch (e: any) { toast(e.message, 'error'); } finally { setBusy(false); } }} />}>
      <ScrollView style={{ paddingHorizontal: GUTTER }} contentContainerStyle={{ gap: space.m, paddingBottom: space.m }}>
        <T variant="subhead" color="secondary">On behalf of {tenant?.name}, please read and accept:</T>
        <Section>
          {pending.map((d) => <Tap key={d.key} onPress={() => setOpen(open === d.key ? null : d.key)} style={{ padding: space.l }}><T variant="body" color="accent">{d.title} (version {d.version})</T></Tap>)}
        </Section>
        {open && doc.data ? <Card><T variant="subhead" selectable>{doc.data.document.content}</T></Card> : null}
      </ScrollView>
    </Sheet>
  );
}

const DISMISSED = 'solaros_dismissed_announcements';

/** Banners from Super Admin → Announcements, plus the company's read-only / grace notice. */
export function WorkspaceNotices() {
  const p = useTheme();
  const { tenant, user } = useAuth();
  const s = useServerState();
  const [dismissed, setDismissed] = useState<string[]>([]);
  useEffect(() => { store.get(DISMISSED).then((v) => setDismissed(v ? JSON.parse(v) : [])).catch(() => {}); }, []);
  const ann = useQuery({ queryKey: ['me', 'announcements'], queryFn: account.announcements, enabled: !!user && user.role !== 'SUPER_ADMIN', staleTime: 5 * 60_000 });
  const [upd, setUpd] = useState(getUpdateState());
  useEffect(() => onUpdateState(setUpd), []);
  const life = tenant ? subscriptionLifecycle(tenant.subscription, tenant.status) : null;
  const notices: { id: string; tone: 'orange' | 'red' | 'blue' | 'green'; title: string; message: string; link?: { url: string; label: string }; closable: boolean }[] = [];
  if (user?.role === 'ADMIN' && life) {
    if (life.state === 'read_only' || s.readOnly) notices.push({ id: 'ro', tone: 'red', title: 'Read-only', message: s.readOnly || 'Renewal is overdue. You can view everything but not add or change records until the payment is made.', closable: false });
    else if (life.state === 'grace') notices.push({ id: 'grace', tone: 'orange', title: 'Renewal overdue', message: `Your SolarOS plan was due ${life.overdueDays} day${life.overdueDays === 1 ? '' : 's'} ago. It becomes read-only in ${life.daysToNextStep} days.`, closable: false });
  }
  if (upd.available && !upd.required && !dismissed.includes(`update-${upd.latestVersion}`)) {
    notices.push({ id: `update-${upd.latestVersion}`, tone: 'blue', title: 'New version available', message: `SolarOS ${upd.latestVersion || ''} is ready to install.`.replace('  ', ' '), link: upd.url ? { url: upd.url, label: 'Download update' } : undefined, closable: true });
  }
  for (const a of ann.data?.announcements || []) {
    if (!dismissed.includes(a.id)) notices.push({ id: a.id, tone: a.tone === 'warning' ? 'orange' : a.tone === 'success' ? 'green' : 'blue', title: a.title, message: a.message, link: a.linkUrl ? { url: a.linkUrl, label: a.linkLabel || 'Learn more' } : undefined, closable: true });
  }
  if (!notices.length) return null;
  const close = (id: string) => { const next = [...dismissed, id].slice(-50); setDismissed(next); void store.set(DISMISSED, JSON.stringify(next)).catch(() => {}); };
  return (
    <View style={{ gap: space.s }}>
      {notices.map((n) => {
        const c = toneColors(p, n.tone);
        return (
          <View key={n.id} style={{ backgroundColor: c.bg, borderRadius: radius.l, padding: space.l, flexDirection: 'row', gap: space.m }}>
            <Megaphone size={20} color={c.fg} />
            <View style={{ flex: 1, gap: 2 }}>
              <T variant="headline" style={{ color: c.fg }}>{n.title}</T>
              <T variant="subhead">{n.message}</T>
              {n.link ? <T variant="subhead" weight="600" style={{ color: c.fg, marginTop: 4 }} onPress={() => Linking.openURL(n.link!.url)}>{n.link.label} ›</T> : null}
            </View>
            {n.closable ? <Tap onPress={() => close(n.id)} hitSlop={10} accessibilityLabel="Dismiss"><X size={18} color={p.secondary} /></Tap> : null}
          </View>
        );
      })}
    </View>
  );
}
