import React, { useState } from 'react';
import { Alert, Linking, Platform, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useQueryClient } from '@tanstack/react-query';
import { Database, KeyRound, LogOut, MonitorSmartphone, ShieldCheck, Download, Trash2 } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { account } from '../../lib/apis/account';
import { useApi } from '../../lib/query';
import { APP_VERSION, getApiBase } from '../../lib/appConfig';
import { formatDate, timeAgo } from '../../lib/formatters';
import { Avatar, Badge, Button, GUTTER, IconTile, InfoRow, Row, Screen, Section, Sheet, space, T, TextField, useOverlay, useTheme, radius, elevation, haptic, type } from '../../ds';
import { TextInput } from 'react-native';

/** Your profile, password, two-factor, devices, privacy and sign-out. */
export function AccountScreen({ tab = false }: { tab?: boolean }) {
  const p = useTheme();
  const router = useRouter();
  const { user, customer, tenant, logout } = useAuth();
  const sec = useApi(['security', 'me'], account.security);
  const [sheet, setSheet] = useState<null | 'password' | 'mfa-on' | 'mfa-off' | 'codes' | 'privacy'>(null);
  const isCustomer = user?.role === 'CUSTOMER';
  const roleLabel = user?.role === 'SUPER_ADMIN' ? `SolarOS ${((user as any).platformRole || 'owner').replace(/^./, (c: string) => c.toUpperCase())}` : isCustomer ? 'Customer' : (user as any)?.roleName || 'Staff';

  const signOut = () => {
    const go = () => { haptic.warning(); void logout(); };
    if (Platform.OS === 'web') go();
    else Alert.alert('Sign out?', 'You will need your password to sign in again.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Sign out', style: 'destructive', onPress: go }]);
  };

  return (
    <Screen title="Account" large={tab} back={!tab} refreshing={sec.refreshing} onRefresh={sec.refresh}>
      <View style={[{ backgroundColor: p.surface, borderRadius: radius.l, padding: space.l, flexDirection: 'row', alignItems: 'center', gap: space.l }, elevation(p, 1)]}>
        <Avatar name={customer?.name || user?.username || ''} size={64} />
        <View style={{ flex: 1, gap: 2 }}>
          <T variant="title3" numberOfLines={1}>{customer?.name || user?.username}</T>
          <T variant="subhead" color="secondary" numberOfLines={1}>{user?.email}</T>
          <T variant="footnote" color="secondary" numberOfLines={1}>{roleLabel}{tenant ? ` · ${tenant.name}` : ''}</T>
        </View>
      </View>

      <Section header="Sign-in & security" footer={sec.data?.passwordChangedAt ? `Password last changed ${formatDate(sec.data.passwordChangedAt)}.` : undefined}>
        <Row icon={<IconTile icon={<KeyRound size={17} color={p.blue} />} tone="blue" />} title="Change password" onPress={() => setSheet('password')} />
        {sec.data?.mfaAvailable !== false ? (
          <Row icon={<IconTile icon={<ShieldCheck size={17} color={p.green} />} tone="green" />} title="Two-factor authentication"
            accessory={<Badge text={sec.data?.mfaEnabled ? 'On' : 'Off'} tone={sec.data?.mfaEnabled ? 'green' : 'gray'} />}
            subtitle={sec.data?.mfaEnabled ? `${sec.data.backupCodesLeft} backup codes left` : sec.data?.mfaRequired ? 'Required for your account' : 'Code from an authenticator app at sign-in'}
            onPress={() => setSheet(sec.data?.mfaEnabled ? 'mfa-off' : 'mfa-on')} />
        ) : null}
        {sec.data?.mfaEnabled ? <Row icon={<IconTile icon={<Database size={17} color={p.purple} />} tone="purple" />} title="New backup codes" onPress={() => setSheet('codes')} /> : null}
        <Row icon={<IconTile icon={<MonitorSmartphone size={17} color={p.orange} />} tone="orange" />} title="Devices & sessions" subtitle="Where you're signed in" onPress={() => router.push('/sessions')} />
      </Section>

      {isCustomer ? (
        <Section header="Your data & privacy" footer="Ask your solar company for a copy of your personal data, or to delete it. Invoices and payments are kept as GST law requires.">
          <Row icon={<IconTile icon={<Download size={17} color={p.teal} />} tone="teal" />} title="Get a copy of my data" onPress={() => setSheet('privacy')} />
        </Section>
      ) : null}

      <Section header="About">
        <InfoRow label="App version" value={APP_VERSION} />
        <InfoRow label="Server" value={getApiBase().replace(/^https?:\/\//, '').replace(/\/api$/, '')} />
        {sec.data?.currentIp ? <InfoRow label="Your network" value={sec.data.currentIp} /> : null}
      </Section>

      <Section>
        <Row icon={<IconTile icon={<LogOut size={17} color={p.red} />} tone="red" />} title="Sign out" destructive onPress={signOut} chevron={false} />
      </Section>

      <PasswordSheet visible={sheet === 'password'} onClose={() => setSheet(null)} />
      <MfaOnSheet visible={sheet === 'mfa-on'} onClose={() => { setSheet(null); void sec.refresh(); }} />
      <MfaOffSheet visible={sheet === 'mfa-off'} onClose={() => { setSheet(null); void sec.refresh(); }} />
      <CodesSheet visible={sheet === 'codes'} onClose={() => { setSheet(null); void sec.refresh(); }} />
      {isCustomer ? <PrivacySheet visible={sheet === 'privacy'} onClose={() => setSheet(null)} /> : null}
    </Screen>
  );
}

function PasswordSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { applyToken } = useAuth();
  const { toast } = useOverlay();
  const [cur, setCur] = useState(''); const [pw, setPw] = useState(''); const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  React.useEffect(() => { if (visible) { setCur(''); setPw(''); setConfirm(''); setError(''); } }, [visible]);
  const save = async () => {
    if (!cur) return setError('Enter your current password.');
    if (pw.length < 8) return setError('Use at least 8 characters.');
    if (pw !== confirm) return setError("The new passwords don't match.");
    setBusy(true); setError('');
    try {
      const r = await account.changePassword(pw, cur);
      if (r.token) await applyToken(r.token);
      onClose();
      toast('Password changed. Other devices were signed out.');
    } catch (e: any) { setError(e.message); haptic.error(); } finally { setBusy(false); }
  };
  return (
    <Sheet visible={visible} onClose={onClose} title="Change password" footer={<Button title="Save" loading={busy} onPress={save} style={{ flex: 1 }} />}>
      <View style={{ paddingHorizontal: GUTTER, gap: space.m }}>
        <Section>
          <TextField label="Current password" value={cur} onChange={setCur} kind="password" autoFocus />
          <TextField label="New password" value={pw} onChange={setPw} kind="password" />
          <TextField label="Confirm new password" value={confirm} onChange={setConfirm} kind="password" onSubmit={save} />
        </Section>
        {error ? <T variant="footnote" color="red">{error}</T> : null}
      </View>
    </Sheet>
  );
}

