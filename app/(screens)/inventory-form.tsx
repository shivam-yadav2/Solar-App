import React, { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../src/lib/api';
import { loadProjects } from '../../src/lib/pickers';
import { Button, FormSection, Screen, SelectField, TextField, haptic, num, useOverlay } from '../../src/ds';
import type { InventoryCategory } from '../../src/types';

const CATS: InventoryCategory[] = ['Solar Panel', 'Inverter', 'Battery', 'Mounting Structure', 'ACDB/DCDB', 'Cables & Wiring', 'Earthing & Lightning', 'Hardware & Fasteners', 'Safety & Tools', 'Other'];
const UNITS = ['Nos', 'Meter', 'Kg', 'Set', 'Box', 'Roll', 'Pair', 'Litre'];

/** New stock item, or (mode=boq) a planned material line for a project. */
export default function InventoryForm() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string; projectId?: string }>();
  const { toast } = useOverlay();
  const boq = params.mode === 'boq';
  const [f, setF] = useState({ itemName: '', itemCode: '', category: 'Other' as InventoryCategory, brand: '', modelNumber: '', unitOfMeasure: 'Nos', currentStock: '', minimumReorderLevel: '', costPricePerUnit: '', sellingPricePerUnit: '', hsnCode: '', gstRatePercent: '12', warehouseLocation: '', plannedQuantity: '', unitCostEstimate: '', notes: '' });
  const [project, setProject] = useState<{ value: string; label: string } | null>(params.projectId ? { value: params.projectId, label: '' } : null);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [k]: v }));
  const save = async () => {
    if (!f.itemName.trim()) { toast('Enter the item name', 'error'); haptic.error(); return; }
    if (boq && (!project || num(f.plannedQuantity) <= 0)) { toast('Choose the project and planned quantity', 'error'); haptic.error(); return; }
    setSaving(true);
    try {
      if (boq) await api.createProjectBoqItem(project!.value, { itemName: f.itemName.trim(), category: f.category, unit: f.unitOfMeasure, plannedQuantity: num(f.plannedQuantity), unitCostEstimate: num(f.unitCostEstimate), notes: f.notes || undefined });
      else await api.createInventoryItem({ itemName: f.itemName.trim(), itemCode: f.itemCode || undefined, category: f.category, brand: f.brand || undefined, modelNumber: f.modelNumber || undefined, unitOfMeasure: f.unitOfMeasure, currentStock: num(f.currentStock), minimumReorderLevel: num(f.minimumReorderLevel), costPricePerUnit: num(f.costPricePerUnit), sellingPricePerUnit: num(f.sellingPricePerUnit), hsnCode: f.hsnCode || undefined, gstRatePercent: num(f.gstRatePercent), warehouseLocation: f.warehouseLocation || undefined } as any);
      toast(boq ? 'Added to the bill of materials' : 'Item added');
      router.back();
    } catch (e: any) { toast(e.message, 'error'); } finally { setSaving(false); }
  };
  const cat = <SelectField label="Category" value={f.category} options={CATS.map((c) => ({ value: c, label: c }))} onChange={(o) => o && setF((s) => ({ ...s, category: o.value as InventoryCategory }))} />;
  const unit = <SelectField label="Unit" value={f.unitOfMeasure} options={UNITS.map((u) => ({ value: u, label: u }))} onChange={(o) => o && setF((s) => ({ ...s, unitOfMeasure: o.value }))} />;
  return (
    <Screen title={boq ? 'Plan material' : 'New item'} large={false} back backLabel="Cancel" right={<Button title="Save" size="s" loading={saving} onPress={save} />}>
      {boq ? (
        <>
          <FormSection><SelectField label="Project" required value={project?.value} display={project?.label} load={loadProjects()} queryKey="projects-all" onChange={(o) => setProject(o)} /></FormSection>
          <FormSection header="Material">
            <TextField label="Item" value={f.itemName} onChange={set('itemName')} required autoFocus />
            {cat}
            <View style={{ flexDirection: 'row' }}><View style={{ flex: 1 }}><TextField label="Planned quantity" kind="decimal" value={f.plannedQuantity} onChange={set('plannedQuantity')} required /></View><View style={{ flex: 1 }}>{unit}</View></View>
            <TextField label="Estimated cost per unit" kind="money" value={f.unitCostEstimate} onChange={set('unitCostEstimate')} />
            <TextField label="Notes" value={f.notes} onChange={set('notes')} multiline />
          </FormSection>
        </>
      ) : (
        <>
          <FormSection header="Item">
            <TextField label="Name" value={f.itemName} onChange={set('itemName')} required autoFocus />
            {cat}
            <View style={{ flexDirection: 'row' }}><View style={{ flex: 1 }}><TextField label="Brand" value={f.brand} onChange={set('brand')} /></View><View style={{ flex: 1 }}><TextField label="Model" value={f.modelNumber} onChange={set('modelNumber')} /></View></View>
            <TextField label="Item code" value={f.itemCode} onChange={set('itemCode')} placeholder="Auto if empty" />
          </FormSection>
          <FormSection header="Stock">
            <View style={{ flexDirection: 'row' }}><View style={{ flex: 1 }}><TextField label="Opening stock" kind="decimal" value={f.currentStock} onChange={set('currentStock')} /></View><View style={{ flex: 1 }}>{unit}</View></View>
            <TextField label="Reorder when below" kind="decimal" value={f.minimumReorderLevel} onChange={set('minimumReorderLevel')} />
            <TextField label="Warehouse / location" value={f.warehouseLocation} onChange={set('warehouseLocation')} />
          </FormSection>
          <FormSection header="Price & tax">
            <View style={{ flexDirection: 'row' }}><View style={{ flex: 1 }}><TextField label="Cost / unit" kind="money" value={f.costPricePerUnit} onChange={set('costPricePerUnit')} /></View><View style={{ flex: 1 }}><TextField label="Sell / unit" kind="money" value={f.sellingPricePerUnit} onChange={set('sellingPricePerUnit')} /></View></View>
            <View style={{ flexDirection: 'row' }}><View style={{ flex: 1 }}><TextField label="HSN" kind="number" value={f.hsnCode} onChange={set('hsnCode')} /></View><View style={{ flex: 1 }}><TextField label="GST %" kind="decimal" value={f.gstRatePercent} onChange={set('gstRatePercent')} /></View></View>
          </FormSection>
        </>
      )}
      <Button title={boq ? 'Add to bill of materials' : 'Add item'} loading={saving} onPress={save} full />
    </Screen>
  );
}
