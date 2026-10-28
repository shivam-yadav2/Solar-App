import React, { useEffect, useMemo, useState } from 'react';
import { Alert, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BarChart3, Download, IndianRupee, ReceiptText, TrendingUp, WalletCards, Wrench } from 'lucide-react-native';
import { api } from '../../src/lib/api';
import { useAuth } from '../../src/context/AuthContext';
import { shareCsv } from '../../src/lib/export';
import { sharePdf } from '../../src/lib/docs';
import { formatINR, formatNumber } from '../../src/lib/formatters';
import { Badge, Button, Card, DateField, ErrorState, IconTile, InfoRow, Screen, Section, SelectField, Spinner, StatGrid, StatTile, T, useTheme } from '../../src/ds';

type ReportKind = 'projects' | 'payments' | 'payroll' | 'expenses' | 'warranties' | 'invoices' | 'profit' | 'complaints';
const definitions: Record<ReportKind, { label: string; description: string }> = {
  projects: { label: 'Solar projects', description: 'Engineering specs, pipeline, balances and installed capacity' },
  payments: { label: 'Collections', description: 'Receipts, modes and payment references' },
  payroll: { label: 'Payroll', description: 'Staff earnings, deductions, payment state and UTR' },
  expenses: { label: 'Expenses', description: 'Project costs and category totals' },
  warranties: { label: 'Warranties', description: 'Equipment serials, coverage and expiry schedule' },
  invoices: { label: 'GST invoices', description: 'Taxable value, GST output, total and invoice state' },
  profit: { label: 'Margins', description: 'Customer-wise realised profit and margin' },
  complaints: { label: 'Service', description: 'Complaints, ticket status and resolution' },
};
const dateOnly = (d: Date) => d.toISOString().slice(0, 10);

