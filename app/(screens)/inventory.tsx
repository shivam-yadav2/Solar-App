import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowDownToLine, ArrowUpFromLine, Boxes, PackageMinus, Plus, Undo2 } from 'lucide-react-native';
import { api } from '../../src/lib/api';
import { useApi } from '../../src/lib/query';
import { useAuth } from '../../src/context/AuthContext';
import { loadProjects } from '../../src/lib/pickers';
import { formatDateTime, formatINR } from '../../src/lib/formatters';
import {
  Badge, Button, EmptyState, ErrorState, FormSection, GroupedItem, GUTTER, IconButton, IconTile, InfoRow, ListScreen, ListSkeleton, Row, SearchBar, Section, Segmented, SelectField, Sheet, space, T, TextField,
  useOverlay, useTheme, haptic, num, radius, elevation, formatMoneyCompact,
} from '../../src/ds';
import type { InventoryItem, InventoryStockMovement, StockMovementType } from '../../src/types';

type Mode = 'stock' | 'low' | 'moves';
const MOVES: { type: StockMovementType; label: string; icon: any; tone: 'green' | 'blue' | 'teal' | 'red' }[] = [
  { type: 'PURCHASE_IN', label: 'Stock in (purchase)', icon: ArrowDownToLine, tone: 'green' },
  { type: 'PROJECT_DISPATCH_OUT', label: 'Send to a site', icon: ArrowUpFromLine, tone: 'blue' },
  { type: 'RETURN_IN', label: 'Returned from site', icon: Undo2, tone: 'teal' },
  { type: 'ADJUSTMENT_WRITE_OFF', label: 'Write off (damaged / lost)', icon: PackageMinus, tone: 'red' },
];
const moveLabel = (t: string) => MOVES.find((m) => m.type === t)?.label || t;

