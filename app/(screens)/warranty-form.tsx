import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../src/lib/api';
import { loadProjects } from '../../src/lib/pickers';
import { formatDate } from '../../src/lib/formatters';
import { Button, DateField, FormSection, Screen, SelectField, TextField, haptic, num, todayISO, useOverlay } from '../../src/ds';
import { AttachField, Attached } from '../../src/components/AttachField';
import type { WarrantyItemType } from '../../src/types';

const ITEMS: WarrantyItemType[] = ['Solar Panel', 'Inverter', 'Battery', 'Structure', 'Wiring/Electrical', 'Other Equipment'];
const YEARS: Record<string, number> = { 'Solar Panel': 25, Inverter: 5, Battery: 5, Structure: 10, 'Wiring/Electrical': 2, 'Other Equipment': 1 };
const addYears = (iso: string, y: number) => { const d = new Date(`${iso}T00:00:00`); d.setFullYear(d.getFullYear() + y); return d.toISOString().slice(0, 10); };

export default function WarrantyForm() {
  const router = useRouter();
  const params = useLocalSearchParams<{ projectId?: string; customerId?: string }>();
  const { toast } = useOverlay();
  const [project, setProject] = useState<{ value: string; label: string; customerId?: string } | null>(null);
  const [itemType, setItemType] = useState<WarrantyItemType>('Solar Panel');
  const [asset, setAsset] = useState<{ value: string; label: string } | null>(null);
  const [f, setF] = useState({ brand: '', model: '', serialNumber: '', warrantyType: 'Manufacturer', periodYears: '25', startDate: todayISO(), remark: '' });
  const [card, setCard] = useState<Attached | null>(null);
  const [saving, setSaving] = useState(false);
  const assets = useQuery({ queryKey: ['inventory', 'assets', project?.value], queryFn: () => api.getProjectEquipmentAssets(project!.value), enabled: !!project });

  useEffect(() => {
    if (params.projectId) api.getProject(params.projectId).then((r) => setProject({ value: r.project.id, label: r.project.projectName, customerId: r.project.customerId })).catch(() => {});
  }, [params.projectId]);
  const set = (k: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [k]: v }));
  const matching = (assets.data?.assets || []).filter((a) => a.equipmentType === itemType || (itemType === 'Other Equipment' && !ITEMS.includes(a.equipmentType as any)));

  const save = async () => {
    if (!project) { toast('Choose the project', 'error'); haptic.error(); return; }
    if (num(f.periodYears) <= 0) { toast('Enter the warranty period', 'error'); haptic.error(); return; }
    setSaving(true);
    try {
      await api.createWarranty({ projectId: project.value, customerId: project.customerId, itemType, warrantyType: f.warrantyType, periodYears: num(f.periodYears), startDate: f.startDate, expiryDate: addYears(f.startDate, num(f.periodYears)),
        brand: f.brand || undefined, model: f.model || undefined, serialNumber: f.serialNumber || undefined, equipmentAssetId: asset?.value, remark: f.remark || undefined, fileId: card?.fileId, fileName: card?.fileName });
      toast('Warranty card added');
      router.back();
    } catch (e: any) { toast(e.message, 'error'); } finally { setSaving(false); }
  };

  return (
    <Screen title="Add warranty" large={false} back backLabel="Cancel" right={<Button title="Save" size="s" loading={saving} onPress={save} />}>
      <FormSection>
        <SelectField label="Project" required value={project?.value} display={project?.label} load={loadProjects(params.customerId)} queryKey={`projects-${params.customerId || 'all'}`}
          onChange={async (o) => { setAsset(null); if (!o) return setProject(null); const r = await api.getProject(o.value).catch(() => null); setProject({ ...o, customerId: r?.project.customerId }); }} />
        <SelectField label="Equipment" value={itemType} options={ITEMS.map((i) => ({ value: i, label: i }))} onChange={(o) => { if (!o) return; setItemType(o.value as WarrantyItemType); setAsset(null); setF((s) => ({ ...s, periodYears: String(YEARS[o.value] || 1) })); }} />
        {matching.length ? <SelectField label="Serial from stock (optional)" value={asset?.value} display={asset?.label} allowClear options={matching.map((a) => ({ value: a.id, label: a.serialNumber, subtitle: [a.brand, a.modelNumber].filter(Boolean).join(' ') }))}
          onChange={(o) => { setAsset(o); const a = matching.find((x) => x.id === o?.value); if (a) setF((s) => ({ ...s, serialNumber: a.serialNumber, brand: a.brand || s.brand, model: a.modelNumber || s.model })); }} /> : null}
      </FormSection>
      <FormSection header="Details">
        <View style={{ flexDirection: 'row' }}><View style={{ flex: 1 }}><TextField label="Brand" value={f.brand} onChange={set('brand')} /></View><View style={{ flex: 1 }}><TextField label="Model" value={f.model} onChange={set('model')} /></View></View>
        <TextField label="Serial number" value={f.serialNumber} onChange={set('serialNumber')} />
        <View style={{ flexDirection: 'row' }}><View style={{ flex: 1 }}><TextField label="Years" kind="number" value={f.periodYears} onChange={set('periodYears')} /></View><View style={{ flex: 2 }}><DateField label="Starts" value={f.startDate} onChange={set('startDate')} hint={num(f.periodYears) ? `Until ${formatDate(addYears(f.startDate, num(f.periodYears)))}` : undefined} /></View></View>
        <SelectField label="Warranty type" value={f.warrantyType} options={['Manufacturer', 'Performance', 'Product', 'Installer / workmanship', 'Extended / AMC'].map((x) => ({ value: x, label: x }))} onChange={(o) => o && setF((s) => ({ ...s, warrantyType: o.value }))} />
      </FormSection>
      <FormSection>
        <AttachField label="Manufacturer's warranty card" value={card} onChange={setCard} />
        <TextField label="Note" value={f.remark} onChange={set('remark')} multiline />
      </FormSection>
      <Button title="Add warranty" loading={saving} onPress={save} full />
    </Screen>
  );
}
