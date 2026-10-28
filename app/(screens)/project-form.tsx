import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../src/lib/api';
import { loadCustomers } from '../../src/lib/pickers';
import {
  Button, DateField, ErrorState, FormSection, ListSkeleton, Screen, SelectField, TextField, ToggleField,
  haptic, num, todayISO, useOverlay, useUnsavedChanges,
} from '../../src/ds';
import type { ProjectStatus } from '../../src/types';

type Form = {
  customerId: string; customerName: string; projectName: string; status: ProjectStatus;
  installationAddress: string; city: string; state: string; pincode: string; startDate: string; bookingDate: string;
  capacityKw: string; panelsCount: string; panelBrand: string; panelModel: string; panelSerialNumbers: string;
  inverterBrand: string; inverterModel: string; inverterSerial: string;
  batteryInstalled: boolean; batteryCapacity: string; batteryBrand: string; batteryModel: string;
  structureType: string; mountingType: string; installationType: string; systemConfiguration: string;
  uppclAccountNo: string; netMeteringStatus: string; dealAmount: string; discount: string; taxGst: string;
  bookedProfit: string; planPackage: string; notes: string; internalRemarks: string;
};

const blank = (customerId = ''): Form => ({
  customerId, customerName: '', projectName: '', status: 'Booked',
  installationAddress: '', city: '', state: '', pincode: '', startDate: todayISO(), bookingDate: todayISO(),
  capacityKw: '', panelsCount: '', panelBrand: '', panelModel: '', panelSerialNumbers: '',
  inverterBrand: '', inverterModel: '', inverterSerial: '',
  batteryInstalled: false, batteryCapacity: '', batteryBrand: '', batteryModel: '',
  structureType: '', mountingType: '', installationType: '', systemConfiguration: '',
  uppclAccountNo: '', netMeteringStatus: '', dealAmount: '', discount: '0', taxGst: '0',
  bookedProfit: '0', planPackage: '', notes: '', internalRemarks: '',
});

const STATUSES: ProjectStatus[] = [
  'Lead', 'Booked', 'Planning', 'Material Ordered', 'Installation Scheduled', 'Installation In Progress',
  'Installed', 'Inspection Pending', 'Completed', 'On Hold', 'Cancelled',
];

