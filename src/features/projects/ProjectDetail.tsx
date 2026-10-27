import React, { useState } from 'react';
import { Alert, Linking, Platform, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { CircleCheck, Ellipsis, FileText, HardHat, IndianRupee, Package, Pencil, Plus, ReceiptText, ShieldCheck, Trash2, UserRound, Wrench, Zap } from 'lucide-react-native';
import { api } from '../../lib/api';
import { useApi } from '../../lib/query';
import { useAuth } from '../../context/AuthContext';
import { useCanOpen } from '../../lib/access';
import { formatDate, formatINR, formatNumber } from '../../lib/formatters';
import {
  Badge, Button, Card, DateField, ErrorState, FormSection, GUTTER, IconButton, IconTile, InfoRow, ListSkeleton, Progress, Row, Screen, Section, Segmented,
  SelectField, Sheet, space, T, TextField, useOverlay, useTheme, haptic, num,
} from '../../ds';
import { MoneySummary, openMap } from '../../components/kit';
import { DISCOM_STAGES, PROJECT_STEPS, projectSteps, Timeline } from '../../components/timeline';
import type { BoQStatus, DiscomLiaisonStage, DiscomStageStatus, ProjectBoqItem, ProjectStatus, SolarProject } from '../../types';

type View_ = 'overview' | 'money' | 'site' | 'discom' | 'files';
type P = SolarProject & { totalReceived?: number; pendingBalance?: number; totalCost?: number; actualProfit?: number; profitMargin?: number; paymentStatus?: string; customerName?: string };

export function ProjectDetail({ id, initialTab }: { id: string; initialTab?: string }) {
  const router = useRouter();
  const p = useTheme();
  const { user, hasPermission: can } = useAuth();
  const canOpen = useCanOpen();
  const { actions, toast } = useOverlay();
  const isCustomer = user?.role === 'CUSTOMER';
  const q = useApi(['projects', 'detail', id], () => api.getProject(id));
  const [tab, setTab] = useState<View_>((['overview', 'money', 'site', 'discom', 'files'].includes(initialTab || '') ? initialTab : 'overview') as View_);
  const [stageSheet, setStageSheet] = useState(false);
  const x: P | undefined = q.data?.project;
  const go = (pathname: string, params?: Record<string, string>) => router.push({ pathname: pathname as never, params });

  const setStatus = async (status: ProjectStatus) => {
    try { await api.updateProject(id, { status }); haptic.success(); toast(`Moved to ${status}`); void q.refresh(); } catch (e: any) { toast(e.message, 'error'); }
  };
  const del = () => {
    const run = async () => { try { await api.deleteProject(id); toast('Moved to recycle bin'); router.back(); } catch (e: any) { toast(e.message, 'error'); } };
    if (Platform.OS === 'web') return void run();
    Alert.alert('Delete project?', 'It moves to the recycle bin for 30 days. Projects with payments or invoices cannot be deleted.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => void run() }]);
  };
  const menu = () => actions({
    title: x?.projectName,
    items: [
      can('projects.edit') && { label: 'Edit project', icon: <Pencil size={20} color={p.accentText} />, onPress: () => go('/project-form', { id }) },
      can('projects.edit') && { label: 'Change stage', icon: <CircleCheck size={20} color={p.accentText} />, onPress: () => setStageSheet(true) },
      can('payments.create') && { label: 'Record payment', icon: <IndianRupee size={20} color={p.accentText} />, onPress: () => go('/payment-form', { projectId: id, customerId: x!.customerId }) },
      can('projects.delete') && { label: 'Delete project', destructive: true, icon: <Trash2 size={20} color={p.red} />, onPress: del },
    ].filter(Boolean) as any,
  });

  const tabs: { value: View_; label: string }[] = [
    { value: 'overview', label: 'Overview' },
    { value: 'money', label: 'Money' },
    ...(!isCustomer && (canOpen('field') || canOpen('inventory')) ? [{ value: 'site' as View_, label: 'Site' }] : []),
    ...(canOpen('discom') || isCustomer ? [{ value: 'discom' as View_, label: 'DISCOM' }] : []),
    { value: 'files', label: 'Files' },
  ];

  return (
    <Screen title={x?.projectName || 'Project'} large={false} back right={x && !isCustomer ? <IconButton icon={<Ellipsis size={18} color={p.label} />} label="More actions" onPress={menu} /> : undefined} refreshing={q.refreshing} onRefresh={q.refresh}>
      {q.error ? <ErrorState message={q.error} onRetry={q.refresh} /> : q.loading || !x ? <ListSkeleton rows={5} avatar={false} /> : (
        <>
          <Card style={{ gap: space.m }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.m }}>
              <IconTile icon={<Zap size={22} color={p.accentText} />} size={44} />
              <View style={{ flex: 1 }}>
                <T variant="title2" num>{formatNumber(x.capacityKw)} kW</T>
                <T variant="footnote" color="secondary">{x.customId}{x.installationType ? ` · ${x.installationType}` : ''}</T>
              </View>
              <Badge text={x.status} size="m" />
            </View>
            {!isCustomer ? <Row style={{ paddingHorizontal: 0 }} icon={<IconTile icon={<UserRound size={17} color={p.blue} />} tone="blue" />} title={q.data?.customer?.name || x.customerName || 'Customer'} subtitle={q.data?.customer?.mobile} onPress={() => go('/customer/[id]', { id: x.customerId })} /> : null}
            {can('projects.edit') && !isCustomer && x.status !== 'Completed' && x.status !== 'Cancelled' ? (
              <Button title={nextStatus(x.status) ? `Move to “${nextStatus(x.status)}”` : 'Change stage'} kind="tinted" size="m" onPress={() => { const n = nextStatus(x.status); if (n) void setStatus(n); else setStageSheet(true); }} />
            ) : null}
          </Card>

          <Segmented value={tab} options={tabs} onChange={setTab} />

          {tab === 'overview' ? <Overview x={x} onPick={can('projects.edit') && !isCustomer ? (s) => void setStatus(s) : undefined} /> : null}
          {tab === 'money' ? <Money x={x} data={q.data} isCustomer={isCustomer} /> : null}
          {tab === 'site' ? <Site x={x} /> : null}
          {tab === 'discom' ? <Discom projectId={id} editable={can('discom.manage') && !isCustomer} /> : null}
          {tab === 'files' ? <Files x={x} data={q.data} isCustomer={isCustomer} /> : null}
        </>
      )}
      <Sheet visible={stageSheet} onClose={() => setStageSheet(false)} title="Project stage">
        <View style={{ paddingHorizontal: GUTTER }}>
          <Section>
            {[...PROJECT_STEPS, 'On Hold' as ProjectStatus, 'Cancelled' as ProjectStatus].map((s) => (
              <Row key={s} title={s} accessory={x?.status === s ? <CircleCheck size={18} color={p.accentText} /> : undefined} chevron={false} onPress={() => { setStageSheet(false); if (x?.status !== s) void setStatus(s); }} destructive={s === 'Cancelled'} />
            ))}
          </Section>
        </View>
      </Sheet>
    </Screen>
  );
}

const nextStatus = (s: ProjectStatus): ProjectStatus | null => {
  const i = PROJECT_STEPS.indexOf(s);
  return i >= 0 && i < PROJECT_STEPS.length - 1 ? PROJECT_STEPS[i + 1] : null;
};

function Overview({ x, onPick }: { x: P; onPick?: (s: ProjectStatus) => void }) {
  const address = [x.installationAddress, x.city, x.state, x.pincode].filter(Boolean).join(', ');
  return (
    <>
      <Card style={{ gap: space.m }}>
        <T variant="headline">Journey</T>
        <Timeline steps={projectSteps(x.status)} onPressStep={onPick ? (i) => onPick(PROJECT_STEPS[i]) : undefined} />
        {onPick ? <T variant="caption" color="secondary">Tap a step to move the project there.</T> : null}
      </Card>
      <Section header="System">
        <InfoRow label="Capacity" value={`${formatNumber(x.capacityKw)} kW`} />
        <InfoRow label="Panels" value={[x.panelsCount ? `${x.panelsCount} ×` : '', x.panelBrand, x.panelModel].filter(Boolean).join(' ')} />
        <InfoRow label="Inverter" value={[x.inverterBrand, x.inverterModel].filter(Boolean).join(' ')} />
        <InfoRow label="Battery" value={x.batteryInstalled ? x.batteryBrand || 'Yes' : 'No'} />
        <InfoRow label="Structure" value={[x.structureType, x.mountingType].filter(Boolean).join(' · ')} />
        <InfoRow label="Net metering" value={x.netMeteringStatus} />
        {x.planPackage ? <InfoRow label="Package" value={x.planPackage} /> : null}
      </Section>
      <Section header="Dates & place">
        <InfoRow label="Booked" value={formatDate(x.bookingDate)} />
        <InfoRow label="Start" value={formatDate(x.startDate)} />
        <InfoRow label="Site" value={address} multiline onPress={address ? () => openMap(address) : undefined} />
      </Section>
    </>
  );
}

function Money({ x, data, isCustomer }: { x: P; data: any; isCustomer: boolean }) {
  const router = useRouter();
  const p = useTheme();
  const { hasPermission: can } = useAuth();
  const total = Number(x.finalDealAmount || x.dealAmount || 0);
  const go = (pathname: string, params?: Record<string, string>) => router.push({ pathname: pathname as never, params });
  const expenses: any[] = data?.expenses || [];
  return (
    <>
      <MoneySummary total={total} paid={Number(x.totalReceived || 0)} />
      <Section header="Deal">
        <InfoRow label="Deal amount" value={formatINR(x.dealAmount)} />
        {Number(x.discount) ? <InfoRow label="Discount" value={`− ${formatINR(x.discount)}`} /> : null}
        {Number(x.taxGst) ? <InfoRow label="GST" value={formatINR(x.taxGst)} /> : null}
        <InfoRow label="Final amount" value={formatINR(total)} />
      </Section>
      <Section header={`Payments · ${(data?.payments || []).length}`}>
        {(data?.payments || []).map((pay: any) => <Row key={pay.id} icon={<IconTile icon={<IndianRupee size={17} color={p.green} />} tone="green" />} title={formatINR(pay.amount)} subtitle={`${formatDate(pay.paymentDate)} · ${pay.paymentMethod}`} accessory={<Badge text={pay.status} />} onPress={() => go('/payment/[id]', { id: pay.id })} />)}
        {can('payments.create') && !isCustomer ? <Row icon={<IconTile icon={<Plus size={17} color={p.accentText} />} />} title="Record payment" action chevron={false} onPress={() => go('/payment-form', { projectId: x.id, customerId: x.customerId })} /> : null}
      </Section>
      {(data?.invoices || []).length ? (
        <Section header="Invoices">
          {data.invoices.map((inv: any) => <Row key={inv.id} icon={<IconTile icon={<ReceiptText size={17} color={p.accentText} />} />} title={inv.invoiceNumber} subtitle={`${formatDate(inv.invoiceDate)} · ${formatINR(inv.totalAmount)}`} accessory={<Badge text={inv.status} />} onPress={() => go('/invoice/[id]', { id: inv.id })} />)}
        </Section>
      ) : null}
      {!isCustomer && can('expenses.view') ? (
        <Section header={`Expenses · ${formatINR(expenses.reduce((s, e) => s + Number(e.amount || 0), 0))}`}>
          {expenses.slice(0, 8).map((e) => <Row key={e.id} title={e.expenseName} subtitle={`${e.expenseCategory} · ${formatDate(e.date)}`} value={formatINR(e.amount)} accessory={e.approvalStatus && e.approvalStatus !== 'Approved' ? <Badge text={e.approvalStatus} /> : undefined} />)}
          {can('expenses.create') ? <Row icon={<IconTile icon={<Plus size={17} color={p.accentText} />} />} title="Add expense" action chevron={false} onPress={() => go('/expense-form', { projectId: x.id, customerId: x.customerId })} /> : null}
        </Section>
      ) : null}
      {!isCustomer && can('reports.view') && x.totalCost !== undefined ? (
        <Card style={{ gap: space.s }}>
          <T variant="headline">Profit</T>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View><T variant="footnote" color="secondary">Cost so far</T><T variant="title3" num>{formatINR(x.totalCost)}</T></View>
            <View style={{ alignItems: 'flex-end' }}><T variant="footnote" color="secondary">Profit · {Number(x.profitMargin || 0).toFixed(1)}%</T><T variant="title3" num color={Number(x.actualProfit) >= 0 ? 'green' : 'red'}>{formatINR(x.actualProfit)}</T></View>
          </View>
          <Progress value={total ? Number(x.totalCost || 0) / total : 0} tone="orange" />
        </Card>
      ) : null}
    </>
  );
}

function Site({ x }: { x: P }) {
  const router = useRouter();
  const p = useTheme();
  const canOpen = useCanOpen();
  const { hasPermission: can } = useAuth();
  const { toast } = useOverlay();
  const dpr = useQuery({ queryKey: ['dpr', x.id], queryFn: () => api.getDpr(x.id), enabled: canOpen('field') });
  const boq = useQuery({ queryKey: ['boq', x.id], queryFn: () => api.getProjectBoq(x.id), enabled: canOpen('inventory') });
  const assets = useQuery({ queryKey: ['inventory', 'assets', x.id], queryFn: () => api.getProjectEquipmentAssets(x.id), enabled: canOpen('inventory') });
  const [edit, setEdit] = useState<ProjectBoqItem | null>(null);
  const reports = dpr.data?.reports || [];
  return (
    <>
      {canOpen('field') ? (
        <Section header={`Site reports · ${reports.length}`}>
          {reports.slice(0, 10).map((r) => {
            const avg = Math.round((Number(r.structureMountingProgressPct) + Number(r.panelInstallationProgressPct) + Number(r.wiringInverterProgressPct)) / 3);
            return <Row key={r.id} icon={<IconTile icon={<HardHat size={17} color={p.teal} />} tone="teal" />} title={formatDate(r.reportDate)} subtitle={`${avg}% done · ${r.laborCountOnSite} on site${r.blockersOrDelays ? ` · ⚠ ${r.blockersOrDelays}` : ''}`} numberOfLines={1} onPress={() => router.push({ pathname: '/dpr/[id]', params: { id: r.id, projectId: x.id } })} />;
          })}
          {can('attendance.manage') ? <Row icon={<IconTile icon={<Plus size={17} color={p.accentText} />} />} title="New site report" action chevron={false} onPress={() => router.push({ pathname: '/field-operation-form', params: { projectId: x.id } })} /> : null}
        </Section>
      ) : null}
      {canOpen('inventory') ? (
        <>
          <Section header="Bill of materials" footer={can('inventory.manage') ? 'Tap an item to update dispatched / used quantities.' : undefined}>
            {(boq.data?.items || []).map((b) => (
              <Row key={b.id} icon={<IconTile icon={<Package size={17} color={p.purple} />} tone="purple" />} title={b.itemName}
                subtitle={`${b.consumedQuantity}/${b.plannedQuantity} ${b.unit} used · ${b.dispatchedQuantity} dispatched`}
                accessory={<Badge text={b.status} />} onPress={can('inventory.manage') ? () => setEdit(b) : undefined} />
            ))}
            {!(boq.data?.items || []).length ? <Row title="No materials planned yet" subtitle="Add them from Inventory & BoQ" /> : null}
          </Section>
          {(assets.data?.assets || []).length ? (
            <Section header="Equipment (serial numbers)">
              {assets.data!.assets.map((a) => (
                <Row key={a.id} title={`${a.equipmentType} · ${a.serialNumber}`} subtitle={[a.brand, a.modelNumber].filter(Boolean).join(' ')} accessory={a.status === 'INSTALLED' ? <Badge text="Installed" tone="green" /> : can('inventory.manage') ? <Button title="Installed" size="s" kind="tinted" onPress={async () => { try { await api.markEquipmentInstalled(a.id); toast('Marked installed'); void assets.refetch(); } catch (e: any) { toast(e.message, 'error'); } }} /> : <Badge text={a.status.replace('_', ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase())} />} />
              ))}
            </Section>
          ) : null}
        </>
      ) : null}
      <BoqSheet item={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); void boq.refetch(); }} />
    </>
  );
}

