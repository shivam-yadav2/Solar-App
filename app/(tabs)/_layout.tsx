import React from 'react';
import { Tabs } from 'expo-router';
import { LayoutDashboard, Users, Zap, CreditCard, Menu } from 'lucide-react-native';
import { useAuth } from '../../src/context/AuthContext';

/**
 * Mirrors the web app's BottomTabBar: four primary destinations plus "More".
 * SUPER_ADMIN with no tenant scope selected sees the platform set instead of
 * the tenant ERP set — same rule as Sidebar.tsx / BottomTabBar.tsx on web.
 */
export default function TabsLayout() {
  const { user, tenant, hasPermission } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isCustomer = user?.role === 'CUSTOMER';
  const showPlatform = isSuperAdmin && !tenant;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#d97706',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#e2e8f0',
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: showPlatform ? 'Tenants' : isCustomer ? 'Overview' : 'Dashboard',
          tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size ?? 22} />,
        }}
      />
      <Tabs.Screen
        name="customers"
        options={{
          title: isCustomer ? 'Profile' : 'Customers',
          href: showPlatform || (user?.role === 'ADMIN' && !hasPermission('customers.view')) ? null : undefined,
          tabBarIcon: ({ color, size }) => <Users color={color} size={size ?? 22} />,
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: 'Projects',
          href: showPlatform || (user?.role === 'ADMIN' && !hasPermission('projects.view')) ? null : undefined,
          tabBarIcon: ({ color, size }) => <Zap color={color} size={size ?? 22} />,
        }}
      />
      <Tabs.Screen
        name="payments"
        options={{
          title: 'Payments',
          href: showPlatform || (user?.role === 'ADMIN' && !hasPermission('payments.view')) ? null : undefined,
          tabBarIcon: ({ color, size }) => <CreditCard color={color} size={size ?? 22} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color, size }) => <Menu color={color} size={size ?? 22} />,
        }}
      />
    </Tabs>
  );
}
