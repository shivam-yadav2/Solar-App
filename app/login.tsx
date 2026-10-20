import React, { useState } from 'react';
import { Image, Linking, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import * as Clipboard from 'expo-clipboard';
import { Eye, EyeOff, ShieldCheck, KeyRound } from 'lucide-react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { useAuth } from '../src/context/AuthContext';
import { account } from '../src/lib/apis/account';
import { Button, GUTTER, haptic, radius, Section, Sheet, space, T, Tap, TextField, type, useOverlay, useTheme } from '../src/ds';

export default function LoginScreen() {
  const { pendingMfa } = useAuth();
  const p = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <KeyboardAwareScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: GUTTER + 4, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 }}
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <View style={{ width: '100%', maxWidth: 420, alignSelf: 'center' }}>
          {pendingMfa ? <MfaStep key="mfa" /> : <CredentialsStep key="creds" />}
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

function Brand({ title, subtitle }: { title: string; subtitle: string }) {
  const p = useTheme();
  return (
    <View style={{ alignItems: 'center', marginBottom: space.xxxl }}>
      <View style={{ width: 92, height: 92, borderRadius: 22, overflow: 'hidden', marginBottom: space.xl, backgroundColor: '#071426', shadowColor: '#000', shadowOpacity: p.dark ? 0 : 0.18, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 10 }}>
        <Image source={require('../assets/branding/brand-login-icon-v3.jpg')} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
      </View>
      <T variant="title1" align="center">{title}</T>
      <T variant="subhead" color="secondary" align="center" style={{ marginTop: 6 }}>{subtitle}</T>
    </View>
  );
}