function BoqSheet({ item, onClose, onSaved }: { item: ProjectBoqItem | null; onClose: () => void; onSaved: () => void }) {
  const { toast } = useOverlay();
  const [d, setD] = useState({ dispatched: '', consumed: '', notes: '' });
  const [busy, setBusy] = useState(false);
  React.useEffect(() => { if (item) setD({ dispatched: String(item.dispatchedQuantity ?? 0), consumed: String(item.consumedQuantity ?? 0), notes: item.notes || '' }); }, [item]);
  const save = async () => {
    if (!item) return;
    setBusy(true);
    try {
      const consumed = num(d.consumed), dispatched = num(d.dispatched);
      const status: BoQStatus = consumed >= item.plannedQuantity ? 'Installed/Consumed' : dispatched >= item.plannedQuantity ? 'Fully Dispatched' : dispatched > 0 ? 'Partially Dispatched' : 'Planned';
      await api.updateProjectBoqItem(item.id, { dispatchedQuantity: dispatched, consumedQuantity: consumed, notes: d.notes, status });
      toast('Updated');
      onSaved();
    } catch (e: any) { toast(e.message, 'error'); } finally { setBusy(false); }
  };
  return (
    <Sheet visible={!!item} onClose={onClose} title={item?.itemName} footer={<Button title="Save" loading={busy} onPress={save} style={{ flex: 1 }} />}>
      <View style={{ paddingHorizontal: GUTTER }}>
        <FormSection footer={item ? `Planned ${item.plannedQuantity} ${item.unit}.` : undefined}>
          <TextField label={`Dispatched (${item?.unit || ''})`} kind="decimal" value={d.dispatched} onChange={(v) => setD({ ...d, dispatched: v })} />
          <TextField label={`Used on site (${item?.unit || ''})`} kind="decimal" value={d.consumed} onChange={(v) => setD({ ...d, consumed: v })} />
          <TextField label="Notes" value={d.notes} onChange={(v) => setD({ ...d, notes: v })} multiline />
        </FormSection>
      </View>
    </Sheet>
  );
}

