import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowUpRight, CreditCard, FileText, KeyRound, Pencil, Plus, ShieldCheck, Ticket, UserRound, Wrench } from 'lucide-react-native';
import { api } from '../../../src/lib/api';
import { useFetch } from '../../../src/hooks/useFetch';
import { formatDate, formatINR, formatPhone } from '../../../src/lib/formatters';
import { Badge, Card, DetailRow, EmptyState, ErrorState, HeaderButton, Loading, Screen, StatCard } from '../../../src/components/ui';
import { useAuth } from '../../../src/context/AuthContext';

type CustomerTab = 'overview' | 'projects' | 'payments' | 'support';

export default function CustomerDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const state = useFetch(() => api.getCustomer(String(id)), [id]);
  const data = state.data;
  const item = data?.customer;
  const { hasPermission } = useAuth();
  const [tab, setTab] = useState<CustomerTab>('overview');
  const payments = data?.payments ?? [];
  const received = payments.reduce((sum: number, value: any) => sum + Number(value.amount || 0), 0);
  const projects = data?.projects ?? [];
  const totalValue = projects.reduce((sum: number, project: any) => sum + Number(project.finalDealAmount || project.dealAmount || 0), 0);
  const pending = Math.max(0, totalValue - received);

  const resetCredentials = async () => {
    try {
      const result = await api.resetCustomerPassword(item.id, 'solar123');
      Alert.alert('Customer credentials reset', `Username: ${result.username}\nTemporary password: ${result.tempPassword}`);
    } catch (e: any) { Alert.alert('Could not reset credentials', e?.message || 'Please try again.'); }
  };
  const archive = () => Alert.alert('Archive customer?', 'The customer and portal access will be archived.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Archive', style: 'destructive', onPress: async () => { try { await api.archiveCustomer(item.id); router.back(); } catch (e: any) { Alert.alert('Could not archive customer', e?.message || 'Please try again.'); } } },
  ]);

  return <Screen title={item?.name || 'Customer'} subtitle={item?.customId} onBack={() => router.back()} action={item && hasPermission('customers.edit') ? <HeaderButton label="Edit" onPress={() => router.push({ pathname: '/customer-form', params: { id: item.id } })} /> : undefined} refreshing={state.isRefreshing} onRefresh={state.refresh}>
    {state.isLoading ? <Loading /> : state.error ? <ErrorState message={state.error} onRetry={state.reload} /> : item ? <>
      <Card className="bg-[#0b1b31] border-[#173554] p-5">
        <View className="flex-row items-center"><View className="w-12 h-12 rounded-2xl bg-amber-400 items-center justify-center"><UserRound size={22} color="#0b1b31" /></View><View className="flex-1 ml-3"><Text className="text-lg font-extrabold text-white">{item.name}</Text><Text className="text-xs text-slate-300 mt-1">{formatPhone(item.mobile)}{item.city ? ` • ${item.city}` : ''}</Text></View><Badge text={item.status || 'Active'} tone={item.status === 'Active' ? 'green' : 'slate'} /></View>
        {(hasPermission('projects.create') || hasPermission('customers.edit')) ? <View className="flex-row gap-2 mt-5">{hasPermission('projects.create') ? <Action label="New project" icon={<Plus size={15} color="#fbbf24" />} onPress={() => router.push({ pathname: '/project-form', params: { customerId: item.id } })} /> : null}{hasPermission('customers.edit') ? <Action label="Reset access" icon={<KeyRound size={15} color="#93c5fd" />} onPress={() => void resetCredentials()} /> : null}</View> : null}
      </Card>
      <View className="flex-row gap-3"><View className="flex-1"><StatCard label="Deal value" value={formatINR(totalValue)} /></View><View className="flex-1"><StatCard label="Paid" value={formatINR(received)} accent="text-emerald-700" /></View></View>
      <View className="flex-row gap-3"><View className="flex-1"><StatCard label="Balance" value={formatINR(pending)} accent="text-amber-600" /></View><View className="flex-1"><StatCard label="Solar sites" value={String(projects.length)} accent="text-blue-700" /></View></View>
      <TabBar tab={tab} onChange={setTab} counts={{ projects: projects.length, payments: payments.length, support: (data.warranties?.length ?? 0) + (data.complaints?.length ?? 0) }} />
      {tab === 'overview' ? <CustomerOverview item={item} data={data} hasPermission={hasPermission} onReset={resetCredentials} onArchive={archive} /> : null}
      {tab === 'projects' ? <CustomerProjects projects={projects} onOpen={projectId => router.push({ pathname: '/project/[id]', params: { id: projectId } })} /> : null}
      {tab === 'payments' ? <CustomerPayments payments={payments} /> : null}
      {tab === 'support' ? <CustomerSupport data={data} onNavigate={path => router.push(path as never)} /> : null}
    </> : null}
  </Screen>;
}

