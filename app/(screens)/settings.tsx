import React from 'react';
import { useRouter } from 'expo-router';
import { Building2, CreditCard, FileText, KeyRound, LockKeyhole, ReceiptText, RotateCcw, ShieldCheck, SlidersHorizontal, Trash2 } from 'lucide-react-native';
import { api } from '../../src/lib/api';
import { useAuth } from '../../src/context/AuthContext';
import { useFetch } from '../../src/hooks/useFetch';
import { ErrorState, IconTile, InfoRow, Row, Screen, Section, Spinner, useTheme } from '../../src/ds';

export default function SettingsScreen() {
  const router = useRouter();
  const p = useTheme();
  const { hasPermission: can, user } = useAuth();
  const state = useFetch(async () => { const [settings, profile] = await Promise.all([api.getSettings(), api.getCompanyProfile()]); return { settings: settings.settings, profile }; });
  const s = state.data?.settings; const profile = state.data?.profile;
  const go = (path: string) => router.push(path as never);
  return <Screen title="Company settings" subtitle="Brand identity, GST, defaults, security and data controls" back refreshing={state.isRefreshing} onRefresh={state.refresh}>
    {state.isLoading ? <Spinner /> : state.error ? <ErrorState message={state.error} onRetry={state.reload} /> : s && profile ? <>
      <Section header="Company"><Row icon={<IconTile tone="accent" icon={<Building2 size={17} color={p.accentText} />} />} title={profile.name} subtitle={[profile.businessProfile?.legalEntityName, profile.businessProfile?.gstin].filter(Boolean).join(' · ') || 'Complete legal and GST identity'} onPress={() => go('/company-profile')} /><Row icon={<IconTile tone="blue" icon={<ReceiptText size={17} color={p.blue} />} />} title="GST & invoice rules" subtitle={`${s.gstSettings?.enabled ? `${s.gstSettings.defaultTaxRate}% · ${s.gstSettings.registrationType}` : 'GST disabled'} · HSN ${s.gstSettings?.defaultHsnSacCode || 'not set'}`} onPress={() => go('/settings-form')} /><Row icon={<IconTile tone="purple" icon={<SlidersHorizontal size={17} color={p.purple} />} />} title="Quotation defaults" subtitle="Templates, equipment options and standard terms" onPress={() => go('/quotation-settings')} /></Section>
      <Section header="Operating defaults"><InfoRow label="Payment methods" value={s.paymentMethods?.length || 0} /><InfoRow label="Panel brands" value={s.panelBrands?.length || 0} /><InfoRow label="Inverter brands" value={s.inverterBrands?.length || 0} /><InfoRow label="Expense categories" value={s.expenseCategories?.length || 0} /><Row title="Edit lists and alerts" action onPress={() => go('/settings-form')} /></Section>
      <Section header="Security & access"><Row icon={<IconTile tone="green" icon={<ShieldCheck size={17} color={p.green} />} />} title="My security" subtitle="Password, two-factor sign-in and backup codes" onPress={() => go('/account-security')} /><Row icon={<IconTile tone="gray" icon={<LockKeyhole size={17} color={p.secondary} />} />} title="Signed-in devices" subtitle="Review and revoke active sessions" onPress={() => go('/sessions')} />{can('users.manage') ? <Row icon={<IconTile tone="purple" icon={<KeyRound size={17} color={p.purple} />} />} title="Roles & permissions" onPress={() => go('/roles')} /> : null}</Section>
      <Section header="Data & account">{can('customers.delete') ? <Row icon={<IconTile tone="red" icon={<Trash2 size={17} color={p.red} />} />} title="Recycle bin" subtitle="Restore or permanently remove deleted records" onPress={() => go('/recycle-bin')} /> : null}{can('customers.delete') ? <Row icon={<IconTile tone="orange" icon={<RotateCcw size={17} color={p.orange} />} />} title="Privacy requests" subtitle="Data copies and customer erasure" onPress={() => go('/privacy')} /> : null}{user?.role === 'ADMIN' ? <Row icon={<IconTile tone="green" icon={<CreditCard size={17} color={p.green} />} />} title="SolarOS plan & billing" onPress={() => go('/billing')} /> : null}</Section>
    </> : null}
  </Screen>;
}
