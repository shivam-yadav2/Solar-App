import '../global.css';
import React, { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Image, AppState, Platform, StyleSheet } from 'react-native';
import { QueryClientProvider, focusManager } from '@tanstack/react-query';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { AppTopBar } from '../src/components/AppTopBar';
import { queryClient } from '../src/lib/queryClient';

SplashScreen.setOptions({
  duration: 400,
  fade: true,
});

const BOOT_SPLASH_BACKGROUND = '#050C1C';
const MINIMUM_NATIVE_SPLASH_MS = 450;

function AppBootSplash() {
  return (
    <View style={styles.bootSplash}>
      <Image
        source={require('../assets/branding/brand-splash-3d-seamless-v2.jpg')}
        style={styles.bootSplashImage}
        resizeMode="contain"
      />
    </View>
  );
}

/**
 * Redirects between the auth screen and the app shell based on session
 * state. This is the native equivalent of the web app's
 * `if (!user) return <LoginView />` branch in App.tsx.
 */
function AuthGate() {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [minimumSplashElapsed, setMinimumSplashElapsed] = useState(Platform.OS === 'web');

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const timer = setTimeout(() => setMinimumSplashElapsed(true), MINIMUM_NATIVE_SPLASH_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isLoading || !minimumSplashElapsed) return;
    const inAuthGroup = segments[0] === 'login';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)/dashboard');
    }
  }, [isAuthenticated, isLoading, minimumSplashElapsed, segments, router]);

  if (isLoading || !minimumSplashElapsed) {
    return <AppBootSplash />;
  }

  return (
    <View className="flex-1 bg-slate-950">
      {isAuthenticated ? <AppTopBar /> : null}
      <View className="flex-1">
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="login" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(screens)" />
        </Stack>
      </View>
    </View>
  );
}

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const subscription = AppState.addEventListener('change', (status) => {
      focusManager.setFocused(status === 'active');
    });
    return () => subscription.remove();
  }, []);

  return (
    <SafeAreaProvider>
      <KeyboardProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <StatusBar style="light" animated />
            <AuthGate />
          </AuthProvider>
        </QueryClientProvider>
      </KeyboardProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  bootSplash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BOOT_SPLASH_BACKGROUND,
  },
  bootSplashImage: {
    width: '100%',
    maxWidth: 520,
    aspectRatio: 1,
  },
});
