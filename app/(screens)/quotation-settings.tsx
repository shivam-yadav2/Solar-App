import React, { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, Trash2 } from 'lucide-react-native';
import { ops } from '../../src/lib/apis/ops';
import type { QuotationSettings, QuotationTemplateKey } from '../../src/types';
import { Button, ErrorState, FormSection, IconButton, Screen, Segmented, Spinner, T, TextField, useTheme, useUnsavedChanges } from '../../src/ds';

const templates: { value: QuotationTemplateKey; label: string }[] = [
  { value: 'classic', label: 'Classic' }, { value: 'modern', label: 'Modern' },
  { value: 'minimal', label: 'Minimal' }, { value: 'bold', label: 'Dark' },
];
const lines = (value: string[]) => value.join('\n');
const split = (value: string) => value.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);

export default function QuotationSettingsScreen() {
  const router = useRouter();
  const p = useTheme();
  const [draft, setDraft] = useState<QuotationSettings | null>(null);
  const [initial, setInitial] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const dirty = !!draft && JSON.stringify(draft) !== initial;
  const allowLeave = useUnsavedChanges(dirty);
  const load = () => {
    setLoading(true); setError('');
    ops.quotationSettings().then(({ settings }) => { setDraft(settings); setInitial(JSON.stringify(settings)); }).catch((e) => setError(e.message)).finally(() => setLoading(false));
  };
  useEffect(load, []);
  const update = (next: Partial<QuotationSettings>) => setDraft((v) => v ? { ...v, ...next } : v);
  const save = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const { settings } = await ops.saveQuotationSettings(draft);
      setDraft(settings); setInitial(JSON.stringify(settings));
      Alert.alert('Quotation defaults saved', 'New quotations will start with these values. Existing quotations are unchanged.', [{ text: 'Done', onPress: () => { allowLeave(); router.back(); } }]);
    } catch (e: any) { Alert.alert('Could not save settings', e.message); } finally { setSaving(false); }
  };
  return <Screen title="Quotation defaults" subtitle="Templates, standard items, inclusions and commercial terms" back large={false} footer={draft ? <Button title="Save defaults" full loading={saving} disabled={!dirty} onPress={() => void save()} style={{ flex: 1 }} /> : undefined}>
    {loading ? <Spinner /> : error ? <ErrorState message={error} onRetry={load} /> : draft ? <>
      <FormSection header="Document style">
        <View style={{ padding: 16, gap: 8 }}><T variant="footnote" color="secondary">Default template</T><Segmented value={draft.defaultTemplate} options={templates} onChange={(defaultTemplate) => update({ defaultTemplate })} /></View>
        <TextField label="Validity (days)" kind="number" value={String(draft.validityDays)} onChange={(v) => update({ validityDays: Math.max(1, Number(v) || 1) })} />
        <TextField label="Price heading" value={draft.priceLabel} onChange={(priceLabel) => update({ priceLabel })} placeholder="Turnkey project price" />
        <TextField label="Header note" value={draft.headerNote} onChange={(headerNote) => update({ headerNote })} multiline />
      </FormSection>

      <FormSection header="Standard inclusions" footer="One benefit per line. They can still be changed for an individual quotation.">
        <TextField label="Features and inclusions" value={lines(draft.features)} onChange={(v) => update({ features: split(v) })} multiline placeholder={'5-year workmanship warranty\nNet-metering assistance'} />
      </FormSection>

      <View style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 }}><T variant="footnote" color="secondary" style={{ flex: 1, textTransform: 'uppercase' }}>Standard equipment choices</T><IconButton label="Add component" tinted icon={<Plus size={18} color={p.accentText} />} onPress={() => update({ components: [...draft.components, { category: 'New item', options: [], defaultSpec: '' }] })} /></View>
        {draft.components.map((component, index) => <FormSection key={`${index}-${component.category}`} header={`Item ${index + 1}`} right={<IconButton label="Remove item" icon={<Trash2 size={17} color={p.red} />} onPress={() => update({ components: draft.components.filter((_, i) => i !== index) })} />}>
          <TextField label="Category" value={component.category} onChange={(category) => update({ components: draft.components.map((x, i) => i === index ? { ...x, category } : x) })} />
          <TextField label="Available brands / options" value={component.options.join(', ')} onChange={(v) => update({ components: draft.components.map((x, i) => i === index ? { ...x, options: v.split(',').map((z) => z.trim()).filter(Boolean) } : x) })} hint="Comma-separated" />
          <TextField label="Default specification" value={component.defaultSpec} onChange={(defaultSpec) => update({ components: draft.components.map((x, i) => i === index ? { ...x, defaultSpec } : x) })} multiline />
        </FormSection>)}
      </View>

      <FormSection header="Commercial terms">
        <TextField label="Payment terms" value={draft.paymentTerms} onChange={(paymentTerms) => update({ paymentTerms })} multiline />
        <TextField label="Terms and conditions" value={draft.termsConditions} onChange={(termsConditions) => update({ termsConditions })} multiline />
      </FormSection>
      <FormSection header="Prepared by">
        <TextField label="Name" kind="name" value={draft.preparedByName} onChange={(preparedByName) => update({ preparedByName })} />
        <TextField label="Phone" kind="phone" value={draft.preparedByPhone} onChange={(preparedByPhone) => update({ preparedByPhone })} />
        <TextField label="Branch / correspondence address" value={draft.branchAddress} onChange={(branchAddress) => update({ branchAddress })} multiline />
        <TextField label="Signatory title" value={draft.signatoryTitle} onChange={(signatoryTitle) => update({ signatoryTitle })} />
      </FormSection>
    </> : null}
  </Screen>;
}
