import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowUpRight,
  Building2,
  CheckCircle2,
  CreditCard,
  FileText,
  Plus,
  ShieldCheck,
  TrendingUp,
  Users,
  WalletCards,
  Wrench,
  Zap,
} from 'lucide-react-native';
import { api } from '../../src/lib/api';
import { useAuth } from '../../src/context/AuthContext';
import { useFetch } from '../../src/hooks/useFetch';
import { formatINR, formatNumber } from '../../src/lib/formatters';
import { Screen, StatCard, Loading, ErrorState, Card } from '../../src/components/ui';

export default function DashboardScreen() {
  const { user, tenant, customer, hasPermission } = useAuth();
  const router = useRouter();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isCustomer = user?.role === 'CUSTOMER';
  const showPlatform = isSuperAdmin && !tenant;

  const { data, error, isLoading, isRefreshing, refresh, reload } = useFetch(
    () => showPlatform ? api.getSaaSAnalytics() : isCustomer && customer ? api.getCustomer(customer.id) : hasPermission('reports.view') ? api.getDashboardKpis() : Promise.resolve({ kpis: null }),
    [showPlatform, isCustomer, customer?.id, hasPermission('reports.view')]
  );

  const title = showPlatform ? 'Platform overview' : isCustomer ? 'My solar journey' : 'Solar operations';
  const subtitle = showPlatform
    ? 'A clear view of every workspace'
    : isCustomer ? 'Projects, payments and support in one place' : tenant?.name ?? 'Your business at a glance';

  return (
    <Screen title={title} subtitle={subtitle} refreshing={isRefreshing} onRefresh={refresh}>
      {isLoading ? <Loading /> : error ? <ErrorState message={error} onRetry={reload} /> : showPlatform ? (
        <PlatformHome data={data} onNavigate={path => router.push(path as never)} />
      ) : isCustomer ? (
        <CustomerHome data={data} name={customer?.name || user?.username || 'there'} onNavigate={path => router.push(path as never)} />
      ) : (
        <TenantHome data={(data as any)?.kpis ?? data} onNavigate={path => router.push(path as never)} />
      )}
    </Screen>
  );
}

function WelcomeHero({ eyebrow, title, detail, icon, children }: { eyebrow: string; title: string; detail: string; icon: React.ReactNode; children?: React.ReactNode }) {
  return (
    <Card className="bg-[#0b1b31] border-[#173554] p-5 mb-4">
      <View className="flex-row items-start">
        <View className="w-11 h-11 rounded-2xl bg-amber-400 items-center justify-center">{icon}</View>
        <View className="flex-1 ml-3">
          <Text className="text-[10px] font-bold uppercase tracking-[1.3px] text-amber-300">{eyebrow}</Text>
          <Text className="text-xl font-extrabold tracking-tight text-white mt-1">{title}</Text>
          <Text className="text-xs text-slate-300 mt-1 leading-5">{detail}</Text>
        </View>
      </View>
      {children}
    </Card>
  );
}

