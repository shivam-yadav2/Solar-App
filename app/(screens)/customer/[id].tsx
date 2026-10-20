import React, { useState } from 'react';
import { Alert, Platform, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Archive, Ellipsis, FileText, IndianRupee, KeyRound, Pencil, Plus, ReceiptText, ShieldCheck, ShieldOff, Trash2, Wrench, Zap } from 'lucide-react-native';
import { api } from '../../../src/lib/api';
import { useApi } from '../../../src/lib/query';
import { useAuth } from '../../../src/context/AuthContext';
import { formatDate, formatINR, formatPhone } from '../../../src/lib/formatters';
import { Avatar, Badge, ErrorState, IconButton, IconTile, InfoRow, ListSkeleton, Row, Screen, Section, space, T, useOverlay, useTheme } from '../../../src/ds';
import { ContactBar, MoneySummary } from '../../../src/components/kit';
import { CredentialsSheet, Credentials } from '../../../src/components/CredentialsSheet';

export default function CustomerDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const p = useTheme();
  const { hasPermission: can, tenant } = useAuth();
  const { actions, toast } = useOverlay();
  const q = useApi(['customers', 'detail', id], () => api.getCustomer(id!), { enabled: !!id });
  const [creds, setCreds] = useState<Credentials | null>(null);
  const c = q.data?.customer;
  const projects: any[] = q.data?.projects || [];
  const payments: any[] = q.data?.payments || [];
  const invoices: any[] = q.data?.invoices || [];
  const warranties: any[] = q.data?.warranties || [];
  const tickets: any[] = q.data?.complaints || [];
  const docs: any[] = q.data?.documents || [];
  const total = projects.reduce((s, x) => s + Number(x.finalDealAmount || x.dealAmount || 0), 0);
  const paid = projects.reduce((s, x) => s + Number(x.totalReceived || 0), 0);
  const go = (pathname: string, params?: Record<string, string>) => router.push({ pathname: pathname as never, params });

  const confirm = (title: string, message: string, label: string, fn: () => Promise<void>) => {
    if (Platform.OS === 'web') return void fn();
    Alert.alert(title, message, [{ text: 'Cancel', style: 'cancel' }, { text: label, style: 'destructive', onPress: () => void fn() }]);
  };
  const portalLogin = async () => {
    if (!c) return;
    try {
      const r = await api.resetCustomerPassword(c.id);
      setCreds({ name: c.name, login: r.email || c.email || r.username, password: r.tempPassword, phone: c.mobile, company: tenant?.name, notified: r.notified });
      void q.refresh();
    } catch (e: any) { toast(e.message, 'error'); }
  };
  const menu = () => c && actions({
    title: c.name,
    items: [
      can('customers.edit') && { label: 'Edit details', icon: <Pencil size={20} color={p.accentText} />, onPress: () => go('/customer-form', { id: c.id }) },
      can('customers.edit') && c.email && { label: c.accountStatus === 'Enabled' ? 'Reset portal password' : 'Create portal login', icon: <KeyRound size={20} color={p.accentText} />, onPress: portalLogin },
      can('customers.delete') && { label: 'Privacy request…', icon: <ShieldOff size={20} color={p.accentText} />, onPress: () => go('/privacy', { customerId: c.id, name: c.name }) },
      can('customers.delete') && c.status !== 'Archived' && { label: 'Archive', icon: <Archive size={20} color={p.accentText} />, onPress: () => confirm('Archive customer?', 'They will be hidden from lists. Their records stay.', 'Archive', async () => { await api.archiveCustomer(c.id); toast('Archived'); router.back(); }) },
      can('customers.delete') && { label: 'Delete', destructive: true, icon: <Trash2 size={20} color={p.red} />, onPress: () => confirm('Delete customer?', 'Moves to the recycle bin for 30 days. Customers with payments or invoices can only be archived.', 'Delete', async () => { try { await api.deleteCustomer(c.id); toast('Moved to recycle bin'); router.back(); } catch (e: any) { toast(e.message, 'error'); } }) },
    ].filter(Boolean) as any,
  });

  return (
    <Screen title={c?.name || 'Customer'} large={false} back right={c ? <IconButton icon={<Ellipsis size={18} color={p.label} />} label="More actions" onPress={menu} /> : undefined} refreshing={q.refreshing} onRefresh={q.refresh}>
      {q.error ? <ErrorState message={q.error} onRetry={q.refresh} /> : q.loading || !c ? <ListSkeleton rows={5} avatar={false} /> : (
        <>
          <View style={{ alignItems: 'center', gap: 6, paddingTop: space.s }}>
            <Avatar name={c.name} size={84} />
            <T variant="title2" align="center">{c.name}</T>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <T variant="subhead" color="secondary">{c.customId}</T>
              <Badge text={c.status} />
              {c.accountStatus === 'Enabled' ? <Badge text="Portal login" tone="blue" /> : null}
            </View>
          </View>
          <ContactBar phone={c.mobile} email={c.email} address={[c.address, c.city, c.state, c.pincode].filter(Boolean).join(', ')} whatsappText={`Hello ${c.name},`} />

          {total > 0 ? <MoneySummary total={total} paid={paid} /> : null}

          <Section header={`Projects · ${projects.length}`}>
            {projects.map((x) => <Row key={x.id} icon={<IconTile icon={<Zap size={17} color={p.orange} />} tone="orange" />} title={x.projectName} subtitle={`${x.capacityKw} kW · ${x.customId}`} accessory={<Badge text={x.status} />} onPress={() => go('/project/[id]', { id: x.id })} />)}
            {can('projects.create') ? <Row icon={<IconTile icon={<Plus size={17} color={p.accentText} />} />} title="New project" action onPress={() => go('/project-form', { customerId: c.id })} chevron={false} /> : null}
          </Section>

          <Section header={`Payments · ${payments.length}`}>
            {payments.slice(0, 5).map((x) => <Row key={x.id} icon={<IconTile icon={<IndianRupee size={17} color={p.green} />} tone="green" />} title={formatINR(x.amount)} subtitle={`${formatDate(x.paymentDate)} · ${x.paymentMethod || ''}${x.milestoneName ? ` · ${x.milestoneName}` : ''}`} accessory={x.status ? <Badge text={x.status} /> : undefined} onPress={() => go('/payment/[id]', { id: x.id })} />)}
            {payments.length > 5 ? <Row title={`All ${payments.length} payments`} action onPress={() => go('/(tabs)/payments', { customerId: c.id })} /> : null}
            {can('payments.create') ? <Row icon={<IconTile icon={<Plus size={17} color={p.accentText} />} />} title="Record payment" action onPress={() => go('/payment-form', { customerId: c.id })} chevron={false} /> : null}
          </Section>

          {invoices.length || can('invoices.create') ? (
            <Section header={`Invoices · ${invoices.length}`}>
              {invoices.slice(0, 5).map((x) => <Row key={x.id} icon={<IconTile icon={<ReceiptText size={17} color={p.accentText} />} />} title={x.invoiceNumber} subtitle={`${formatDate(x.invoiceDate || x.issueDate)} · ${formatINR(x.totalAmount ?? x.grandTotal ?? x.total)}`} accessory={<Badge text={x.status} />} onPress={() => go('/invoice/[id]', { id: x.id })} />)}
              {can('invoices.create') ? <Row icon={<IconTile icon={<Plus size={17} color={p.accentText} />} />} title="New invoice" action onPress={() => go('/invoice-form', { customerId: c.id })} chevron={false} /> : null}
            </Section>
          ) : null}

          {warranties.length ? (
            <Section header={`Warranties · ${warranties.length}`}>
              {warranties.map((x) => <Row key={x.id} icon={<IconTile icon={<ShieldCheck size={17} color={p.blue} />} tone="blue" />} title={x.equipmentType || x.componentType || x.title || 'Warranty'} subtitle={`${x.brand || ''} ${x.model || ''} · until ${formatDate(x.warrantyEndDate || x.expiryDate)}`.trim()} onPress={() => go('/warranty/[id]', { id: x.id })} />)}
            </Section>
          ) : null}

          {tickets.length ? (
            <Section header={`Service tickets · ${tickets.length}`}>
              {tickets.map((x) => <Row key={x.id} icon={<IconTile icon={<Wrench size={17} color={p.red} />} tone="red" />} title={x.title || x.subject || x.category} subtitle={`${x.customId || ''} · ${formatDate(x.createdAt)}`} accessory={<Badge text={x.status} />} onPress={() => go('/ticket/[id]', { id: x.id })} />)}
            </Section>
          ) : null}

          {docs.length ? (
            <Section header={`Documents · ${docs.length}`}>
              {docs.slice(0, 6).map((x) => <Row key={x.id} icon={<IconTile icon={<FileText size={17} color={p.purple} />} tone="purple" />} title={x.title || x.fileName} subtitle={x.category} onPress={() => go('/documents', { customerId: c.id })} />)}
            </Section>
          ) : null}

          <Section header="Details">
            <InfoRow label="Mobile" value={formatPhone(c.mobile)} />
            <InfoRow label="Email" value={c.email} />
            <InfoRow label="Address" value={[c.address, c.city, c.state, c.pincode].filter(Boolean).join(', ')} multiline />
            <InfoRow label="Customer since" value={formatDate(c.createdAt)} />
            {c.notes ? <InfoRow label="Notes" value={c.notes} multiline /> : null}
          </Section>

          {can('customers.edit') && c.email ? (
            <Section header="Customer portal" footer={c.accountStatus === 'Enabled' ? 'The customer can sign in to see progress, payments and invoices.' : 'Give the customer their own login to track their project.'}>
              <Row icon={<IconTile icon={<KeyRound size={17} color={p.blue} />} tone="blue" />} title={c.accountStatus === 'Enabled' ? 'Reset portal password' : 'Create portal login'} action onPress={portalLogin} chevron={false} />
            </Section>
          ) : null}
        </>
      )}
      <CredentialsSheet creds={creds} onClose={() => setCreds(null)} />
    </Screen>
  );
}

