import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Boxes, ChevronDown, ChevronUp, FileText, IndianRupee, LifeBuoy, ReceiptText, SunMedium, Users, Wrench } from 'lucide-react-native';
import { Button, Card, IconTile, Row, Screen, SearchBar, Section, T, Tap, useTheme } from '../../src/ds';

const guides = [
  { id: 'sale', title: 'From enquiry to signed customer', subtitle: 'Lead → follow-up → quotation → customer', path: '/leads', tone: 'purple' as const, icon: Users, steps: ['Add every enquiry under Leads and record each call, meeting or site visit.', 'Build a quotation from the lead; pricing, inclusions and validity come from quotation defaults.', 'When the deal is won, convert the lead to a customer, then create their solar project.'] },
  { id: 'project', title: 'Create and deliver a solar project', subtitle: 'Booking, BoQ, serials, DISCOM and field work', path: '/projects', tone: 'accent' as const, icon: SunMedium, steps: ['Create the project under the correct customer and enter the signed deal amount.', 'Prepare the BoQ and dispatch stock. Enter panel and inverter serial numbers at issue time.', 'Update the installation milestone, field reports and DISCOM stages as work progresses.'] },
  { id: 'money', title: 'Record money correctly', subtitle: 'Payments, expenses, invoices and margins', path: '/payments', tone: 'green' as const, icon: IndianRupee, steps: ['Record every customer receipt against the correct project and keep the bank/UPI reference.', 'Log site expenses with supplier and proof; approvers should approve or reject pending entries.', 'Issue the GST invoice only after checking company GST settings and equipment serials.'] },
  { id: 'invoice', title: 'Generate a GST invoice', subtitle: 'Tax settings, HSN, serial numbers and sharing', path: '/invoices', tone: 'blue' as const, icon: ReceiptText, steps: ['Complete Company settings: legal name, GSTIN, registered address, state and bank details.', 'Confirm GST mode, HSN/SAC and rate, then create the invoice for the customer/project.', 'Preview before issuing. Share the issued PDF; cancelled invoices remain in the audit trail.'] },
  { id: 'stock', title: 'Control inventory and serial numbers', subtitle: 'Purchase, dispatch, return and reconciliation', path: '/inventory', tone: 'orange' as const, icon: Boxes, steps: ['Create the inventory item with HSN, GST rate, reorder level and purchase cost.', 'Record purchases into stock, then add the item to a project BoQ.', 'Dispatch against the project and capture unique equipment serials before installation.'] },
  { id: 'service', title: 'Handle after-sales service', subtitle: 'Ticket → visit → resolution → warranty', path: '/tickets', tone: 'red' as const, icon: Wrench, steps: ['Log the customer complaint with priority, category and affected project.', 'Assign the technician, record visit notes and attach evidence.', 'Resolve only after recording the outcome; warranty details remain linked to the project.'] },
];

export default function HelpScreen() {
  const router = useRouter();
  const p = useTheme();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState('sale');
  const visible = guides.filter((x) => `${x.title} ${x.subtitle} ${x.steps.join(' ')}`.toLowerCase().includes(q.toLowerCase()));
  return <Screen title="Help & workflows" subtitle="Short, practical guides for running your solar business" back>
    <SearchBar value={q} onChange={setQ} placeholder="Search a task or module" />
    <Card style={{ gap: 10 }}><View style={{ flexDirection: 'row', gap: 12 }}><IconTile tone="accent" icon={<SunMedium size={18} color={p.accentText} />} /><View style={{ flex: 1 }}><T variant="headline">New to SolarOS?</T><T variant="footnote" color="secondary">Start with the sales workflow, then follow the project, inventory and finance guides in order.</T></View></View></Card>
    <View style={{ gap: 12 }}>{visible.map((guide) => { const Icon = guide.icon; const expanded = open === guide.id; const color = (p as any)[guide.tone] || p.accentText; return <Card key={guide.id} padded={false}><Tap onPress={() => setOpen(expanded ? '' : guide.id)} style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 }}><IconTile tone={guide.tone} icon={<Icon size={18} color={color} />} /><View style={{ flex: 1 }}><T variant="headline">{guide.title}</T><T variant="footnote" color="secondary">{guide.subtitle}</T></View>{expanded ? <ChevronUp size={18} color={p.secondary} /> : <ChevronDown size={18} color={p.secondary} />}</Tap>{expanded ? <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 12 }}>{guide.steps.map((step, i) => <View key={step} style={{ flexDirection: 'row', gap: 10 }}><View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: p.fill, alignItems: 'center', justifyContent: 'center' }}><T variant="caption" weight="700">{i + 1}</T></View><T variant="subhead" color="secondary" style={{ flex: 1 }}>{step}</T></View>)}<Button title="Open this module" kind="tinted" size="m" full onPress={() => router.push(guide.path as never)} /></View> : null}</Card>; })}</View>
    {!visible.length ? <T variant="body" color="secondary" align="center">No guide matches “{q}”.</T> : null}
    <Section header="Need personal help"><Row icon={<IconTile tone="blue" icon={<LifeBuoy size={17} color={p.blue} />} />} title="Contact SolarOS support" subtitle="Create a ticket and continue the conversation in the app" onPress={() => router.push('/support')} /></Section>
  </Screen>;
}