export default function ReportsScreen() {
  const router = useRouter();
  const p = useTheme();
  const { hasPermission: can } = useAuth();
  const [kind, setKind] = useState<ReportKind>('projects');
  const [startDate, setStartDate] = useState(dateOnly(new Date(new Date().getFullYear(), 0, 1)));
  const [endDate, setEndDate] = useState(dateOnly(new Date()));
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const load = async () => {
    if (startDate && endDate && startDate > endDate) { setError('Start date must be before the end date.'); return; }
    setLoading(true); setError('');
    try {
      if (['projects', 'payments', 'expenses', 'profit', 'complaints'].includes(kind)) {
        setData(await api.getReport(kind === 'projects' ? 'sales' : kind, { startDate, endDate }));
      } else {
        const result: any = kind === 'payroll' ? await api.getPayrollRecords({ limit: '1000' }) : kind === 'warranties' ? await api.getWarranties({ limit: '1000' }) : await api.getInvoices({ limit: '1000' });
        const raw = kind === 'payroll' ? result.records : kind === 'warranties' ? (result as any).warranties : (result as any).invoices;
        const items = (raw || []).filter((x: any) => { const date = x.paymentDate || x.month?.slice(0, 7) + '-01' || x.startDate || x.invoiceDate || x.createdAt; return (!startDate || !date || date.slice(0, 10) >= startDate) && (!endDate || !date || date.slice(0, 10) <= endDate); });
        setData({ title: definitions[kind].label, count: items.length, items });
      }
    }
    catch (e: any) { setError(e.message || 'Could not prepare this report.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [kind]);
  const allowed = (Object.keys(definitions) as ReportKind[]).filter((x) => x === 'projects' ? can('projects.view') : x === 'payments' ? can('payments.view') : x === 'payroll' ? can('payroll.view') : x === 'expenses' ? can('expenses.view') : x === 'warranties' ? can('warranties.view') : x === 'invoices' ? can('invoices.view') : x === 'complaints' ? can('complaints.view') : can('reports.view'));
  const items = Array.isArray(data?.items) ? data.items : [];
  const summary = useMemo(() => reportSummary(kind, data), [kind, data]);
  const exportReport = async () => {
    setExporting(true);
    try {
      const rows = items.map((item: any) => flattenRow(item));
      await shareCsv(`SolarOS_${definitions[kind].label}_${startDate}_to_${endDate}`, rows);
    } catch (e: any) { Alert.alert('Export failed', e.message); } finally { setExporting(false); }
  };
  const exportPdf = async () => {
    setExporting(true);
    try { await sharePdf(reportHtml(data, definitions[kind].label, startDate, endDate), `SolarOS ${definitions[kind].label} report`); }
    catch (e: any) { Alert.alert('PDF failed', e.message); } finally { setExporting(false); }
  };
  return <Screen title="Reports & export" subtitle="Accountant-ready operational and financial registers" back refreshing={loading} onRefresh={load}>
    <Card style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><IconTile tone="blue" icon={<BarChart3 size={18} color={p.blue} />} /><View style={{ flex: 1 }}><T variant="headline">{definitions[kind].label} report</T><T variant="footnote" color="secondary">{definitions[kind].description}</T></View></View>
      <SelectField label="Dataset" value={kind} options={allowed.map((value) => ({ value, label: definitions[value].label, subtitle: definitions[value].description }))} onChange={(x) => x && setKind(x.value as ReportKind)} />
    </Card>
    <Section header="Reporting period">
      <DateField label="From" value={startDate} onChange={setStartDate} />
      <DateField label="To" value={endDate} onChange={setEndDate} />
      <View style={{ padding: 12 }}><Button title="Apply dates" kind="gray" size="m" full onPress={() => void load()} /></View>
    </Section>
    {loading ? <Spinner /> : error ? <ErrorState message={error} onRetry={load} /> : <>
      <StatGrid>{summary.map((x) => <StatTile key={x.label} label={x.label} value={x.value} money={x.money} suffix={x.suffix} tone={x.tone as any} />)}</StatGrid>
      {kind === 'expenses' && data?.byCategory ? <Section header="Expense categories">{Object.entries(data.byCategory).map(([name, value]) => <InfoRow key={name} label={name} value={formatINR(Number(value))} />)}</Section> : null}
      <Section header={`Preview · ${items.length} records`} footer={items.length > 20 ? `Showing the first 20 of ${items.length}. The CSV includes all ${items.length} records returned by this report.` : undefined}>
        {items.length ? items.slice(0, 20).map((item: any, index: number) => <ReportRow key={item.id || index} kind={kind} item={item} />) : <View style={{ padding: 20 }}><T color="secondary" align="center">No records in this period.</T></View>}
      </Section>
      <Button title={exporting ? 'Preparing CSV…' : 'Export full CSV'} icon={<Download size={18} color={p.onAccent} />} loading={exporting} disabled={!items.length} onPress={() => void exportReport()} />
      <Button title="Share report PDF" kind="tinted" loading={exporting} disabled={!items.length} onPress={() => void exportPdf()} />
      <T variant="footnote" color="secondary" align="center">Exports use the same tenant-scoped data and date filters as the web report.</T>
    </>}
  </Screen>;
}

function reportSummary(kind: ReportKind, d: any): { label: string; value: number; money?: boolean; suffix?: string; tone: string }[] {
  if (!d) return [];
  if (kind === 'projects') return [{ label: 'Contract value', value: Number(d.totalRevenue || 0), money: true, tone: 'accent' }, { label: 'Projects', value: Number(d.count || 0), tone: 'blue' }, { label: 'Capacity', value: Number(d.totalCapacity || 0), suffix: ' kWp', tone: 'green' }];
  if (kind === 'payments') return [{ label: 'Collected', value: Number(d.totalCollected || 0), money: true, tone: 'green' }, { label: 'Receipts', value: Number(d.count || 0), tone: 'blue' }];
  if (kind === 'expenses') return [{ label: 'Site expenses', value: Number(d.totalExpense || 0), money: true, tone: 'red' }, { label: 'Entries', value: Number(d.count || 0), tone: 'orange' }];
  if (kind === 'profit') return [{ label: 'Revenue', value: Number(d.totalRevenue || 0), money: true, tone: 'blue' }, { label: 'Cost', value: Number(d.totalCost || 0), money: true, tone: 'red' }, { label: 'Actual profit', value: Number(d.totalActualProfit || 0), money: true, tone: 'green' }, { label: 'Margin', value: Number(d.overallMargin || 0), suffix: '%', tone: 'accent' }];
  if (kind === 'complaints') return [{ label: 'Total tickets', value: Number(d.total || 0), tone: 'blue' }, { label: 'Open', value: Number(d.open || 0), tone: 'red' }, { label: 'Resolved', value: Number(d.resolved || 0), tone: 'green' }];
  const total = (d.items || []).reduce((sum: number, x: any) => sum + Number(kind === 'payroll' ? x.netSalary : kind === 'invoices' ? x.amount : 0), 0);
  return [{ label: 'Records', value: Number(d.count || 0), tone: 'blue' }, ...(kind === 'payroll' || kind === 'invoices' ? [{ label: kind === 'payroll' ? 'Net salaries' : 'Invoice total', value: total, money: true, tone: 'green' }] : [])];
}

function ReportRow({ kind, item }: { kind: ReportKind; item: any }) {
  const title = kind === 'projects' ? (item.customerName || item.projectName || item.name) : kind === 'payments' ? (item.customerName || item.customId) : kind === 'expenses' ? (item.expenseCategory || item.category) : kind === 'profit' ? (item.customerName || item.name) : kind === 'payroll' ? item.employeeName : kind === 'warranties' ? `${item.itemType || 'Equipment'} · ${item.brand || ''}` : kind === 'invoices' ? (item.customerName || item.invoiceNumber) : (item.subject || item.customId);
  const amount = kind === 'projects' ? item.finalDealAmount : kind === 'payments' ? item.amount : kind === 'expenses' ? item.amount : kind === 'profit' ? (item.actualProfit ?? item.realizedNetProfit) : kind === 'payroll' ? item.netSalary : kind === 'invoices' ? item.amount : undefined;
  const subtitle = [item.customId, item.paymentDate || item.date || item.bookingDate, item.status].filter(Boolean).join(' · ');
  return <View style={{ paddingHorizontal: 16, paddingVertical: 12, gap: 4 }}><View style={{ flexDirection: 'row', gap: 10 }}><T variant="body" weight="600" style={{ flex: 1 }} numberOfLines={1}>{title || 'Record'}</T>{amount !== undefined ? <T variant="body" weight="600" num>{formatINR(Number(amount))}</T> : item.status ? <Badge text={item.status} /> : null}</View>{subtitle ? <T variant="footnote" color="secondary" numberOfLines={1}>{subtitle}</T> : null}</View>;
}

function flattenRow(value: any, prefix = '', output: Record<string, unknown> = {}) {
  Object.entries(value || {}).forEach(([key, item]) => {
    const name = prefix ? `${prefix}.${key}` : key;
    if (item && typeof item === 'object' && !Array.isArray(item)) flattenRow(item, name, output);
    else output[name] = Array.isArray(item) ? item.join(' | ') : item as any;
  });
  return output;
}

const htmlEscape = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
function reportHtml(data: any, label: string, from: string, to: string) {
  const rows = (Array.isArray(data?.items) ? data.items : []).map((item: any) => flattenRow(item));
  const columns = [...new Set<string>(rows.flatMap((row: Record<string, unknown>) => Object.keys(row)))].slice(0, 10);
  const table = rows.length ? `<table><thead><tr>${columns.map((x) => `<th>${htmlEscape(x)}</th>`).join('')}</tr></thead><tbody>${rows.map((row: Record<string, unknown>) => `<tr>${columns.map((x) => `<td>${htmlEscape(row[x])}</td>`).join('')}</tr>`).join('')}</tbody></table>` : '<p>No records in this period.</p>';
  return `<!doctype html><html><head><meta charset="utf-8"><style>@page{size:A4 landscape;margin:18mm}body{font:11px Arial;color:#172033}h1{font-size:22px;margin:0 0 4px}p{color:#64748b}table{width:100%;border-collapse:collapse;margin-top:18px}th,td{border:1px solid #dbe2ea;padding:6px;text-align:left;vertical-align:top;word-break:break-word}th{background:#f1f5f9}footer{margin-top:18px;color:#64748b}</style></head><body><h1>SolarOS ${htmlEscape(label)} report</h1><p>${htmlEscape(from)} to ${htmlEscape(to)} · ${rows.length} records</p>${table}<footer>Generated from tenant-scoped SolarOS data.</footer></body></html>`;
}
