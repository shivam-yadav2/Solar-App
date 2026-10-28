import React, { useEffect, useState } from 'react';
import { Linking, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Download, X } from 'lucide-react-native';
import { APP_VERSION, checkAppConfig, getUpdateState, onUpdateState, UpdateState } from '../lib/appConfig';
import { Button, IconButton, IconTile, space, T, useTheme } from '../ds';

function useUpdateState() {
  const [state, setState] = useState<UpdateState>(getUpdateState());
  useEffect(() => onUpdateState(setState), []);
  return state;
}
const openUrl = (url?: string) => { if (url) void Linking.openURL(url); };

/**
 * Full screen "update the app" when this copy is older than the minimum
 * version set in Super Admin → Mobile app. Render last, over everything.
 */
export function UpdateBlocker() {
  const p = useTheme();
  const state = useUpdateState();
  const [checking, setChecking] = useState(false);

  if (!state.required) return null;
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: p.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xl, gap: space.m, zIndex: 100, elevation: 100 }}>
      <IconTile icon={<Download size={30} color={p.accentText} />} size={64} />
      <T variant="title2" align="center">Update SolarOS</T>
      <T variant="body" color="secondary" align="center">{state.message || 'This version of the app is no longer supported. Install the new version to continue.'}</T>
      <T variant="footnote" color="secondary">Your version: {APP_VERSION}</T>
      <View style={{ alignSelf: 'stretch', gap: space.s, marginTop: space.l }}>
        {state.url ? <Button title="Download Update" onPress={() => openUrl(state.url)} full /> : <T variant="footnote" color="secondary" align="center">Ask your company admin or SolarOS support for the new app.</T>}
        <Button title="Check Again" kind="plain" loading={checking} onPress={async () => { setChecking(true); await checkAppConfig().catch(() => undefined); setChecking(false); }} full />
      </View>
    </View>
  );
}

/** Small "new version available" bar (closable). */
export function UpdateBanner({ withTopInset }: { withTopInset?: boolean }) {
  const p = useTheme();
  const state = useUpdateState();
  const [dismissed, setDismissed] = useState(false);

  if (state.required || !state.available || dismissed) return null;
  return (
    <SafeAreaView edges={withTopInset ? ['top'] : []} style={{ backgroundColor: p.surface }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: space.l, gap: space.s, minHeight: 44 }}>
        <T variant="footnote" style={{ flex: 1 }}>A new version of SolarOS{state.latestVersion ? ` (${state.latestVersion})` : ''} is available.</T>
        {state.url ? <Button title="Update" size="s" kind="tinted" onPress={() => openUrl(state.url)} /> : null}
        <IconButton icon={<X size={16} color={p.secondary} />} label="Later" onPress={() => setDismissed(true)} size={44} />
      </View>
    </SafeAreaView>
  );
}