const DSTATUS: DiscomStageStatus[] = ['Pending', 'In Progress', 'Approved', 'Rejected', 'On Hold'];

function Discom({ projectId, editable }: { projectId: string; editable: boolean }) {
  const q = useQuery({ queryKey: ['discom', projectId], queryFn: () => api.getDiscomStages(projectId) });
  const [open, setOpen] = useState<{ name: string; stage?: DiscomLiaisonStage } | null>(null);
  const stages = q.data?.stages || [];
  const byName = new Map(stages.map((s) => [s.stageName, s]));
  const firstOpen = DISCOM_STAGES.findIndex((n) => byName.get(n)?.status !== 'Approved');
  if (q.isPending) return <ListSkeleton rows={4} avatar={false} />;
  return (
    <>
      <Card style={{ gap: space.m }}>
        <View>
          <T variant="headline">Net-metering & subsidy</T>
          <T variant="footnote" color="secondary">{stages.filter((s) => s.status === 'Approved').length} of {DISCOM_STAGES.length} approved{editable ? ' · tap a stage to update' : ''}</T>
        </View>
        <Timeline
          steps={DISCOM_STAGES.map((n, i) => {
            const s = byName.get(n);
            return {
              title: n,
              subtitle: [s?.applicationReferenceNo ? `Ref ${s.applicationReferenceNo}` : '', s?.approvalDate ? `Approved ${formatDate(s.approvalDate)}` : s?.submissionDate ? `Submitted ${formatDate(s.submissionDate)}` : '', s?.status && s.status !== 'Approved' ? s.status : '', s?.remarks || ''].filter(Boolean).join(' · ') || undefined,
              state: s?.status === 'Approved' ? 'done' : s?.status === 'Rejected' ? 'blocked' : i === firstOpen ? 'current' : 'todo',
            };
          })}
          onPressStep={editable ? (i) => setOpen({ name: DISCOM_STAGES[i], stage: byName.get(DISCOM_STAGES[i]) }) : undefined}
        />
      </Card>
      <DiscomSheet projectId={projectId} open={open} onClose={() => setOpen(null)} onSaved={() => { setOpen(null); void q.refetch(); }} />
    </>
  );
}

