import '../global.css';
import React, { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, Text, Image, AppState, Platform, StyleSheet } from 'react-native';
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

const BOOT_SPLASH_BACKGROUND = '#071426';
const MINIMUM_NATIVE_SPLASH_MS = 450;

function AppBootSplash() {
  return (
    <View style={styles.bootSplash}>
      <Image source={require('../assets/branding/brand-adaptive-foreground-v3.png')} style={styles.bootSplashImage} resizeMode="contain" />
      <Text style={styles.bootSplashTitle}>SolarOS</Text>
      <Text style={styles.bootSplashSubtitle}>Solar operations, simplified</Text>
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
  const [minimumSplashElapsed, setMinimumSplashElapsed] = useState(Platform.OS === 'web');

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const timer = setTimeout(() => setMinimumSplashElapsed(true), MINIMUM_NATIVE_SPLASH_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => { void SystemUI.setBackgroundColorAsync(p.bg).catch(() => {}); }, [p.bg]);

  useEffect(() => {
    if (isLoading || !minimumSplashElapsed) return;
    const inAuthGroup = segments[0] === 'login';
    if (!isAuthenticated && !inAuthGroup) router.replace('/login');
    else if (isAuthenticated && inAuthGroup) router.replace('/(tabs)/dashboard');
  }, [isAuthenticated, isLoading, minimumSplashElapsed, segments, router]);

  // Tapping a push notification opens the notifications screen.
  useEffect(() => onNotificationTap(() => { if (isAuthenticated) router.push('/notifications'); }), [isAuthenticated, router]);

  if (isLoading || !minimumSplashElapsed) return <AppBootSplash />;
  if (isAuthenticated && user?.forcePasswordChange) return <SetPasswordScreen />;
  if (isAuthenticated && server.blocked && user?.role !== 'SUPER_ADMIN') return <BlockedScreen />;
  if (server.maintenance && user?.role !== 'SUPER_ADMIN') return <MaintenanceScreen onRetry={refreshUser} />;

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: p.bg }, animation: Platform.OS === 'android' ? 'ios_from_right' : 'default', gestureEnabled: true }}>
        <Stack.Screen name="login" options={{ animation: 'fade' }} />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(screens)" />
      </Stack>
      {isAuthenticated ? <><BackupCodesSheet /><LegalSheet /></> : null}
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

const styles = StyleSheet.create({
  bootSplash: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: BOOT_SPLASH_BACKGROUND },
  bootSplashImage: { width: 240, height: 240, marginBottom: 2 },
  bootSplashTitle: { color: '#f8fafc', fontSize: 28, fontWeight: '800', letterSpacing: -0.8 },
  bootSplashSubtitle: { color: '#93a4bc', fontSize: 12, marginTop: 6, letterSpacing: 0.3 },
});