const CodeInput: React.FC<{ value: string; onChange: (v: string) => void; onSubmit?: () => void }> = ({ value, onChange, onSubmit }) => {
  const p = useTheme();
  return (
    <View style={{ backgroundColor: p.surface, borderRadius: radius.m + 2, padding: space.l }}>
      <TextInput value={value} onChangeText={(v) => onChange(v.replace(/[^0-9A-Za-z-]/g, '').slice(0, 12))} placeholder="000000" placeholderTextColor={p.tertiary} keyboardType="number-pad" textContentType="oneTimeCode" onSubmitEditing={onSubmit}
        style={[type.title2, { color: p.label, textAlign: 'center', letterSpacing: 8, fontVariant: ['tabular-nums'] }]} />
    </View>
  );
};

const BackupList: React.FC<{ codes: string[] }> = ({ codes }) => {
  const p = useTheme();
  const { toast } = useOverlay();
  return (
    <View style={{ gap: space.s }}>
      <View style={{ backgroundColor: p.surface, borderRadius: radius.m + 2, padding: space.l, flexDirection: 'row', flexWrap: 'wrap', gap: space.m }}>
        {codes.map((c) => <T key={c} variant="headline" num selectable style={{ width: '45%' }}>{c}</T>)}
      </View>
      <Button title="Copy all" kind="gray" size="m" onPress={async () => { await Clipboard.setStringAsync(codes.join('\n')); toast('Copied'); }} />
    </View>
  );
};

function MfaOnSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useOverlay();
  const [setup, setSetup] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [code, setCode] = useState(''); const [codes, setCodes] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  React.useEffect(() => {
    if (!visible) return;
    setSetup(null); setCode(''); setCodes(null); setError('');
    account.startMfa().then(setSetup).catch((e) => setError(e.message));
  }, [visible]);
  const enable = async () => {
    setBusy(true); setError('');
    try { const r = await account.enableMfa(code); setCodes(r.backupCodes); haptic.success(); void qc.invalidateQueries({ queryKey: ['security'] }); } catch (e: any) { setError(e.message); haptic.error(); } finally { setBusy(false); }
  };
  return (
    <Sheet visible={visible} onClose={onClose} title={codes ? 'Save your backup codes' : 'Turn on two-factor'}
      footer={codes ? <Button title="Done" onPress={onClose} style={{ flex: 1 }} /> : <Button title="Turn on" loading={busy} disabled={code.length < 6} onPress={enable} style={{ flex: 1 }} />}>
      <View style={{ paddingHorizontal: GUTTER, gap: space.m }}>
        {codes ? (
          <><T variant="subhead" color="secondary">Each code works once if you lose your phone. They won't be shown again.</T><BackupList codes={codes} /></>
        ) : (
          <>
            <T variant="subhead" color="secondary">Add SolarOS to an authenticator app (Google or Microsoft Authenticator), then enter the 6-digit code it shows.</T>
            <View style={{ alignItems: 'center', gap: space.s }}>
              <T variant="headline" num selectable style={{ letterSpacing: 2 }}>{setup ? setup.secret.replace(/(.{4})/g, '$1 ').trim() : '…'}</T>
              <View style={{ flexDirection: 'row', gap: space.s }}>
                <Button title="Copy key" kind="gray" size="m" disabled={!setup} onPress={async () => { await Clipboard.setStringAsync(setup!.secret); toast('Key copied'); }} />
                <Button title="Open authenticator" kind="tinted" size="m" disabled={!setup} onPress={() => Linking.openURL(setup!.otpauthUrl).catch(() => toast('No authenticator app found — copy the key.', 'error'))} />
              </View>
            </View>
            <CodeInput value={code} onChange={setCode} onSubmit={enable} />
          </>
        )}
        {error ? <T variant="footnote" color="red">{error}</T> : null}
      </View>
    </Sheet>
  );
}

function MfaOffSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { toast } = useOverlay();
  const [pw, setPw] = useState(''); const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  React.useEffect(() => { if (visible) { setPw(''); setCode(''); setError(''); } }, [visible]);
  const off = async () => {
    setBusy(true); setError('');
    try { await account.disableMfa(pw, code); onClose(); toast('Two-factor turned off'); } catch (e: any) { setError(e.message); haptic.error(); } finally { setBusy(false); }
  };
  return (
    <Sheet visible={visible} onClose={onClose} title="Turn off two-factor" footer={<Button title="Turn off" kind="destructive" loading={busy} onPress={off} style={{ flex: 1 }} />}>
      <View style={{ paddingHorizontal: GUTTER, gap: space.m }}>
        <T variant="subhead" color="secondary">Your account will be protected by the password only.</T>
        <Section><TextField label="Password" value={pw} onChange={setPw} kind="password" /></Section>
        <CodeInput value={code} onChange={setCode} onSubmit={off} />
        {error ? <T variant="footnote" color="red">{error}</T> : null}
      </View>
    </Sheet>
  );
}

function CodesSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [code, setCode] = useState(''); const [codes, setCodes] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  React.useEffect(() => { if (visible) { setCode(''); setCodes(null); setError(''); } }, [visible]);
  const renew = async () => {
    setBusy(true); setError('');
    try { setCodes((await account.renewBackupCodes(code)).backupCodes); haptic.success(); } catch (e: any) { setError(e.message); haptic.error(); } finally { setBusy(false); }
  };
  return (
    <Sheet visible={visible} onClose={onClose} title="New backup codes" footer={codes ? <Button title="Done" onPress={onClose} style={{ flex: 1 }} /> : <Button title="Make new codes" loading={busy} onPress={renew} style={{ flex: 1 }} />}>
      <View style={{ paddingHorizontal: GUTTER, gap: space.m }}>
        {codes ? <BackupList codes={codes} /> : <><T variant="subhead" color="secondary">The old codes stop working. Enter a current code from your authenticator.</T><CodeInput value={code} onChange={setCode} onSubmit={renew} /></>}
        {error ? <T variant="footnote" color="red">{error}</T> : null}
      </View>
    </Sheet>
  );
}

function PrivacySheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { toast } = useOverlay();
  const p = useTheme();
  const reqs = useApi(['privacy-requests', 'mine'], account.myDataRequests, { enabled: visible });
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const ask = async (type: 'copy' | 'delete') => {
    setBusy(type);
    try { await account.createMyDataRequest(type, note || undefined); setNote(''); await reqs.refresh(); toast(type === 'copy' ? 'Request sent — your company will share your data.' : 'Delete request sent to your company.'); } catch (e: any) { toast(e.message, 'error'); } finally { setBusy(null); }
  };
  const confirmDelete = () => Alert.alert('Delete your data?', 'Your company will remove your personal details. Invoices and payments stay for GST records. Your portal login will stop working.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Ask to delete', style: 'destructive', onPress: () => void ask('delete') }]);
  return (
    <Sheet visible={visible} onClose={onClose} title="Your data & privacy">
      <View style={{ paddingHorizontal: GUTTER, gap: space.m, paddingBottom: space.m }}>
        <Section><TextField label="Note (optional)" value={note} onChange={setNote} multiline /></Section>
        <View style={{ flexDirection: 'row', gap: space.s }}>
          <Button title="Get a copy" kind="tinted" loading={busy === 'copy'} onPress={() => void ask('copy')} style={{ flex: 1 }} icon={<Download size={17} color={p.accentText} />} />
          <Button title="Delete my data" kind="destructive" loading={busy === 'delete'} onPress={Platform.OS === 'web' ? () => void ask('delete') : confirmDelete} style={{ flex: 1 }} icon={<Trash2 size={17} color={p.red} />} />
        </View>
        {(reqs.data?.requests || []).length ? (
          <Section header="Your requests">
            {reqs.data!.requests.map((r) => <Row key={r.id} title={r.type === 'copy' ? 'Copy of my data' : 'Delete my data'} subtitle={`${timeAgo(r.createdAt)}${r.outcome ? ` · ${r.outcome}` : ''}`} accessory={<Badge text={r.status} />} />)}
          </Section>
        ) : null}
      </View>
    </Sheet>
  );
}

