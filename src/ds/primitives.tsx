import React, { useEffect } from 'react';
import { ActivityIndicator, Platform, Pressable, PressableProps, StyleProp, Text, TextProps, TextStyle, View, ViewStyle } from 'react-native';
import Animated, { Easing, interpolate, useAnimatedStyle, useSharedValue, withRepeat, withSpring, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { elevation, fontFamily, Palette, radius, space, statusTone, Tone, toneColors, type, TypeVariant, useTheme } from './theme';

// ---------------------------------------------------------------- haptics

export const haptic = {
  tap: () => { if (Platform.OS !== 'web') void Haptics.selectionAsync().catch(() => {}); },
  light: () => { if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); },
  success: () => { if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); },
  warning: () => { if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}); },
  error: () => { if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {}); },
};

// ---------------------------------------------------------------- text

type ColorKey = 'label' | 'secondary' | 'tertiary' | 'accent' | 'green' | 'red' | 'orange' | 'blue' | 'onAccent' | 'white';
export interface TProps extends TextProps {
  variant?: TypeVariant;
  color?: ColorKey;
  weight?: TextStyle['fontWeight'];
  align?: TextStyle['textAlign'];
  /** Tabular figures for money and counts. */
  num?: boolean;
  style?: StyleProp<TextStyle>;
}
export const T: React.FC<TProps> = ({ variant = 'body', color = 'label', weight, align, num, style, ...rest }) => {
  const p = useTheme();
  const c = color === 'white' ? '#fff' : color === 'accent' ? p.accentText : p[color];
  return (
    <Text
      {...rest}
      style={[type[variant], { color: c, fontFamily }, weight ? { fontWeight: weight } : null, align ? { textAlign: align } : null, num ? { fontVariant: ['tabular-nums'] } : null, style]}
    />
  );
};

// ---------------------------------------------------------------- tap with spring

export interface TapProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  /** Scale while pressed (0.97 rows/cards, 0.94 small buttons). */
  scaleTo?: number;
  haptics?: boolean;
  children?: React.ReactNode;
}
const APressable = Animated.createAnimatedComponent(Pressable);
export const Tap: React.FC<TapProps> = ({ style, scaleTo = 0.97, haptics = false, onPressIn, onPressOut, onPress, children, ...rest }) => {
  const pressed = useSharedValue(0);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: interpolate(pressed.value, [0, 1], [1, scaleTo]) }], opacity: interpolate(pressed.value, [0, 1], [1, 0.82]) }));
  return (
    <APressable
      {...rest}
      onPressIn={(e) => { pressed.value = withSpring(1, { damping: 20, stiffness: 420 }); onPressIn?.(e); }}
      onPressOut={(e) => { pressed.value = withSpring(0, { damping: 16, stiffness: 260 }); onPressOut?.(e); }}
      onPress={(e) => { if (haptics) haptic.tap(); onPress?.(e); }}
      style={[style, a]}
    >
      {children}
    </APressable>
  );
};

// ---------------------------------------------------------------- buttons

export type ButtonKind = 'filled' | 'tinted' | 'gray' | 'plain' | 'destructive';
export const Button: React.FC<{
  title: string;
  onPress?: () => void;
  kind?: ButtonKind;
  size?: 'l' | 'm' | 's';
  icon?: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  full?: boolean;
  style?: StyleProp<ViewStyle>;
}> = ({ title, onPress, kind = 'filled', size = 'l', icon, loading, disabled, full, style }) => {
  const p = useTheme();
  const bg = { filled: p.accent, tinted: p.accentSoft, gray: p.fill, plain: 'transparent', destructive: p.redSoft }[kind];
  const fg = { filled: p.onAccent, tinted: p.accentText, gray: p.label, plain: p.accentText, destructive: p.red }[kind];
  const h = { l: 50, m: 40, s: 32 }[size];
  return (
    <Tap
      onPress={disabled || loading ? undefined : () => { haptic.light(); onPress?.(); }}
      scaleTo={0.96}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      style={[{ height: h, minWidth: h, paddingHorizontal: size === 's' ? 12 : 18, borderRadius: size === 'l' ? 14 : radius.pill, backgroundColor: bg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: disabled ? 0.45 : 1, alignSelf: full ? 'stretch' : 'auto' }, style]}
    >
      {loading ? <ActivityIndicator color={fg} /> : icon}
      {!loading || size !== 's' ? <T variant={size === 's' ? 'footnote' : size === 'm' ? 'subhead' : 'headline'} weight="600" style={{ color: fg }}>{title}</T> : null}
    </Tap>
  );
};

/** Round icon button (header actions). */
export const IconButton: React.FC<{ icon: React.ReactNode; onPress?: () => void; label: string; tinted?: boolean; size?: number }> = ({ icon, onPress, label, tinted, size = 36 }) => {
  const p = useTheme();
  return (
    <Tap onPress={() => { haptic.tap(); onPress?.(); }} scaleTo={0.9} accessibilityRole="button" accessibilityLabel={label} hitSlop={8}
      style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: tinted ? p.accentSoft : p.fill }}>
      {icon}
    </Tap>
  );
};

// ---------------------------------------------------------------- surfaces

