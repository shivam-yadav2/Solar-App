import React from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { useTheme } from '../../src/ds';

export default function ScreensLayout() {
  const p = useTheme();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: p.bg }, animation: Platform.OS === 'android' ? 'ios_from_right' : 'default', gestureEnabled: true, fullScreenGestureEnabled: true }} />;
}
