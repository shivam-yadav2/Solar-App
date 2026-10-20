import React, { useState } from 'react';
import { Platform, TextInput, TextInputProps, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { ChevronDown, CalendarDays } from 'lucide-react-native';
import { space, type, useTheme } from './theme';
/** Browsers draw a focus ring around inputs; iOS/Android don't. */
const noOutline = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null;
import { Button, T, Tap } from './primitives';
import { Segmented, Switch } from './controls';
import { Picker, PickerOption, Sheet } from './sheet';

export { Section as FormSection } from './list';

type Kind = 'text' | 'number' | 'decimal' | 'money' | 'phone' | 'email' | 'password' | 'name';

const kb: Record<Kind, Partial<TextInputProps>> = {
  text: { autoCapitalize: 'sentences' },
  name: { autoCapitalize: 'words', textContentType: 'name' },
  number: { keyboardType: 'number-pad' },
  decimal: { keyboardType: 'decimal-pad' },
  money: { keyboardType: 'decimal-pad' },
  phone: { keyboardType: 'phone-pad', textContentType: 'telephoneNumber', autoComplete: 'tel' },
  email: { keyboardType: 'email-address', autoCapitalize: 'none', autoCorrect: false, textContentType: 'emailAddress', autoComplete: 'email' },
  password: { secureTextEntry: true, autoCapitalize: 'none', autoCorrect: false, textContentType: 'password' },
};

const Label: React.FC<{ label: string; required?: boolean }> = ({ label, required }) => (
  <T variant="footnote" color="secondary">{label}{required ? ' *' : ''}</T>
);

const Help: React.FC<{ error?: string; hint?: string }> = ({ error, hint }) =>
  error ? <T variant="caption" color="red" style={{ marginTop: 2 }}>{error}</T> : hint ? <T variant="caption" color="secondary" style={{ marginTop: 2 }}>{hint}</T> : null;

/** Stacked label + input inside a grouped section. */
export const TextField: React.FC<{
  label: string; value: string; onChange: (v: string) => void; kind?: Kind; placeholder?: string; multiline?: boolean;
  required?: boolean; error?: string; hint?: string; autoFocus?: boolean; editable?: boolean; maxLength?: number; onSubmit?: () => void;
}> = ({ label, value, onChange, kind = 'text', placeholder, multiline, required, error, hint, autoFocus, editable = true, maxLength, onSubmit }) => {
  const p = useTheme();
  return (
    <View style={{ paddingHorizontal: space.l, paddingVertical: 10, gap: 3 }}>
      <Label label={label} required={required} />
      <View style={{ flexDirection: 'row', alignItems: multiline ? 'flex-start' : 'center' }}>
        {kind === 'money' ? <T variant="body" color="secondary" style={{ marginRight: 2 }}>₹</T> : null}
        <TextInput
          {...kb[kind]}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={p.tertiary}
          multiline={multiline}
          autoFocus={autoFocus}
          editable={editable}
          maxLength={maxLength}
          onSubmitEditing={onSubmit}
          style={[type.body, { flex: 1, color: editable ? p.label : p.secondary, paddingVertical: 2, minHeight: multiline ? 72 : 24, textAlignVertical: multiline ? 'top' : 'center' }, noOutline]}
        />
      </View>
      <Help error={error} hint={hint} />
    </View>
  );
};

/** Tappable value that opens a Picker (fixed options or server search). */
export const SelectField: React.FC<{
  label: string; value?: string; display?: string; onChange: (o: PickerOption | null) => void; options?: PickerOption[];
  load?: (q: string) => Promise<PickerOption[]>; queryKey?: string; placeholder?: string; required?: boolean; error?: string; hint?: string; allowClear?: boolean; disabled?: boolean;
}> = ({ label, value, display, onChange, options, load, queryKey, placeholder = 'Choose', required, error, hint, allowClear, disabled }) => {
  const p = useTheme();
  const [open, setOpen] = useState(false);
  const shown = display || options?.find((o) => o.value === value)?.label || '';
  return (
    <>
      <Tap onPress={disabled ? undefined : () => setOpen(true)} scaleTo={0.99} style={{ paddingHorizontal: space.l, paddingVertical: 10, gap: 3, opacity: disabled ? 0.5 : 1 }}>
        <Label label={label} required={required} />
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <T variant="body" color={shown ? 'label' : 'tertiary'} style={{ flex: 1 }} numberOfLines={1}>{shown || placeholder}</T>
          <ChevronDown size={18} color={p.tertiary} />
        </View>
        <Help error={error} hint={hint} />
      </Tap>
      <Picker visible={open} onClose={() => setOpen(false)} title={label} value={value} options={options} load={load} queryKey={queryKey} onSelect={onChange} allowClear={allowClear} />
    </>
  );
};

const toISODate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fromISO = (v?: string) => { const d = v ? new Date(v.length === 10 ? `${v}T00:00:00` : v) : new Date(); return Number.isNaN(d.getTime()) ? new Date() : d; };
const pretty = (v?: string) => (v ? fromISO(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

/** Date (YYYY-MM-DD). Android: native dialog; iOS: inline calendar in a sheet; web: typed. */
export const DateField: React.FC<{ label: string; value?: string; onChange: (v: string) => void; required?: boolean; error?: string; hint?: string; minimumDate?: Date; maximumDate?: Date; placeholder?: string }> = ({ label, value, onChange, required, error, hint, minimumDate, maximumDate, placeholder = 'Choose a date' }) => {
  const p = useTheme();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(fromISO(value));
  if (Platform.OS === 'web') {
    return <TextField label={label} value={value || ''} onChange={onChange} placeholder="YYYY-MM-DD" required={required} error={error} hint={hint} />;
  }
  const openPicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({ value: fromISO(value), mode: 'date', minimumDate, maximumDate, onChange: (e, d) => { if (e.type === 'set' && d) onChange(toISODate(d)); } });
    } else {
      setDraft(fromISO(value));
      setOpen(true);
    }
  };
  return (
    <>
      <Tap onPress={openPicker} scaleTo={0.99} style={{ paddingHorizontal: space.l, paddingVertical: 10, gap: 3 }}>
        <Label label={label} required={required} />
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <T variant="body" color={value ? 'label' : 'tertiary'} style={{ flex: 1 }}>{pretty(value) || placeholder}</T>
          <CalendarDays size={18} color={p.tertiary} />
        </View>
        <Help error={error} hint={hint} />
      </Tap>
      {Platform.OS === 'ios' ? (
        <Sheet visible={open} onClose={() => setOpen(false)} title={label} footer={<Button title="Done" full onPress={() => { onChange(toISODate(draft)); setOpen(false); }} style={{ flex: 1 }} />}>
          <DateTimePicker value={draft} mode="date" display="inline" accentColor={p.accent} minimumDate={minimumDate} maximumDate={maximumDate} onChange={(_, d) => d && setDraft(d)} />
        </Sheet>
      ) : null}
    </>
  );
};

export const ToggleField: React.FC<{ label: string; value: boolean; onChange: (v: boolean) => void; hint?: string; disabled?: boolean }> = ({ label, value, onChange, hint, disabled }) => (
  <View style={{ paddingHorizontal: space.l, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: space.m }}>
    <View style={{ flex: 1 }}>
      <T variant="body">{label}</T>
      {hint ? <T variant="footnote" color="secondary">{hint}</T> : null}
    </View>
    <Switch value={value} onChange={onChange} disabled={disabled} />
  </View>
);

export function ChoiceField<V extends string>({ label, value, options, onChange }: { label: string; value: V; options: { value: V; label: string }[]; onChange: (v: V) => void }) {
  return (
    <View style={{ paddingHorizontal: space.l, paddingVertical: 10, gap: 8 }}>
      <Label label={label} />
      <Segmented value={value} options={options} onChange={onChange} />
    </View>
  );
}

/** Number parsing for form strings ("1,20,000" → 120000). */
export const num = (v: string | number | undefined | null) => {
  const n = typeof v === 'number' ? v : Number(String(v ?? '').replace(/[,₹\s]/g, ''));
  return Number.isFinite(n) ? n : 0;
};
export const todayISO = () => toISODate(new Date());
