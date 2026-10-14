import React from 'react';
import { useRouter } from 'expo-router';
import { api } from '../../src/lib/api';
import { useFetch } from '../../src/hooks/useFetch';
import { Card, DetailRow, ErrorState, HeaderButton, Loading, Screen } from '../../src/components/ui';

export default function SettingsScreen() {
  const router = useRouter(); const state = useFetch(() => api.getSettings()); const item = state.data?.settings;
  return <Screen title="Settings" subtitle="Company profile and defaults" onBack={() => router.back()} action={<HeaderButton label="Edit" onPress={() => router.push('/settings-form')} />} refreshing={state.isRefreshing} onRefresh={state.refresh}>
    {state.isLoading ? <Loading /> : state.error ? <ErrorState message={state.error} onRetry={state.reload} /> : item ? <>
      <Card><DetailRow label="Company" value={item.companyName} /><DetailRow label="Tagline" value={item.tagline} /><DetailRow label="Email" value={item.email} /><DetailRow label="Phone" value={item.phone} /><DetailRow label="Website" value={item.website} /></Card>
      <Card><DetailRow label="Address" value={[item.address, item.city, item.state, item.pincode].filter(Boolean).join(', ')} /><DetailRow label="GST Number" value={item.gstNumber} /><DetailRow label="Currency" value={item.defaultCurrency} /><DetailRow label="Warranty alerts" value={`${item.warrantyExpiryAlertDays} days`} /></Card>
      <Card><DetailRow label="GST invoicing" value={item.gstSettings?.enabled ? 'Enabled' : 'Disabled'} /><DetailRow label="Registration" value={item.gstSettings?.registrationType} /><DetailRow label="GST state code" value={item.gstSettings?.stateCode} /><DetailRow label="HSN / SAC" value={item.gstSettings?.defaultHsnSacCode} /><DetailRow label="Default tax rate" value={`${item.gstSettings?.defaultTaxRate ?? 0}%`} /><DetailRow label="Pricing" value={item.gstSettings?.priceIncludesTax ? 'GST inclusive' : 'GST extra'} /><DetailRow label="Invoice prefix" value={item.gstSettings?.invoicePrefix} /></Card>
      <Card><DetailRow label="Payment methods" value={item.paymentMethods?.join(', ')} /><DetailRow label="Panel brands" value={item.panelBrands?.join(', ')} /><DetailRow label="Inverter brands" value={item.inverterBrands?.join(', ')} /></Card>
    </> : null}
  </Screen>;
}
