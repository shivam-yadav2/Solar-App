import React from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import {
  Receipt, WalletCards, TrendingUp, FileText, ShieldCheck, Wrench,
  FolderKanban, FileSpreadsheet, History, UserCog, Shield, Settings,
  Crown, Tags, Activity, LogOut, ChevronRight,
  Search,
  KeyRound,
  Bell,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { Screen, Card } from '../../src/components/ui';

/**
 * The "More" tab is the native equivalent of the web Sidebar's overflow —
 * every destination that doesn't fit in the 5-slot bottom bar.
 *
 * Every entry is a real Expo Router destination backed by the shared API.
 */
type Item = { label: string; Icon: any; route: string; permission?: string };
type Section = { title: string; items: Item[] };

const TENANT_SECTIONS: Section[] = [
  {
    title: 'PRE-SALES & OPERATIONS',
    items: [
      { label: 'Leads & Follow-ups', Icon: UserCog, route: '/leads', permission: 'leads.view' },
      { label: 'Quotations', Icon: FileSpreadsheet, route: '/quotations', permission: 'quotations.view' },
      { label: 'Inventory & BoQ', Icon: FolderKanban, route: '/inventory', permission: 'inventory.view' },
      { label: 'Field Operations', Icon: Activity, route: '/field-operations', permission: 'attendance.view' },
      { label: 'DISCOM Liaison', Icon: ShieldCheck, route: '/discom', permission: 'discom.view' },
    ],
  },
  {
    title: 'FINANCIALS',
    items: [
      { label: 'Expenses', Icon: Receipt, route: '/expenses', permission: 'expenses.view' },
      { label: 'Staff Payroll', Icon: WalletCards, route: '/payroll', permission: 'payroll.view' },
      { label: 'Profit & Margins', Icon: TrendingUp, route: '/profit', permission: 'projects.view' },
      { label: 'Invoices', Icon: FileText, route: '/invoices', permission: 'invoices.view' },
    ],
  },
  {
    title: 'AFTERSALES & ASSETS',
    items: [
      { label: 'Warranties', Icon: ShieldCheck, route: '/warranties', permission: 'warranties.view' },
      { label: 'Service Tickets', Icon: Wrench, route: '/tickets', permission: 'complaints.view' },
      { label: 'Documents', Icon: FolderKanban, route: '/documents', permission: 'documents.view' },
    ],
  },
  {
    title: 'SYSTEM',
    items: [
      { label: 'Reports & Export', Icon: FileSpreadsheet, route: '/reports', permission: 'reports.view' },
      { label: 'Audit Logs', Icon: History, route: '/audit-logs', permission: 'activity_logs.view' },
      { label: 'Team Members', Icon: UserCog, route: '/team', permission: 'users.manage' },
      { label: 'Roles & Permissions', Icon: Shield, route: '/roles', permission: 'roles.manage' },
      { label: 'Settings', Icon: Settings, route: '/settings' },
      { label: 'Notifications', Icon: Bell, route: '/notifications' },
      { label: 'Subscription Billing', Icon: Receipt, route: '/billing' },
      { label: 'Account Security', Icon: KeyRound, route: '/account-security' },
    ],
  },
];

const PLATFORM_SECTIONS: Section[] = [
  {
    title: 'PLATFORM',
    items: [
      { label: 'Tenants', Icon: Crown, route: '/tenants' },
      { label: 'Plans', Icon: Tags, route: '/plans' },
      { label: 'Audit Log', Icon: History, route: '/platform-audit' },
      { label: 'Search', Icon: Search, route: '/platform-search' },
      { label: 'System Health', Icon: Activity, route: '/system-health' },
    ],
  },
];

const CUSTOMER_SECTIONS: Section[] = [{
  title: 'MY SOLAR PORTAL',
  items: [
    { label: 'Invoices', Icon: FileText, route: '/invoices' },
    { label: 'Warranties', Icon: ShieldCheck, route: '/warranties' },
    { label: 'Service Tickets', Icon: Wrench, route: '/tickets' },
    { label: 'Documents', Icon: FolderKanban, route: '/documents' },
    { label: 'Share Feedback', Icon: FileSpreadsheet, route: '/feedback' },
    { label: 'Notifications', Icon: Bell, route: '/notifications' },
    { label: 'Account Security', Icon: KeyRound, route: '/account-security' },
  ],
}];

export default function MoreScreen() {
  const router = useRouter();
  const { user, tenant, logout, switchTenantScope, hasPermission } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const sections = user?.role === 'CUSTOMER' ? CUSTOMER_SECTIONS : isSuperAdmin && !tenant ? PLATFORM_SECTIONS : TENANT_SECTIONS;

  const confirmLogout = () =>
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void logout() },
    ]);

  return (
    <Screen title="More" subtitle={tenant?.name ?? 'Platform'}>
      <Card>
        <Text className="text-sm font-bold text-slate-900">{user?.username}</Text>
        <Text className="text-xs text-slate-500 mt-0.5">{user?.email}</Text>
        <View className="mt-2 self-start bg-amber-50 px-2 py-0.5 rounded-md">
          <Text className="text-[10px] font-semibold text-amber-700">
            {isSuperAdmin ? 'Super Admin' : user?.role}
          </Text>
        </View>
      </Card>

      {isSuperAdmin && tenant ? (
        <Pressable
          onPress={async () => { await switchTenantScope(null); router.replace('/(tabs)/dashboard'); }}
          className="mb-3 bg-amber-50 border border-amber-200 rounded-2xl py-3 items-center"
        >
          <Text className="text-sm font-semibold text-amber-800">Return to Global Platform</Text>
        </Pressable>
      ) : null}

      {sections.map((section) => (
        <View key={section.title} className="mb-2">
          <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 mb-1.5 mt-2">
            {section.title}
          </Text>
          <View className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            {section.items.filter(item => user?.role !== 'ADMIN' || !item.permission || hasPermission(item.permission)).map((item, i) => (
              <Pressable
                key={item.label}
                onPress={() => router.push(item.route as any)}
                className={`flex-row items-center gap-3 px-4 py-3.5 active:bg-slate-50 ${
                  i > 0 ? 'border-t border-slate-100' : ''
                }`}
              >
                <item.Icon size={18} color="#64748b" />
                <Text className="flex-1 text-sm text-slate-800">{item.label}</Text>
                <ChevronRight size={16} color="#cbd5e1" />
              </Pressable>
            ))}
          </View>
        </View>
      ))}

      <Pressable
        onPress={confirmLogout}
        className="mt-4 flex-row items-center justify-center gap-2 bg-white border border-rose-200 rounded-2xl py-3.5 active:bg-rose-50"
      >
        <LogOut size={16} color="#e11d48" />
        <Text className="text-sm font-semibold text-rose-600">Sign Out</Text>
      </Pressable>
    </Screen>
  );
}