function CredentialsStep() {
  const { login } = useAuth();
  const p = useTheme();
  const { toast } = useOverlay();
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [forgot, setForgot] = useState(false);

  const submit = async () => {
    if (!id.trim() || !password) { setError('Enter your email (or mobile) and password.'); haptic.error(); return; }
    setBusy(true);
    setError('');
    try {
      await login(id.trim(), password);
    } catch (e: any) {
      setError(e?.message || 'Could not sign in.');
      haptic.error();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Animated.View entering={FadeInDown.springify().damping(18)} exiting={FadeOutUp.duration(160)}>
      <Brand title="Sign in to SolarOS" subtitle="Your solar business — projects, payments and customers — in your pocket." />
      <Section>
        <TextField label="Email, username or mobile" value={id} onChange={setId} kind="email" placeholder="you@company.com" />
        <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
          <View style={{ flex: 1 }}>
            <TextField label="Password" value={password} onChange={setPassword} kind={show ? 'text' : 'password'} placeholder="Required" onSubmit={submit} />
          </View>
          <Tap onPress={() => setShow((v) => !v)} hitSlop={10} style={{ padding: 14 }} accessibilityLabel={show ? 'Hide password' : 'Show password'}>
            {show ? <EyeOff size={20} color={p.secondary} /> : <Eye size={20} color={p.secondary} />}
          </Tap>
        </View>
      </Section>
      {error ? <T variant="footnote" color="red" align="center" style={{ marginTop: space.m }}>{error}</T> : null}
      <Button title="Sign In" onPress={submit} loading={busy} full style={{ marginTop: space.xl }} />
      <Button title="Forgot password?" kind="plain" size="m" onPress={() => setForgot(true)} style={{ marginTop: space.s, alignSelf: 'center' }} />
      <ForgotSheet visible={forgot} onClose={() => setForgot(false)} initial={id} onSent={(m) => toast(m, 'info')} />
    </Animated.View>
  );
}

function ForgotSheet({ visible, onClose, initial, onSent }: { visible: boolean; onClose: () => void; initial: string; onSent: (m: string) => void }) {
  const [identifier, setIdentifier] = useState(initial);
  const [company, setCompany] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  React.useEffect(() => { if (visible) { setIdentifier(initial); setError(''); } }, [visible, initial]);
  const send = async () => {
    if (!identifier.trim()) { setError('Enter your email, username or mobile number.'); return; }
    setBusy(true);
    try {
      const r = await account.forgotPassword(identifier.trim(), company.trim() || undefined);
      onClose();
      onSent(r.message);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet visible={visible} onClose={onClose} title="Reset password" footer={<Button title="Send reset link" onPress={send} loading={busy} full style={{ flex: 1 }} />}>
      <View style={{ paddingHorizontal: GUTTER, gap: space.m }}>
        <T variant="subhead" color="secondary">We'll send a link to the email or phone on your account. It works for 30 minutes.</T>
        <Section footer="Customers: the code of your solar company (on your invoice or login link). Staff can leave it empty.">
          <TextField label="Email, username or mobile" value={identifier} onChange={setIdentifier} kind="email" />
          <TextField label="Company code (optional)" value={company} onChange={setCompany} kind="email" placeholder="e.g. samadhaangroups" />
        </Section>
        {error ? <T variant="footnote" color="red">{error}</T> : null}
      </View>
    </Sheet>
  );
}

function MfaStep() {
  const { pendingMfa, verifyMfa, enableMfaAtLogin, cancelMfa } = useAuth();
  const p = useTheme();
  const { toast } = useOverlay();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [setup, setSetup] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const isSetup = !!pendingMfa?.setup;

  React.useEffect(() => {
    if (isSetup && pendingMfa) account.loginMfaSetup(pendingMfa.mfaToken).then(setSetup).catch((e) => setError(e.message));
  }, [isSetup, pendingMfa]);

  const submit = async () => {
    const c = code.replace(/\s/g, '');
    if (c.length < 6) { setError('Enter the 6-digit code from your authenticator app.'); haptic.error(); return; }
    setBusy(true);
    setError('');
    try {
      if (isSetup) await enableMfaAtLogin(c); else await verifyMfa(c);
    } catch (e: any) {
      setError(e.message);
      haptic.error();
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Animated.View entering={FadeInDown.springify().damping(18)} exiting={FadeOutUp.duration(160)}>
      <View style={{ alignItems: 'center', marginBottom: space.xxl }}>
        <View style={{ width: 72, height: 72, borderRadius: 20, backgroundColor: p.accentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: space.l }}>
          {isSetup ? <KeyRound size={34} color={p.accentText} /> : <ShieldCheck size={34} color={p.accentText} />}
        </View>
        <T variant="title1" align="center">{isSetup ? 'Set up two-factor' : 'Two-factor code'}</T>
        <T variant="subhead" color="secondary" align="center" style={{ marginTop: 6 }}>
          {isSetup
            ? 'Your account needs a code from an authenticator app (Google Authenticator, Microsoft Authenticator…) at every sign-in.'
            : `Open your authenticator app and enter the code for ${pendingMfa?.email}. A backup code also works.`}
        </T>
      </View>

      {isSetup ? (
        <Section header="1 · Add SolarOS to your authenticator" footer="Tap “Open authenticator”, or copy the key and paste it into the app as a new account.">
          <View style={{ padding: space.l, gap: space.m }}>
            <T variant="headline" num selectable style={{ letterSpacing: 2, textAlign: 'center' }}>{setup ? setup.secret.replace(/(.{4})/g, '$1 ').trim() : '…'}</T>
            <View style={{ flexDirection: 'row', gap: space.s }}>
              <Button title="Copy key" kind="gray" size="m" style={{ flex: 1 }} disabled={!setup} onPress={async () => { await Clipboard.setStringAsync(setup!.secret); toast('Key copied'); }} />
              <Button title="Open authenticator" kind="tinted" size="m" style={{ flex: 1 }} disabled={!setup} onPress={() => Linking.openURL(setup!.otpauthUrl).catch(() => toast('No authenticator app found — copy the key instead.', 'error'))} />
            </View>
          </View>
        </Section>
      ) : null}

      <View style={{ marginTop: isSetup ? space.xl : 0 }}>
        {isSetup ? <T variant="footnote" color="secondary" style={{ paddingHorizontal: space.l, marginBottom: 6, textTransform: 'uppercase' }}>2 · Enter the code it shows</T> : null}
        <View style={{ backgroundColor: p.surface, borderRadius: radius.m + 2, paddingVertical: space.l, paddingHorizontal: space.l }}>
          <TextInput
            value={code}
            onChangeText={(v) => setCode(v.replace(/[^0-9A-Za-z-]/g, '').slice(0, 12))}
            placeholder="000000"
            placeholderTextColor={p.tertiary}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            autoFocus
            onSubmitEditing={submit}
            style={[type.title1, { color: p.label, textAlign: 'center', letterSpacing: 10, fontVariant: ['tabular-nums'] }]}
          />
        </View>
      </View>
      {error ? <T variant="footnote" color="red" align="center" style={{ marginTop: space.m }}>{error}</T> : null}
      <Button title={isSetup ? 'Turn on and sign in' : 'Verify'} onPress={submit} loading={busy} full style={{ marginTop: space.xl }} />
      <Button title="Back" kind="plain" size="m" onPress={cancelMfa} style={{ marginTop: space.s, alignSelf: 'center' }} />
    </Animated.View>
  );
}
