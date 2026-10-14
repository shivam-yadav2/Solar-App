import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../src/lib/api';
import { Card, ChoiceField, ErrorState, FormField, Loading, PrimaryButton, Screen, ToggleField } from '../../src/components/ui';

const arrayKeys = ['paymentMethods', 'panelBrands', 'inverterBrands', 'batteryBrands', 'expenseCategories', 'complaintCategories', 'documentCategories'];
const defaultGstSettings = { enabled: true, registrationType: 'Regular', stateCode: '', defaultHsnSacCode: '85414011', defaultTaxRate: 5, priceIncludesTax: true, invoicePrefix: 'INV' };

export default function SettingsFormScreen() {
  const router = useRouter();
  const [form, setForm] = useState<any>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getSettings()
      .then(({ settings }) => setForm({
        ...settings,
        gstSettings: settings.gstSettings || defaultGstSettings,
        warrantyExpiryAlertDays: String(settings.warrantyExpiryAlertDays),
        ...Object.fromEntries(arrayKeys.map(key => [key, (settings as any)[key]?.join(', ') || ''])),
      }))
      .catch(e => setError(e.message));
  }, []);

  const set = (key: string) => (value: string) => setForm((current: any) => ({ ...current, [key]: value }));
  const setGst = (key: string, value: string | boolean | number) => setForm((current: any) => ({ ...current, gstSettings: { ...current.gstSettings, [key]: value } }));

  const save = async () => {
    setSaving(true);
    try {
      const payload: any = {
        ...form,
        warrantyExpiryAlertDays: Number(form.warrantyExpiryAlertDays),
        gstSettings: {
          ...form.gstSettings,
          stateCode: String(form.gstSettings.stateCode || '').replace(/\D/g, '').slice(0, 2),
          defaultTaxRate: Number(form.gstSettings.defaultTaxRate) || 0,
          invoicePrefix: String(form.gstSettings.invoicePrefix || 'INV').toUpperCase(),
        },
      };
      arrayKeys.forEach(key => { payload[key] = String(form[key] || '').split(',').map((value: string) => value.trim()).filter(Boolean); });
      await api.updateSettings(payload);
      router.back();
    } catch (e: any) {
      Alert.alert('Could not update settings', e.message);
    } finally {
      setSaving(false);
    }
  };

  return <Screen title="Edit Settings" subtitle="Company profile, GST and operating defaults" onBack={() => router.back()}>{error ? <ErrorState message={error} /> : !form ? <Loading /> : <>
    <Card>
      <FormField label="Company name" value={form.companyName} onChangeText={set('companyName')} required />
      <FormField label="Tagline" value={form.tagline} onChangeText={set('tagline')} />
      <FormField label="Phone" value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" />
      <FormField label="Email" value={form.email} onChangeText={set('email')} keyboardType="email-address" />
      <FormField label="Website" value={form.website} onChangeText={set('website')} />
      <FormField label="Address" value={form.address} onChangeText={set('address')} multiline />
      <FormField label="City" value={form.city} onChangeText={set('city')} />
      <FormField label="State" value={form.state} onChangeText={set('state')} />
      <FormField label="Pincode" value={form.pincode} onChangeText={set('pincode')} keyboardType="numeric" />
      <FormField label="GST number" value={form.gstNumber} onChangeText={set('gstNumber')} />
      <FormField label="Warranty alert days" value={form.warrantyExpiryAlertDays} onChangeText={set('warrantyExpiryAlertDays')} keyboardType="numeric" />
    </Card>
    <Card>
      <ToggleField label="Enable GST invoicing" description="Apply these rules while creating invoices." value={Boolean(form.gstSettings.enabled)} onValueChange={(value) => setGst('enabled', value)} />
      <ChoiceField label="Registration type" value={form.gstSettings.registrationType} options={['Regular', 'Composition', 'Unregistered']} onChange={(value) => setGst('registrationType', value)} />
      <FormField label="GST state code" value={String(form.gstSettings.stateCode || '')} onChangeText={(value) => setGst('stateCode', value)} placeholder="09" keyboardType="numeric" />
      <FormField label="Default HSN / SAC" value={form.gstSettings.defaultHsnSacCode} onChangeText={(value) => setGst('defaultHsnSacCode', value)} placeholder="85414011" />
      <FormField label="Default GST rate (%)" value={String(form.gstSettings.defaultTaxRate ?? '')} onChangeText={(value) => setGst('defaultTaxRate', value)} keyboardType="numeric" />
      <FormField label="Invoice prefix" value={form.gstSettings.invoicePrefix} onChangeText={(value) => setGst('invoicePrefix', value)} placeholder="INV" />
      <ToggleField label="Prices include GST" description="Turn this off when GST should be added above the entered invoice value." value={Boolean(form.gstSettings.priceIncludesTax)} onValueChange={(value) => setGst('priceIncludesTax', value)} />
    </Card>
    <Card>
      <FormField label="Payment methods (comma separated)" value={form.paymentMethods} onChangeText={set('paymentMethods')} multiline />
      <FormField label="Panel brands" value={form.panelBrands} onChangeText={set('panelBrands')} multiline />
      <FormField label="Inverter brands" value={form.inverterBrands} onChangeText={set('inverterBrands')} multiline />
      <FormField label="Battery brands" value={form.batteryBrands} onChangeText={set('batteryBrands')} multiline />
      <FormField label="Expense categories" value={form.expenseCategories} onChangeText={set('expenseCategories')} multiline />
    </Card>
    <PrimaryButton label={saving ? 'Saving…' : 'Save Settings'} onPress={() => void save()} disabled={saving} />
  </>}</Screen>;
}
