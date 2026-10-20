import React, { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CheckCircle2, Ellipsis, Pencil, RotateCcw, TriangleAlert, UserRound, Zap } from 'lucide-react-native';
import { ops } from '../../../src/lib/apis/ops';
import { useApi } from '../../../src/lib/query';
import { useAuth } from '../../../src/context/AuthContext';
import { formatDate, formatDateTime, formatINR } from '../../../src/lib/formatters';
import { Badge, Button, DateField, ErrorState, FormSection, GUTTER, Hero, IconButton, IconTile, InfoRow, ListSkeleton, Row, Screen, Section, Segmented, Sheet, space, T, TextField, todayISO, useOverlay, useTheme, num } from '../../../src/ds';
import { DocumentActions } from '../../../src/components/DocumentActions';

export default function PaymentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const p = useTheme();
  const { user, hasPermission: can } = useAuth();
  const { actions } = useOverlay();
  const q = useApi(['payments', 'detail', id], () => ops.payment(id!), { enabled: !!id });
  const [sheet, setSheet] = useState<null | 'refund' | 'reconcile'>(null);
  const isCustomer = user?.role === 'CUSTOMER';
  const x = q.data?.payment;
  const refunded = (q.data?.adjustments || []).reduce((s, a) => s + Math.abs(Number(a.amount) || 0), 0);
  const menu = () => actions({
    title: x?.customId,
    items: [
      can('payments.create') && { label: 'Edit payment', icon: <Pencil size={20} color={p.accentText} />, onPress: () => router.push({ pathname: '/payment-form', params: { id: x.id } }) },
      can('financials.approve') && { label: 'Reconcile with bank', icon: <CheckCircle2 size={20} color={p.accentText} />, onPress: () => setSheet('reconcile') },
      can('financials.approve') && Number(x?.amount) > 0 && { label: 'Refund…', destructive: true, icon: <RotateCcw size={20} color={p.red} />, onPress: () => setSheet('refund') },
    ].filter(Boolean) as any,
  });

  return (
    <Screen title="Payment" large={false} back right={x && !isCustomer ? <IconButton icon={<Ellipsis size={18} color={p.label} />} label="More actions" onPress={menu} /> : undefined} refreshing={q.refreshing} onRefresh={q.refresh}>
      {q.error ? <ErrorState message={q.error} onRetry={q.refresh} /> : q.loading || !x ? <ListSkeleton rows={4} avatar={false} /> : (
        <>
          <Hero label={`${x.customId} · ${formatDate(x.paymentDate)}`} value={formatINR(x.amount)} caption={`${x.paymentMethod}${x.transactionRef ? ` · ${x.transactionRef}` : ''}`} tone={Number(x.amount) < 0 ? 'red' : 'green'} />
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: -space.m }}>
            <Badge text={x.status} size="m" />
            {!isCustomer && x.reconciliationStatus ? <Badge text={x.reconciliationStatus === 'Matched' ? 'Reconciled' : x.reconciliationStatus} tone={x.reconciliationStatus === 'Matched' ? 'green' : x.reconciliationStatus === 'Exception' ? 'red' : 'orange'} size="m" /> : null}
          </View>

          <DocumentActions kind="receipt" id={x.id} data={{ ...x, customerName: q.data?.customer?.name, projectName: q.data?.project?.projectName, balanceAfter: q.data?.project?.pendingBalance }} fileName={`Receipt ${x.customId}`} />

          <Section>
            {q.data?.customer ? <Row icon={<IconTile icon={<UserRound size={17} color={p.blue} />} tone="blue" />} title={q.data.customer.name} subtitle={q.data.customer.mobile} onPress={isCustomer ? undefined : () => router.push({ pathname: '/customer/[id]', params: { id: q.data!.customer.id } })} /> : null}
            {q.data?.project ? <Row icon={<IconTile icon={<Zap size={17} color={p.orange} />} tone="orange" />} title={q.data.project.projectName} subtitle={`Balance now ${formatINR(q.data.project.pendingBalance)} of ${formatINR(q.data.project.finalDealAmount)}`} onPress={() => router.push({ pathname: '/project/[id]', params: { id: q.data!.project.id } })} /> : null}
          </Section>

          <Section header="Details">
            <InfoRow label="Method" value={x.paymentMethod} />
            <InfoRow label="Reference" value={x.transactionRef} />
            {x.notes ? <InfoRow label="Notes" value={x.notes} multiline /> : null}
            {!isCustomer ? <InfoRow label="Recorded" value={formatDateTime(x.createdAt)} /> : null}
            {!isCustomer && x.reconciliationNote ? <InfoRow label="Bank check" value={x.reconciliationNote} multiline /> : null}
          </Section>

          {(q.data?.adjustments || []).length ? (
            <Section header={`Refunds · ${formatINR(refunded)}`}>
              {q.data!.adjustments.map((a) => <Row key={a.id} icon={<IconTile icon={<RotateCcw size={17} color={p.red} />} tone="red" />} title={formatINR(a.amount)} subtitle={`${formatDate(a.paymentDate)}${a.notes ? ` · ${a.notes}` : ''}`} />)}
            </Section>
          ) : null}
          {x.reconciliationStatus === 'Exception' && !isCustomer ? <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 4 }}><TriangleAlert size={16} color={p.red} /><T variant="footnote" color="red" style={{ flex: 1 }}>Marked as an exception — the bank amount didn't match.</T></View> : null}
        </>
      )}
      {x ? <RefundSheet visible={sheet === 'refund'} max={Number(x.amount) - refunded} id={x.id} onClose={() => setSheet(null)} onDone={() => { setSheet(null); void q.refresh(); }} /> : null}
      {x ? <ReconcileSheet visible={sheet === 'reconcile'} id={x.id} onClose={() => setSheet(null)} onDone={() => { setSheet(null); void q.refresh(); }} /> : null}
    </Screen>
  );
}

