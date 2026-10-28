import React from 'react';
import { Alert, Platform, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CircleCheck, CircleX, Ellipsis, IndianRupee, UserRound, Zap } from 'lucide-react-native';
import { ops } from '../../../src/lib/apis/ops';
import { useApi } from '../../../src/lib/query';
import { useAuth } from '../../../src/context/AuthContext';
import { formatDate, formatINR } from '../../../src/lib/formatters';
import { Badge, ErrorState, Hero, IconButton, IconTile, InfoRow, ListSkeleton, Row, Screen, Section, space, T, useOverlay, useTheme } from '../../../src/ds';
import { DocumentActions } from '../../../src/components/DocumentActions';

export default function InvoiceDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const p = useTheme();
  const { user, hasPermission: can } = useAuth();
  const { actions, toast } = useOverlay();
  const isCustomer = user?.role === 'CUSTOMER';
  const q = useApi(['invoices', 'detail', id], () => ops.invoice(id!), { enabled: !!id });
  const x = q.data?.invoice;
  const lines: any[] = x?.lineItems || [];
  const tax = lines.length ? lines.reduce((s, l) => s + Number(l.cgstAmount || 0) + Number(l.sgstAmount || 0) + Number(l.igstAmount || 0), 0) : Number(x?.taxAmount || 0);
  const taxableValue = lines.length ? lines.reduce((sum, line) => sum + Number(line.taxableValue || 0), 0) : Number(x?.amount || 0) - tax;
  const cgst = lines.length ? lines.reduce((sum, line) => sum + Number(line.cgstAmount || 0), 0) : tax / 2;
  const sgst = lines.length ? lines.reduce((sum, line) => sum + Number(line.sgstAmount || 0), 0) : tax - cgst;
  const igst = lines.length ? lines.reduce((sum, line) => sum + Number(line.igstAmount || 0), 0) : tax;

  const setStatus = (status: 'Issued' | 'Paid' | 'Cancelled') => {
    const run = async () => { try { await ops.setInvoiceStatus(x.id, status, status === 'Cancelled' ? 'Cancelled from the app' : undefined); toast(status === 'Paid' ? 'Marked paid' : status === 'Cancelled' ? 'Invoice cancelled' : 'Marked unpaid'); void q.refresh(); } catch (e: any) { toast(e.message, 'error'); } };
    if (status !== 'Cancelled' || Platform.OS === 'web') return void run();
    Alert.alert('Cancel this invoice?', 'It stays in the list for your records but no longer counts as billed.', [{ text: 'Keep', style: 'cancel' }, { text: 'Cancel invoice', style: 'destructive', onPress: () => void run() }]);
  };
  const menu = () => actions({
    title: x?.invoiceNumber,
    items: [
      x?.status !== 'Paid' && { label: 'Mark as paid', icon: <CircleCheck size={20} color={p.green} />, onPress: () => setStatus('Paid') },
      x?.status === 'Paid' && { label: 'Mark as unpaid', icon: <CircleCheck size={20} color={p.accentText} />, onPress: () => setStatus('Issued') },
      can('payments.create') && { label: 'Record payment', icon: <IndianRupee size={20} color={p.accentText} />, onPress: () => router.push({ pathname: '/payment-form', params: { projectId: x.projectId, customerId: x.customerId, amount: String(x.amount) } }) },
      x?.status !== 'Cancelled' && { label: 'Cancel invoice', destructive: true, icon: <CircleX size={20} color={p.red} />, onPress: () => setStatus('Cancelled') },
    ].filter(Boolean) as any,
  });

  return (
    <Screen title={x?.invoiceNumber || 'Invoice'} large={false} back right={x && can('invoices.create') && !isCustomer ? <IconButton icon={<Ellipsis size={18} color={p.label} />} label="More actions" onPress={menu} /> : undefined} refreshing={q.refreshing} onRefresh={q.refresh}>
      {q.error ? <ErrorState message={q.error} onRetry={q.refresh} /> : q.loading || !x ? <ListSkeleton rows={4} avatar={false} /> : (
        <>
          <Hero label={`${x.invoiceType} · ${formatDate(x.invoiceDate)}`} value={formatINR(x.amount)} caption={x.dueDate ? `Due ${formatDate(x.dueDate)}` : undefined} />
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: -space.m }}><Badge text={x.status === 'Issued' ? 'Unpaid' : x.status} tone={x.status === 'Paid' ? 'green' : x.status === 'Cancelled' ? 'gray' : 'orange'} size="m" /></View>

          <DocumentActions kind="invoice" id={x.id} data={x} fileName={`Invoice ${x.invoiceNumber}`} />

          <Section>
            {!isCustomer ? <Row icon={<IconTile icon={<UserRound size={17} color={p.blue} />} tone="blue" />} title={x.customerName} subtitle={x.customerMobile} onPress={() => router.push({ pathname: '/customer/[id]', params: { id: x.customerId } })} /> : null}
            <Row icon={<IconTile icon={<Zap size={17} color={p.orange} />} tone="orange" />} title={x.projectName} subtitle={x.capacityKw ? `${x.capacityKw} kW` : undefined} onPress={() => router.push({ pathname: '/project/[id]', params: { id: x.projectId } })} />
          </Section>

          <Section header="Items">
            {(lines.length ? lines : [{ id: 'one', itemDescription: x.description || 'Solar rooftop power plant', taxableValue: Number(x.amount) - Number(x.taxAmount || 0), totalAmount: x.amount, quantity: 1 }]).map((l: any) => (
              <View key={l.id} style={{ paddingHorizontal: space.l, paddingVertical: 12, gap: 2 }}>
                <View style={{ flexDirection: 'row', gap: space.m }}>
                  <T variant="body" style={{ flex: 1 }}>{l.itemDescription}</T>
                  <T variant="body" num weight="600">{formatINR(l.totalAmount)}</T>
                </View>
                <T variant="footnote" color="secondary" num>{[l.quantity ? `${l.quantity} ${l.unitOfMeasure || ''} × ${formatINR(l.ratePerUnit || l.taxableValue)}` : '', l.hsnSacCode ? `HSN ${l.hsnSacCode}` : ''].filter(Boolean).join(' · ')}</T>
              </View>
            ))}
          </Section>

          <Section>
            <InfoRow label="Taxable value" value={formatINR(taxableValue)} />
            {x.gstSnapshot?.supplyType === 'INTER_STATE' ? <InfoRow label="IGST" value={formatINR(igst)} /> : null}
            {x.gstSnapshot?.supplyType !== 'INTER_STATE' ? <InfoRow label="CGST" value={formatINR(cgst)} /> : null}
            {x.gstSnapshot?.supplyType !== 'INTER_STATE' ? <InfoRow label="SGST" value={formatINR(sgst)} /> : null}
            <InfoRow label="Total" value={<T variant="headline" num>{formatINR(x.amount)}</T>} />
          </Section>

          {(x.panelSerialNumbers || []).length || x.inverterSerial ? <Section header="Issued equipment serials">
            {(x.panelSerialNumbers || []).length ? <InfoRow label="Solar modules" value={(x.panelSerialNumbers || []).join(', ')} multiline /> : null}
            {x.inverterSerial ? <InfoRow label="Inverter" value={x.inverterSerial} /> : null}
          </Section> : null}

          {x.description && !lines.some((l) => l.itemDescription === x.description) ? <Section header="Notes"><InfoRow label="" value={x.description} multiline /></Section> : null}
        </>
      )}
    </Screen>
  );
}
