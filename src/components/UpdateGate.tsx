import React, { useEffect, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Download, X } from 'lucide-react-native';
import { APP_VERSION, checkAppConfig, getUpdateState, onUpdateState, UpdateState } from '../lib/appConfig';

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
  const state = useUpdateState();
  const [checking, setChecking] = useState(false);
  const open = () => openUrl(state.url);

  if (state.required) {
    return (
      <View className="absolute inset-0 bg-[#071426] items-center justify-center px-8" style={{ zIndex: 100, elevation: 100 }}>
        <View className="w-16 h-16 rounded-2xl bg-amber-500/15 items-center justify-center mb-5">
          <Download size={30} color="#f59e0b" />
        </View>
        <Text className="text-slate-50 text-2xl font-extrabold text-center">Please update SolarOS</Text>
        <Text className="text-slate-300 text-sm text-center mt-3 leading-5">
          {state.message || 'This version of the app is no longer supported. Install the new version to continue.'}
        </Text>
        <Text className="text-slate-500 text-xs mt-2">Your version: {APP_VERSION}</Text>
        {state.url ? (
          <Pressable onPress={open} className="mt-7 bg-amber-500 rounded-xl px-6 py-3.5 w-full items-center active:opacity-80">
            <Text className="text-slate-950 font-bold">Download the update</Text>
          </Pressable>
        ) : (
          <Text className="text-slate-400 text-xs text-center mt-6">Ask your company admin or SolarOS support for the new app.</Text>
        )}
        <Pressable
          disabled={checking}
          onPress={async () => { setChecking(true); await checkAppConfig(); setChecking(false); }}
          className="mt-3 px-6 py-3 w-full items-center"
        >
          <Text className="text-slate-400 text-sm">{checking ? 'Checking…' : 'I have updated — check again'}</Text>
        </Pressable>
      </View>
    );
  }
  return null;
}

/** Small "new version available" bar (closable). */
export function UpdateBanner({ withTopInset }: { withTopInset?: boolean }) {
  const state = useUpdateState();
  const [dismissed, setDismissed] = useState(false);
  const open = () => openUrl(state.url);

  if (!state.required && state.available && !dismissed) {
    return (
      <SafeAreaView edges={withTopInset ? ['top'] : []} className="bg-amber-500">
        <View className="flex-row items-center px-4 py-2 gap-3">
          <Text className="flex-1 text-slate-950 text-xs font-semibold">
            A new version of SolarOS{state.latestVersion ? ` (${state.latestVersion})` : ''} is available.
          </Text>
          {state.url ? (
            <Pressable onPress={open} className="bg-slate-950 rounded-lg px-3 py-1.5">
              <Text className="text-amber-400 text-xs font-bold">Update</Text>
            </Pressable>
          ) : null}
          <Pressable onPress={() => setDismissed(true)} hitSlop={10} accessibilityLabel="Later">
            <X size={16} color="#0f172a" />
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }
  return null;
}