export const Card: React.FC<{ children: React.ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; padded?: boolean }> = ({ children, style, onPress, padded = true }) => {
  const p = useTheme();
  const s: ViewStyle = { backgroundColor: p.surface, borderRadius: radius.l, padding: padded ? space.l : 0, ...elevation(p, 1) };
  return onPress ? <Tap onPress={onPress} style={[s, style]}>{children}</Tap> : <View style={[s, style]}>{children}</View>;
};

/** Coloured rounded-square icon (Settings-style). */
export const IconTile: React.FC<{ icon: React.ReactNode; tone?: Tone; size?: number }> = ({ icon, tone = 'accent', size = 30 }) => {
  const p = useTheme();
  const c = toneColors(p, tone);
  return <View style={{ width: size, height: size, borderRadius: size * 0.27, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>{icon}</View>;
};

export const Badge: React.FC<{ text: string; tone?: Tone; status?: boolean; size?: 's' | 'm' }> = ({ text, tone, status = true, size = 's' }) => {
  const p = useTheme();
  const c = toneColors(p, tone || (status ? statusTone(text) : 'gray'));
  return (
    <View style={{ alignSelf: 'flex-start', backgroundColor: c.bg, borderRadius: radius.pill, paddingHorizontal: size === 's' ? 8 : 10, paddingVertical: size === 's' ? 2 : 4 }}>
      <T variant={size === 's' ? 'caption2' : 'caption'} weight="600" style={{ color: c.fg }}>{text}</T>
    </View>
  );
};

export const Avatar: React.FC<{ name?: string; size?: number; tone?: Tone }> = ({ name = '?', size = 40, tone }) => {
  const p = useTheme();
  const initials = name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('') || '?';
  const tones: Tone[] = ['blue', 'purple', 'teal', 'orange', 'green', 'accent'];
  const pick = tone || tones[[...name].reduce((n, ch) => n + ch.charCodeAt(0), 0) % tones.length];
  const c = toneColors(p, pick);
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>
      <T variant={size > 48 ? 'title3' : 'subhead'} weight="600" style={{ color: c.fg }}>{initials}</T>
    </View>
  );
};

export const Divider: React.FC<{ inset?: number }> = ({ inset = 0 }) => {
  const p = useTheme();
  return <View style={{ height: Platform.OS === 'web' ? 1 : 0.5, backgroundColor: p.separator, marginLeft: inset }} />;
};

// ---------------------------------------------------------------- loading / empty / error

export const Skeleton: React.FC<{ width?: number | `${number}%`; height?: number; radius?: number; style?: StyleProp<ViewStyle> }> = ({ width = '100%', height = 14, radius: r = 6, style }) => {
  const p = useTheme();
  const t = useSharedValue(0);
  useEffect(() => { t.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }), -1, true); }, [t]);
  const a = useAnimatedStyle(() => ({ opacity: interpolate(t.value, [0, 1], [0.45, 1]) }));
  return <Animated.View style={[{ width, height, borderRadius: r, backgroundColor: p.fill }, a, style]} />;
};

/** Placeholder rows while a list loads. */
export const ListSkeleton: React.FC<{ rows?: number; avatar?: boolean }> = ({ rows = 6, avatar = true }) => {
  const p = useTheme();
  return (
    <View style={{ backgroundColor: p.surface, borderRadius: radius.l, overflow: 'hidden' }}>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
          {avatar ? <Skeleton width={40} height={40} radius={20} /> : null}
          <View style={{ flex: 1, gap: 7 }}>
            <Skeleton width="62%" height={14} />
            <Skeleton width="38%" height={11} />
          </View>
          <Skeleton width={56} height={14} />
        </View>
      ))}
    </View>
  );
};

export const EmptyState: React.FC<{ icon?: React.ReactNode; title: string; message?: string; action?: { title: string; onPress: () => void } }> = ({ icon, title, message, action }) => (
  <View style={{ alignItems: 'center', paddingVertical: 48, paddingHorizontal: 32, gap: 8 }}>
    {icon ? <View style={{ marginBottom: 6 }}>{icon}</View> : null}
    <T variant="title3" align="center">{title}</T>
    {message ? <T variant="subhead" color="secondary" align="center">{message}</T> : null}
    {action ? <Button title={action.title} onPress={action.onPress} kind="tinted" size="m" style={{ marginTop: 10 }} /> : null}
  </View>
);

export const ErrorState: React.FC<{ message: string; onRetry?: () => void }> = ({ message, onRetry }) => (
  <View style={{ alignItems: 'center', paddingVertical: 40, paddingHorizontal: 32, gap: 8 }}>
    <T variant="headline" align="center">Couldn't load this</T>
    <T variant="footnote" color="secondary" align="center">{message}</T>
    {onRetry ? <Button title="Try again" onPress={onRetry} kind="gray" size="m" style={{ marginTop: 8 }} /> : null}
  </View>
);

export const Spinner: React.FC<{ style?: StyleProp<ViewStyle> }> = ({ style }) => {
  const p = useTheme();
  return <View style={[{ paddingVertical: 24, alignItems: 'center' }, style]}><ActivityIndicator color={p.secondary} /></View>;
};

export type { Palette };
