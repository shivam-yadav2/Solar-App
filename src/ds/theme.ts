import { Platform, TextStyle, useColorScheme } from 'react-native';

/**
 * SolarOS design tokens — modelled on Apple's Human Interface Guidelines:
 * grouped system backgrounds, label hierarchy by opacity, one accent (amber),
 * semantic status colours, an 8-pt spacing grid and the iOS type ramp.
 * Every component reads colours through useTheme() so dark mode is a palette
 * swap, not a second set of screens.
 */

export interface Palette {
  dark: boolean;
  /** Screen background behind grouped sections. */
  bg: string;
  /** Cards, list sections, sheets. */
  surface: string;
  /** Inputs, segmented controls and fills on a surface. */
  fill: string;
  fillStrong: string;
  separator: string;
  label: string;
  secondary: string;
  tertiary: string;
  quaternary: string;
  accent: string;
  /** Accent for text/icons on white (meets contrast). */
  accentText: string;
  accentSoft: string;
  onAccent: string;
  green: string;
  greenSoft: string;
  red: string;
  redSoft: string;
  orange: string;
  orangeSoft: string;
  blue: string;
  blueSoft: string;
  purple: string;
  purpleSoft: string;
  teal: string;
  tealSoft: string;
  gray: string;
  graySoft: string;
  shadow: string;
  overlay: string;
  chrome: string;
}

const light: Palette = {
  dark: false,
  bg: '#F2F2F7',
  surface: '#FFFFFF',
  fill: 'rgba(118,118,128,0.12)',
  fillStrong: 'rgba(118,118,128,0.2)',
  separator: 'rgba(60,60,67,0.16)',
  label: '#0B0B0F',
  secondary: 'rgba(60,60,67,0.64)',
  tertiary: 'rgba(60,60,67,0.36)',
  quaternary: 'rgba(60,60,67,0.18)',
  accent: '#F59E0B',
  accentText: '#B45309',
  accentSoft: 'rgba(245,158,11,0.14)',
  onAccent: '#1A1203',
  green: '#1F9D4C',
  greenSoft: 'rgba(52,199,89,0.14)',
  red: '#D70015',
  redSoft: 'rgba(255,59,48,0.12)',
  orange: '#C2410C',
  orangeSoft: 'rgba(255,149,0,0.14)',
  blue: '#0063D1',
  blueSoft: 'rgba(10,132,255,0.12)',
  purple: '#7E3BD4',
  purpleSoft: 'rgba(175,82,222,0.12)',
  teal: '#0E7C86',
  tealSoft: 'rgba(48,176,199,0.14)',
  gray: '#636366',
  graySoft: 'rgba(142,142,147,0.16)',
  shadow: '#0B1020',
  overlay: 'rgba(0,0,0,0.32)',
  chrome: 'rgba(249,249,251,0.86)',
};

const dark: Palette = {
  dark: true,
  bg: '#000000',
  surface: '#1C1C1E',
  fill: 'rgba(118,118,128,0.24)',
  fillStrong: 'rgba(118,118,128,0.36)',
  separator: 'rgba(84,84,88,0.6)',
  label: '#FFFFFF',
  secondary: 'rgba(235,235,245,0.62)',
  tertiary: 'rgba(235,235,245,0.32)',
  quaternary: 'rgba(235,235,245,0.18)',
  accent: '#FFB224',
  accentText: '#FFC14D',
  accentSoft: 'rgba(255,178,36,0.18)',
  onAccent: '#1A1203',
  green: '#30D158',
  greenSoft: 'rgba(48,209,88,0.18)',
  red: '#FF6961',
  redSoft: 'rgba(255,69,58,0.2)',
  orange: '#FF9F0A',
  orangeSoft: 'rgba(255,159,10,0.2)',
  blue: '#409CFF',
  blueSoft: 'rgba(10,132,255,0.22)',
  purple: '#DA8FFF',
  purpleSoft: 'rgba(191,90,242,0.22)',
  teal: '#5DE6FF',
  tealSoft: 'rgba(100,210,255,0.2)',
  gray: '#AEAEB2',
  graySoft: 'rgba(142,142,147,0.24)',
  shadow: '#000000',
  overlay: 'rgba(0,0,0,0.55)',
  chrome: 'rgba(22,22,24,0.82)',
};

