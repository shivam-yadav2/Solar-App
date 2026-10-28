import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { radius, space, useTheme } from './theme';
import { T, Tap } from './primitives';

/** Inset-grouped section (iOS Settings): optional header/footer, rounded surface, inset separators. */
export const Section: React.FC<{ header?: string; footer?: string; right?: React.ReactNode; children: React.ReactNode; style?: StyleProp<ViewStyle> }> = ({ header, footer, right, children, style }) => {
  const p = useTheme();
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={style}>
      {header || right ? (
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: space.l, marginBottom: 6 }}>
          {header ? <T variant="footnote" color="secondary" style={{ textTransform: 'uppercase', letterSpacing: 0.3 }}>{header}</T> : <View />}
          {right}
        </View>
      ) : null}
      <View style={{ backgroundColor: p.surface, borderRadius: radius.m + 2, overflow: 'hidden' }}>
        {items.map((child, i) => (
          <React.Fragment key={i}>
            {child}
            {i < items.length - 1 ? <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: p.separator, marginLeft: React.isValidElement(child) && (child.props as any).icon ? 58 : space.l }} /> : null}
          </React.Fragment>
        ))}
      </View>
      {footer ? <T variant="footnote" color="secondary" style={{ paddingHorizontal: space.l, marginTop: 6 }}>{footer}</T> : null}
    </View>
  );
};

export interface RowProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Right-hand value text (secondary colour). */
  value?: React.ReactNode;
  icon?: React.ReactNode;
  /** Anything on the right (badge, switch, amount). */
  accessory?: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  chevron?: boolean;
  destructive?: boolean;
  /** Title in the accent colour (actions like "Add follow-up"). */
  action?: boolean;
  numberOfLines?: number;
  style?: StyleProp<ViewStyle>;
}

/** One list row. */
export const Row: React.FC<RowProps> = ({ title, subtitle, value, icon, accessory, onPress, onLongPress, chevron, destructive, action, numberOfLines = 1, style }) => {
  const p = useTheme();
  const body = (
    <View style={[{ minHeight: subtitle ? 64 : 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.l, paddingVertical: subtitle ? 10 : 12, gap: space.m }, style]}>
      {icon}
      <View style={{ flex: 1, gap: 2 }}>
        {typeof title === 'string' ? (
          <T variant="body" numberOfLines={numberOfLines} style={destructive ? { color: p.red } : action ? { color: p.accentText } : undefined}>{title}</T>
        ) : title}
        {subtitle ? (typeof subtitle === 'string' ? <T variant="footnote" color="secondary" numberOfLines={2}>{subtitle}</T> : subtitle) : null}
      </View>
      {value !== undefined && value !== null && value !== '' ? (typeof value === 'string' || typeof value === 'number' ? <T variant="body" color="secondary" num numberOfLines={1} style={{ maxWidth: '55%' }}>{value}</T> : value) : null}
      {accessory}
      {chevron ?? !!onPress ? <ChevronRight size={18} color={p.tertiary} strokeWidth={2.4} /> : null}
    </View>
  );
  return onPress || onLongPress ? <Tap onPress={onPress} onLongPress={onLongPress} scaleTo={0.985} haptics accessibilityRole="button" accessibilityLabel={typeof title === 'string' ? [title, typeof subtitle === 'string' ? subtitle : '', typeof value === 'string' || typeof value === 'number' ? String(value) : ''].filter(Boolean).join(', ') : undefined}>{body}</Tap> : body;
};

/** Key / value line for detail screens. */
export const InfoRow: React.FC<{ label: string; value?: React.ReactNode; onPress?: () => void; multiline?: boolean }> = ({ label, value, onPress, multiline }) => {
  const p = useTheme();
  const shown = value === undefined || value === null || value === '' ? '—' : value;
  const body = (
    <View style={{ flexDirection: multiline ? 'column' : 'row', paddingHorizontal: space.l, paddingVertical: 12, gap: multiline ? 4 : space.m, alignItems: multiline ? 'flex-start' : 'center' }}>
      <T variant={multiline ? 'footnote' : 'body'} color="secondary" style={multiline ? undefined : { flexShrink: 0 }}>{label}</T>
      <View style={{ flex: multiline ? undefined : 1, alignItems: multiline ? 'flex-start' : 'flex-end' }}>
        {typeof shown === 'string' || typeof shown === 'number' ? <T variant="body" align={multiline ? 'left' : 'right'} num style={onPress ? { color: p.accentText } : undefined} selectable>{shown}</T> : shown}
      </View>
    </View>
  );
  return onPress ? <Tap onPress={onPress} scaleTo={0.985}>{body}</Tap> : body;
};

/**
 * FlashList rows can't sit inside one <Section>, so each item draws its own
 * slice of the grouped card: rounded top on the first row, bottom on the last,
 * and a separator below every row except the last.
 */
export const GroupedItem: React.FC<{ index: number; count: number; children: React.ReactNode; inset?: number }> = ({ index, count, children, inset = space.l }) => {
  const p = useTheme();
  const first = index === 0, last = index === count - 1;
  return (
    <View style={{ backgroundColor: p.surface, borderTopLeftRadius: first ? radius.m + 2 : 0, borderTopRightRadius: first ? radius.m + 2 : 0, borderBottomLeftRadius: last ? radius.m + 2 : 0, borderBottomRightRadius: last ? radius.m + 2 : 0, overflow: 'hidden' }}>
      {children}
      {!last ? <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: p.separator, marginLeft: inset }} /> : null}
    </View>
  );
};
