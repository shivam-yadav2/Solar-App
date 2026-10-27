import React, { useState } from 'react';
import { Alert, Linking, Platform, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check, ClipboardList, Paperclip, Plus, RotateCcw, Trash2, X } from 'lucide-react-native';
import { api } from '../../src/lib/api';
import { ops } from '../../src/lib/apis/ops';
import { usePaged, toPage } from '../../src/lib/query';
import { useAuth } from '../../src/context/AuthContext';
import { formatDate, formatINR } from '../../src/lib/formatters';
import {
  Badge, Button, EmptyState, ErrorState, FormSection, GroupedItem, GUTTER, IconButton, InfoRow, ListScreen, ListSkeleton, SearchBar, Section, Segmented, Sheet, space, T, Tap, TextField,
  useOverlay, useTheme, radius, elevation, formatMoneyCompact, haptic, num, todayISO, DateField,
} from '../../src/ds';
import { LoadMoreFooter } from '../../src/components/kit';

type Mode = 'Pending' | 'all';

export default function ExpensesScreen() {
  const router = useRouter();
  const p = useTheme();
  const params = useLocalSearchParams<{ status?: string; projectId?: string }>();
  const { hasPermission: can } = useAuth();
  const { toast } = useOverlay();
  const approver = can('financials.approve');
  const [mode, setMode] = useState<Mode>(params.status === 'Pending' || approver ? 'Pending' : 'all');
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [summary, setSummary] = useState<any>({});
  const [open, setOpen] = useState<any | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const list = usePaged<any>(['expenses', 'list', mode, search, params.projectId], async (page, limit) => {
    const r: any = await api.getExpenses({ page: String(page), limit: String(limit), approvalStatus: mode, search, ...(params.projectId ? { projectId: params.projectId } : {}) });
    if (page === 1) setSummary(r.summary || {});
    return toPage(r.expenses, r, page);
  });

  const decide = async (x: any, status: 'Approved' | 'Rejected', note?: string) => {
    setBusy(x.id);
    try { await ops.approveExpense(x.id, status, note); haptic.success(); toast(status === 'Approved' ? `Approved ${formatINR(x.amount)}` : 'Rejected'); setOpen(null); void list.refresh(); } catch (e: any) { toast(e.message, 'error'); } finally { setBusy(null); }
  };
  const approveAll = () => {
    const run = async () => { setBusy('all'); try { const r = await ops.approvePending(); toast(`${r.approved} approved${r.skipped ? ` · ${r.skipped} need another approver` : ''}`); void list.refresh(); } catch (e: any) { toast(e.message, 'error'); } finally { setBusy(null); } };
    if (Platform.OS === 'web') return void run();
    Alert.alert('Approve all pending expenses?', `${summary.pendingApprovalCount} expenses · ${formatINR(summary.pendingApprovalAmount)}`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Approve all', onPress: () => void run() }]);
  };

  return (
    <>
    <ListScreen<any>
      title="Expenses" back large={false}
      right={can('expenses.create') ? <IconButton tinted icon={<Plus size={18} color={p.accentText} strokeWidth={2.6} />} label="Add expense" onPress={() => router.push({ pathname: '/expense-form', params: params.projectId ? { projectId: params.projectId } : {} })} /> : undefined}
      header={<>
        <View style={[{ backgroundColor: p.surface, borderRadius: radius.l, padding: space.l, flexDirection: 'row' }, elevation(p, 1)]}>
          <View style={{ flex: 1 }}><T variant="footnote" color="secondary">Approved spend</T><T variant="title2" num>{formatMoneyCompact(Number(summary.totalExpense) || 0)}</T></View>
          <View style={{ flex: 1 }}><T variant="footnote" color="secondary">Waiting · {summary.pendingApprovalCount || 0}</T><T variant="title2" num color={summary.pendingApprovalCount ? 'orange' : 'label'}>{formatMoneyCompact(Number(summary.pendingApprovalAmount) || 0)}</T></View>
        </View>
        <Segmented<Mode> value={mode} onChange={setMode} options={[{ value: 'Pending', label: `To approve${summary.pendingApprovalCount ? ` · ${summary.pendingApprovalCount}` : ''}` }, { value: 'all', label: 'All expenses' }]} />
        <SearchBar value={text} onChange={setText} onSearch={setSearch} placeholder="Item, vendor or EXP no." />
        {list.loading ? <ListSkeleton avatar={false} /> : list.error ? <ErrorState message={list.error} onRetry={list.refresh} /> : null}
      </>}
      footer={approver && mode === 'Pending' && list.items.length > 1 ? <Button title={`Approve all ${summary.pendingApprovalCount || ''}`} loading={busy === 'all'} onPress={approveAll} style={{ flex: 1 }} /> : undefined}
      data={list.loading || list.error ? [] : list.items}
      keyExtractor={(x) => x.id}
      refreshing={list.refreshing}
      onRefresh={list.refresh}
      onEndReached={list.loadMore}
      ListEmptyComponent={!list.loading && !list.error ? <EmptyState icon={<ClipboardList size={44} color={p.tertiary} />} title={mode === 'Pending' ? 'Nothing to approve' : 'No expenses'} message={mode === 'Pending' ? 'New expenses from your team will wait here.' : undefined} /> : null}
      ListFooterComponent={<LoadMoreFooter loading={list.loadingMore} hasMore={list.hasMore} count={list.items.length} total={list.total} noun="expenses" />}
      renderItem={({ item: x, index }) => (
        <GroupedItem index={index} count={list.items.length}>
          <Tap onPress={() => setOpen(x)} scaleTo={0.985} style={{ paddingHorizontal: space.l, paddingVertical: 12, gap: 6 }}>
            <View style={{ flexDirection: 'row', gap: space.m, alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <T variant="headline" numberOfLines={1}>{x.expenseName}</T>
                <T variant="footnote" color="secondary" numberOfLines={1}>{[x.expenseCategory, x.vendor, x.projectName].filter(Boolean).join(' · ')}</T>
                <T variant="caption" color="secondary">{formatDate(x.date)} · {x.customId}{x.receiptFileId ? ' · 📎' : ''}</T>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <T variant="headline" num>{formatINR(x.amount)}</T>
                {x.approvalStatus && x.approvalStatus !== 'Approved' ? <Badge text={x.approvalStatus} /> : null}
              </View>
            </View>
            {approver && x.approvalStatus === 'Pending' ? (
              <View style={{ flexDirection: 'row', gap: space.s, marginTop: 2 }}>
                <Button title="Approve" size="s" kind="tinted" icon={<Check size={15} color={p.accentText} />} loading={busy === x.id} onPress={() => void decide(x, 'Approved')} style={{ flex: 1 }} />
                <Button title="Reject" size="s" kind="destructive" icon={<X size={15} color={p.red} />} onPress={() => setOpen({ ...x, rejecting: true })} style={{ flex: 1 }} />
              </View>
            ) : null}
          </Tap>
        </GroupedItem>
      )}
    />
    <ExpenseSheet x={open} onClose={() => { setOpen(null); void list.refresh(); }} onDecide={decide} />
    </>
  );
}

function ExpenseSheet({ x, onClose, onDecide }: { x: any | null; onClose: () => void; onDecide: (x: any, s: 'Approved' | 'Rejected', note?: string) => Promise<void> }) {
  const p = useTheme();
  const { hasPermission: can } = useAuth();
  const { toast } = useOverlay();
  const [note, setNote] = useState('');
  const [reverse, setReverse] = useState(false);
  const [amount, setAmount] = useState(''); const [date, setDate] = useState(todayISO());
  const [busy, setBusy] = useState(false);
  React.useEffect(() => { setNote(''); setReverse(false); setAmount(String(x?.amount || '')); setDate(todayISO()); }, [x]);
  if (!x) return null;
  const approver = can('financials.approve');
  const del = async () => { try { await api.deleteExpense(x.id); toast('Expense deleted'); onClose(); } catch (e: any) { toast(e.message, 'error'); } };
  const doReverse = async () => {
    if (!note.trim()) { toast('Write why it is being reversed', 'error'); return; }
    setBusy(true);
    try { await ops.reverseExpense(x.id, num(amount), note.trim(), date); toast('Reversal recorded'); onClose(); } catch (e: any) { toast(e.message, 'error'); } finally { setBusy(false); }
  };
  return (
    <Sheet visible onClose={onClose} title={x.expenseName}>
      <View style={{ paddingHorizontal: GUTTER, gap: space.m, paddingBottom: space.m }}>
        <Section>
          <InfoRow label="Amount" value={formatINR(x.amount)} />
          <InfoRow label="Category" value={x.expenseCategory} />
          <InfoRow label="Vendor" value={x.vendor} />
          <InfoRow label="Project" value={x.projectName} />
          <InfoRow label="Date" value={formatDate(x.date)} />
          <InfoRow label="Added by" value={x.addedBy} />
          <InfoRow label="Status" value={<Badge text={x.approvalStatus || 'Approved'} />} />
          {x.approvalNote ? <InfoRow label="Approval note" value={x.approvalNote} multiline /> : null}
          {x.remark ? <InfoRow label="Remark" value={x.remark} multiline /> : null}
        </Section>
        {x.receiptFileId ? <Button title="View bill / receipt" kind="gray" icon={<Paperclip size={17} color={p.label} />} onPress={async () => { try { await Linking.openURL(await api.getFileUrl(x.receiptFileId)); } catch (e: any) { toast(e.message, 'error'); } }} /> : null}
        {approver && x.approvalStatus === 'Pending' ? (
          <>
            <FormSection><TextField label={x.rejecting ? 'Reason for rejecting' : 'Note (optional)'} value={note} onChange={setNote} multiline autoFocus={!!x.rejecting} /></FormSection>
            <View style={{ flexDirection: 'row', gap: space.s }}>
              <Button title="Reject" kind="destructive" style={{ flex: 1 }} onPress={() => { if (!note.trim()) { toast('Write a reason so your team knows', 'error'); return; } void onDecide(x, 'Rejected', note.trim()); }} />
              <Button title="Approve" style={{ flex: 1 }} onPress={() => void onDecide(x, 'Approved', note.trim() || undefined)} />
            </View>
          </>
        ) : null}
        {approver && (x.approvalStatus || 'Approved') === 'Approved' && Number(x.amount) > 0 ? (
          reverse ? (
            <>
              <FormSection footer="Adds a negative entry; the original stays for the audit trail.">
                <TextField label="Amount to reverse" kind="money" value={amount} onChange={setAmount} />
                <DateField label="Date" value={date} onChange={setDate} />
                <TextField label="Reason" value={note} onChange={setNote} multiline />
              </FormSection>
              <Button title="Record reversal" kind="destructive" loading={busy} onPress={doReverse} />
            </>
          ) : <Button title="Reverse this expense…" kind="gray" icon={<RotateCcw size={17} color={p.label} />} onPress={() => setReverse(true)} />
        ) : null}
        {can('expenses.delete') && x.approvalStatus !== 'Approved' ? <Button title="Delete" kind="plain" icon={<Trash2 size={17} color={p.red} />} onPress={del} /> : null}
      </View>
    </Sheet>
  );
}