function RefundSheet({ visible, id, max, onClose, onDone }: { visible: boolean; id: string; max: number; onClose: () => void; onDone: () => void }) {
  const { toast } = useOverlay();
  const [amount, setAmount] = useState(''); const [reason, setReason] = useState(''); const [date, setDate] = useState(todayISO());
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  React.useEffect(() => { if (visible) { setAmount(String(max)); setReason(''); setDate(todayISO()); setError(''); } }, [visible, max]);
  const go = async () => {
    const a = num(amount);
    if (a <= 0 || a > max) return setError(`Enter an amount up to ${formatINR(max)}.`);
    if (!reason.trim()) return setError('Write why the money is being returned.');
    setBusy(true);
    try { await ops.refundPayment(id, a, reason.trim(), date); toast('Refund recorded'); onDone(); } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };
  return (
    <Sheet visible={visible} onClose={onClose} title="Refund" footer={<Button title="Record refund" kind="destructive" loading={busy} onPress={go} style={{ flex: 1 }} />}>
      <View style={{ paddingHorizontal: GUTTER, gap: space.m }}>
        <FormSection footer="A refund is recorded as a negative payment; the original stays for the audit trail.">
          <TextField label="Amount" kind="money" value={amount} onChange={setAmount} />
          <DateField label="Refund date" value={date} onChange={setDate} />
          <TextField label="Reason" value={reason} onChange={setReason} multiline />
        </FormSection>
        {error ? <T variant="footnote" color="red">{error}</T> : null}
      </View>
    </Sheet>
  );
}

function ReconcileSheet({ visible, id, onClose, onDone }: { visible: boolean; id: string; onClose: () => void; onDone: () => void }) {
  const { toast } = useOverlay();
  const [status, setStatus] = useState<'Matched' | 'Exception'>('Matched'); const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try { await ops.reconcilePayment(id, status, note || undefined); toast(status === 'Matched' ? 'Marked as reconciled' : 'Marked as exception'); onDone(); } catch (e: any) { toast(e.message, 'error'); } finally { setBusy(false); }
  };
  return (
    <Sheet visible={visible} onClose={onClose} title="Check against bank" footer={<Button title="Save" loading={busy} onPress={go} style={{ flex: 1 }} />}>
      <View style={{ paddingHorizontal: GUTTER, gap: space.m }}>
        <Segmented value={status} onChange={setStatus} options={[{ value: 'Matched', label: 'Matches bank' }, { value: 'Exception', label: "Doesn't match" }]} />
        <FormSection><TextField label="Note" value={note} onChange={setNote} multiline placeholder="e.g. Seen in HDFC statement 12 Oct" /></FormSection>
      </View>
    </Sheet>
  );
}