export default function ProjectFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; customerId?: string }>();
  const id = params.id ? String(params.id) : undefined;
  const editing = !!id;
  const { toast } = useOverlay();
  const [form, setForm] = useState<Form>(() => blank(params.customerId ? String(params.customerId) : ''));
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [loading, setLoading] = useState(editing || !!params.customerId);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const baseline = useRef(JSON.stringify(form));

  useEffect(() => {
    const load = async () => {
      try {
        if (id) {
          const result = await api.getProject(id);
          const project = result.project;
          const next: Form = {
            ...blank(project.customerId),
            ...project,
            customerName: result.customer?.name || project.customerName || '',
            capacityKw: String(project.capacityKw ?? ''),
            panelsCount: String(project.panelsCount ?? ''),
            panelSerialNumbers: Array.isArray(project.panelSerialNumbers) ? project.panelSerialNumbers.join('\n') : String(project.panelSerialNumbers || ''),
            inverterSerial: String(project.inverterSerial || ''),
            batteryInstalled: Boolean(project.batteryInstalled),
            batteryCapacity: String(project.batteryCapacity || ''),
            batteryBrand: String(project.batteryBrand || ''),
            batteryModel: String(project.batteryModel || ''),
            systemConfiguration: String(project.systemConfiguration || ''),
            uppclAccountNo: String(project.uppclAccountNo || ''),
            dealAmount: String(project.dealAmount ?? ''), discount: String(project.discount ?? 0),
            taxGst: String(project.taxGst ?? 0), bookedProfit: String(project.bookedProfit ?? 0),
            notes: String(project.notes || ''), internalRemarks: String(project.internalRemarks || ''),
          };
          setForm(next);
          baseline.current = JSON.stringify(next);
        } else if (params.customerId) {
          const result = await api.getCustomer(String(params.customerId));
          const next = { ...blank(String(params.customerId)), customerName: result.customer.name };
          setForm(next);
          baseline.current = JSON.stringify(next);
        }
      } catch (error: any) {
        setLoadError(error.message || 'Could not load the project.');
      } finally {
        setLoading(false);
      }
    };
    if (editing || params.customerId) void load();
  }, [editing, id, params.customerId]);

  const dirty = useMemo(() => !loading && JSON.stringify(form) !== baseline.current, [form, loading]);
  const allowNavigation = useUnsavedChanges(dirty);
  const set = <K extends keyof Form>(key: K) => (value: Form[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const validate = () => {
    const next: typeof errors = {};
    if (!form.customerId) next.customerId = 'Choose a customer.';
    if (!form.projectName.trim()) next.projectName = 'Enter a project name.';
    if (num(form.capacityKw) <= 0) next.capacityKw = 'Enter a capacity greater than zero.';
    if (num(form.dealAmount) <= 0) next.dealAmount = 'Enter the agreed deal amount.';
    if (form.pincode && !/^\d{6}$/.test(form.pincode)) next.pincode = 'Enter a 6-digit pincode.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = async () => {
    if (!validate()) { haptic.error(); return; }
    setSaving(true);
    try {
      const { customerName: _customerName, ...values } = form;
      const payload = {
        ...values,
        projectName: form.projectName.trim(),
        panelSerialNumbers: form.panelSerialNumbers.split(/[\n,]+/).map((serial) => serial.trim()).filter(Boolean),
        inverterSerial: form.inverterSerial.trim(),
        capacityKw: num(form.capacityKw), panelsCount: num(form.panelsCount), dealAmount: num(form.dealAmount),
        discount: num(form.discount), taxGst: num(form.taxGst), bookedProfit: num(form.bookedProfit),
      };
      if (id) await api.updateProject(id, payload); else await api.createProject(payload);
      haptic.success();
      toast(id ? 'Project updated' : 'Project created');
      allowNavigation();
      router.back();
    } catch (error: any) {
      toast(error.message || 'Could not save the project.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen title={editing ? 'Edit project' : 'New project'} subtitle="Installation, system and deal details" large={false} back backLabel="Cancel"
      right={<Button title={editing ? 'Save' : 'Create'} size="s" loading={saving} onPress={save} />}>
      {loadError ? <ErrorState message={loadError} /> : loading ? <ListSkeleton rows={6} avatar={false} /> : (
        <>
          <FormSection header="Project">
            <SelectField label="Customer" required value={form.customerId} display={form.customerName} load={loadCustomers} queryKey="project-customer" error={errors.customerId}
              onChange={(option) => { set('customerId')(option?.value || ''); set('customerName')(option?.label || ''); }} />
            <TextField label="Project name" kind="name" value={form.projectName} onChange={set('projectName')} required error={errors.projectName} autoFocus={!editing} />
            <SelectField label="Stage" value={form.status} options={STATUSES.map((status) => ({ value: status, label: status }))} onChange={(option) => option && set('status')(option.value as ProjectStatus)} />
            <TextField label="Package" value={form.planPackage} onChange={set('planPackage')} placeholder="Optional plan or package name" />
          </FormSection>

          <FormSection header="Solar system" footer="Serial numbers also appear on supported invoices and warranty records.">
            <View style={{ flexDirection: 'row' }}>
              <View style={{ flex: 1 }}><TextField label="Capacity (kW)" kind="decimal" value={form.capacityKw} onChange={set('capacityKw')} required error={errors.capacityKw} /></View>
              <View style={{ flex: 1 }}><TextField label="Panel count" kind="number" value={form.panelsCount} onChange={set('panelsCount')} /></View>
            </View>
            <TextField label="Panel brand" kind="name" value={form.panelBrand} onChange={set('panelBrand')} />
            <TextField label="Panel model" value={form.panelModel} onChange={set('panelModel')} />
            <TextField label="Panel serial numbers" value={form.panelSerialNumbers} onChange={set('panelSerialNumbers')} multiline hint="One serial per line, or separate with commas." />
            <TextField label="Inverter brand" kind="name" value={form.inverterBrand} onChange={set('inverterBrand')} />
            <TextField label="Inverter model" value={form.inverterModel} onChange={set('inverterModel')} />
            <TextField label="Inverter serial number" value={form.inverterSerial} onChange={set('inverterSerial')} />
            <ToggleField label="Battery installed" value={form.batteryInstalled} onChange={set('batteryInstalled')} />
            {form.batteryInstalled ? (
              <>
                <TextField label="Battery brand" kind="name" value={form.batteryBrand} onChange={set('batteryBrand')} />
                <TextField label="Battery model" value={form.batteryModel} onChange={set('batteryModel')} />
                <TextField label="Battery capacity" value={form.batteryCapacity} onChange={set('batteryCapacity')} placeholder="For example, 10 kWh" />
              </>
            ) : null}
          </FormSection>

          <FormSection header="Installation & DISCOM">
            <TextField label="Installation type" value={form.installationType} onChange={set('installationType')} placeholder="On-grid, off-grid or hybrid" />
            <TextField label="System configuration" value={form.systemConfiguration} onChange={set('systemConfiguration')} />
            <TextField label="Structure type" value={form.structureType} onChange={set('structureType')} />
            <TextField label="Mounting type" value={form.mountingType} onChange={set('mountingType')} />
            <TextField label="DISCOM account number" value={form.uppclAccountNo} onChange={set('uppclAccountNo')} />
            <TextField label="Net-metering status" value={form.netMeteringStatus} onChange={set('netMeteringStatus')} />
          </FormSection>

          <FormSection header="Site & dates">
            <TextField label="Installation address" value={form.installationAddress} onChange={set('installationAddress')} multiline />
            <View style={{ flexDirection: 'row' }}>
              <View style={{ flex: 1 }}><TextField label="City" kind="name" value={form.city} onChange={set('city')} /></View>
              <View style={{ width: 120 }}><TextField label="Pincode" kind="number" maxLength={6} value={form.pincode} onChange={set('pincode')} error={errors.pincode} /></View>
            </View>
            <TextField label="State" kind="name" value={form.state} onChange={set('state')} />
            <DateField label="Booking date" value={form.bookingDate} onChange={set('bookingDate')} />
            <DateField label="Start date" value={form.startDate} onChange={set('startDate')} />
          </FormSection>

          <FormSection header="Deal" footer="Final deal value is deal amount minus discount plus GST.">
            <TextField label="Deal amount" kind="money" value={form.dealAmount} onChange={set('dealAmount')} required error={errors.dealAmount} />
            <TextField label="Discount" kind="money" value={form.discount} onChange={set('discount')} />
            <TextField label="GST amount" kind="money" value={form.taxGst} onChange={set('taxGst')} />
            <TextField label="Booked profit" kind="money" value={form.bookedProfit} onChange={set('bookedProfit')} hint="Expected profit captured when the deal is booked." />
          </FormSection>

          <FormSection header="Notes">
            <TextField label="Project notes" value={form.notes} onChange={set('notes')} multiline />
            <TextField label="Internal remarks" value={form.internalRemarks} onChange={set('internalRemarks')} multiline hint="Only permitted staff can see internal remarks." />
          </FormSection>
          <Button title={editing ? 'Save changes' : 'Create project'} loading={saving} onPress={save} full />
        </>
      )}
    </Screen>
  );
}
