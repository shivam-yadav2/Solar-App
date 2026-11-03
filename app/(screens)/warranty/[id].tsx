import React, { useState } from 'react';
import { Alert, Linking, Platform, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ellipsis, FileText, Pencil, ShieldCheck, Trash2, UserRound, Zap } from 'lucide-react-native';
import { care } from '../../../src/lib/apis/care';
import { FormSheet } from '../../../src/components/FormSheet';
import { api } from '../../../src/lib/api';
import { ops } from '../../../src/lib/apis/ops';
import { useApi } from '../../../src/lib/query';
import { useAuth } from '../../../src/context/AuthContext';
import { formatDate } from '../../../src/lib/formatters';
import { Badge, Card, ErrorState, IconButton, IconTile, InfoRow, ListSkeleton, Progress, Row, Screen, Section, space, T, useOverlay, useTheme } from '../../../src/ds';
import { DocumentActions } from '../../../src/components/DocumentActions';

export default function WarrantyDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const p = useTheme();
  const { user, hasPermission: can } = useAuth();
  const { toast, actions } = useOverlay();
  const [editing, setEditing] = useState(false);
  const q = useApi(['warranties', 'detail', id], () => ops.warranty(id!), { enabled: !!id });
  const w: any = q.data?.warranty;
  const isCustomer = user?.role === 'CUSTOMER';
  const start = w ? new Date(w.startDate).getTime() : 0, end = w ? new Date(w.expiryDate).getTime() : 0;
  const used = end > start ? Math.min(1, Math.max(0, (Date.now() - start) / (end - start))) : 0;
  const daysLeft = w ? Math.ceil((end - Date.now()) / 864e5) : 0;
  return (
    <Screen title={w ? `${w.itemType} warranty` : 'Warranty'} large={false} back refreshing={q.refreshing} onRefresh={q.refresh}
      right={w && !isCustomer && can('warranties.create') ? <IconButton icon={<Ellipsis size={18} color={p.label} />} label="More actions" onPress={() => actions({
        title: w.customId,
        items: [
          { label: 'Edit warranty', icon: <Pencil size={20} color={p.accentText} />, onPress: () => setEditing(true) },
          { label: 'Delete (issued by mistake)', destructive: true, icon: <Trash2 size={20} color={p.red} />, onPress: () => {
            const run = async () => { try { const r = await care.deleteWarranty(w.id); toast(r.message); router.back(); } catch (e: any) { toast(e.message, 'error'); } };
            if (Platform.OS === 'web') { if (globalThis.confirm('Delete this warranty? It stays in the recycle bin for 30 days.')) void run(); return; }
            Alert.alert('Delete this warranty?', 'It stays in the recycle bin for 30 days.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => void run() }]);
          } },
        ],
      })} /> : undefined}>
      {q.error ? <ErrorState message={q.error} onRetry={q.refresh} /> : q.loading || !w ? <ListSkeleton rows={4} avatar={false} /> : (
        <>
          <Card style={{ gap: space.m, alignItems: 'center' }}>
            <IconTile icon={<ShieldCheck size={30} color={daysLeft < 0 ? p.gray : p.green} />} tone={daysLeft < 0 ? 'gray' : 'green'} size={60} />
            <T variant="title2" align="center">{w.periodYears} year{w.periodYears === 1 ? '' : 's'} · {w.brand || w.itemType}</T>
            <T variant="subhead" color="secondary" align="center">{daysLeft < 0 ? `Expired on ${formatDate(w.expiryDate)}` : `Covered until ${formatDate(w.expiryDate)} · ${daysLeft.toLocaleString('en-IN')} days left`}</T>
            <View style={{ alignSelf: 'stretch' }}><Progress value={used} tone={daysLeft < 0 ? 'gray' : daysLeft < 60 ? 'orange' : 'green'} /></View>
          </Card>

          <DocumentActions kind="warranty" id={w.id} data={{ ...w, customerName: q.data?.customer?.name }} fileName={`Warranty ${w.customId}`} />

          <Section header="Equipment">
            <InfoRow label="Item" value={w.itemType} />
            <InfoRow label="Brand" value={w.brand} />
            <InfoRow label="Model" value={w.model} />
            <InfoRow label="Serial no." value={w.serialNumber} />
            <InfoRow label="Type" value={w.warrantyType} />
            <InfoRow label="From" value={formatDate(w.startDate)} />
            <InfoRow label="Certificate no." value={w.customId} />
          </Section>

          {w.fileId ? (
            <Section>
              <Row icon={<IconTile icon={<FileText size={17} color={p.purple} />} tone="purple" />} title="Manufacturer's warranty card" subtitle={w.fileName} onPress={async () => { try { await Linking.openURL(await api.getFileUrl(w.fileId)); } catch (e: any) { toast(e.message, 'error'); } }} />
            </Section>
          ) : null}

          <Section>
            {!isCustomer && q.data?.customer ? <Row icon={<IconTile icon={<UserRound size={17} color={p.blue} />} tone="blue" />} title={q.data.customer.name} subtitle={q.data.customer.mobile} onPress={() => router.push({ pathname: '/customer/[id]', params: { id: q.data!.customer.id } })} /> : null}
            {q.data?.project ? <Row icon={<IconTile icon={<Zap size={17} color={p.orange} />} tone="orange" />} title={q.data.project.projectName} subtitle={`${q.data.project.capacityKw} kW`} onPress={() => router.push({ pathname: '/project/[id]', params: { id: q.data!.project.id } })} /> : null}
          </Section>
          {w.remark ? <Section header="Note"><InfoRow label="" value={w.remark} multiline /></Section> : null}
          {daysLeft >= 0 && daysLeft < 60 && !isCustomer ? <View style={{ flexDirection: 'row', justifyContent: 'center' }}><Badge text="Expiring soon — offer an AMC or extension" tone="orange" size="m" /></View> : null}
        </>
      )}
      {w ? <FormSheet visible={editing} title="Edit warranty" submit="Save" onClose={() => setEditing(false)} note="Expiry is worked out from the start date and years."
        initial={{ brand: w.brand || '', model: w.model || '', serialNumber: w.serialNumber || '', startDate: String(w.startDate || '').slice(0, 10), periodYears: String(w.periodYears || ''), remark: w.remark || '' }}
        fields={[{ key: 'brand', label: 'Brand' }, { key: 'model', label: 'Model' }, { key: 'serialNumber', label: 'Serial no.' }, { key: 'startDate', label: 'Start date', type: 'date', required: true }, { key: 'periodYears', label: 'Years', type: 'number', required: true }, { key: 'remark', label: 'Note', multiline: true }]}
        onSubmit={async (v) => { await care.updateWarranty(w.id, { ...v, periodYears: Number(v.periodYears) }); toast('Warranty updated'); setEditing(false); void q.refresh(); }} /> : null}
    </Screen>
  );
}
