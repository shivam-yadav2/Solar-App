import React from 'react';
import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LayoutDashboard, Users, Zap, IndianRupee, Ellipsis, Building2, UserRound } from 'lucide-react-native';
import { useAuth } from '../../src/context/AuthContext';
import { haptic, radius, useTheme } from '../../src/ds';

/** Always-dark floating pill, regardless of the app's own light/dark theme — the one piece of chrome that doesn't change. */
const PILL_BG = '#121214';
const PILL_ACTIVE = '#FFFFFF';
const PILL_INACTIVE = 'rgba(235,235,245,0.5)';

/** Active tab gets a filled rounded highlight behind its icon instead of just a colour change. */
function TabIcon({ Icon, focused }: { Icon: React.ComponentType<{ color: string; size: number }>; focused: boolean }) {
  return (
    <View style={{ width: 44, height: 36, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: focused ? 'rgba(255,255,255,0.14)' : 'transparent' }}>
      <Icon color={focused ? PILL_ACTIVE : PILL_INACTIVE} size={23} />
    </View>
  );
}

/**
 * Four primary destinations plus "More" (web BottomTabBar). A SUPER_ADMIN with
 * no company selected sees the platform set instead of the company set.
 */
export default function TabsLayout() {
  const { user, tenant, hasPermission } = useAuth();
  const p = useTheme();
  const insets = useSafeAreaInsets();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isCustomer = user?.role === 'CUSTOMER';
  const showPlatform = isSuperAdmin && !tenant;
  const hide = (perm: string) => showPlatform || (user?.role === 'ADMIN' && !hasPermission(perm));

  return (
    <Tabs
      screenListeners={{ tabPress: () => haptic.tap() }}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          position: 'absolute', left: 20, right: 20, bottom: Math.max(insets.bottom, 12), height: 60,
          borderRadius: radius.pill, backgroundColor: PILL_BG, borderTopWidth: 0,
          shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 12,
        },
        tabBarItemStyle: { paddingTop: 12 },
        tabBarHideOnKeyboard: true,
        sceneStyle: { backgroundColor: p.bg },
      }}
    >
      <Tabs.Screen name="dashboard" options={{ title: showPlatform ? 'Platform' : isCustomer ? 'Home' : 'Today', tabBarIcon: ({ focused }) => <TabIcon Icon={showPlatform ? Building2 : LayoutDashboard} focused={focused} /> }} />
      <Tabs.Screen name="customers" options={{ title: isCustomer ? 'Account' : 'Customers', href: hide('customers.view') ? null : undefined, tabBarIcon: ({ focused }) => <TabIcon Icon={isCustomer ? UserRound : Users} focused={focused} /> }} />
      <Tabs.Screen name="projects" options={{ title: 'Projects', href: hide('projects.view') ? null : undefined, tabBarIcon: ({ focused }) => <TabIcon Icon={Zap} focused={focused} /> }} />
      <Tabs.Screen name="payments" options={{ title: 'Payments', href: hide('payments.view') ? null : undefined, tabBarIcon: ({ focused }) => <TabIcon Icon={IndianRupee} focused={focused} /> }} />
      <Tabs.Screen name="more" options={{ title: 'More', tabBarIcon: ({ focused }) => <TabIcon Icon={Ellipsis} focused={focused} /> }} />
    </Tabs>
  );
}
