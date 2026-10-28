import React from 'react';
import { useRouter } from 'expo-router';
import { Building2, CreditCard, IndianRupee, LifeBuoy, TrendingDown, TrendingUp, Zap, Activity } from 'lucide-react-native';
import { api } from '../../lib/api';
import { platform } from '../../lib/apis/platform';
import { useApi } from '../../lib/query';
import { useAuth } from '../../context/AuthContext';
import { platformTabAllowed } from '../../lib/platformRoles';
import { formatDate, formatINR } from '../../lib/formatters';
import { BarChart, Card, ErrorState, IconTile, Row, Screen, Section, StatGrid, StatTile, T, useTheme, space, formatMoneyCompact } from '../../ds';
import { HeaderActions } from '../../components/kit';

/** Super Admin home: money, companies at risk, support queue. */
export function PlatformHome() {
  const router = useRouter();
  const p = useTheme();
  const { user } = useAuth();
  const role = (user as any)?.platformRole;
  const canBilling = platformTabAllowed(role, 'saas_billing');
  const canSupport = platformTabAllowed(role, 'saas_support');
  const canUsage = platformTabAllowed(role, 'saas_usage');
  const go = (path: string) => router.push(path as never);
  const a = useApi(['saas', 'analytics'], api.getSaaSAnalytics);
  const b = useApi(['saas', 'billing', 'overview'], platform.billingOverview, { enabled: canBilling });
  const s = useApi(['support', 'counts'], () => platform.supportTickets({ status: 'open' }), { enabled: canSupport });
  const u = useApi(['saas', 'usage'], platform.usage, { enabled: canUsage });
  const churn = (u.data?.tenants || []).filter((t) => t.signals.some((x) => x.kind === 'churn')).length;
  const upsell = (u.data?.tenants || []).filter((t) => t.signals.some((x) => x.kind === 'upsell')).length;
  const life = b.data?.lifecycleCounts;
  const months = (b.data?.months || []).slice(-6).map((m) => ({ label: new Date(`${m.month}-01T00:00:00`).toLocaleString('en-IN', { month: 'short' }), value: m.mrr }));

  return (
    <Screen title="Platform" subtitle="SolarOS across every company" right={<HeaderActions />} refreshing={a.refreshing} onRefresh={() => { void a.refresh(); void b.refresh(); void s.refresh(); void u.refresh(); }}>
      {a.error ? <ErrorState message={a.error} onRetry={a.refresh} /> : (
        <StatGrid>
          {canBilling ? <StatTile label="MRR" value={b.data?.mrr ?? a.data?.totalMRR ?? 0} money tone="green" icon={<IndianRupee size={15} color={p.green} />} hint={b.data ? `ARR ${formatMoneyCompact(b.data.arr)}` : undefined} /> : null}
          {canBilling ? <StatTile label="Paying companies" value={b.data?.payingCompanies ?? 0} tone="blue" icon={<CreditCard size={15} color={p.blue} />} hint={b.data ? `${formatMoneyCompact(b.data.collectedThisMonth)} collected this month` : undefined} /> : null}
          <StatTile label="Companies" value={a.data?.totalTenants ?? 0} tone="accent" icon={<Building2 size={15} color={p.accentText} />} hint={`${a.data?.activeTenants ?? 0} active · ${a.data?.trialTenants ?? 0} trial`} onPress={() => go('/tenants')} />
          <StatTile label="Solar projects" value={a.data?.totalProjectsAcrossTenants ?? 0} tone="orange" icon={<Zap size={15} color={p.orange} />} hint={`${a.data?.totalKWAcrossTenants ?? 0} kW managed`} />
        </StatGrid>
      )}

      <Section header="Needs attention">
        {canBilling && b.data && b.data.overdue.length ? <Row icon={<IconTile icon={<CreditCard size={17} color={p.red} />} tone="red" />} title="Overdue invoices" subtitle={formatINR(b.data.overdueAmount)} value={String(b.data.overdue.length)} /> : null}
        {canBilling && life && life.grace + life.read_only + life.locked > 0 ? <Row icon={<IconTile icon={<Building2 size={17} color={p.orange} />} tone="orange" />} title="Renewals overdue" subtitle={`${life.grace} in grace · ${life.read_only} read-only · ${life.locked} locked`} onPress={() => go('/tenants')} /> : null}
        {canSupport && s.data ? <Row icon={<IconTile icon={<LifeBuoy size={17} color={p.blue} />} tone="blue" />} title="Support tickets" subtitle={`${s.data.counts.urgent} urgent · ${s.data.counts.unassigned} unassigned`} value={String(s.data.counts.open)} /> : null}
        {canUsage && u.data ? <Row icon={<IconTile icon={<TrendingDown size={17} color={p.red} />} tone="red" />} title="Churn risk" subtitle="Low sign-ins or falling activity" value={String(churn)} /> : null}
        {canUsage && u.data ? <Row icon={<IconTile icon={<TrendingUp size={17} color={p.green} />} tone="green" />} title="Ready to upgrade" subtitle="Near their plan limits or growing fast" value={String(upsell)} /> : null}
        {canUsage ? <Row icon={<IconTile icon={<Activity size={17} color={p.purple} />} tone="purple" />} title="Usage by company" /> : null}
      </Section>

      {canBilling && months.some((m) => m.value > 0) ? (
        <Card>
          <T variant="headline">MRR · last 6 months</T>
          <T variant="footnote" color="secondary" style={{ marginBottom: space.m }}>Monthly recurring revenue at month end.</T>
          <BarChart data={months} tone="green" />
        </Card>
      ) : null}

      {canBilling && b.data?.renewalsNext30.length ? (
        <Section header="Renewals in the next 30 days">
          {b.data.renewalsNext30.slice(0, 6).map((r) => <Row key={r.tenantId} title={r.name} subtitle={`Due ${formatDate(r.dueAt)}${r.enforced ? '' : ' · not enforced'}`} value={formatMoneyCompact(r.monthly)} onPress={() => router.push({ pathname: '/tenant-form', params: { id: r.tenantId } })} />)}
        </Section>
      ) : null}
    </Screen>
  );
}
