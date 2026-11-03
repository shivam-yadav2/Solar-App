import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Button, DateField, FormSection, GUTTER, SelectField, Sheet, space, T, TextField, haptic, type PickerOption } from '../ds';

export type SheetField =
  | { key: string; label: string; type?: 'text' | 'money' | 'number'; multiline?: boolean; placeholder?: string; required?: boolean }
  | { key: string; label: string; type: 'date'; required?: boolean; maxToday?: boolean }
  | { key: string; label: string; type: 'select'; options?: PickerOption[]; load?: (q: string) => Promise<PickerOption[]>; queryKey?: string; required?: boolean };

/**
 * A short form in a bottom sheet (reason for a refund, a new date, which project…).
 * `onSubmit` returns nothing on success, or throws (its message is shown).
 */
export function FormSheet({ visible, title, fields, initial, note, submit, destructive, onClose, onSubmit }: {
  visible: boolean; title: string; fields: SheetField[]; initial?: Record<string, string>; note?: string; submit: string; destructive?: boolean;
  onClose: () => void; onSubmit: (values: Record<string, string>) => Promise<void>;
}) {
  const [v, setV] = useState<Record<string, string>>({});
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (visible) { setV(initial || {}); setLabels({}); setError(''); } }, [visible]);
  const go = async () => {
    const missing = fields.find((f) => f.required && !String(v[f.key] || '').trim());
    if (missing) { setError(`${missing.label} is needed.`); haptic.error(); return; }
    setBusy(true);
    try { await onSubmit(v); haptic.success(); } catch (e: any) { setError(e.message || 'Could not save.'); haptic.error(); } finally { setBusy(false); }
  };
  return (
    <Sheet visible={visible} onClose={onClose} title={title} footer={<Button title={submit} kind={destructive ? 'destructive' : 'filled'} loading={busy} onPress={go} style={{ flex: 1 }} />}>
      <View style={{ paddingHorizontal: GUTTER, gap: space.m }}>
        <FormSection footer={note}>
          {fields.map((f) => {
            const set = (x: string) => setV((s) => ({ ...s, [f.key]: x }));
            if (f.type === 'date') return <DateField key={f.key} label={f.label} value={v[f.key]} onChange={set} required={f.required} maximumDate={f.maxToday ? new Date() : undefined} />;
            if (f.type === 'select') return <SelectField key={f.key} label={f.label} value={v[f.key]} display={labels[f.key]} options={f.options} load={f.load} queryKey={f.queryKey} required={f.required}
              onChange={(o) => { set(o?.value || ''); setLabels((s) => ({ ...s, [f.key]: o?.label || '' })); }} />;
            return <TextField key={f.key} label={f.label} kind={f.type === 'money' ? 'money' : f.type === 'number' ? 'number' : undefined} value={v[f.key] || ''} onChange={set} multiline={f.multiline} placeholder={f.placeholder} required={f.required} />;
          })}
        </FormSection>
        {error ? <T variant="footnote" color="red">{error}</T> : null}
      </View>
    </Sheet>
  );
}
