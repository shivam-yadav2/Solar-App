import React, { useState } from 'react';
import { Alert, Linking, Platform, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Archive, Ellipsis, FileText, IndianRupee, KeyRound, Pencil, Plus, ReceiptText, ShieldCheck, Trash2, Wrench, Zap } from 'lucide-react-native';
import { api } from '../../../src/lib/api';
import { useApi } from '../../../src/lib/query';
import { useAuth } from '../../../src/context/AuthContext';
import { formatDate, formatINR, formatPhone } from '../../../src/lib/formatters';
import { Avatar, Badge, ErrorState, IconButton, IconTile, InfoRow, ListSkeleton, Row, Screen, Section, Segmented, space, T, useOverlay, useTheme } from '../../../src/ds';
import { ContactBar, MoneySummary } from '../../../src/components/kit';
import { CredentialsSheet, Credentials } from '../../../src/components/CredentialsSheet';

type CustomerView = 'overview' | 'projects' | 'money' | 'service' | 'files';

export default function CustomerDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const p = useTheme();
  const { hasPermission: can, tenant } = useAuth();
  const { actions, toast } = useOverlay();
  const q = useApi(['customers', 'detail', id], () => api.getCustomer(id!), { enabled: !!id });
  const [creds, setCreds] = useState<Credentials | null>(null);
  const [tab, setTab] = useState<CustomerView>('overview');
  const c = q.data?.customer;
  const projects: any[] = q.data?.projects || [];
  const payments: any[] = q.data?.payments || [];
  const invoices: any[] = q.data?.invoices || [];
  const warranties: any[] = q.data?.warranties || [];
  const tickets: any[] = q.data?.complaints || [];
  const docs: any[] = q.data?.documents || [];
  const total = projects.reduce((sum, project) => sum + Number(project.finalDealAmount || project.dealAmount || 0), 0);
  const paid = projects.reduce((sum, project) => sum + Number(project.totalReceived || 0), 0);
  const go = (pathname: string, params?: Record<string, string>) => router.push({ pathname: pathname as never, params });
  const openFile = async (fileId?: string) => {
    if (!fileId) return go('/documents', { customerId: c?.id || '' });
    try { await Linking.openURL(await api.getFileUrl(fileId)); } catch (error: any) { toast(error.message, 'error'); }
  };

  const confirm = (title: string, message: string, label: string, run: () => Promise<void>) => {
    if (Platform.OS === 'web') { if (globalThis.confirm(`${title}\n\n${message}`)) void run(); return; }
    Alert.alert(title, message, [{ text: 'Cancel', style: 'cancel' }, { text: label, style: 'destructive', onPress: () => void run() }]);
  };

  const portalLogin = async () => {
    if (!c) return;
    try {
      const result = await api.resetCustomerPassword(c.id);
      setCreds({ name: c.name, login: result.email || c.email || result.username, password: result.tempPassword, phone: c.mobile, company: tenant?.name, notified: result.notified });
      void q.refresh();
    } catch (error: any) { toast(error.message, 'error'); }
  };

  const menu = () => c && actions({
    title: c.name,
    items: [
      can('customers.edit') && { label: 'Edit details', icon: <Pencil size={20} color={p.accentText} />, onPress: () => go('/customer-form', { id: c.id }) },
      can('customers.edit') && c.email && { label: c.accountStatus === 'Enabled' ? 'Reset portal password' : 'Create portal login', icon: <KeyRound size={20} color={p.accentText} />, onPress: portalLogin },
      can('customers.delete') && c.status !== 'Archived' && { label: 'Archive', icon: <Archive size={20} color={p.accentText} />, onPress: () => confirm('Archive customer?', 'They will be hidden from lists. Their records stay.', 'Archive', async () => { await api.archiveCustomer(c.id); toast('Archived'); router.back(); }) },
      can('customers.delete') && { label: 'Delete', destructive: true, icon: <Trash2 size={20} color={p.red} />, onPress: () => confirm('Delete customer?', 'This moves the customer to the recycle bin for 30 days. Customers with payments or invoices can only be archived.', 'Delete', async () => { try { await api.deleteCustomer(c.id); toast('Moved to recycle bin'); router.back(); } catch (error: any) { toast(error.message, 'error'); } }) },
    ].filter(Boolean) as any,
  });

  return (
    <Screen title={c?.name || 'Customer'} large={false} back right={c ? <IconButton icon={<Ellipsis size={18} color={p.label} />} label="More customer actions" onPress={menu} /> : undefined} refreshing={q.refreshing} onRefresh={q.refresh}>
      {q.error ? <ErrorState message={q.error} onRetry={q.refresh} /> : q.loading || !c ? <ListSkeleton rows={5} avatar={false} /> : (
        <>
          <View style={{ alignItems: 'center', gap: 6, paddingTop: space.s }}>
            <Avatar name={c.name} size={84} />
            <T variant="title2" align="center">{c.name}</T>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
              <T variant="subhead" color="secondary">{c.customId}</T>
              <Badge text={c.status} />
              {c.accountStatus === 'Enabled' ? <Badge text="Portal login" tone="blue" /> : null}
            </View>
          </View>
          <ContactBar phone={c.mobile} email={c.email} address={[c.address, c.city, c.state, c.pincode].filter(Boolean).join(', ')} whatsappText={`Hello ${c.name},`} />
          {total > 0 ? <MoneySummary total={total} paid={paid} /> : null}

          <Segmented<CustomerView> value={tab} onChange={setTab} options={[
            { value: 'overview', label: 'Overview' },
            { value: 'projects', label: `Projects ${projects.length}` },
            { value: 'money', label: 'Money' },
            { value: 'service', label: 'Service' },
            { value: 'files', label: 'Files' },
          ]} />

          {tab === 'overview' ? (
            <>
              <Section header="Account details">
                <InfoRow label="Mobile" value={formatPhone(c.mobile)} />
                <InfoRow label="Email" value={c.email} />
                <InfoRow label="Address" value={[c.address, c.city, c.state, c.pincode].filter(Boolean).join(', ')} multiline />
                <InfoRow label="Customer since" value={formatDate(c.createdAt)} />
                <InfoRow label="Portal" value={c.accountStatus === 'Enabled' ? 'Enabled' : 'Disabled'} />
                {c.notes ? <InfoRow label="Notes" value={c.notes} multiline /> : null}
              </Section>
              {can('customers.edit') && c.email ? (
                <Section header="Customer portal" footer={c.accountStatus === 'Enabled' ? 'Resetting creates a new temporary password and invalidates the old one.' : 'Give this customer a private login for progress, documents and billing.'}>
                  <Row icon={<IconTile icon={<KeyRound size={17} color={p.blue} />} tone="blue" />} title={c.accountStatus === 'Enabled' ? 'Reset and share credentials' : 'Create portal login'} action onPress={portalLogin} chevron={false} />
                </Section>
              ) : null}
            </>
          ) : null}

          {tab === 'projects' ? (
            <Section header={`Projects · ${projects.length}`}>
              {projects.map((project) => <Row key={project.id} icon={<IconTile icon={<Zap size={17} color={p.orange} />} tone="orange" />} title={project.projectName} subtitle={`${project.capacityKw} kW · ${project.customId}`} accessory={<Badge text={project.status} />} onPress={() => go('/project/[id]', { id: project.id })} />)}
              {!projects.length ? <Row title="No projects yet" subtitle="Create the customer's first solar installation." /> : null}
              {can('projects.create') ? <Row icon={<IconTile icon={<Plus size={17} color={p.accentText} />} />} title="New project" action onPress={() => go('/project-form', { customerId: c.id })} chevron={false} /> : null}
            </Section>
          ) : null}

          {tab === 'money' ? (
            <>
              <Section header={`Payments · ${payments.length}`}>
                {payments.map((payment) => <Row key={payment.id} icon={<IconTile icon={<IndianRupee size={17} color={p.green} />} tone="green" />} title={formatINR(payment.amount)} subtitle={`${formatDate(payment.paymentDate)} · ${payment.paymentMethod || ''}${payment.milestoneName ? ` · ${payment.milestoneName}` : ''}`} accessory={payment.status ? <Badge text={payment.status} /> : undefined} onPress={() => go('/payment/[id]', { id: payment.id })} />)}
                {!payments.length ? <Row title="No payments recorded" /> : null}
                {can('payments.create') ? <Row icon={<IconTile icon={<Plus size={17} color={p.accentText} />} />} title="Record payment" action onPress={() => go('/payment-form', { customerId: c.id })} chevron={false} /> : null}
              </Section>
              <Section header={`Invoices · ${invoices.length}`}>
                {invoices.map((invoice) => <Row key={invoice.id} icon={<IconTile icon={<ReceiptText size={17} color={p.accentText} />} />} title={invoice.invoiceNumber} subtitle={`${formatDate(invoice.invoiceDate || invoice.issueDate)} · ${formatINR(invoice.totalAmount ?? invoice.grandTotal ?? invoice.total ?? invoice.amount)}`} accessory={<Badge text={invoice.status} />} onPress={() => go('/invoice/[id]', { id: invoice.id })} />)}
                {!invoices.length ? <Row title="No invoices issued" /> : null}
                {can('invoices.create') ? <Row icon={<IconTile icon={<Plus size={17} color={p.accentText} />} />} title="New invoice" action onPress={() => go('/invoice-form', { customerId: c.id })} chevron={false} /> : null}
              </Section>
            </>
          ) : null}

          {tab === 'service' ? (
            <>
              <Section header={`Warranties · ${warranties.length}`}>
                {warranties.map((warranty) => <Row key={warranty.id} icon={<IconTile icon={<ShieldCheck size={17} color={p.blue} />} tone="blue" />} title={warranty.itemType || warranty.equipmentType || warranty.componentType || warranty.title || 'Warranty'} subtitle={`${warranty.brand || ''} ${warranty.model || ''} · until ${formatDate(warranty.warrantyEndDate || warranty.expiryDate)}`.trim()} onPress={() => go('/warranty/[id]', { id: warranty.id })} />)}
                {!warranties.length ? <Row title="No warranty cards issued" /> : null}
                {can('warranties.create') ? <Row icon={<IconTile icon={<Plus size={17} color={p.accentText} />} />} title="Issue warranty" action onPress={() => go('/warranty-form', { customerId: c.id })} chevron={false} /> : null}
              </Section>
              <Section header={`Service tickets · ${tickets.length}`}>
                {tickets.map((ticket) => <Row key={ticket.id} icon={<IconTile icon={<Wrench size={17} color={p.red} />} tone="red" />} title={ticket.title || ticket.subject || ticket.category} subtitle={`${ticket.customId || ''} · ${formatDate(ticket.createdAt)}`} accessory={<Badge text={ticket.status} />} onPress={() => go('/ticket/[id]', { id: ticket.id })} />)}
                {!tickets.length ? <Row title="No service tickets" /> : null}
                {can('complaints.create') ? <Row icon={<IconTile icon={<Plus size={17} color={p.accentText} />} />} title="New service ticket" action onPress={() => go('/ticket-form', { customerId: c.id })} chevron={false} /> : null}
              </Section>
            </>
          ) : null}

          {tab === 'files' ? (
            <Section header={`Documents · ${docs.length}`}>
              {docs.map((document) => <Row key={document.id} icon={<IconTile icon={<FileText size={17} color={p.purple} />} tone="purple" />} title={document.name || document.fileName} subtitle={[document.category, formatDate(document.createdAt)].filter(Boolean).join(' · ')} onPress={() => void openFile(document.fileId)} />)}
              {!docs.length ? <Row title="No customer documents" /> : null}
              {can('documents.create') ? <Row icon={<IconTile icon={<Plus size={17} color={p.accentText} />} />} title="Upload document" action onPress={() => go('/document-form', { customerId: c.id })} chevron={false} /> : null}
            </Section>
          ) : null}
        </>
      )}
      <CredentialsSheet creds={creds} onClose={() => setCreds(null)} />
    </Screen>
  );
}
