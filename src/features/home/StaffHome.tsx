import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Building2, CheckCircle2, Percent, ClipboardList, CreditCard, FileSignature, FileText, HardHat, IndianRupee,
  ReceiptText, ShieldCheck, Sun, UserPlus, Users, Wrench, Zap, Target,
} from 'lucide-react-native';
import { api } from '../../lib/api';
import { useApi } from '../../lib/query';
import { useAuth } from '../../context/AuthContext';
import { useCanOpen } from '../../lib/access';
import { humanizeAction } from '../../lib/activityLabels';
import { formatINR, greeting, timeAgo } from '../../lib/formatters';
import {
  Badge, Card, ComparisonBarChart, DistributionBars, ErrorState, IconTile, Progress, Row, Screen, Section, Skeleton,
  StatGrid, StatTile, T, useTheme, space, formatMoneyCompact,
} from '../../ds';
import { HeaderActions, QuickActions, QuickAction } from '../../components/kit';
import { WorkspaceNotices } from '../../components/gates';

export function StaffHome() {
  const router = useRouter();
  const p = useTheme();
  const { user, tenant, hasPermission: can } = useAuth();
  const canOpen = useCanOpen();
  const go = (path: string) => router.push(path as never);
  const kpi = useApi(['dashboard', 'kpis'], api.getDashboardKpis, { enabled: can('reports.view') });
  const charts = useApi(['dashboard', 'charts'], api.getCharts, { enabled: can('reports.view') });
  const activity = useApi(['dashboard', 'activity'], () => api.getActivityLogs({ limit: '40' }), { enabled: can('activity_logs.view') });
  const recent = useApi(['dashboard', 'projects'], () => api.getProjects({ limit: '6' }), { enabled: canOpen('projects') });
  const quotations = useApi(['dashboard', 'quotations'], () => api.getQuotations({ limit: '100' }), { enabled: canOpen('quotations') });
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

  const openQuotes = (quotations.data?.quotations || []).filter((q) => q.status === 'Sent' || q.status === 'Viewed');
  const openQuoteValue = openQuotes.reduce((sum, q) => sum + Number(q.totalAmount || 0), 0);
  const profile = tenant?.businessProfile;
  const profileGaps = [
    !profile?.gstin && 'GSTIN',
    !(profile?.bankAccountNumber && profile?.bankIfsc) && 'bank details',
    !profile?.address && 'address',
  ].filter(Boolean) as string[];
  const collectionRate = Number(k.totalDealValue) > 0 ? Math.round((Number(k.totalReceived) / Number(k.totalDealValue)) * 100) : 0;

  const attention = [
    can('financials.approve') && Number(k.pendingExpenseCount) > 0 && { title: 'Expenses to approve', subtitle: `${formatINR(k.pendingExpenses)} waiting`, value: String(k.pendingExpenseCount), icon: <IconTile icon={<ClipboardList size={17} color={p.orange} />} tone="orange" />, path: '/expenses?status=Pending' },
    can('payments.view') && Number(k.totalPending) > 0 && { title: 'To collect', subtitle: `${collectionRate}% of contract value collected`, value: formatMoneyCompact(Number(k.totalPending)), icon: <IconTile icon={<CreditCard size={17} color={p.green} />} tone="green" />, path: '/(tabs)/payments' },
    can('complaints.view') && Number(k.openComplaints) > 0 && { title: 'Open service tickets', subtitle: 'Customers waiting for a resolution', value: String(k.openComplaints), icon: <IconTile icon={<Wrench size={17} color={p.red} />} tone="red" />, path: '/tickets' },
    can('warranties.view') && Number(k.expiringWarranties) > 0 && { title: 'Warranties expiring soon', subtitle: 'Offer an AMC or extension', value: String(k.expiringWarranties), icon: <IconTile icon={<ShieldCheck size={17} color={p.blue} />} tone="blue" />, path: '/warranties' },
    canOpen('quotations') && openQuotes.length > 0 && { title: 'Quotations awaiting reply', subtitle: `${formatINR(openQuoteValue)} in open offers`, value: String(openQuotes.length), icon: <IconTile icon={<FileSignature size={17} color={p.green} />} tone="green" />, path: '/quotations' },
    can('tenant.profile.edit') && profileGaps.length > 0 && { title: 'Complete company profile', subtitle: `Add ${profileGaps.join(', ')} for documents`, value: String(profileGaps.length), icon: <IconTile icon={<Building2 size={17} color={p.gray} />} tone="gray" />, path: '/settings' },
  ].filter(Boolean) as { title: string; subtitle: string; value: string; icon: React.ReactNode; path: string }[];

  const business = (activity.data?.logs || []).filter((log: any) => !['auth', 'security'].includes(log.category) && !/^LOGIN|^LOGOUT|^SESSION|^MFA/.test(log.action));
  const months = (charts.data?.monthlyData || []).slice(-6).map((month: any) => ({ label: String(month.month).split(' ')[0], primary: Number(month.revenue) || 0, secondary: Number(month.cost) || 0 }));
  const stages = (charts.data?.statusDistribution || []).map((item: any) => ({ label: item.name, value: Number(item.value) || 0 }));
  const capacity = (charts.data?.capacityDistribution || []).map((item: any) => ({ label: item.name, value: Number(item.value) || 0, suffix: ' sites' }));
  const recentProjects: any[] = recent.data?.projects || [];
  const first = (user?.username || '').split(/[\s@._]/)[0];

  return (
    <Screen
      title="Today"
      subtitle={`${greeting()}${first ? `, ${first.charAt(0).toUpperCase()}${first.slice(1)}` : ''} · ${tenant?.name || ''}`}
      right={<HeaderActions />}
      refreshing={kpi.refreshing}
      onRefresh={() => { void kpi.refresh(); void charts.refresh(); void activity.refresh(); void recent.refresh(); void quotations.refresh(); }}
    >
      <WorkspaceNotices />
      <QuickActions items={actions} />

      {can('reports.view') ? (
        kpi.error ? <ErrorState message={kpi.error} onRetry={kpi.refresh} /> : kpi.loading ? (
          <View style={{ gap: space.m }}><View style={{ flexDirection: 'row', gap: space.m }}><Skeleton height={104} radius={16} style={{ flex: 1 }} /><Skeleton height={104} radius={16} style={{ flex: 1 }} /></View><View style={{ flexDirection: 'row', gap: space.m }}><Skeleton height={104} radius={16} style={{ flex: 1 }} /><Skeleton height={104} radius={16} style={{ flex: 1 }} /></View></View>
        ) : (
          <StatGrid>
            <StatTile label="Contract value" value={Number(k.totalDealValue) || 0} money tone="accent" icon={<Zap size={15} color={p.accentText} />} hint={`${k.totalProjects || 0} projects · ${Number(k.totalCapacityKw || 0).toFixed(1)} kW`} onPress={() => go('/(tabs)/projects')} />
            <StatTile label="Collected" value={Number(k.totalReceived) || 0} money tone="green" icon={<IndianRupee size={15} color={p.green} />} hint={`${collectionRate}% of contract value`} onPress={() => go('/(tabs)/payments')} />
            <StatTile label="To collect" value={Number(k.totalPending) || 0} money tone="orange" icon={<CreditCard size={15} color={p.orange} />} hint="Outstanding balance" onPress={() => go('/(tabs)/projects')} />
            <StatTile label="Net profit" value={Number(k.actualProfit) || 0} money tone={Number(k.actualProfit) >= 0 ? 'green' : 'red'} icon={<Percent size={15} color={Number(k.actualProfit) >= 0 ? p.green : p.red} />} hint={`${Number(k.profitMargin || 0).toFixed(1)}% margin`} onPress={() => go('/profit')} />
            <StatTile label="Active projects" value={Number(k.activeProjects) || 0} tone="blue" icon={<Zap size={15} color={p.blue} />} hint={`${k.projectsThisMonth || 0} started this month`} onPress={() => go('/(tabs)/projects')} />
            <StatTile label="Installed" value={Number(k.totalInstalledKw ?? k.totalCapacityKw) || 0} suffix=" kW" tone="accent" icon={<Sun size={15} color={p.accentText} />} hint={`${k.totalProjects || 0} projects`} />
            <StatTile label="Profit margin" value={Number(k.profitMargin) || 0} suffix="%" tone="purple" icon={<Percent size={15} color={p.purple} />} hint={`Profit ${formatMoneyCompact(Number(k.actualProfit) || 0)}`} onPress={() => go('/profit')} />
            <StatTile label="Customers" value={Number(k.totalCustomers) || 0} tone="teal" icon={<Users size={15} color={p.teal} />} hint={`${k.activeCustomers || 0} active`} onPress={() => go('/(tabs)/customers')} />
          </StatGrid>
        )
      ) : null}

      {attention.length ? (
        <Section header="Needs attention">
          {attention.map((item) => <Row key={item.title} icon={item.icon} title={item.title} subtitle={item.subtitle} value={item.value} onPress={() => go(item.path)} />)}
        </Section>
      ) : can('reports.view') && !kpi.loading ? (
        <Section header="Needs attention"><Row icon={<IconTile icon={<CheckCircle2 size={17} color={p.green} />} tone="green" />} title="All caught up" subtitle="No approvals, dues, expiring warranties or customer replies waiting." /></Section>
      ) : null}

      {months.length && months.some((month) => month.primary > 0 || month.secondary > 0) ? (
        <Card style={{ gap: space.m }}>
          <View><T variant="headline">Sales vs costs</T><T variant="footnote" color="secondary">Projects booked in each of the last six months.</T></View>
          <ComparisonBarChart data={months} primaryLabel="Sales" secondaryLabel="Costs" />
        </Card>
      ) : null}

      {recentProjects.length ? (
        <Section header="Recent projects" right={<T variant="footnote" color="accent" onPress={() => go('/(tabs)/projects')}>See all</T>}>
          {recentProjects.map((project) => {
            const total = Number(project.finalDealAmount || project.dealAmount || 0);
            const paid = Number(project.totalReceived || 0);
            const paidFraction = total > 0 ? Math.min(1, paid / total) : 0;
            return (
              <Row
                key={project.id}
                icon={<IconTile icon={<Zap size={17} color={p.orange} />} tone="orange" />}
                title={project.customerName || project.projectName}
                subtitle={<View style={{ gap: 5 }}><T variant="footnote" color="secondary" numberOfLines={1}>{project.customId} · {project.capacityKw} kW · {project.projectName}</T><Progress value={paidFraction} tone={paidFraction >= 1 ? 'green' : 'accent'} height={4} /></View>}
                accessory={<View style={{ alignItems: 'flex-end', gap: 4 }}><Badge text={project.status} /><T variant="caption2" color={Number(project.pendingBalance) > 0 ? 'orange' : 'green'} num>{Number(project.pendingBalance) > 0 ? `${formatMoneyCompact(project.pendingBalance)} due` : 'Paid'}</T></View>}
                onPress={() => router.push({ pathname: '/project/[id]', params: { id: project.id } })}
              />
            );
          })}
        </Section>
      ) : null}

      {stages.length ? <Card style={{ gap: space.m }}><T variant="headline">Pipeline by stage</T><DistributionBars data={stages} tone="blue" /></Card> : null}
      {capacity.length ? <Card style={{ gap: space.m }}><T variant="headline">System sizes</T><DistributionBars data={capacity} tone="accent" /></Card> : null}

      {business.length ? (
        <Section header="Recent activity" right={<T variant="footnote" color="accent" onPress={() => go('/audit-logs')}>See all</T>}>
          {business.slice(0, 6).map((log: any) => <Row key={log.id} title={humanizeAction(log.action)} subtitle={`${log.userName} · ${log.entityCustomId || log.entity} · ${timeAgo(log.timestamp)}`} />)}
        </Section>
      ) : null}
    </Screen>
  );
}
