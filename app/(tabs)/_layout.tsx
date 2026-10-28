import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Tabs } from 'expo-router';
import { BlurView } from 'expo-blur';
import { LayoutDashboard, Users, Zap, IndianRupee, Ellipsis, Building2, UserRound } from 'lucide-react-native';
import { useAuth } from '../../src/context/AuthContext';
import { haptic, useTheme } from '../../src/ds';

/**
 * Four primary destinations plus "More" (web BottomTabBar). A SUPER_ADMIN with
 * no company selected sees the platform set instead of the company set.
 */
export default function TabsLayout() {
  const { user, tenant, hasPermission } = useAuth();
  const p = useTheme();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isCustomer = user?.role === 'CUSTOMER';
  const showPlatform = isSuperAdmin && !tenant;
  const hide = (perm: string) => showPlatform || (user?.role === 'ADMIN' && !hasPermission(perm));

  return (
    <Tabs
      screenListeners={{ tabPress: () => haptic.tap() }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: p.accentText,
        tabBarInactiveTintColor: p.secondary,
        tabBarStyle: { position: 'absolute', borderTopColor: p.separator, borderTopWidth: StyleSheet.hairlineWidth, backgroundColor: Platform.OS === 'ios' ? 'transparent' : p.dark ? 'rgba(18,18,20,0.98)' : 'rgba(250,250,252,0.98)', elevation: 0, ...(Platform.OS === 'web' ? { height: 58, paddingBottom: 6 } : null) },
        tabBarBackground: () => (Platform.OS === 'ios' ? <BlurView tint={p.dark ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'} intensity={100} style={StyleSheet.absoluteFill} /> : <View />),
        tabBarLabelStyle: { fontSize: 11, lineHeight: 14, fontWeight: '500' },
        tabBarHideOnKeyboard: true,
        sceneStyle: { backgroundColor: p.bg },
      }}
    >
      <Tabs.Screen name="dashboard" options={{ title: showPlatform ? 'Platform' : isCustomer ? 'Home' : 'Today', tabBarIcon: ({ color }) => (showPlatform ? <Building2 color={color} size={24} /> : <LayoutDashboard color={color} size={24} />) }} />
      <Tabs.Screen name="customers" options={{ title: isCustomer ? 'Account' : 'Customers', href: hide('customers.view') ? null : undefined, tabBarIcon: ({ color }) => (isCustomer ? <UserRound color={color} size={24} /> : <Users color={color} size={24} />) }} />
      <Tabs.Screen name="projects" options={{ title: 'Projects', href: hide('projects.view') ? null : undefined, tabBarIcon: ({ color }) => <Zap color={color} size={24} /> }} />
      <Tabs.Screen name="payments" options={{ title: 'Payments', href: hide('payments.view') ? null : undefined, tabBarIcon: ({ color }) => <IndianRupee color={color} size={24} /> }} />
      <Tabs.Screen name="more" options={{ title: 'More', tabBarIcon: ({ color }) => <Ellipsis color={color} size={24} /> }} />
    </Tabs>
  );
}