export const space = { xxs: 2, xs: 4, s: 8, m: 12, l: 16, xl: 20, xxl: 24, xxxl: 32, huge: 44 } as const;
/** Smooth, soft-cornered geometry: s/m for controls and tiles, l/xl for cards, xxl for hero surfaces and sheet tops. */
export const radius = { s: 10, m: 14, l: 20, xl: 28, xxl: 34, pill: 999 } as const;
/** Screen side margin (iOS inset-grouped lists use 16–20). */
export const GUTTER = 16;
export const HIT = 44;

const font = Platform.select({ ios: 'System', android: undefined, default: undefined });

/** iOS text styles (size / line height / weight / tracking). */
export const type = {
  /** Hero numerals only (home-screen balance/total figures) — not for headings. */
  display: { fontSize: 44, lineHeight: 50, fontWeight: '800', letterSpacing: 0.3 },
  largeTitle: { fontSize: 34, lineHeight: 41, fontWeight: '700', letterSpacing: 0.37 },
  title1: { fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: 0.36 },
  title2: { fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: 0.35 },
  title3: { fontSize: 20, lineHeight: 25, fontWeight: '600', letterSpacing: 0.38 },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600', letterSpacing: -0.41 },
  body: { fontSize: 17, lineHeight: 22, fontWeight: '400', letterSpacing: -0.41 },
  callout: { fontSize: 16, lineHeight: 21, fontWeight: '400', letterSpacing: -0.32 },
  subhead: { fontSize: 15, lineHeight: 20, fontWeight: '400', letterSpacing: -0.24 },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: '400', letterSpacing: -0.08 },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '400', letterSpacing: 0 },
  caption2: { fontSize: 11, lineHeight: 13, fontWeight: '400', letterSpacing: 0.07 },
} satisfies Record<string, TextStyle>;
export type TypeVariant = keyof typeof type;
export const fontFamily = font;

export type Tone = 'accent' | 'green' | 'red' | 'orange' | 'blue' | 'purple' | 'teal' | 'gray';
export const toneColors = (p: Palette, tone: Tone) => ({
  fg: tone === 'accent' ? p.accentText : p[tone],
  bg: tone === 'accent' ? p.accentSoft : p[`${tone}Soft` as const],
});

export function useTheme(): Palette {
  return useColorScheme() === 'dark' ? dark : light;
}

/** Soft, diffused elevation — the large radius + soft shadow pairing reads as "smooth." */
export const elevation = (p: Palette, level: 1 | 2 | 3 = 1) => ({
  shadowColor: p.shadow,
  shadowOpacity: p.dark ? [0, 0.22, 0.3, 0.4][level] : [0, 0.07, 0.11, 0.18][level],
  shadowRadius: [0, 12, 22, 36][level],
  shadowOffset: { width: 0, height: [0, 3, 8, 16][level] },
  elevation: p.dark ? [0, 2, 4, 10][level] : [0, 1, 3, 8][level],
});

/** Status text → tone (used by every list badge). */
export function statusTone(status?: string): Tone {
  const s = (status || '').toLowerCase();
  if (/(paid|won|completed|commission|active|approved|resolved|installed|closed|success|delivered|enabled|valid|done)/.test(s)) return 'green';
  if (/(overdue|lost|cancel|reject|failed|expired|locked|suspended|void|error|refund|critical|high)/.test(s)) return 'red';
  if (/(pending|due|partial|draft|grace|warning|hold|review|waiting|medium|trial|read)/.test(s)) return 'orange';
  if (/(progress|open|sent|new|installation|survey|design|quoted|scheduled|assigned|planning|booked|material|dispatched|planned|contacted|survey|proposal|negotiation|viewed)/.test(s)) return 'blue';
  return 'gray';
}