export default function InventoryScreen() {
  const router = useRouter();
  const p = useTheme();
  const { hasPermission: can } = useAuth();
  const q = useApi(['inventory', 'all'], api.getInventory);
  const [mode, setMode] = useState<Mode>('stock');
  const [text, setText] = useState('');
  const [open, setOpen] = useState<InventoryItem | null>(null);
  const items: InventoryItem[] = q.data?.items || [];
  const moves: InventoryStockMovement[] = q.data?.movements || [];
  const low = items.filter((i) => Number(i.currentStock) <= Number(i.minimumReorderLevel || 0));
  const value = items.reduce((s, i) => s + Number(i.currentStock || 0) * Number(i.costPricePerUnit || 0), 0);
  const itemById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const t = text.trim().toLowerCase();
  const shownItems = (mode === 'low' ? low : items).filter((i) => !t || `${i.itemName} ${i.itemCode} ${i.brand || ''} ${i.category}`.toLowerCase().includes(t));
  const shownMoves = moves.filter((m) => !t || `${itemById.get(m.itemId)?.itemName || ''} ${m.vendorSupplier || ''} ${m.referenceChallanNo || ''}`.toLowerCase().includes(t));
  const data: any[] = q.loading ? [] : mode === 'moves' ? shownMoves : shownItems;

  return (
    <>
      <ListScreen<any>
        title="Inventory" back large={false}
        right={can('inventory.manage') ? <IconButton tinted icon={<Plus size={18} color={p.accentText} strokeWidth={2.6} />} label="New item" onPress={() => router.push('/inventory-form')} /> : undefined}
        header={<>
          <View style={[{ backgroundColor: p.surface, borderRadius: radius.l, padding: space.l, flexDirection: 'row' }, elevation(p, 1)]}>
            <View style={{ flex: 1 }}><T variant="footnote" color="secondary">Items</T><T variant="title2" num>{items.length}</T></View>
            <View style={{ flex: 1 }}><T variant="footnote" color="secondary">Low stock</T><T variant="title2" num color={low.length ? 'orange' : 'label'}>{low.length}</T></View>
            <View style={{ flex: 1 }}><T variant="footnote" color="secondary">Stock value</T><T variant="title2" num>{formatMoneyCompact(value)}</T></View>
          </View>
          <Segmented<Mode> value={mode} onChange={setMode} options={[{ value: 'stock', label: 'Stock' }, { value: 'low', label: `Low${low.length ? ` · ${low.length}` : ''}` }, { value: 'moves', label: 'Movements' }]} />
          <SearchBar value={text} onChange={setText} placeholder={mode === 'moves' ? 'Item, vendor or challan' : 'Item, code or brand'} />
          {q.loading ? <ListSkeleton avatar={false} /> : q.error ? <ErrorState message={q.error} onRetry={q.refresh} /> : null}
        </>}
        data={data}
        keyExtractor={(x) => x.id}
        refreshing={q.refreshing}
        onRefresh={q.refresh}
        ListEmptyComponent={!q.loading ? <EmptyState icon={<Boxes size={44} color={p.tertiary} />} title={mode === 'low' ? 'Nothing running low' : mode === 'moves' ? 'No stock movements' : 'No items yet'} action={mode === 'stock' && can('inventory.manage') && !t ? { title: 'Add item', onPress: () => router.push('/inventory-form') } : undefined} /> : null}
        renderItem={({ item: x, index }) => (
          <GroupedItem index={index} count={data.length} inset={mode === 'moves' ? 58 : 16}>
            {mode === 'moves' ? (() => {
              const m = MOVES.find((mv) => mv.type === x.movementType) || MOVES[0];
              const Icon = m.icon;
              const out = x.movementType === 'PROJECT_DISPATCH_OUT' || x.movementType === 'ADJUSTMENT_WRITE_OFF';
              return <Row icon={<IconTile icon={<Icon size={17} color={p[m.tone]} />} tone={m.tone} />} title={itemById.get(x.itemId)?.itemName || 'Item'} subtitle={`${moveLabel(x.movementType)} · ${formatDateTime(x.createdAt)}${x.vendorSupplier ? ` · ${x.vendorSupplier}` : ''}`}
                accessory={<T variant="subhead" num weight="600" color={out ? 'red' : 'green'}>{out ? '−' : '+'}{x.quantity}</T>} />;
            })() : (
              <Row title={x.itemName} subtitle={[x.itemCode, x.brand, x.category].filter(Boolean).join(' · ')}
                accessory={<View style={{ alignItems: 'flex-end', gap: 2 }}><T variant="headline" num color={Number(x.currentStock) <= Number(x.minimumReorderLevel || 0) ? 'orange' : 'label'}>{x.currentStock}</T><T variant="caption2" color="secondary">{x.unitOfMeasure}</T></View>}
                onPress={() => setOpen(x)} />
            )}
          </GroupedItem>
        )}
      />
      <ItemSheet item={open} onClose={() => setOpen(null)} onChanged={() => { setOpen(null); void q.refresh(); }} />
    </>
  );
}