function DiscomSheet({ projectId, open, onClose, onSaved }: { projectId: string; open: { name: string; stage?: DiscomLiaisonStage } | null; onClose: () => void; onSaved: () => void }) {
  const { toast } = useOverlay();
  const [d, setD] = useState({ status: 'Pending' as DiscomStageStatus, applicationReferenceNo: '', submissionDate: '', approvalDate: '', discomOfficerName: '', remarks: '' });
  const [busy, setBusy] = useState(false);
  React.useEffect(() => {
    if (!open) return;
    const s = open.stage;
    setD({ status: s?.status || 'In Progress', applicationReferenceNo: s?.applicationReferenceNo || '', submissionDate: s?.submissionDate?.slice(0, 10) || '', approvalDate: s?.approvalDate?.slice(0, 10) || '', discomOfficerName: s?.discomOfficerName || '', remarks: s?.remarks || '' });
  }, [open]);
  const save = async () => {
    if (!open) return;
    setBusy(true);
    try {
      const approvalDate = d.status === 'Approved' ? d.approvalDate || new Date().toISOString().slice(0, 10) : d.approvalDate || undefined;
      if (open.stage) await api.updateDiscomStageStatus(open.stage.id, { status: d.status, approvalDate, remarks: d.remarks });
      else await api.createDiscomStage(projectId, { stageName: open.name as any, status: d.status, applicationReferenceNo: d.applicationReferenceNo, submissionDate: d.submissionDate || undefined, approvalDate, discomOfficerName: d.discomOfficerName, remarks: d.remarks });
      haptic.success();
      toast('Stage updated');
      onSaved();
    } catch (e: any) { toast(e.message, 'error'); } finally { setBusy(false); }
  };
  return (
    <Sheet visible={!!open} onClose={onClose} title={open?.name} footer={<Button title="Save" loading={busy} onPress={save} style={{ flex: 1 }} />}>
      <View style={{ paddingHorizontal: GUTTER, gap: space.m }}>
        <FormSection>
          <SelectField label="Status" value={d.status} options={DSTATUS.map((s) => ({ value: s, label: s }))} onChange={(o) => o && setD({ ...d, status: o.value as DiscomStageStatus })} />
          {!open?.stage ? <TextField label="Application / reference no." value={d.applicationReferenceNo} onChange={(v) => setD({ ...d, applicationReferenceNo: v })} /> : null}
          {!open?.stage ? <DateField label="Submitted on" value={d.submissionDate} onChange={(v) => setD({ ...d, submissionDate: v })} /> : null}
          {d.status === 'Approved' ? <DateField label="Approved on" value={d.approvalDate} onChange={(v) => setD({ ...d, approvalDate: v })} /> : null}
          {!open?.stage ? <TextField label="DISCOM officer" kind="name" value={d.discomOfficerName} onChange={(v) => setD({ ...d, discomOfficerName: v })} /> : null}
          <TextField label="Remarks" value={d.remarks} onChange={(v) => setD({ ...d, remarks: v })} multiline />
        </FormSection>
      </View>
    </Sheet>
  );
}

