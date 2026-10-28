import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Banknote, Download, IndianRupee, Plus, UsersRound } from 'lucide-react-native';
import { api } from '../../src/lib/api';
import { toPage, usePaged } from '../../src/lib/query';
import { useAuth } from '../../src/context/AuthContext';
import { formatDate, formatINR } from '../../src/lib/formatters';
import { payslipHtml, sharePdf } from '../../src/lib/docs';
import { shareCsv } from '../../src/lib/export';
import { Badge, Button, Chips, EmptyState, ErrorState, FormSection, GroupedItem, GUTTER, IconButton, IconTile, InfoRow, ListScreen, ListSkeleton, Row, SearchBar, Section, Segmented, Sheet, T, TextField, formatMoneyCompact, haptic, space, useOverlay, useTheme } from '../../src/ds';
import { LoadMoreFooter } from '../../src/components/kit';

type Mode = 'payroll' | 'employees' | 'advances';

export default function PayrollScreen() {
  const router = useRouter();
  const p = useTheme();
  const { tenant, hasPermission: can } = useAuth();
  const { toast, actions } = useOverlay();
  const [mode, setMode] = useState<Mode>('payroll');
  const [text, setText] = useState(''); const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [recovered, setRecovered] = useState('all');
  const [summary, setSummary] = useState<any>({});
  const [selected, setSelected] = useState<any | null>(null);

  const payroll = usePaged<any>(['payroll', 'records', search, status], async (page, limit) => {
    const result: any = await api.getPayrollRecords({ page: String(page), limit: String(limit), search, status });
    if (page === 1) setSummary(result.summary || {});
    return toPage(result.records, result, page);
  }, 30, { enabled: mode === 'payroll' });
  const employees = usePaged<any>(['payroll', 'employees', search, status], async (page, limit) => {
    const result: any = await api.getEmployees({ page: String(page), limit: String(limit), search, status });
    return toPage(result.employees, result, page);
  }, 30, { enabled: mode === 'employees' });
  const advances = usePaged<any>(['payroll', 'advances', recovered], async (page, limit) => {
    const result: any = await api.getSalaryAdvances({ page: String(page), limit: String(limit), ...(recovered === 'all' ? {} : { isRecovered: recovered }) });
    return toPage(result.advances, result, page);
  }, 30, { enabled: mode === 'advances' });
  const list = mode === 'payroll' ? payroll : mode === 'employees' ? employees : advances;

  const refresh = async () => { await list.refresh(); };
  const runBatch = () => {
    const month = new Date().toISOString().slice(0, 7);
    actions({ title: `Run payroll for ${month}?`, message: 'This creates one pending payroll record for each active employee without an existing record.', items: [{ label: 'Run batch payroll', icon: <IndianRupee size={20} color={p.accentText} />, onPress: async () => {
      try { const result = await api.runBatchPayroll(month); toast(result.message || 'Payroll created'); await payroll.refresh(); } catch (e: any) { toast(e.message || 'Batch payroll failed', 'error'); }
    } }] });
  };
  const remove = (kind: 'record' | 'employee', item: any) => actions({ title: `Delete ${kind}?`, message: kind === 'record' ? `${item.employeeName} · ${item.month}` : item.name, items: [{ label: 'Delete permanently', destructive: true, onPress: async () => {
    try { if (kind === 'record') await api.deletePayrollRecord(item.id); else await api.deleteEmployee(item.id); setSelected(null); toast('Deleted'); await (kind === 'record' ? payroll.refresh() : employees.refresh()); } catch (e: any) { toast(e.message || 'Could not delete', 'error'); }
  } }] });
  const settle = (item: any) => actions({ title: 'Mark salary paid?', message: `${item.employeeName} · ${formatINR(item.netSalary)}`, items: [{ label: 'Mark paid by bank transfer', onPress: async () => {
    try { await api.updatePayrollRecord(item.id, { status: 'Paid', paymentDate: new Date().toISOString().slice(0, 10), paymentMethod: 'Bank Transfer' }); setSelected(null); haptic.success(); toast('Payroll marked paid'); await payroll.refresh(); } catch (e: any) { toast(e.message, 'error'); }
  } }] });
  const exportData = async () => {
    try {
      if (mode === 'payroll') await shareCsv('SolarOS_Payroll', payroll.items.map((item) => ({ Voucher: item.customId, Employee: item.employeeName, Month: item.month, Gross: item.grossSalary, Deductions: item.totalDeductions, Net: item.netSalary, Status: item.status })));
      else if (mode === 'employees') await shareCsv('SolarOS_Employees', employees.items.map((item) => ({ ID: item.customId, Employee: item.name, Role: item.role, Department: item.department, BaseSalary: item.baseSalary, Status: item.status })));
      else await shareCsv('SolarOS_Salary_Advances', advances.items.map((item) => ({ ID: item.customId, Employee: item.employeeName, Amount: item.amount, RecoveryMonth: item.recoveryMonth, Recovered: item.isRecovered ? 'Yes' : 'No' })));
    } catch (e: any) { toast(e.message || 'Export failed', 'error'); }
  };
  const add = () => router.push(mode === 'payroll' ? '/payroll-record-form' : mode === 'employees' ? '/employee-form' : '/salary-advance-form');
  const emptyTitle = mode === 'payroll' ? 'No payroll records' : mode === 'employees' ? 'No employees' : 'No salary advances';

  return <>
    <ListScreen<any>
      title="Staff payroll" subtitle="Employees, salary runs, advances and payslips" back large={false}
      right={can('payroll.manage') ? <IconButton tinted icon={<Plus size={18} color={p.accentText} strokeWidth={2.6} />} label={mode === 'payroll' ? 'New payroll' : mode === 'employees' ? 'Add employee' : 'Grant advance'} onPress={add} /> : undefined}
      header={<>
        <Segmented<Mode> value={mode} onChange={(value) => { setMode(value); setText(''); setSearch(''); setStatus('All'); }} options={[{ value: 'payroll', label: 'Payroll' }, { value: 'employees', label: 'People' }, { value: 'advances', label: 'Advances' }]} />
        {mode === 'payroll' ? <View style={{ flexDirection: 'row', gap: space.m }}><View style={{ flex: 1 }}><Section><InfoRow label="Net payroll" value={<T variant="headline" num>{formatMoneyCompact(summary.totalNet || 0)}</T>} /></Section></View><View style={{ flex: 1 }}><Section><InfoRow label="Pending" value={<T variant="headline" num color="orange">{formatMoneyCompact(summary.totalPending || 0)}</T>} /></Section></View></View> : null}
        {mode !== 'advances' ? <SearchBar value={text} onChange={setText} onSearch={setSearch} placeholder={mode === 'payroll' ? 'Employee, voucher or role' : 'Name, ID, phone or role'} /> : null}
        {mode === 'payroll' ? <Chips value={status} onChange={setStatus} options={['All', 'Pending', 'Processing', 'Paid'].map((value) => ({ value, label: value }))} /> : null}
        {mode === 'employees' ? <Chips value={status} onChange={setStatus} options={['All', 'Active', 'On Leave', 'Inactive', 'Terminated'].map((value) => ({ value, label: value }))} /> : null}
        {mode === 'advances' ? <Chips value={recovered} onChange={setRecovered} options={[{ value: 'all', label: 'All' }, { value: 'false', label: 'Pending' }, { value: 'true', label: 'Recovered' }]} /> : null}
        {can('payroll.manage') && mode === 'payroll' ? <View style={{ flexDirection: 'row', gap: space.s }}><Button title="Run this month" kind="gray" onPress={runBatch} style={{ flex: 1 }} /><Button title="Export" kind="gray" icon={<Download size={17} color={p.label} />} onPress={() => void exportData()} style={{ flex: 1 }} /></View> : <Button title="Export current list" kind="gray" icon={<Download size={17} color={p.label} />} onPress={() => void exportData()} full />}
        {list.loading ? <ListSkeleton /> : list.error ? <ErrorState message={list.error} onRetry={list.refresh} /> : null}
      </>}
      data={list.loading || list.error ? [] : list.items}
      keyExtractor={(item) => item.id}
      refreshing={list.refreshing}
      onRefresh={list.refresh}
      onEndReached={list.loadMore}
      onEndReachedThreshold={0.4}
      ListEmptyComponent={!list.loading && !list.error ? <EmptyState icon={mode === 'employees' ? <UsersRound size={44} color={p.tertiary} /> : <Banknote size={44} color={p.tertiary} />} title={emptyTitle} action={can('payroll.manage') ? { title: mode === 'payroll' ? 'Create payroll' : mode === 'employees' ? 'Add employee' : 'Grant advance', onPress: add } : undefined} /> : null}
      ListFooterComponent={<LoadMoreFooter loading={list.loadingMore} hasMore={list.hasMore} count={list.items.length} total={list.total} noun={mode} />}
      renderItem={({ item, index }) => <GroupedItem index={index} count={list.items.length} inset={58}>
        {mode === 'payroll' ? <Row icon={<IconTile icon={<IndianRupee size={17} color={item.status === 'Paid' ? p.green : p.orange} />} tone={item.status === 'Paid' ? 'green' : 'orange'} />} title={item.employeeName} subtitle={`${item.employeeRole} · ${item.month} · ${item.customId}`} accessory={<View style={{ alignItems: 'flex-end', gap: 2 }}><T variant="subhead" num weight="600">{formatINR(item.netSalary)}</T><Badge text={item.status} tone={item.status === 'Paid' ? 'green' : 'orange'} /></View>} onPress={() => setSelected(item)} /> : null}
        {mode === 'employees' ? <Row icon={<IconTile icon={<UsersRound size={17} color={p.blue} />} tone="blue" />} title={item.name} subtitle={`${item.role} · ${item.department} · ${item.customId}`} accessory={<View style={{ alignItems: 'flex-end', gap: 2 }}><T variant="subhead" num>{formatINR(item.baseSalary)}</T><Badge text={item.status} tone={item.status === 'Active' ? 'green' : 'gray'} /></View>} onPress={() => can('payroll.manage') && router.push({ pathname: '/employee-form', params: { id: item.id } })} onLongPress={() => can('payroll.manage') && remove('employee', item)} /> : null}
        {mode === 'advances' ? <Row icon={<IconTile icon={<Banknote size={17} color={item.isRecovered ? p.green : p.orange} />} tone={item.isRecovered ? 'green' : 'orange'} />} title={item.employeeName} subtitle={`${item.reason} · Recover ${item.recoveryMonth} · ${formatDate(item.disbursedDate)}`} accessory={<View style={{ alignItems: 'flex-end', gap: 2 }}><T variant="subhead" num weight="600">{formatINR(item.amount)}</T><Badge text={item.isRecovered ? 'Recovered' : 'Pending'} tone={item.isRecovered ? 'green' : 'orange'} /></View>} onPress={() => can('payroll.manage') && router.push({ pathname: '/salary-advance-form', params: { id: item.id } })} /> : null}
      </GroupedItem>}
    />
    <Sheet visible={!!selected} onClose={() => setSelected(null)} title={selected?.employeeName || 'Payroll'}>
      {selected ? <View style={{ paddingHorizontal: GUTTER, gap: space.m }}>
        <Section header={`${selected.month} · ${selected.customId}`}>
          <InfoRow label="Gross earnings" value={formatINR(selected.grossSalary)} />
          <InfoRow label="Deductions" value={formatINR(selected.totalDeductions)} />
          <InfoRow label="Net salary" value={<T variant="headline" num color="green">{formatINR(selected.netSalary)}</T>} />
          <InfoRow label="Status" value={<Badge text={selected.status} tone={selected.status === 'Paid' ? 'green' : 'orange'} />} />
          {selected.transactionRef ? <InfoRow label="Transaction" value={selected.transactionRef} /> : null}
        </Section>
        <Button title="Share payslip PDF" onPress={() => void sharePdf(payslipHtml(selected, tenant), `Payslip-${selected.employeeName}-${selected.month}.pdf`).catch((e) => toast(e.message, 'error'))} full />
        {can('payroll.manage') ? <View style={{ flexDirection: 'row', gap: space.s }}>
          <Button title="Edit" kind="gray" onPress={() => { setSelected(null); router.push({ pathname: '/payroll-record-form', params: { id: selected.id } }); }} style={{ flex: 1 }} />
          {selected.status !== 'Paid' ? <Button title="Mark paid" kind="tinted" onPress={() => settle(selected)} style={{ flex: 1 }} /> : null}
          <Button title="Delete" kind="destructive" onPress={() => remove('record', selected)} style={{ flex: 1 }} />
        </View> : null}
      </View> : null}
    </Sheet>
  </>;
}