function ItemSheet({ item, onClose, onChanged }: { item: InventoryItem | null; onClose: () => void; onChanged: () => void }) {
  const p = useTheme();
  const { hasPermission: can } = useAuth();
  const { toast } = useOverlay();
  const [type, setType] = useState<StockMovementType | null>(null);
  const [qty, setQty] = useState(''); const [project, setProject] = useState<{ value: string; label: string } | null>(null);
  const [vendor, setVendor] = useState(''); const [challan, setChallan] = useState(''); const [serials, setSerials] = useState(''); const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  React.useEffect(() => { setType(null); setQty(''); setProject(null); setVendor(''); setChallan(''); setSerials(''); setNotes(''); }, [item]);
  if (!item) return null;
  const serialised = item.category === 'Solar Panel' || item.category === 'Inverter';
  const save = async () => {
    if (!type) return;
    if (num(qty) <= 0) { toast('Enter the quantity', 'error'); return; }
    if (type === 'PROJECT_DISPATCH_OUT' && !project) { toast('Choose the project', 'error'); return; }
    const list = serials.split(/[\n,]+/).map((x) => x.trim()).filter(Boolean);
    if (type === 'PROJECT_DISPATCH_OUT' && serialised && !list.length) { toast('Enter the serial numbers being sent', 'error'); return; }
    setBusy(true);
    try {
      await api.createStockMovement({ itemId: item.id, movementType: type, quantity: num(qty), linkedProjectId: project?.value, vendorSupplier: vendor || undefined, referenceChallanNo: challan || undefined, notes: notes || undefined, serialNumbers: list.length ? list : undefined });
      haptic.success();
      toast(`${moveLabel(type)}: ${qty} ${item.unitOfMeasure}`);
      onChanged();
    } catch (e: any) { toast(e.message, 'error'); } finally { setBusy(false); }
  };
  return (
    <Sheet visible onClose={onClose} title={item.itemName} full={!!type} footer={type ? <><Button title="Back" kind="gray" onPress={() => setType(null)} style={{ flex: 1 }} /><Button title="Save" loading={busy} onPress={save} style={{ flex: 1 }} /></> : undefined}>
      <View style={{ paddingHorizontal: GUTTER, gap: space.m, paddingBottom: space.m }}>
        {!type ? (
          <>
            <Section>
              <InfoRow label="In stock" value={`${item.currentStock} ${item.unitOfMeasure}`} />
              <InfoRow label="Reorder at" value={`${item.minimumReorderLevel} ${item.unitOfMeasure}`} />
              <InfoRow label="Cost / sell" value={`${formatINR(item.costPricePerUnit)} / ${formatINR(item.sellingPricePerUnit)}`} />
              <InfoRow label="Code" value={item.itemCode} />
              {item.brand ? <InfoRow label="Brand" value={[item.brand, item.modelNumber].filter(Boolean).join(' ')} /> : null}
              {item.warehouseLocation ? <InfoRow label="Location" value={item.warehouseLocation} /> : null}
              {Number(item.currentStock) <= Number(item.minimumReorderLevel || 0) ? <InfoRow label="" value={<Badge text="Running low — reorder" tone="orange" />} /> : null}
            </Section>
            {can('inventory.manage') ? (
              <Section>
                {MOVES.map((m) => { const Icon = m.icon; return <Row key={m.type} icon={<IconTile icon={<Icon size={17} color={p[m.tone]} />} tone={m.tone} />} title={m.label} onPress={() => setType(m.type)} />; })}
              </Section>
            ) : null}
          </>
        ) : (
          <FormSection header={moveLabel(type)} footer={`Now ${item.currentStock} ${item.unitOfMeasure} in stock.`}>
            <TextField label={`Quantity (${item.unitOfMeasure})`} kind="decimal" value={qty} onChange={setQty} autoFocus />
            {type === 'PROJECT_DISPATCH_OUT' || type === 'RETURN_IN' ? <SelectField label="Project" value={project?.value} display={project?.label} load={loadProjects()} queryKey="projects-all" onChange={(o) => setProject(o)} required={type === 'PROJECT_DISPATCH_OUT'} /> : null}
            {type === 'PURCHASE_IN' ? <TextField label="Supplier" kind="name" value={vendor} onChange={setVendor} /> : null}
            <TextField label="Challan / bill no." value={challan} onChange={setChallan} placeholder="Optional" />
            {serialised && type !== 'ADJUSTMENT_WRITE_OFF' ? <TextField label="Serial numbers" value={serials} onChange={setSerials} multiline placeholder="One per line or comma-separated" hint={type === 'PROJECT_DISPATCH_OUT' ? 'Required — they go on the warranty and invoice.' : undefined} /> : null}
            <TextField label="Notes" value={notes} onChange={setNotes} multiline />
          </FormSection>
        )}
      </View>
    </Sheet>
  );
}
