import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  Bell, Boxes, Building2, ClipboardList, CreditCard, FileClock, FileText, FolderOpen, Gauge, HardHat, IndianRupee, KeyRound,
  LogOut, MessageSquareHeart, PieChart, ReceiptText, Search, Settings, ShieldCheck, Target, Users, Wallet, Wrench, Zap, FileBarChart, Calculator,
  LifeBuoy, CircleHelp, Trash2, UserX, Database, Smartphone, Megaphone, FlaskConical, Shield, BarChart3,
} from 'lucide-react-native';
import { useAuth } from '../../src/context/AuthContext';
import { useCanOpen } from '../../src/lib/access';
import { api } from '../../src/lib/api';
import { platformTabAllowed } from '../../src/lib/platformRoles';
import { Avatar, Badge, IconTile, Row, Screen, Section, T, Tone, useTheme, space, radius, elevation, Tap, toneColors } from '../../src/ds';
import { WorkspaceNotices } from '../../src/components/gates';

interface Item { label: string; icon: React.ComponentType<{ size?: number; color?: string }>; tone: Tone; path: string; badge?: number; subtitle?: string }

export default function MoreTab() {
  const router = useRouter();
  const p = useTheme();
  const { user, tenant, customer, hasPermission: can, isImpersonating, exitWorkspace } = useAuth();
  const canOpen = useCanOpen();
  const isCustomer = user?.role === 'CUSTOMER';
  const isPlatform = user?.role === 'SUPER_ADMIN' && !tenant;
  const role = (user as any)?.platformRole;
  const kpi = useQuery({ queryKey: ['dashboard', 'kpis'], queryFn: api.getDashboardKpis, enabled: !isCustomer && !isPlatform && can('reports.view'), staleTime: 60_000 });
  const pendingExp = Number(kpi.data?.kpis?.pendingExpenseCount || 0);
  const go = (path: string) => router.push(path as never);

  const sections: { title: string; items: (Item | false)[] }[] = isCustomer ? [
    { title: 'My solar', items: [
      { label: 'Payments & receipts', icon: CreditCard, tone: 'green', path: '/(tabs)/payments' },
      { label: 'Invoices & receipts', icon: ReceiptText, tone: 'accent', path: '/invoices' },
      { label: 'Warranty cards', icon: ShieldCheck, tone: 'green', path: '/warranties' },
      { label: 'Service requests', icon: Wrench, tone: 'red', path: '/tickets' },
      { label: 'Documents', icon: FolderOpen, tone: 'purple', path: '/documents' },
    ] },
    { title: 'More', items: [
      { label: 'Rate your installation', icon: MessageSquareHeart, tone: 'orange', path: '/feedback' },
      { label: 'Notifications', icon: Bell, tone: 'gray', path: '/notifications' },
      { label: 'Privacy requests', icon: UserX, tone: 'purple', path: '/privacy', subtitle: 'Request a data copy or deletion' },
      { label: 'SolarOS support', icon: LifeBuoy, tone: 'blue', path: '/support' },
      { label: 'Help & workflows', icon: CircleHelp, tone: 'accent', path: '/help' },
      { label: 'Loan EMI calculator', icon: Calculator, tone: 'orange', path: '/emi' },
    ] },
  ] : isPlatform ? [
    { title: 'Companies', items: [
      platformTabAllowed(role, 'saas_control') && { label: 'Companies', icon: Building2, tone: 'accent', path: '/tenants' },
      platformTabAllowed(role, 'saas_plans') && { label: 'Plans', icon: Wallet, tone: 'teal', path: '/plans' },
      platformTabAllowed(role, 'saas_usage') && { label: 'Usage & adoption', icon: BarChart3, tone: 'blue', path: '/platform/usage' },
      platformTabAllowed(role, 'saas_enquiries') && { label: 'Sales enquiries', icon: Target, tone: 'orange', path: '/platform/enquiries' },
      platformTabAllowed(role, 'saas_users') && { label: 'Platform users', icon: Users, tone: 'purple', path: '/platform/users' },
    ] },
    { title: 'Operations', items: [
      platformTabAllowed(role, 'saas_billing') && { label: 'Platform billing', icon: CreditCard, tone: 'green', path: '/platform/billing' },
      platformTabAllowed(role, 'saas_support') && { label: 'Support desk', icon: LifeBuoy, tone: 'blue', path: '/platform/support' },
      platformTabAllowed(role, 'saas_demos') && { label: 'Demo workspaces', icon: FlaskConical, tone: 'purple', path: '/platform/demos' },
      platformTabAllowed(role, 'saas_communication') && { label: 'Communication', icon: Megaphone, tone: 'orange', path: '/platform/communication' },
    ] },
    { title: 'Platform', items: [
      platformTabAllowed(role, 'saas_audit') && { label: 'Activity & security', icon: FileClock, tone: 'gray', path: '/platform-audit' },
      platformTabAllowed(role, 'saas_search') && { label: 'Search everything', icon: Search, tone: 'purple', path: '/platform-search' },
      platformTabAllowed(role, 'saas_health') && { label: 'System health', icon: Gauge, tone: 'orange', path: '/system-health' },
      platformTabAllowed(role, 'saas_security') && { label: 'Platform security', icon: Shield, tone: 'green', path: '/platform/security' },
      platformTabAllowed(role, 'saas_data') && { label: 'Data & recovery', icon: Database, tone: 'purple', path: '/platform/data' },
      platformTabAllowed(role, 'saas_mobile') && { label: 'Mobile app control', icon: Smartphone, tone: 'blue', path: '/platform/mobile' },
      platformTabAllowed(role, 'saas_api') && { label: 'Website login & API', icon: KeyRound, tone: 'accent', path: '/platform/api-access' },
      platformTabAllowed(role, 'saas_settings') && { label: 'Platform settings', icon: Settings, tone: 'gray', path: '/platform/settings' },
    ] },
  ] : [
    { title: 'Sales', items: [
      canOpen('leads') && { label: 'Leads & follow-ups', icon: Target, tone: 'purple', path: '/leads' },
      canOpen('quotations') && { label: 'Quotations', icon: FileText, tone: 'blue', path: '/quotations' },
    ] },
    { title: 'Operations', items: [
      canOpen('field') && { label: 'Field work', icon: HardHat, tone: 'teal', path: '/field-operations', subtitle: 'Attendance and site reports' },
      canOpen('discom') && { label: 'DISCOM & subsidy', icon: Zap, tone: 'orange', path: '/discom' },
      canOpen('inventory') && { label: 'Inventory & BoQ', icon: Boxes, tone: 'accent', path: '/inventory' },
      canOpen('documents') && { label: 'Documents', icon: FolderOpen, tone: 'purple', path: '/documents' },
    ] },
    { title: 'After-sales', items: [
      canOpen('complaints') && { label: 'Service tickets', icon: Wrench, tone: 'red', path: '/tickets' },
      canOpen('warranties') && { label: 'Warranties', icon: ShieldCheck, tone: 'green', path: '/warranties' },
    ] },
    { title: 'Money', items: [
      canOpen('expenses') && { label: 'Expenses', icon: ClipboardList, tone: 'orange', path: '/expenses', badge: can('financials.approve') ? pendingExp : 0 },
      canOpen('payroll') && { label: 'Payroll', icon: IndianRupee, tone: 'green', path: '/payroll' },
      canOpen('profit') && { label: 'Profit & margins', icon: PieChart, tone: 'purple', path: '/profit' },
      { label: 'Loan EMI calculator', icon: Calculator, tone: 'accent', path: '/emi' },
      canOpen('reports') && { label: 'Reports & export', icon: FileBarChart, tone: 'blue', path: '/reports' },
    ] },
    { title: 'Company', items: [
      canOpen('team') && { label: 'Team', icon: Users, tone: 'blue', path: '/team' },
      canOpen('roles') && { label: 'Roles & permissions', icon: KeyRound, tone: 'purple', path: '/roles' },
      canOpen('activity') && { label: 'Audit log', icon: FileClock, tone: 'gray', path: '/audit-logs' },
      can('settings.view') && { label: 'Company settings', icon: Settings, tone: 'gray', path: '/settings' },
      can('customers.delete') && { label: 'Recycle bin', icon: Trash2, tone: 'red', path: '/recycle-bin' },
      can('customers.delete') && { label: 'Privacy requests', icon: UserX, tone: 'purple', path: '/privacy' },
      user?.role === 'ADMIN' && { label: 'SolarOS plan & billing', icon: CreditCard, tone: 'green', path: '/billing' },
    ] },
    { title: 'Support', items: [
      { label: 'SolarOS support', icon: LifeBuoy, tone: 'blue', path: '/support', subtitle: 'Open and track a support ticket' },
      { label: 'Help & workflows', icon: CircleHelp, tone: 'accent', path: '/help' },
    ] },
  ];

  return (
    <Screen title="More">
      <Tap onPress={() => go('/account')} scaleTo={0.985} style={[{ backgroundColor: p.surface, borderRadius: radius.l, padding: space.l, flexDirection: 'row', alignItems: 'center', gap: space.l }, elevation(p, 1)]}>
        <Avatar name={customer?.name || user?.username || ''} size={56} />
        <View style={{ flex: 1 }}>
          <T variant="title3" numberOfLines={1}>{customer?.name || user?.username}</T>
          <T variant="footnote" color="secondary" numberOfLines={1}>{tenant?.name || 'SolarOS platform'} · Account, password, devices</T>
        </View>
      </Tap>

      {isImpersonating ? (
        <Tap onPress={() => void exitWorkspace()} style={{ backgroundColor: toneColors(p, 'orange').bg, borderRadius: radius.l, padding: space.l, flexDirection: 'row', alignItems: 'center', gap: space.m }}>
          <LogOut size={20} color={p.orange} />
          <View style={{ flex: 1 }}>
            <T variant="headline" style={{ color: p.orange }}>Exit {tenant?.name}</T>
            <T variant="footnote" color="secondary">You're inside this company's workspace as a platform admin.</T>
          </View>
        </Tap>
      ) : null}

      <WorkspaceNotices />

      {sections.map((sec) => {
        const items = sec.items.filter(Boolean) as Item[];
        if (!items.length) return null;
        return (
          <Section key={sec.title} header={sec.title}>
            {items.map((it) => {
              const Icon = it.icon;
              const c = toneColors(p, it.tone);
              return <Row key={it.label} icon={<IconTile icon={<Icon size={17} color={c.fg} />} tone={it.tone} />} title={it.label} subtitle={it.subtitle} accessory={it.badge ? <Badge text={String(it.badge)} tone="red" status={false} /> : undefined} onPress={() => go(it.path)} />;
            })}
          </Section>
        );
      })}
      <T variant="footnote" color="secondary" align="center">SolarOS · {tenant?.slug || 'platform'}</T>
    </Screen>
  );
}

