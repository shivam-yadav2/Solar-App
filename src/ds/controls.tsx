import React, { useEffect, useState } from 'react';
import { LayoutChangeEvent, Platform, ScrollView, Switch as RNSwitch, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Search, X } from 'lucide-react-native';
import { radius, space, type, useTheme } from './theme';
const noOutline = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null;
import { T, Tap, haptic } from './primitives';

/** iOS search field. `onSearch` fires after typing pauses (debounced) — use it for server search. */
export const SearchBar: React.FC<{ value: string; onChange: (v: string) => void; onSearch?: (v: string) => void; placeholder?: string; autoFocus?: boolean; delay?: number }> = ({ value, onChange, onSearch, placeholder = 'Search', autoFocus, delay = 350 }) => {
  const p = useTheme();
  useEffect(() => {
    if (!onSearch) return;
    const t = setTimeout(() => onSearch(value.trim()), delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: p.fill, borderRadius: radius.s + 2, height: 38, paddingHorizontal: 8, gap: 6 }}>
      <Search size={17} color={p.secondary} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={p.secondary}
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus={autoFocus}
        returnKeyType="search"
        clearButtonMode="never"
        style={[type.body, { flex: 1, color: p.label, paddingVertical: 0 }, noOutline]}
      />
      {value ? (
        <Tap onPress={() => onChange('')} hitSlop={10} accessibilityLabel="Clear search">
          <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: p.tertiary, alignItems: 'center', justifyContent: 'center' }}><X size={12} color={p.surface} strokeWidth={3} /></View>
        </Tap>
      ) : null}
    </View>
  );
};

/** Segmented control with a sliding thumb. */
export function Segmented<V extends string>({ value, options, onChange }: { value: V; options: { value: V; label: string }[]; onChange: (v: V) => void }) {
  const p = useTheme();
  const [w, setW] = useState(0);
  const idx = Math.max(0, options.findIndex((o) => o.value === value));
  const x = useSharedValue(0);
  const seg = w / Math.max(1, options.length);
  useEffect(() => { x.value = withSpring(idx * seg, { damping: 22, stiffness: 260 }); }, [idx, seg, x]);
  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <View onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width - 4)} style={{ flexDirection: 'row', backgroundColor: p.fill, borderRadius: radius.s + 1, padding: 2, height: 34 }}>
      {w > 0 ? <Animated.View style={[{ position: 'absolute', top: 2, left: 2, width: seg, bottom: 2, borderRadius: 7, backgroundColor: p.dark ? '#636366' : '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 }, thumb]} /> : null}
      {options.map((o) => (
        <Tap key={o.value} scaleTo={0.96} onPress={() => { if (o.value !== value) { haptic.tap(); onChange(o.value); } }} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }} accessibilityRole="tab" accessibilityState={{ selected: o.value === value }}>
          <T variant="footnote" weight={o.value === value ? '600' : '500'} numberOfLines={1}>{o.label}</T>
        </Tap>
      ))}
    </View>
  );
}

/** Horizontal filter chips (status filters on lists). */
export function Chips<V extends string>({ value, options, onChange }: { value: V; options: { value: V; label: string; count?: number }[]; onChange: (v: V) => void }) {
  const p = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.s }} style={{ marginHorizontal: -16 }}>
      <View style={{ width: 8 }} />
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Tap key={o.value} scaleTo={0.94} onPress={() => { haptic.tap(); onChange(o.value); }} style={{ height: 32, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: on ? p.label : p.surface, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <T variant="subhead" weight="500" style={{ color: on ? p.bg : p.label }}>{o.label}</T>
            {o.count !== undefined ? <T variant="caption" num style={{ color: on ? p.bg : p.secondary }}>{o.count}</T> : null}
          </Tap>
        );
      })}
      <View style={{ width: 8 }} />
    </ScrollView>
  );
}

export const Switch: React.FC<{ value: boolean; onChange: (v: boolean) => void; disabled?: boolean }> = ({ value, onChange, disabled }) => {
  const p = useTheme();
  return <RNSwitch value={value} disabled={disabled} onValueChange={(v) => { haptic.tap(); onChange(v); }} trackColor={{ false: p.fillStrong, true: p.green }} thumbColor="#FFFFFF" ios_backgroundColor={p.fillStrong} />;
};
