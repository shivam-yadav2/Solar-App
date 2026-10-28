import React, { useState } from 'react';
import { Alert, View } from 'react-native';
import { Download, ShieldCheck, UserX } from 'lucide-react-native';
import { useAuth } from '../../src/context/AuthContext';
import { account, authHeaders, DataRequestView } from '../../src/lib/apis/account';
import { shareDownload } from '../../src/lib/export';
import { loadCustomers } from '../../src/lib/pickers';
import { useFetch } from '../../src/hooks/useFetch';
import { formatDateTime } from '../../src/lib/formatters';
import { Badge, Button, ChoiceField, EmptyState, ErrorState, FormSection, IconTile, InfoRow, Screen, SelectField, Sheet, Spinner, T, TextField, useTheme } from '../../src/ds';

export default function PrivacyScreen() {
  const p = useTheme();
  const { user } = useAuth();
  const customerMode = user?.role === 'CUSTOMER';
  const state = useFetch(() => customerMode ? account.myDataRequests() : account.privacyRequests(), [customerMode]);
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<DataRequestView | null>(null);
  const [customer, setCustomer] = useState<{ id: string; name: string } | null>(null);
  const [type, setType] = useState<'copy' | 'delete'>('copy');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const items = state.data?.requests || [];
  const create = async () => {
    if (!customerMode && !customer) { Alert.alert('Choose a customer'); return; }
    setBusy(true);
    try {
      if (customerMode) await account.createMyDataRequest(type, note); else await account.createPrivacyRequest(customer!.id, type, note);
      setCreateOpen(false); setNote(''); setCustomer(null); await state.reload();
    } catch (e: any) { Alert.alert('Could not log request', e.message); } finally { setBusy(false); }
  };
  const complete = async (action: 'erase' | 'done' | 'reject') => {
    if (!selected) return;
    const message = action === 'erase' ? 'Personal details will be anonymised. Statutory invoices and payment records remain for GST compliance.' : action === 'reject' ? 'The request will be marked rejected.' : 'The request will be marked completed.';
    Alert.alert(action === 'erase' ? 'Erase customer data?' : 'Complete request?', message, [{ text: 'Cancel', style: 'cancel' }, { text: action === 'erase' ? 'Erase data' : 'Continue', style: action === 'erase' ? 'destructive' : 'default', onPress: async () => { setBusy(true); try { await account.completePrivacyRequest(selected.id, action, note); setSelected(null); setNote(''); await state.reload(); } catch (e: any) { Alert.alert('Could not complete request', e.message); } finally { setBusy(false); } } }]);
  };
  const exportCopy = async (item: DataRequestView) => { setBusy(true); try { const headers = authHeaders(); await shareDownload(account.privacyExportUrl(item.id), `${item.customerCode || 'customer'}-data-export.json`, 'application/json', headers.Authorization ? { Authorization: headers.Authorization } : undefined); } catch (e: any) { Alert.alert('Export failed', e.message); } finally { setBusy(false); } };
  return <>
    <Screen title="Privacy requests" subtitle={customerMode ? 'Request a copy or deletion of your personal information' : 'Handle data access and erasure requests within 30 days'} back right={<Button title="New" size="s" onPress={() => setCreateOpen(true)} />} refreshing={state.isRefreshing} onRefresh={state.refresh}>
      <View style={{ backgroundColor: p.blueSoft, borderRadius: 14, padding: 16, flexDirection: 'row', gap: 12 }}><ShieldCheck size={22} color={p.blue} /><T variant="footnote" style={{ color: p.blue, flex: 1 }}>{customerMode ? 'Invoices and payment records required by law may be retained after personal details are removed.' : 'Deletion anonymises personal identity. GST invoices, payments and warranties remain as legally required records.'}</T></View>
      {state.isLoading ? <Spinner /> : state.error ? <ErrorState message={state.error} onRetry={state.reload} /> : !items.length ? <EmptyState icon={<UserX size={44} color={p.tertiary} />} title="No privacy requests" message="New copy or deletion requests will appear here." /> : items.map((item) => <FormSection key={item.id} header={item.type === 'copy' ? 'Data copy' : 'Data deletion'} footer={`Requested ${formatDateTime(item.createdAt)}${item.completedAt ? ` · Closed ${formatDateTime(item.completedAt)}` : ''}`}>
        <View style={{ padding: 16, gap: 8 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><IconTile tone={item.type === 'delete' ? 'red' : 'blue'} icon={item.type === 'delete' ? <UserX size={17} color={p.red} /> : <Download size={17} color={p.blue} />} /><View style={{ flex: 1 }}><T variant="headline">{item.customerName || 'My account'}</T><T variant="footnote" color="secondary">{item.customerCode || item.requestedBy}</T></View><Badge text={item.status} /></View>{item.note ? <T variant="footnote" color="secondary">{item.note}</T> : null}{!customerMode && item.status === 'pending' ? <Button title="Review request" kind="gray" size="m" full onPress={() => { setSelected(item); setNote(''); }} /> : item.type === 'copy' && item.status === 'completed' && !customerMode ? <Button title="Download data copy" kind="tinted" size="m" full loading={busy} onPress={() => void exportCopy(item)} /> : null}</View>
      </FormSection>)}
    </Screen>

    <Sheet visible={createOpen} onClose={() => setCreateOpen(false)} title="New privacy request" footer={<Button title="Submit request" full loading={busy} onPress={() => void create()} style={{ flex: 1 }} />}>
      <View style={{ padding: 16, gap: 16 }}>{!customerMode ? <FormSection><SelectField label="Customer" value={customer?.id} display={customer?.name} load={loadCustomers} queryKey="privacy-customers" onChange={(x) => setCustomer(x ? { id: x.value, name: x.label } : null)} required /></FormSection> : null}<FormSection><ChoiceField label="Request type" value={type} onChange={setType} options={[{ value: 'copy', label: 'Data copy' }, { value: 'delete', label: 'Delete data' }]} /><TextField label="Note" value={note} onChange={setNote} multiline placeholder="Optional details" /></FormSection></View>
    </Sheet>

    <Sheet visible={!!selected} onClose={() => setSelected(null)} title="Review privacy request" footer={<><Button title="Reject" kind="destructive" onPress={() => void complete('reject')} disabled={busy} style={{ flex: 1 }} /><Button title={selected?.type === 'delete' ? 'Erase data' : 'Mark completed'} loading={busy} onPress={() => void complete(selected?.type === 'delete' ? 'erase' : 'done')} style={{ flex: 1 }} /></>}>
      {selected ? <View style={{ padding: 16, gap: 16 }}><FormSection><InfoRow label="Customer" value={selected.customerName} /><InfoRow label="Account" value={selected.customerCode} /><InfoRow label="Requested by" value={selected.requestedBy} /><InfoRow label="Type" value={selected.type} /></FormSection><FormSection><TextField label="Outcome note" value={note} onChange={setNote} multiline /></FormSection></View> : null}
    </Sheet>
  </>;
}
