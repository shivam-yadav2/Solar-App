import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Dimensions, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useQuery } from '@tanstack/react-query';
import { FlashList } from '@shopify/flash-list';
import { Check, CheckCircle2, CircleAlert, Info, X } from 'lucide-react-native';
import { GUTTER, radius, space, useTheme } from './theme';
import { Button, haptic, IconButton, Spinner, T, Tap, EmptyState } from './primitives';
import { SearchBar } from './controls';
import { GroupedItem } from './list';

const H = Dimensions.get('window').height;
const SPRING = { damping: 26, stiffness: 260, mass: 0.9 };

/** Bottom sheet: springs up, drag the grabber down (or tap outside) to close. */
export function Sheet({ visible, onClose, title, children, right, footer, full }: { visible: boolean; onClose: () => void; title?: string; children: React.ReactNode; right?: React.ReactNode; footer?: React.ReactNode; full?: boolean }) {
  const p = useTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const [mounted, setMounted] = useState(visible);
  const y = useSharedValue(H);
  const fade = useSharedValue(0);
  useEffect(() => {
    if (visible) {
      setMounted(true);
      if (reduceMotion) { y.value = 0; fade.value = 1; }
      else { y.value = H; requestAnimationFrame(() => { y.value = withSpring(0, SPRING); fade.value = withTiming(1, { duration: 220 }); }); }
    } else if (mounted) {
      if (reduceMotion) { fade.value = 0; y.value = H; setMounted(false); }
      else { fade.value = withTiming(0, { duration: 180 }); y.value = withTiming(H, { duration: 240 }, (done) => { if (done) runOnJS(setMounted)(false); }); }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, reduceMotion]);
  const close = useCallback(() => onClose(), [onClose]);
  const pan = Gesture.Pan()
    .onChange((e) => { y.value = Math.max(0, y.value + e.changeY); })
    .onEnd((e) => {
      if (y.value > 120 || e.velocityY > 900) runOnJS(close)();
      else y.value = withSpring(0, SPRING);
    });
  const panel = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const backdrop = useAnimatedStyle(() => ({ opacity: fade.value }));
  if (!mounted) return null;
  return (
    <Modal transparent visible animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={close}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: p.overlay }, backdrop]}>
          <Pressable style={{ flex: 1 }} onPress={close} accessibilityRole="button" accessibilityLabel="Close sheet" />
        </Animated.View>
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1, justifyContent: 'flex-end' }} pointerEvents="box-none">
          <Animated.View accessibilityViewIsModal accessibilityLabel={title || 'Sheet'} style={[{ backgroundColor: p.dark ? '#1C1C1E' : p.bg, borderTopLeftRadius: 14, borderTopRightRadius: 14, maxHeight: H * 0.92, height: full ? H * 0.92 : undefined, paddingBottom: Math.max(insets.bottom, space.m) }, panel]}>
            <GestureDetector gesture={pan}>
              <View style={{ paddingTop: 6, paddingBottom: title ? 4 : 10 }}>
                <View style={{ alignSelf: 'center', width: 36, height: 5, borderRadius: 3, backgroundColor: p.tertiary }} />
                {title ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: GUTTER, paddingTop: 10, paddingBottom: 6 }}>
                    <T variant="headline" style={{ flex: 1 }} numberOfLines={1}>{title}</T>
                    {right}
                    <View style={{ marginLeft: 8 }}><IconButton icon={<X size={16} color={p.secondary} strokeWidth={2.6} />} label="Close" onPress={close} size={30} /></View>
                  </View>
                ) : null}
              </View>
            </GestureDetector>
            <View style={{ flexShrink: 1, flexGrow: full ? 1 : 0 }}>{children}</View>
            {footer ? <View style={{ paddingHorizontal: GUTTER, paddingTop: space.m, flexDirection: 'row', gap: space.s }}>{footer}</View> : null}
          </Animated.View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}

// ---------------------------------------------------------------- picker

export interface PickerOption { value: string; label: string; subtitle?: string }

/**
 * Pick one item. Pass `options` for a fixed list (filtered locally), or
 * `load(query)` for server search (customers, projects…) — 30 at a time.
 */
