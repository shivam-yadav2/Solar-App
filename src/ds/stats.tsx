import React, { useEffect, useRef, useState } from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming, Easing } from 'react-native-reanimated';
import { radius, space, Tone, toneColors, useTheme, elevation } from './theme';
import { T, Tap } from './primitives';

/** Counts up to `value` once (dashboard numbers). */
export function useCountUp(value: number, ms = 700): number {
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const start = Date.now(), a = from.current, b = value;
    let raf = 0;
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / ms);
      const e = 1 - Math.pow(1 - t, 3);
      setShown(a + (b - a) * e);
      if (t < 1) raf = requestAnimationFrame(tick); else from.current = b;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, ms]);
  return shown;
}

const compactINR = (n: number) => {
  const a = Math.abs(n);
  if (a >= 1e7) return `₹${(n / 1e7).toFixed(a >= 1e8 ? 0 : 2)} Cr`;
  if (a >= 1e5) return `₹${(n / 1e5).toFixed(a >= 1e6 ? 1 : 2)} L`;
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
};
export const formatMoneyCompact = compactINR;

/** KPI tile: label, big animated number, optional hint and icon. */
export const StatTile: React.FC<{
  label: string; value: number; money?: boolean; suffix?: string; hint?: string; icon?: React.ReactNode; tone?: Tone; onPress?: () => void; style?: StyleProp<ViewStyle>;
}> = ({ label, value, money, suffix, hint, icon, tone = 'accent', onPress, style }) => {
  const p = useTheme();
  const v = useCountUp(Number(value) || 0);
  const c = toneColors(p, tone);
  const text = money ? compactINR(v) : `${Math.round(v).toLocaleString('en-IN')}${suffix || ''}`;
  const body = (
    <View style={[{ backgroundColor: p.surface, borderRadius: radius.l, padding: space.l, gap: 6, minHeight: 104 }, elevation(p, 1), style]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <T variant="footnote" color="secondary" weight="500" numberOfLines={1} style={{ flex: 1 }}>{label}</T>
        {icon ? <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>{icon}</View> : null}
      </View>
      <T variant="title1" num numberOfLines={1} adjustsFontSizeToFit>{text}</T>
      {hint ? <T variant="caption" color="secondary" numberOfLines={1}>{hint}</T> : null}
    </View>
  );
  return <View style={{ flex: 1 }}>{onPress ? <Tap onPress={onPress}>{body}</Tap> : body}</View>;
};

/** Two tiles per row. */
export const StatGrid: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const items = React.Children.toArray(children).filter(Boolean);
  const rows: React.ReactNode[][] = [];
  items.forEach((c, i) => { if (i % 2 === 0) rows.push([c]); else rows[rows.length - 1].push(c); });
  return (
    <View style={{ gap: space.m }}>
      {rows.map((r, i) => <View key={i} style={{ flexDirection: 'row', gap: space.m }}>{r}{r.length === 1 ? <View style={{ flex: 1 }} /> : null}</View>)}
    </View>
  );
};

/** Animated progress bar (payment collected, project stage…). */
export const Progress: React.FC<{ value: number; tone?: Tone; height?: number }> = ({ value, tone = 'accent', height = 6 }) => {
  const p = useTheme();
  const w = useSharedValue(0);
  useEffect(() => { w.value = withTiming(Math.max(0, Math.min(1, value || 0)), { duration: 700, easing: Easing.out(Easing.cubic) }); }, [value, w]);
  const a = useAnimatedStyle(() => ({ width: `${w.value * 100}%` }));
  const c = toneColors(p, tone);
  return (
    <View style={{ height, borderRadius: height, backgroundColor: p.fill, overflow: 'hidden' }}>
      <Animated.View style={[{ height, borderRadius: height, backgroundColor: tone === 'accent' ? p.accent : c.fg }, a]} />
    </View>
  );
};

/** Simple vertical bars (monthly collections) — bars spring up in sequence. */
export const BarChart: React.FC<{ data: { label: string; value: number }[]; tone?: Tone; height?: number; format?: (n: number) => string }> = ({ data, tone = 'accent', height = 120, format = compactINR }) => {
  const p = useTheme();
  const max = Math.max(1, ...data.map((d) => d.value || 0));
  const [sel, setSel] = useState<number | null>(null);
  const c = toneColors(p, tone);
  return (
    <View style={{ gap: 8 }}>
      <T variant="footnote" color="secondary" num style={{ minHeight: 18 }}>{sel !== null ? `${data[sel].label}: ${format(data[sel].value)}` : `Peak ${format(max)}`}</T>
      <View style={{ height, flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
        {data.map((d, i) => <Bar key={d.label + i} i={i} ratio={(d.value || 0) / max} height={height} color={sel === null || sel === i ? (tone === 'accent' ? p.accent : c.fg) : p.fillStrong} onPress={() => setSel(sel === i ? null : i)} />)}
      </View>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {data.map((d, i) => <T key={d.label + i} variant="caption2" color="secondary" align="center" style={{ flex: 1 }} numberOfLines={1}>{d.label}</T>)}
      </View>
    </View>
  );
};
const Bar: React.FC<{ i: number; ratio: number; height: number; color: string; onPress: () => void }> = ({ i, ratio, height, color, onPress }) => {
  const h = useSharedValue(0);
  useEffect(() => { h.value = withDelay(i * 40, withSpring(Math.max(3, ratio * height), { damping: 18, stiffness: 160 })); }, [ratio, height, i, h]);
  const a = useAnimatedStyle(() => ({ height: h.value }));
  return (
    <Tap onPress={onPress} scaleTo={0.94} style={{ flex: 1, height, justifyContent: 'flex-end' }} hitSlop={4}>
      <Animated.View style={[{ borderRadius: 5, backgroundColor: color }, a]} />
    </Tap>
  );
};

/** Big amount with a caption (detail headers: balance due, total paid). */
export const Hero: React.FC<{ label: string; value: string; caption?: string; tone?: 'label' | 'green' | 'red' | 'accent' }> = ({ label, value, caption, tone = 'label' }) => (
  <View style={{ alignItems: 'center', paddingVertical: space.m, gap: 2 }}>
    <T variant="footnote" color="secondary" weight="500">{label}</T>
    <T variant="largeTitle" num color={tone === 'label' ? 'label' : tone}>{value}</T>
    {caption ? <T variant="footnote" color="secondary" align="center">{caption}</T> : null}
  </View>
);