function QuickActions({ actions, onNavigate }: { actions: { label: string; path: string; icon: React.ReactNode }[]; onNavigate: (path: string) => void }) {
  return (
    <View className="mt-5 flex-row gap-2">
      {actions.map(action => (
        <Pressable key={action.label} onPress={() => onNavigate(action.path)} className="flex-1 min-h-16 rounded-2xl bg-[#132a47] border border-[#284361] px-2.5 py-2.5 justify-center active:bg-[#1a3a5e]">
          {action.icon}
          <Text className="text-[10px] font-bold text-slate-100 mt-1.5" numberOfLines={1}>{action.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function ProgressRow({ label, value, percent, tone = '#f59e0b' }: { label: string; value: string; percent: number; tone?: string }) {
  return (
    <View className="mb-3">
      <View className="flex-row justify-between mb-1.5"><Text className="text-xs font-semibold text-slate-600">{label}</Text><Text className="text-xs font-bold text-slate-900">{value}</Text></View>
      <View className="h-2 rounded-full bg-slate-100 overflow-hidden"><View style={{ width: `${Math.min(100, Math.max(0, percent))}%`, backgroundColor: tone }} className="h-full rounded-full" /></View>
    </View>
  );
}

function TenantHome({ data, onNavigate }: { data: any; onNavigate: (path: string) => void }) {
  if (!data) return <Card><Text className="text-sm text-slate-400 text-center py-7">No dashboard data yet.</Text></Card>;
  const deal = Number(data.totalDealValue || 0);
  const received = Number(data.totalReceived || 0);
  const pending = Number(data.pendingReceivables ?? data.totalPending ?? Math.max(0, deal - received));
  const margin = Number(data.netMargin ?? data.profitMargin ?? data.averageProfitMargin ?? 0);
  const collectionRate = deal > 0 ? (received / deal) * 100 : 0;
  const activeSites = Number(data.inProgressProjects ?? data.activeProjects ?? 0);

  return <>
    <WelcomeHero eyebrow="Workspace pulse" title="Everything in view" detail="Track revenue, collections and the work that needs attention today." icon={<Zap size={21} color="#0b1b31" />}>
      <QuickActions onNavigate={onNavigate} actions={[
        { label: 'New project', path: '/project-form', icon: <Plus size={17} color="#fbbf24" /> },
        { label: 'Record payment', path: '/payment-form', icon: <CreditCard size={17} color="#34d399" /> },
        { label: 'Log expense', path: '/expense-form', icon: <FileText size={17} color="#93c5fd" /> },
      ]} />
    </WelcomeHero>

    <Text className="text-sm font-extrabold text-slate-900 mb-2">Financial snapshot</Text>
    <StatCard label="Total deal value" value={formatINR(deal)} hint={`${data.totalProjects ?? 0} sites • ${formatNumber(data.totalCapacityKw ?? data.totalInstalledKw ?? 0)} kWp`} />
    <View className="flex-row gap-3">
      <View className="flex-1"><StatCard label="Collected" value={formatINR(received)} accent="text-emerald-700" /></View>
      <View className="flex-1"><StatCard label="To collect" value={formatINR(pending)} accent="text-amber-600" /></View>
    </View>

    <Card className="mt-1">
      <View className="flex-row items-center justify-between mb-3"><View><Text className="text-sm font-extrabold text-slate-900">Collection health</Text><Text className="text-xs text-slate-500 mt-0.5">Cash received against contracted value</Text></View><WalletCards size={19} color="#d97706" /></View>
      <ProgressRow label="Received" value={`${collectionRate.toFixed(1)}%`} percent={collectionRate} tone="#10b981" />
      <View className="flex-row gap-3"><View className="flex-1"><Text className="text-[10px] uppercase tracking-wide text-slate-400">Active sites</Text><Text className="text-lg font-extrabold text-slate-900 mt-1">{activeSites}</Text></View><View className="flex-1"><Text className="text-[10px] uppercase tracking-wide text-slate-400">Net margin</Text><Text className="text-lg font-extrabold text-blue-700 mt-1">{margin.toFixed(1)}%</Text></View><View className="flex-1"><Text className="text-[10px] uppercase tracking-wide text-slate-400">Clients</Text><Text className="text-lg font-extrabold text-slate-900 mt-1">{data.totalCustomers ?? data.activeCustomers ?? 0}</Text></View></View>
    </Card>

    <Card>
      <View className="flex-row items-center justify-between"><View><Text className="text-sm font-extrabold text-slate-900">Next best actions</Text><Text className="text-xs text-slate-500 mt-0.5">Keep the operation moving</Text></View><ArrowUpRight size={18} color="#94a3b8" /></View>
      <Pressable onPress={() => onNavigate('/payments')} className="flex-row items-center py-3 border-b border-slate-100"><View className="w-9 h-9 rounded-xl bg-amber-50 items-center justify-center"><CreditCard size={17} color="#d97706" /></View><View className="flex-1 ml-3"><Text className="text-xs font-bold text-slate-800">Follow up on receivables</Text><Text className="text-[11px] text-slate-500 mt-0.5">{formatINR(pending)} remains outstanding</Text></View><ArrowUpRight size={16} color="#94a3b8" /></Pressable>
      <Pressable onPress={() => onNavigate('/projects')} className="flex-row items-center pt-3"><View className="w-9 h-9 rounded-xl bg-blue-50 items-center justify-center"><Zap size={17} color="#2563eb" /></View><View className="flex-1 ml-3"><Text className="text-xs font-bold text-slate-800">Review active sites</Text><Text className="text-[11px] text-slate-500 mt-0.5">{activeSites} projects currently in motion</Text></View><ArrowUpRight size={16} color="#94a3b8" /></Pressable>
    </Card>
  </>;
}

function CustomerHome({ data, name, onNavigate }: { data: any; name: string; onNavigate: (path: string) => void }) {
  const projects = data?.projects ?? [];
  const payments = data?.payments ?? [];
  const warranties = data?.warranties ?? [];
  const complaints = data?.complaints ?? [];
  const received = payments.reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0);
  const balance = projects.reduce((sum: number, item: any) => sum + Number(item.pendingBalance || 0), 0);
  return <>
    <WelcomeHero eyebrow="Customer portal" title={`Good to see you, ${name.split(' ')[0]}`} detail="Your solar system, payments and service support are all right here." icon={<Building2 size={20} color="#0b1b31" />}>
      <QuickActions onNavigate={onNavigate} actions={[
        { label: 'My projects', path: '/projects', icon: <Zap size={17} color="#fbbf24" /> },
        { label: 'Raise ticket', path: '/ticket-form', icon: <Wrench size={17} color="#fda4af" /> },
        { label: 'Payments', path: '/payments', icon: <CreditCard size={17} color="#34d399" /> },
      ]} />
    </WelcomeHero>
    <Text className="text-sm font-extrabold text-slate-900 mb-2">Your solar summary</Text>
    <StatCard label="Installed capacity" value={`${formatNumber(projects.reduce((sum: number, item: any) => sum + Number(item.capacityKw || 0), 0))} kWp`} hint={`${projects.length} active projects`} accent="text-blue-700" />
    <View className="flex-row gap-3"><View className="flex-1"><StatCard label="Paid so far" value={formatINR(received)} accent="text-emerald-700" /></View><View className="flex-1"><StatCard label="Balance" value={formatINR(balance)} accent="text-amber-600" /></View></View>
    <Card><Text className="text-sm font-extrabold text-slate-900 mb-3">Support & protection</Text><View className="flex-row gap-3"><View className="flex-1 rounded-2xl bg-emerald-50 p-3"><ShieldCheck size={18} color="#059669" /><Text className="text-[10px] uppercase tracking-wide text-emerald-700 mt-2">Warranties</Text><Text className="text-xl font-extrabold text-emerald-800 mt-1">{warranties.length}</Text></View><View className="flex-1 rounded-2xl bg-rose-50 p-3"><Wrench size={18} color="#e11d48" /><Text className="text-[10px] uppercase tracking-wide text-rose-700 mt-2">Open tickets</Text><Text className="text-xl font-extrabold text-rose-800 mt-1">{complaints.filter((item: any) => !/resolved|closed/i.test(item.status)).length}</Text></View></View></Card>
    <Card><View className="flex-row items-center"><CheckCircle2 size={18} color="#10b981" /><Text className="text-sm font-extrabold text-slate-900 ml-2">Stay on top of your system</Text></View><Text className="text-xs text-slate-500 leading-5 mt-2">View your latest project milestone or contact support whenever you need help.</Text><Pressable onPress={() => onNavigate('/projects')} className="mt-3 self-start flex-row items-center"><Text className="text-xs font-bold text-amber-700">View my projects</Text><ArrowUpRight size={14} color="#b45309" /></Pressable></Card>
  </>;
}

function PlatformHome({ data, onNavigate }: { data: any; onNavigate: (path: string) => void }) {
  if (!data) return null;
  return <>
    <WelcomeHero eyebrow="Platform control plane" title="Your SaaS at a glance" detail="Monitor tenant growth, recurring revenue and the health of every workspace." icon={<TrendingUp size={20} color="#0b1b31" />}>
      <QuickActions onNavigate={onNavigate} actions={[
        { label: 'Tenants', path: '/tenants', icon: <Users size={17} color="#93c5fd" /> },
        { label: 'Plans', path: '/plans', icon: <WalletCards size={17} color="#fbbf24" /> },
        { label: 'Audit log', path: '/platform-audit', icon: <FileText size={17} color="#c4b5fd" /> },
      ]} />
    </WelcomeHero>
    <Text className="text-sm font-extrabold text-slate-900 mb-2">Platform snapshot</Text>
    <StatCard label="Total tenants" value={String(data.totalTenants ?? 0)} hint={`${data.activeTenants ?? 0} active • ${data.trialTenants ?? 0} trial`} />
    <View className="flex-row gap-3"><View className="flex-1"><StatCard label="Platform MRR" value={formatINR(data.totalMRR)} accent="text-emerald-700" /></View><View className="flex-1"><StatCard label="Managed solar" value={`${formatNumber(data.totalKWAcrossTenants)} kWp`} accent="text-blue-700" /></View></View>
    <Card><Text className="text-sm font-extrabold text-slate-900 mb-3">Growth footprint</Text><ProgressRow label="Active workspaces" value={`${data.activeTenants ?? 0} / ${data.totalTenants ?? 0}`} percent={Number(data.totalTenants) ? (Number(data.activeTenants || 0) / Number(data.totalTenants)) * 100 : 0} tone="#10b981" /><View className="flex-row gap-3"><View className="flex-1"><Text className="text-[10px] uppercase tracking-wide text-slate-400">Solar projects</Text><Text className="text-xl font-extrabold text-slate-900 mt-1">{data.totalProjectsAcrossTenants ?? 0}</Text></View><View className="flex-1"><Text className="text-[10px] uppercase tracking-wide text-slate-400">End customers</Text><Text className="text-xl font-extrabold text-slate-900 mt-1">{data.totalCustomersAcrossTenants ?? 0}</Text></View></View></Card>
  </>;
}
