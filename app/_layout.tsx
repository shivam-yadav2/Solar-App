import '../global.css';
import React, { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, ActivityIndicator, AppState, Platform, StyleSheet } from 'react-native';
import { QueryClientProvider, focusManager } from '@tanstack/react-query';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { queryClient } from '../src/lib/queryClient';
import { UpdateBlocker } from '../src/components/UpdateGate';
import { BackupCodesSheet, BlockedScreen, LegalSheet, MaintenanceScreen, SetPasswordScreen, useServerState } from '../src/components/gates';
import { checkAppConfig } from '../src/lib/appConfig';
import { onNotificationTap } from '../src/lib/push';
import { OverlayProvider, useTheme } from '../src/ds';

SplashScreen.setOptions({ duration: 400, fade: true });

/**
 * While the saved session is restored: the first screen's own background,
 * nothing else (HIG › Launching: no logo or text, nearly identical to the
 * first screen). A spinner appears only if it takes longer than a moment.
 */
function BootCover() {
  const p = useTheme();
  const [slow, setSlow] = useState(false);
  useEffect(() => { const t = setTimeout(() => setSlow(true), 1200); return () => clearTimeout(t); }, []);
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: p.bg, alignItems: 'center', justifyContent: 'center', zIndex: 50, elevation: 50 }]}>
      {slow ? <ActivityIndicator color={p.secondary} /> : null}
    </View>
  );
}

/**
 * Decides what the signed-in person sees: sign-in, "choose your password",
 * a blocked or maintenance page, or the app itself.
 */
function AuthGate() {
  const { isAuthenticated, isLoading, user, refreshUser } = useAuth();
  const server = useServerState();
  const segments = useSegments();
  const router = useRouter();
  const p = useTheme();
  useEffect(() => { void SystemUI.setBackgroundColorAsync(p.bg).catch(() => {}); }, [p.bg]);

  useEffect(() => {
    if (isLoading) return;
    const inAuthGroup = segments[0] === 'login';
    if (!isAuthenticated && !inAuthGroup) router.replace('/login');
    else if (isAuthenticated && inAuthGroup) router.replace('/(tabs)/dashboard');
  }, [isAuthenticated, isLoading, segments, router]);

  // Tapping a push notification opens the notifications screen.
  useEffect(() => onNotificationTap(() => { if (isAuthenticated) router.push('/notifications'); }), [isAuthenticated, router]);

  // The navigator is always mounted: expo-router hides the native launch
  // screen only once navigation is ready, so rendering anything else first
  // could leave the app on the launch screen.
  const gate = isLoading ? <BootCover />
    : isAuthenticated && user?.forcePasswordChange ? <SetPasswordScreen />
    : isAuthenticated && server.blocked && user?.role !== 'SUPER_ADMIN' ? <BlockedScreen />
    : server.maintenance && user?.role !== 'SUPER_ADMIN' ? <MaintenanceScreen onRetry={refreshUser} />
    : null;

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: p.bg }, animation: Platform.OS === 'android' ? 'ios_from_right' : 'default', gestureEnabled: true }}>
        <Stack.Screen name="login" options={{ animation: 'fade' }} />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(screens)" />
      </Stack>
      {isAuthenticated && !gate ? <><BackupCodesSheet /><LegalSheet /></> : null}
      {gate ? <View style={StyleSheet.absoluteFill}>{gate}</View> : null}
    </View>
  );
}

function Themed() {
  const p = useTheme();
  return (
    <>
      <StatusBar style={p.dark ? 'light' : 'dark'} animated />
      <AuthGate />
      <UpdateBlocker />
    </>
  );
}

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const subscription = AppState.addEventListener('change', (status) => {
      focusManager.setFocused(status === 'active');
      // Picks up a new minimum version / server address without a restart.
      if (status === 'active') void checkAppConfig();
    });
    return () => subscription.remove();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <KeyboardProvider>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <OverlayProvider>
                <Themed />
              </OverlayProvider>
            </AuthProvider>
          </QueryClientProvider>
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
