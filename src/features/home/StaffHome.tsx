import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Percent, ClipboardList, CreditCard, FileText, HardHat, IndianRupee, ReceiptText, ShieldCheck, Sun, UserPlus, Users, Wrench, Zap, Target } from 'lucide-react-native';
import { api } from '../../lib/api';
import { useApi } from '../../lib/query';
import { useAuth } from '../../context/AuthContext';
import { humanizeAction } from '../../lib/activityLabels';
import { formatINR, greeting, timeAgo } from '../../lib/formatters';
import { BarChart, Card, ErrorState, IconTile, Row, Screen, Section, Skeleton, StatGrid, StatTile, T, useTheme, space, formatMoneyCompact } from '../../ds';
import { HeaderActions, QuickActions, QuickAction } from '../../components/kit';
import { WorkspaceNotices } from '../../components/gates';

export function StaffHome() {
  const router = useRouter();
  const p = useTheme();
  const { user, tenant, hasPermission: can } = useAuth();
  const go = (path: string) => router.push(path as never);
  const kpi = useApi(['dashboard', 'kpis'], api.getDashboardKpis, { enabled: can('reports.view') });
  const charts = useApi(['dashboard', 'charts'], api.getCharts, { enabled: can('reports.view') });
  const activity = useApi(['dashboard', 'activity'], () => api.getActivityLogs({ limit: '40' }), { enabled: can('activity_logs.view') });
  const k = kpi.data?.kpis || {};

  const actions: QuickAction[] = [
    can('customers.create') && { label: 'Customer', icon: UserPlus, tone: 'blue', onPress: () => go('/customer-form') },
    can('payments.create') && { label: 'Payment', icon: IndianRupee, tone: 'green', onPress: () => go('/payment-form') },
    can('leads.manage') && { label: 'Lead', icon: Target, tone: 'purple', onPress: () => go('/lead-form') },
    can('invoices.create') && { label: 'Invoice', icon: ReceiptText, tone: 'accent', onPress: () => go('/invoice-form') },
    can('projects.create') && { label: 'Project', icon: Zap, tone: 'orange', onPress: () => go('/project-form') },
    can('attendance.manage') && { label: 'Site report', icon: HardHat, tone: 'teal', onPress: () => go('/field-operation-form') },
    can('complaints.create') && { label: 'Ticket', icon: Wrench, tone: 'red', onPress: () => go('/ticket-form') },
    can('expenses.create') && { label: 'Expense', icon: FileText, tone: 'gray', onPress: () => go('/expense-form') },
  ].filter(Boolean).slice(0, 8) as QuickAction[];

  const attention = [
    can('financials.approve') && Number(k.pendingExpenseCount) > 0 && { title: 'Expenses to approve', subtitle: `${formatINR(k.pendingExpenses)} waiting`, value: String(k.pendingExpenseCount), icon: <IconTile icon={<ClipboardList size={17} color={p.orange} />} tone="orange" />, path: '/expenses?status=Pending' },
    can('payments.view') && Number(k.totalPending) > 0 && { title: 'To collect', subtitle: 'Balance across all projects', value: formatMoneyCompact(Number(k.totalPending)), icon: <IconTile icon={<CreditCard size={17} color={p.green} />} tone="green" />, path: '/(tabs)/payments' },
    can('complaints.view') && Number(k.openComplaints) > 0 && { title: 'Open service tickets', subtitle: 'Waiting for a technician', value: String(k.openComplaints), icon: <IconTile icon={<Wrench size={17} color={p.red} />} tone="red" />, path: '/tickets' },
    can('warranties.view') && Number(k.expiringWarranties) > 0 && { title: 'Warranties expiring soon', subtitle: 'Offer an AMC or extension', value: String(k.expiringWarranties), icon: <IconTile icon={<ShieldCheck size={17} color={p.blue} />} tone="blue" />, path: '/warranties' },
  ].filter(Boolean) as { title: string; subtitle: string; value: string; icon: React.ReactNode; path: string }[];

  // Sign-ins and security events are noise on a home screen.
  const business = (activity.data?.logs || []).filter((l: any) => !['auth', 'security'].includes(l.category) && !/^LOGIN|^LOGOUT|^SESSION|^MFA/.test(l.action));
  const months = (charts.data?.monthlyData || []).slice(-6).map((m: any) => ({ label: String(m.month).split(' ')[0], value: Number(m.revenue) || 0 }));
  const first = (user?.username || '').split(/[\s@._]/)[0];

  return (
    <Screen title="Today" subtitle={`${greeting()}${first ? `, ${first.charAt(0).toUpperCase()}${first.slice(1)}` : ''} · ${tenant?.name || ''}`} right={<HeaderActions />}
      refreshing={kpi.refreshing} onRefresh={() => { void kpi.refresh(); void charts.refresh(); void activity.refresh(); }}>
      <WorkspaceNotices />
      <QuickActions items={actions} />

      {can('reports.view') ? (
        kpi.error ? <ErrorState message={kpi.error} onRetry={kpi.refresh} /> : kpi.loading ? (
          <View style={{ gap: space.m }}><View style={{ flexDirection: 'row', gap: space.m }}><Skeleton height={104} radius={16} style={{ flex: 1 }} /><Skeleton height={104} radius={16} style={{ flex: 1 }} /></View><View style={{ flexDirection: 'row', gap: space.m }}><Skeleton height={104} radius={16} style={{ flex: 1 }} /><Skeleton height={104} radius={16} style={{ flex: 1 }} /></View></View>
        ) : (
          <StatGrid>
            <StatTile label="Collected" value={Number(k.totalReceived) || 0} money tone="green" icon={<IndianRupee size={15} color={p.green} />} hint={`of ${formatMoneyCompact(Number(k.totalDealValue) || 0)} booked`} onPress={() => go('/(tabs)/payments')} />
            <StatTile label="To collect" value={Number(k.totalPending) || 0} money tone="orange" icon={<CreditCard size={15} color={p.orange} />} hint="Outstanding balance" onPress={() => go('/(tabs)/payments')} />
            <StatTile label="Active projects" value={Number(k.activeProjects) || 0} tone="blue" icon={<Zap size={15} color={p.blue} />} hint={`${k.projectsThisMonth || 0} started this month`} onPress={() => go('/(tabs)/projects')} />
            <StatTile label="Installed" value={Number(k.totalInstalledKw ?? k.totalCapacityKw) || 0} suffix=" kW" tone="accent" icon={<Sun size={15} color={p.accentText} />} hint={`${k.totalProjects || 0} projects`} />
            <StatTile label="Profit margin" value={Number(k.profitMargin) || 0} suffix="%" tone="purple" icon={<Percent size={15} color={p.purple} />} hint={`Profit ${formatMoneyCompact(Number(k.actualProfit) || 0)}`} onPress={() => go('/profit')} />
            <StatTile label="Customers" value={Number(k.totalCustomers) || 0} tone="teal" icon={<Users size={15} color={p.teal} />} hint={`${k.activeCustomers || 0} active`} onPress={() => go('/(tabs)/customers')} />
          </StatGrid>
        )
      ) : null}

      {attention.length ? (
        <Section header="Needs attention">
          {attention.map((a) => <Row key={a.title} icon={a.icon} title={a.title} subtitle={a.subtitle} value={a.value} onPress={() => go(a.path)} />)}
        </Section>
      ) : null}

      {months.length && months.some((m: { value: number }) => m.value > 0) ? (
        <Card>
          <T variant="headline">Bookings · last 6 months</T>
          <T variant="footnote" color="secondary" style={{ marginBottom: space.m }}>Project value by start month. Tap a bar.</T>
          <BarChart data={months} />
        </Card>
      ) : null}

      {business.length ? (
        <Section header="Recent activity" right={<T variant="footnote" color="accent" onPress={() => go('/audit-logs')}>See all</T>}>
          {business.slice(0, 6).map((l: any) => (
            <Row key={l.id} title={humanizeAction(l.action)} subtitle={`${l.userName} · ${l.entityCustomId || l.entity} · ${timeAgo(l.timestamp)}`} />
          ))}
        </Section>
      ) : null}
    </Screen>
  );
}