export function Picker({ visible, onClose, title, value, options, load, queryKey, onSelect, allowClear, placeholder = 'Search' }: {
  visible: boolean; onClose: () => void; title: string; value?: string; onSelect: (o: PickerOption | null) => void;
  options?: PickerOption[]; load?: (q: string) => Promise<PickerOption[]>; queryKey?: string; allowClear?: boolean; placeholder?: string;
}) {
  const p = useTheme();
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  useEffect(() => { if (visible) { setText(''); setQ(''); } }, [visible]);
  const remote = useQuery({ queryKey: ['picker', queryKey || title, q], queryFn: () => load!(q), enabled: visible && !!load, staleTime: 60_000 });
  const local = options ? options.filter((o) => !text || `${o.label} ${o.subtitle || ''}`.toLowerCase().includes(text.toLowerCase())) : [];
  const items = load ? remote.data || [] : local;
  return (
    <Sheet visible={visible} onClose={onClose} title={title} full={!!load || (options?.length || 0) > 8}>
      <View style={{ paddingHorizontal: GUTTER, paddingBottom: space.s }}>
        <SearchBar value={text} onChange={setText} onSearch={load ? setQ : undefined} placeholder={placeholder} />
      </View>
      {load && remote.isPending ? <Spinner /> : items.length === 0 ? <EmptyState title="Nothing found" message={text ? `No match for “${text}”.` : undefined} /> : (
        <FlashList
          data={allowClear ? [{ value: '', label: 'None' }, ...items] : items}
          keyExtractor={(o) => o.value || '__none'}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: GUTTER, paddingBottom: space.xl }}
          renderItem={({ item, index }) => (
            <GroupedItem index={index} count={items.length + (allowClear ? 1 : 0)}>
              <Tap onPress={() => { haptic.tap(); onSelect(item.value ? item : null); onClose(); }} scaleTo={0.985} style={{ paddingHorizontal: space.l, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: space.m }}>
                <View style={{ flex: 1 }}>
                  <T variant="body" numberOfLines={1} color={item.value ? 'label' : 'secondary'}>{item.label}</T>
                  {item.subtitle ? <T variant="footnote" color="secondary" numberOfLines={1}>{item.subtitle}</T> : null}
                </View>
                {item.value === (value || '') && (item.value || allowClear) ? <Check size={18} color={p.accentText} strokeWidth={2.6} /> : null}
              </Tap>
            </GroupedItem>
          )}
        />
      )}
    </Sheet>
  );
}

// ---------------------------------------------------------------- toasts + action sheets (one host at the root)

type ToastKind = 'success' | 'error' | 'info';
interface ActionItem { label: string; onPress: () => void; destructive?: boolean; icon?: React.ReactNode }
interface OverlayApi {
  toast: (message: string, kind?: ToastKind) => void;
  actions: (opts: { title?: string; message?: string; items: ActionItem[] }) => void;
}
const OverlayCtx = createContext<OverlayApi>({ toast: () => {}, actions: () => {} });
export const useOverlay = () => useContext(OverlayCtx);

export function OverlayProvider({ children }: { children: React.ReactNode }) {
  const p = useTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const [toast, setToast] = useState<{ id: number; message: string; kind: ToastKind } | null>(null);
  const [sheet, setSheet] = useState<{ title?: string; message?: string; items: ActionItem[] } | null>(null);
  const ty = useSharedValue(-140);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const show = useCallback((message: string, kind: ToastKind = 'success') => {
    if (kind === 'success') haptic.success(); else if (kind === 'error') haptic.error();
    setToast({ id: Date.now(), message, kind });
    AccessibilityInfo.announceForAccessibility(message);
    ty.value = reduceMotion ? 0 : withSpring(0, { damping: 18, stiffness: 220 });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { ty.value = reduceMotion ? -140 : withTiming(-140, { duration: 260 }); }, kind === 'error' ? 4200 : 2400);
  }, [reduceMotion, ty]);
  const ts = useAnimatedStyle(() => ({ transform: [{ translateY: ty.value }] }));
  const Icon = toast?.kind === 'error' ? CircleAlert : toast?.kind === 'info' ? Info : CheckCircle2;
  const color = toast?.kind === 'error' ? p.red : toast?.kind === 'info' ? p.blue : p.green;
  return (
    <OverlayCtx.Provider value={{ toast: show, actions: setSheet }}>
      {children}
      <Animated.View pointerEvents="box-none" style={[{ position: 'absolute', top: insets.top + 6, left: GUTTER, right: GUTTER, alignItems: 'center', zIndex: 1000, elevation: 1000 }, ts]}>
        {toast ? (
          <Tap onPress={() => { ty.value = withTiming(-140, { duration: 200 }); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: p.dark ? '#2C2C2E' : '#FFFFFF', borderRadius: radius.pill, paddingVertical: 11, paddingHorizontal: 16, maxWidth: 520, shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 8 }}>
            <Icon size={20} color={color} />
            <T variant="subhead" weight="500" style={{ flexShrink: 1 }}>{toast.message}</T>
          </Tap>
        ) : null}
      </Animated.View>
      <Sheet visible={!!sheet} onClose={() => setSheet(null)} title={sheet?.title}>
        {sheet?.message ? <T variant="footnote" color="secondary" style={{ paddingHorizontal: GUTTER, marginBottom: space.m }}>{sheet.message}</T> : null}
        <View style={{ paddingHorizontal: GUTTER, gap: 1 }}>
          <View style={{ backgroundColor: p.surface, borderRadius: radius.m + 2, overflow: 'hidden' }}>
            {sheet?.items.map((a, i) => (
              <Tap key={a.label} scaleTo={0.985} onPress={() => { setSheet(null); setTimeout(a.onPress, Platform.OS === 'ios' ? 280 : 120); }}
                accessibilityRole="button" accessibilityLabel={a.label}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: space.l, paddingVertical: 14, borderTopWidth: i ? StyleSheet.hairlineWidth : 0, borderTopColor: p.separator }}>
                {a.icon}
                <T variant="body" style={{ color: a.destructive ? p.red : p.label }}>{a.label}</T>
              </Tap>
            ))}
          </View>
          <Button title="Cancel" kind="gray" onPress={() => setSheet(null)} style={{ marginTop: space.s }} full />
        </View>
      </Sheet>
    </OverlayCtx.Provider>
  );
}