function Action({ label, icon, onPress }: { label: string; icon: React.ReactNode; onPress: () => void }) {
  return <Pressable onPress={onPress} className="flex-1 min-h-11 rounded-xl bg-[#132a47] border border-[#29415f] px-3 flex-row items-center justify-center active:bg-[#1a3a5e]"><View>{icon}</View><Text className="text-[11px] font-bold text-white ml-2">{label}</Text></Pressable>;
}

function TabBar({ tab, onChange, counts }: { tab: CustomerTab; onChange: (tab: CustomerTab) => void; counts: { projects: number; payments: number; support: number } }) {
  const tabs: { key: CustomerTab; label: string; count?: number }[] = [{ key: 'overview', label: 'Overview' }, { key: 'projects', label: 'Projects', count: counts.projects }, { key: 'payments', label: 'Payments', count: counts.payments }, { key: 'support', label: 'Support', count: counts.support }];
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4"><View className="flex-row gap-2">{tabs.map(item => <Pressable key={item.key} onPress={() => onChange(item.key)} className={`px-4 py-2.5 rounded-xl border ${tab === item.key ? 'bg-amber-50 border-amber-300' : 'bg-white border-slate-200'}`}><Text className={`text-xs font-bold ${tab === item.key ? 'text-amber-800' : 'text-slate-500'}`}>{item.label}{item.count != null ? ` (${item.count})` : ''}</Text></Pressable>)}</View></ScrollView>;
}

function CustomerOverview({ item, data, hasPermission, onReset, onArchive }: { item: any; data: any; hasPermission: (permission: string) => boolean; onReset: () => void; onArchive: () => void }) {
  return <>
    <Card><Text className="text-sm font-extrabold text-slate-900 mb-2">Customer account</Text><DetailRow label="Account ID" value={item.customId} /><DetailRow label="Mobile" value={formatPhone(item.mobile)} /><DetailRow label="Email" value={item.email} /><DetailRow label="Address" value={[item.address, item.city, item.state, item.pincode].filter(Boolean).join(', ')} /><DetailRow label="Portal access" value={item.accountStatus} /><DetailRow label="Customer since" value={formatDate(item.createdAt)} />{hasPermission('customers.edit') ? <Pressable onPress={onReset} className="mt-4 min-h-11 rounded-xl bg-amber-50 border border-amber-200 items-center justify-center"><Text className="text-xs font-bold text-amber-800">Reset portal credentials</Text></Pressable> : null}</Card>
    <Card><Text className="text-sm font-extrabold text-slate-900 mb-2">Account activity</Text><DetailRow label="Projects" value={String(data.projects?.length ?? 0)} /><DetailRow label="Payments" value={String(data.payments?.length ?? 0)} /><DetailRow label="Invoices" value={String(data.invoices?.length ?? 0)} /><DetailRow label="Warranties" value={String(data.warranties?.length ?? 0)} /><DetailRow label="Tickets" value={String(data.complaints?.length ?? 0)} /><DetailRow label="Documents" value={String(data.documents?.length ?? 0)} /></Card>
    {item.notes ? <Card><Text className="text-[10px] font-bold tracking-wide text-slate-400 mb-2">NOTES</Text><Text className="text-sm leading-5 text-slate-700">{item.notes}</Text></Card> : null}
    {hasPermission('customers.delete') && item.status !== 'Archived' ? <Pressable onPress={onArchive} className="min-h-11 rounded-xl border border-rose-200 bg-rose-50 items-center justify-center"><Text className="text-xs font-bold text-rose-700">Archive customer</Text></Pressable> : null}
  </>;
}

