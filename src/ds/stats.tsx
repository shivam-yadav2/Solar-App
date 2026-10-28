import React, { useEffect, useRef, useState } from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSpring, withTiming, Easing } from 'react-native-reanimated';
import { radius, space, Tone, toneColors, useTheme, elevation } from './theme';
import { T, Tap } from './primitives';

/** Counts up to `value` once (dashboard numbers). */
export function useCountUp(value: number, ms = 700): number {
  const reduceMotion = useReducedMotion();
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    if (reduceMotion) { setShown(value); from.current = value; return; }
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
  }, [value, ms, reduceMotion]);
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
  label: string; value: number; money?: boolean; format?: (value: number) => string; suffix?: string; hint?: string; icon?: React.ReactNode; tone?: Tone; onPress?: () => void; style?: StyleProp<ViewStyle>;
}> = ({ label, value, money, format, suffix, hint, icon, tone = 'accent', onPress, style }) => {
  const p = useTheme();
  const v = useCountUp(Number(value) || 0);
  const c = toneColors(p, tone);
  const text = format ? format(v) : money ? compactINR(v) : `${Math.round(v).toLocaleString('en-IN')}${suffix || ''}`;
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
  return <View style={{ flex: 1 }}>{onPress ? <Tap onPress={onPress} accessibilityRole="button" accessibilityLabel={[label, text, hint].filter(Boolean).join(', ')}>{body}</Tap> : body}</View>;
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
  const reduceMotion = useReducedMotion();
  const w = useSharedValue(0);
  useEffect(() => { const next = Math.max(0, Math.min(1, value || 0)); w.value = reduceMotion ? next : withTiming(next, { duration: 700, easing: Easing.out(Easing.cubic) }); }, [value, reduceMotion, w]);
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
        {data.map((d, i) => <Bar key={d.label + i} i={i} ratio={(d.value || 0) / max} height={height} color={sel === null || sel === i ? (tone === 'accent' ? p.accent : c.fg) : p.fillStrong} label={`${d.label}, ${format(d.value)}`} onPress={() => setSel(sel === i ? null : i)} />)}
      </View>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {data.map((d, i) => <T key={d.label + i} variant="caption2" color="secondary" align="center" style={{ flex: 1 }} numberOfLines={1}>{d.label}</T>)}
      </View>
    </View>
  );
};
const Bar: React.FC<{ i: number; ratio: number; height: number; color: string; label: string; onPress: () => void }> = ({ i, ratio, height, color, label, onPress }) => {
  const reduceMotion = useReducedMotion();
  const h = useSharedValue(0);
  useEffect(() => { const next = Math.max(3, ratio * height); h.value = reduceMotion ? next : withDelay(i * 40, withSpring(next, { damping: 18, stiffness: 160 })); }, [ratio, height, i, reduceMotion, h]);
  const a = useAnimatedStyle(() => ({ height: h.value }));
  return (
    <Tap onPress={onPress} scaleTo={0.94} accessibilityRole="button" accessibilityLabel={label} style={{ flex: 1, height, justifyContent: 'flex-end' }} hitSlop={4}>
      <Animated.View style={[{ borderRadius: 5, backgroundColor: color }, a]} />
    </Tap>
  );
};