function Files({ x, data, isCustomer }: { x: P; data: any; isCustomer: boolean }) {
  const router = useRouter();
  const p = useTheme();
  const { hasPermission: can } = useAuth();
  const { toast } = useOverlay();
  const docs: any[] = data?.documents || [];
  const warranties: any[] = data?.warranties || [];
  const tickets: any[] = data?.complaints || [];
  const open = async (fileId?: string) => { if (!fileId) return; try { await Linking.openURL(await api.getFileUrl(fileId)); } catch (e: any) { toast(e.message, 'error'); } };
  return (
    <>
      <Section header={`Documents · ${docs.length}`}>
        {docs.map((d) => <Row key={d.id} icon={<IconTile icon={<FileText size={17} color={p.purple} />} tone="purple" />} title={d.name || d.fileName} subtitle={[d.category, formatDate(d.createdAt)].filter(Boolean).join(' · ')} onPress={() => void open(d.fileId)} />)}
        {can('documents.create') && !isCustomer ? <Row icon={<IconTile icon={<Plus size={17} color={p.accentText} />} />} title="Upload document or photo" action chevron={false} onPress={() => router.push({ pathname: '/document-form', params: { projectId: x.id, customerId: x.customerId } })} /> : null}
        {!docs.length && (isCustomer || !can('documents.create')) ? <Row title="No documents yet" /> : null}
      </Section>
      <Section header={`Warranties · ${warranties.length}`}>
        {warranties.map((w) => <Row key={w.id} icon={<IconTile icon={<ShieldCheck size={17} color={p.blue} />} tone="blue" />} title={w.itemType || w.equipmentType || 'Warranty'} subtitle={`${[w.brand, w.model].filter(Boolean).join(' ')} · until ${formatDate(w.warrantyEndDate)}`} onPress={() => router.push({ pathname: '/warranty/[id]', params: { id: w.id } })} />)}
        {can('warranties.create') && !isCustomer ? <Row icon={<IconTile icon={<Plus size={17} color={p.accentText} />} />} title="Add warranty card" action chevron={false} onPress={() => router.push({ pathname: '/warranty-form', params: { projectId: x.id, customerId: x.customerId } })} /> : null}
      </Section>
      <Section header={`Service tickets · ${tickets.length}`}>
        {tickets.map((t) => <Row key={t.id} icon={<IconTile icon={<Wrench size={17} color={p.red} />} tone="red" />} title={t.title || t.category} subtitle={`${t.customId} · ${formatDate(t.createdAt)}`} accessory={<Badge text={t.status} />} onPress={() => router.push({ pathname: '/ticket/[id]', params: { id: t.id } })} />)}
        <Row icon={<IconTile icon={<Plus size={17} color={p.accentText} />} />} title={isCustomer ? 'Get help with this system' : 'New service ticket'} action chevron={false} onPress={() => router.push({ pathname: '/ticket-form', params: { projectId: x.id, customerId: x.customerId } })} />
      </Section>
    </>
  );
}