function CustomerProjects({ projects, onOpen }: { projects: any[]; onOpen: (id: string) => void }) {
  if (!projects.length) return <EmptyState message="This customer has no projects yet." />;
  return <>{projects.map(project => <Pressable key={project.id} onPress={() => onOpen(project.id)}><Card><View className="flex-row items-start justify-between"><View className="flex-1"><Text className="text-[10px] font-mono text-slate-400">{project.customId}</Text><Text className="text-base font-extrabold text-slate-900 mt-1">{project.projectName}</Text><Text className="text-xs text-slate-500 mt-1">{project.capacityKw} kW • {project.city || 'Installation site'}</Text></View><Badge text={project.status || 'Draft'} tone={/complete|installed/i.test(project.status) ? 'green' : 'amber'} /></View><View className="flex-row mt-3 pt-3 border-t border-slate-100"><Text className="flex-1 text-xs text-slate-500">Deal <Text className="font-bold text-slate-800">{formatINR(project.finalDealAmount || project.dealAmount)}</Text></Text><Text className="text-xs text-slate-500">Balance <Text className="font-bold text-amber-700">{formatINR(project.pendingBalance)}</Text></Text></View><View className="flex-row items-center mt-3"><Text className="text-xs font-bold text-amber-700">Open project details</Text><ArrowUpRight size={14} color="#b45309" /></View></Card></Pressable>)}</>;
}

function CustomerPayments({ payments }: { payments: any[] }) {
  if (!payments.length) return <EmptyState message="No payments recorded for this customer." />;
  return <>{payments.map((payment, index) => <Card key={payment.id || index}><View className="flex-row items-center"><View className="w-9 h-9 rounded-xl bg-emerald-50 items-center justify-center"><CreditCard size={16} color="#059669" /></View><View className="flex-1 ml-3"><Text className="text-sm font-bold text-slate-900">{formatINR(payment.amount)}</Text><Text className="text-xs text-slate-500 mt-0.5">{payment.projectName || payment.project?.projectName || 'Solar project'} • {formatDate(payment.paymentDate || payment.date)}</Text></View><Badge text={payment.status || 'Successful'} tone={/success|paid/i.test(payment.status || '') ? 'green' : 'amber'} /></View></Card>)}</>;
}

function CustomerSupport({ data, onNavigate }: { data: any; onNavigate: (path: string) => void }) {
  const warranties = data.warranties ?? []; const invoices = data.invoices ?? []; const complaints = data.complaints ?? []; const documents = data.documents ?? [];
  if (!warranties.length && !invoices.length && !complaints.length && !documents.length) return <EmptyState message="No warranty, invoice, ticket, or document records yet." />;
  return <>
    <Card><View className="flex-row items-center justify-between mb-3"><Text className="text-sm font-extrabold text-slate-900">Service tickets</Text><Pressable onPress={() => onNavigate('/ticket-form')}><Text className="text-xs font-bold text-amber-700">New ticket</Text></Pressable></View>{complaints.length ? complaints.map((item: any, index: number) => <View key={item.id || index} className="flex-row items-center py-2.5 border-b border-slate-100"><View className="w-8 h-8 rounded-lg bg-rose-50 items-center justify-center"><Ticket size={15} color="#e11d48" /></View><View className="flex-1 ml-3"><Text className="text-xs font-bold text-slate-800" numberOfLines={1}>{item.subject || 'Service request'}</Text><Text className="text-[11px] text-slate-500 mt-0.5">{item.priority || 'Medium'} priority</Text></View><Badge text={item.status || 'Open'} tone={/resolved|closed/i.test(item.status || '') ? 'green' : 'rose'} /></View>) : <Text className="text-xs text-slate-400">No service tickets.</Text>}</Card>
    <Card><Text className="text-sm font-extrabold text-slate-900 mb-3">Warranties & documents</Text><DetailRow label="Active warranties" value={String(warranties.length)} /><DetailRow label="Invoices" value={String(invoices.length)} /><DetailRow label="Documents" value={String(documents.length)} /></Card>
  </>;
}