/** Two-series monthly comparison used for revenue/cost and similar business charts. */
export const ComparisonBarChart: React.FC<{
  data: { label: string; primary: number; secondary: number }[];
  primaryLabel: string;
  secondaryLabel: string;
  primaryTone?: Tone;
  height?: number;
  format?: (n: number) => string;
}> = ({ data, primaryLabel, secondaryLabel, primaryTone = 'accent', height = 132, format = compactINR }) => {
  const p = useTheme();
  const c = toneColors(p, primaryTone);
  const max = Math.max(1, ...data.flatMap((d) => [d.primary || 0, d.secondary || 0]));
  const [sel, setSel] = useState<number | null>(null);
  return (
    <View style={{ gap: space.s }} accessibilityRole="summary">
      <View style={{ flexDirection: 'row', gap: space.l, flexWrap: 'wrap' }}>
        <Legend color={primaryTone === 'accent' ? p.accent : c.fg} label={primaryLabel} />
        <Legend color={p.gray} label={secondaryLabel} />
      </View>
      <T variant="footnote" color="secondary" num style={{ minHeight: 18 }}>
        {sel === null ? 'Tap a month for exact values' : `${data[sel].label}: ${primaryLabel} ${format(data[sel].primary)} · ${secondaryLabel} ${format(data[sel].secondary)}`}
      </T>
      <View style={{ height, flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
        {data.map((d, i) => (
          <Tap key={`${d.label}-${i}`} onPress={() => setSel(sel === i ? null : i)} accessibilityRole="button" accessibilityLabel={`${d.label}, ${primaryLabel} ${format(d.primary)}, ${secondaryLabel} ${format(d.secondary)}`} style={{ flex: 1, height, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 3 }}>
            <StaticBar ratio={d.primary / max} height={height} color={sel === null || sel === i ? (primaryTone === 'accent' ? p.accent : c.fg) : p.fillStrong} />
            <StaticBar ratio={d.secondary / max} height={height} color={sel === null || sel === i ? p.gray : p.fillStrong} />
          </Tap>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>{data.map((d, i) => <T key={`${d.label}-${i}`} variant="caption2" color="secondary" align="center" style={{ flex: 1 }} numberOfLines={1}>{d.label}</T>)}</View>
    </View>
  );
};

const Legend = ({ color, label }: { color: string; label: string }) => <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: color }} /><T variant="caption" color="secondary">{label}</T></View>;

const StaticBar = ({ ratio, height, color }: { ratio: number; height: number; color: string }) => <View style={{ width: '34%', maxWidth: 18, minHeight: 3, height: Math.max(3, Math.min(1, ratio || 0) * height), borderTopLeftRadius: 5, borderTopRightRadius: 5, backgroundColor: color }} />;

/** Compact labelled distribution with values that remains legible at large text sizes. */
export const DistributionBars: React.FC<{ data: { label: string; value: number; suffix?: string }[]; tone?: Tone; empty?: string }> = ({ data, tone = 'blue', empty = 'No data yet' }) => {
  const p = useTheme();
  const c = toneColors(p, tone);
  const max = Math.max(1, ...data.map((d) => Number(d.value) || 0));
  if (!data.length) return <T variant="footnote" color="secondary">{empty}</T>;
  return <View style={{ gap: space.m }}>{data.map((d) => <View key={d.label} accessibilityLabel={`${d.label}, ${d.value}${d.suffix || ''}`}><View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.m, marginBottom: 5 }}><T variant="footnote" color="secondary" numberOfLines={1} style={{ flex: 1 }}>{d.label}</T><T variant="footnote" weight="600" num>{d.value}{d.suffix || ''}</T></View><View style={{ height: 6, borderRadius: 6, backgroundColor: p.fill, overflow: 'hidden' }}><View style={{ height: 6, width: `${Math.max(3, (Number(d.value) / max) * 100)}%`, borderRadius: 6, backgroundColor: tone === 'accent' ? p.accent : c.fg }} /></View></View>)}</View>;
};

/** Big amount with a caption (detail headers: balance due, total paid). */
export const Hero: React.FC<{ label: string; value: string; caption?: string; tone?: 'label' | 'green' | 'red' | 'accent' }> = ({ label, value, caption, tone = 'label' }) => (
  <View style={{ alignItems: 'center', paddingVertical: space.m, gap: 2 }}>
    <T variant="footnote" color="secondary" weight="500">{label}</T>
    <T variant="largeTitle" num color={tone === 'label' ? 'label' : tone}>{value}</T>
    {caption ? <T variant="footnote" color="secondary" align="center">{caption}</T> : null}
  </View>
);
