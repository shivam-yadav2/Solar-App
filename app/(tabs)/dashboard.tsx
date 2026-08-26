import React from 'react';
import { View, Text } from 'react-native';
import { api } from '../../src/lib/api';
import { useAuth } from '../../src/context/AuthContext';
import { useFetch } from '../../src/hooks/useFetch';
import { formatINR, formatNumber } from '../../src/lib/formatters';
import { Screen, StatCard, Loading, ErrorState, Card } from '../../src/components/ui';

export default function DashboardScreen() {
  const { user, tenant, customer, hasPermission } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isCustomer = user?.role === 'CUSTOMER';
  const showPlatform = isSuperAdmin && !tenant;

  const { data, error, isLoading, isRefreshing, refresh, reload } = useFetch(
    () => showPlatform ? api.getSaaSAnalytics() : isCustomer && customer ? api.getCustomer(customer.id) : hasPermission('reports.view') ? api.getDashboardKpis() : Promise.resolve({ kpis: null }),
    [showPlatform, isCustomer, customer?.id, hasPermission('reports.view')]
  );

  const title = showPlatform ? 'SaaS Control Plane' : isCustomer ? `Welcome, ${customer?.name || 'Customer'}` : 'Solar Operations';
  const subtitle = showPlatform
    ? 'Cross-tenant platform metrics'
    : isCustomer ? 'Your solar projects, payments and support' : tenant?.name ?? 'Live pipeline, margins & milestone billing';

  return (
    <Screen title={title} subtitle={subtitle} refreshing={isRefreshing} onRefresh={refresh}>
      {isLoading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : showPlatform ? (
        <PlatformStats data={data} />
      ) : isCustomer ? (
        <CustomerStats data={data} />
      ) : (
        <TenantStats data={(data as any)?.kpis ?? data} />
      )}
    </Screen>
  );
}

function CustomerStats({ data }: { data: any }) {
  const projects = data?.projects ?? []; const payments = data?.payments ?? []; const warranties = data?.warranties ?? []; const complaints = data?.complaints ?? [];
  const received = payments.reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0);
  const balance = projects.reduce((sum: number, item: any) => sum + Number(item.pendingBalance || 0), 0);
  return <>
    <StatCard label="My Solar Capacity" value={`${formatNumber(projects.reduce((sum: number, item: any) => sum + Number(item.capacityKw || 0), 0))} kWp`} hint={`${projects.length} projects`} accent="text-blue-700" />
    <StatCard label="Payments Made" value={formatINR(received)} hint={`${payments.length} receipts`} accent="text-emerald-700" />
    <StatCard label="Pending Balance" value={formatINR(balance)} accent="text-amber-600" />
    <View className="flex-row gap-3"><View className="flex-1"><StatCard label="Warranties" value={String(warranties.length)} /></View><View className="flex-1"><StatCard label="Open Tickets" value={String(complaints.filter((item: any) => !/resolved|closed/i.test(item.status)).length)} accent="text-rose-600" /></View></View>
  </>;
}

function PlatformStats({ data }: { data: any }) {
  if (!data) return null;
  return (
    <>
      <StatCard
        label="Total Tenants"
        value={String(data.totalTenants ?? 0)}
        hint={`${data.activeTenants ?? 0} active • ${data.trialTenants ?? 0} trial`}
      />
      <StatCard
        label="Platform MRR"
        value={formatINR(data.totalMRR)}
        hint="Monthly subscription revenue"
        accent="text-emerald-700"
      />
      <StatCard
        label="Managed Solar"
        value={`${formatNumber(data.totalKWAcrossTenants)} kWp`}
        hint={`${data.totalProjectsAcrossTenants ?? 0} rooftop sites`}
        accent="text-blue-700"
      />
      <StatCard
        label="End Customers"
        value={String(data.totalCustomersAcrossTenants ?? 0)}
        hint="Self-service portal access"
        accent="text-purple-700"
      />
    </>
  );
}

function TenantStats({ data }: { data: any }) {
  if (!data) {
    return (
      <Card>
        <Text className="text-xs text-slate-400 text-center py-6">No dashboard data yet.</Text>
      </Card>
    );
  }
  return (
    <>
      <StatCard
        label="Total Deal Value"
        value={formatINR(data.totalDealValue)}
        hint={
          data.totalProjects != null
            ? `${data.totalProjects} sites (${formatNumber(data.totalCapacityKw)} kWp)`
            : undefined
        }
      />
      <StatCard
        label="Collections Received"
        value={formatINR(data.totalReceived)}
        hint={data.collectionRate != null ? `Rate: ${data.collectionRate}%` : undefined}
        accent="text-emerald-700"
      />
      <StatCard
        label="Pending Receivables"
        value={formatINR(data.pendingReceivables)}
        hint="Customer balance to collect"
        accent="text-amber-600"
      />
      <StatCard
        label="Actual Net Profit"
        value={formatINR(data.actualProfit)}
        hint={data.netMargin != null ? `${data.netMargin}% net margin` : undefined}
        accent="text-blue-700"
      />

      <View className="flex-row gap-3">
        <View className="flex-1">
          <StatCard label="Clients" value={String(data.totalCustomers ?? 0)} />
        </View>
        <View className="flex-1">
          <StatCard label="Open Tickets" value={String(data.openComplaints ?? 0)} accent="text-rose-600" />
        </View>
      </View>
    </>
  );
}
