import React from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FileText, MapPin, PackageCheck, UserRound } from 'lucide-react-native';
import { api } from '../../../src/lib/api';
import { useFetch } from '../../../src/hooks/useFetch';
import { formatDate, formatINR } from '../../../src/lib/formatters';
import { Badge, Card, DetailRow, EmptyState, ErrorState, Loading, Screen } from '../../../src/components/ui';

function TaxRow({ label, value }: { label: string; value: number }) {
  return value > 0 ? <View className="flex-row justify-between py-2"><Text className="text-xs text-slate-500">{label}</Text><Text className="text-xs font-semibold text-slate-800">{formatINR(value)}</Text></View> : null;
}

export default function InvoiceDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const state = useFetch(() => api.getInvoices({ limit: '200' }), [id], { queryKey: ['invoice-detail', id] });
  const invoice: any = state.data?.invoices?.find(item => item.id === id);

  return <Screen title="Invoice Details" subtitle={invoice?.invoiceNumber || 'Billing document'} onBack={() => router.back()} refreshing={state.isRefreshing} onRefresh={state.refresh}>
    {state.isLoading ? <Loading /> : state.error ? <ErrorState message={state.error} onRetry={state.reload} /> : !invoice ? <EmptyState message="This invoice is no longer available." /> : <>
      <Card className="bg-[#0b1b31] border-[#173554]"><View className="flex-row items-start"><View className="h-11 w-11 items-center justify-center rounded-2xl bg-amber-400"><FileText size={21} color="#0b1b31" /></View><View className="ml-3 flex-1"><Text className="text-[10px] font-bold uppercase tracking-[1.2px] text-amber-300">{invoice.invoiceType}</Text><Text className="mt-1 text-lg font-extrabold text-white">{formatINR(invoice.amount)}</Text><Text className="mt-1 text-xs text-slate-300">Issued {formatDate(invoice.invoiceDate)}</Text></View><Badge text={invoice.status} tone={invoice.status === 'Paid' ? 'green' : invoice.status === 'Cancelled' ? 'rose' : 'amber'} /></View></Card>
      <Card><View className="mb-3 flex-row items-center"><UserRound size={17} color="#2563eb" /><Text className="ml-2 text-sm font-extrabold text-slate-900">Customer & project</Text></View><DetailRow label="Customer" value={invoice.customerName} /><DetailRow label="Mobile" value={invoice.customerMobile} /><DetailRow label="Email" value={invoice.customerEmail} /><DetailRow label="Project" value={invoice.projectName} /><DetailRow label="Capacity" value={invoice.capacityKw ? `${invoice.capacityKw} kWp` : undefined} /><View className="mt-2 flex-row"><MapPin size={14} color="#94a3b8" /><Text className="ml-2 flex-1 text-xs leading-5 text-slate-500">{invoice.installationAddress || invoice.customerAddress || 'Address not recorded'}</Text></View></Card>
      <Card><Text className="mb-3 text-sm font-extrabold text-slate-900">GST calculation</Text><DetailRow label="Taxable value" value={formatINR((invoice.lineItems || []).reduce((sum: number, item: any) => sum + Number(item.taxableValue || 0), 0) || Number(invoice.amount || 0) - Number(invoice.taxAmount || 0))} /><TaxRow label="CGST" value={(invoice.lineItems || []).reduce((sum: number, item: any) => sum + Number(item.cgstAmount || 0), 0)} /><TaxRow label="SGST" value={(invoice.lineItems || []).reduce((sum: number, item: any) => sum + Number(item.sgstAmount || 0), 0)} /><TaxRow label="IGST" value={(invoice.lineItems || []).reduce((sum: number, item: any) => sum + Number(item.igstAmount || 0), 0)} /><DetailRow label="GST total" value={formatINR(invoice.taxAmount || 0)} /><DetailRow label="HSN / SAC" value={invoice.gstSnapshot?.defaultHsnSacCode || invoice.lineItems?.[0]?.hsnSacCode} /><DetailRow label="Tax treatment" value={invoice.gstSnapshot ? (invoice.gstSnapshot.supplyType === 'INTER_STATE' ? 'Inter-state · IGST' : 'Intra-state · CGST + SGST') : 'Legacy invoice'} /></Card>
      <Card><Text className="mb-3 text-sm font-extrabold text-slate-900">Items billed</Text>{(invoice.lineItems || []).length ? invoice.lineItems.map((item: any) => <View key={item.id} className="border-b border-slate-100 py-3 last:border-b-0"><View className="flex-row justify-between gap-3"><Text className="flex-1 text-xs font-bold text-slate-800">{item.itemDescription}</Text><Text className="text-xs font-bold text-slate-900">{formatINR(item.totalAmount)}</Text></View><Text className="mt-1 text-[11px] text-slate-500">{item.quantity} {item.unitOfMeasure} · HSN {item.hsnSacCode || '—'} · taxable {formatINR(item.taxableValue)}</Text></View>) : <Text className="text-xs text-slate-500">{invoice.description || 'No line item details available.'}</Text>}</Card>
      <Card><View className="mb-3 flex-row items-center"><PackageCheck size={17} color="#059669" /><Text className="ml-2 text-sm font-extrabold text-slate-900">Installed equipment</Text></View><DetailRow label="Panels" value={[invoice.panelBrand, invoice.panelModel].filter(Boolean).join(' · ')} /><DetailRow label="Panel serials" value={Array.isArray(invoice.panelSerialNumbers) ? invoice.panelSerialNumbers.filter(Boolean).join(', ') : undefined} /><DetailRow label="Inverter" value={[invoice.inverterBrand, invoice.inverterModel].filter(Boolean).join(' · ')} /><DetailRow label="Inverter serial" value={invoice.inverterSerial} /></Card>
      <Card><DetailRow label="Due date" value={invoice.dueDate ? formatDate(invoice.dueDate) : 'Not set'} /><DetailRow label="Created by" value={invoice.uploadedBy} /><DetailRow label="Notes" value={invoice.description} /></Card>
    </>}
  </Screen>;
}
