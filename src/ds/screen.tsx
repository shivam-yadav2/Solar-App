import React, { useContext } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, Platform, RefreshControl, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, { Extrapolation, interpolate, SharedValue, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { BottomTabBarHeightContext } from 'expo-router/build/react-navigation/bottom-tabs';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { FlashList, FlashListProps } from '@shopify/flash-list';
import { GUTTER, space, useTheme } from './theme';
import { T, Tap, haptic } from './primitives';

const BAR = 44;
const LARGE = 52;

/** Frosted bar on iOS; a near-opaque chrome colour on Android/web (blur there is unreliable). */
const Chrome: React.FC<{ style?: StyleProp<ViewStyle> }> = ({ style }) => {
  const p = useTheme();
  if (Platform.OS === 'ios') return <BlurView tint={p.dark ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'} intensity={100} style={[StyleSheet.absoluteFill, style]} />;
  return <View style={[StyleSheet.absoluteFill, { backgroundColor: p.dark ? '#121214' : '#F8F8FA' }, style]} />;
};

export interface HeaderProps {
  title: string;
  subtitle?: string;
  /** true = router.back(); a function overrides it. */
  back?: boolean | (() => void);
  backLabel?: string;
  right?: React.ReactNode;
  /** Large collapsing title (tab roots, lists). false = compact title from the start (details, forms). */
  large?: boolean;
}

function NavBar({ y, title, back, backLabel = 'Back', right, large }: HeaderProps & { y: SharedValue<number> }) {
  const p = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const onBack = typeof back === 'function' ? back : () => router.back();
  const bg = useAnimatedStyle(() => ({ opacity: interpolate(y.value, large ? [LARGE - 16, LARGE + 4] : [0, 12], [0, 1], Extrapolation.CLAMP) }));
  const smallTitle = useAnimatedStyle(() => ({
    opacity: large ? interpolate(y.value, [LARGE - 10, LARGE + 6], [0, 1], Extrapolation.CLAMP) : 1,
    transform: [{ translateY: large ? interpolate(y.value, [LARGE - 10, LARGE + 6], [6, 0], Extrapolation.CLAMP) : 0 }],
  }));
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, paddingTop: insets.top, height: insets.top + BAR }}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, bg]}>
        <Chrome />
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: p.separator }} />
      </Animated.View>
      <View style={{ height: BAR, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 }}>
        <View style={{ minWidth: 80, alignItems: 'flex-start' }}>
          {back ? (
            <Tap onPress={() => { haptic.tap(); onBack(); }} hitSlop={10} accessibilityRole="button" accessibilityLabel="Back" style={{ flexDirection: 'row', alignItems: 'center', paddingRight: 8, height: BAR }}>
              <ChevronLeft size={28} color={p.accentText} strokeWidth={2.4} />
              <T variant="body" style={{ color: p.accentText, marginLeft: -4 }} numberOfLines={1}>{backLabel}</T>
            </Tap>
          ) : null}
        </View>
        <Animated.View pointerEvents="none" style={[{ flex: 1, alignItems: 'center' }, smallTitle]}>
          <T variant="headline" numberOfLines={1}>{title}</T>
        </Animated.View>
        <View style={{ minWidth: 80, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8, paddingRight: 8 }}>{right}</View>
      </View>
    </View>
  );
}

function LargeTitle({ title, subtitle, y }: { title: string; subtitle?: string; y: SharedValue<number> }) {
  // Pulling down grows the title slightly, like iOS.
  const a = useAnimatedStyle(() => ({ transform: [{ scale: interpolate(y.value, [-120, 0], [1.08, 1], Extrapolation.CLAMP) }], opacity: interpolate(y.value, [0, LARGE], [1, 0], Extrapolation.CLAMP) }));
  return (
    <Animated.View style={[{ paddingHorizontal: GUTTER + 4, paddingBottom: space.m, transformOrigin: 'left' } as ViewStyle, a]}>
      <T variant="largeTitle" numberOfLines={1} adjustsFontSizeToFit>{title}</T>
      {subtitle ? <T variant="subhead" color="secondary" style={{ marginTop: 2 }} numberOfLines={2}>{subtitle}</T> : null}
    </Animated.View>
  );
}

const useBottomPad = () => {
  const tab = useContext(BottomTabBarHeightContext);
  const insets = useSafeAreaInsets();
  return (tab ?? insets.bottom) + space.xxl;
};

/** Scrollable page (forms, details, dashboards) with the collapsing navigation bar. */
export function Screen({
  title, subtitle, back, backLabel, right, large = true, children, refreshing, onRefresh, footer, contentStyle, scrollEnabled = true,
}: HeaderProps & { children: React.ReactNode; refreshing?: boolean; onRefresh?: () => void; footer?: React.ReactNode; contentStyle?: StyleProp<ViewStyle>; scrollEnabled?: boolean }) {
  const p = useTheme();
  const insets = useSafeAreaInsets();
  const y = useSharedValue(0);
  const bottom = useBottomPad();
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => { y.value = e.nativeEvent.contentOffset.y; };
  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <NavBar y={y} title={title} back={back} backLabel={backLabel} right={right} large={large} />
      <KeyboardAwareScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        scrollEnabled={scrollEnabled}
        bottomOffset={24}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={[{ paddingTop: insets.top + BAR + (large ? 0 : space.s), paddingBottom: bottom + (footer ? 80 : 0) }]}
        refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={p.secondary} progressViewOffset={insets.top + BAR} /> : undefined}
      >
        {large ? <LargeTitle title={title} subtitle={subtitle} y={y} /> : subtitle ? <T variant="footnote" color="secondary" style={{ paddingHorizontal: GUTTER + 4, marginBottom: space.s }}>{subtitle}</T> : null}
        <View style={[{ paddingHorizontal: GUTTER, gap: space.xl }, contentStyle]}>{children}</View>
      </KeyboardAwareScrollView>
      {footer ? <StickyFooter>{footer}</StickyFooter> : null}
    </View>
  );
}

/** Bottom action bar (Save, Record payment…) over the content. */
export function StickyFooter({ children }: { children: React.ReactNode }) {
  const p = useTheme();
  const tab = useContext(BottomTabBarHeightContext);
  const insets = useSafeAreaInsets();
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: GUTTER, paddingTop: space.m, paddingBottom: (tab ?? insets.bottom) + space.m }}>
      <Chrome />
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: p.separator }} />
      <View style={{ flexDirection: 'row', gap: space.s }}>{children}</View>
    </View>
  );
}

/** Long lists: FlashList (virtualised) with the same header, search/filter slot and load-more. */
export function ListScreen<I>({
  title, subtitle, back, backLabel, right, large = true, header, refreshing, onRefresh, footer, ...list
}: HeaderProps & Omit<FlashListProps<I>, 'ListHeaderComponent' | 'refreshControl'> & { header?: React.ReactNode; refreshing?: boolean; onRefresh?: () => void; footer?: React.ReactNode }) {
  const p = useTheme();
  const insets = useSafeAreaInsets();
  const y = useSharedValue(0);
  const bottom = useBottomPad();
  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <NavBar y={y} title={title} back={back} backLabel={backLabel} right={right} large={large} />
      <FlashList<I>
        {...list}
        onScroll={(e) => { y.value = e.nativeEvent.contentOffset.y; }}
        scrollEventThrottle={16}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingTop: insets.top + BAR + (large ? 0 : space.s), paddingBottom: bottom + (footer ? 80 : 0), paddingHorizontal: GUTTER }}
        ListHeaderComponent={
          <View style={{ marginHorizontal: -GUTTER }}>
            {large ? <LargeTitle title={title} subtitle={subtitle} y={y} /> : null}
            {header ? <View style={{ paddingHorizontal: GUTTER, paddingBottom: space.m, gap: space.m }}>{header}</View> : null}
          </View>
        }
        refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={p.secondary} progressViewOffset={insets.top + BAR} /> : undefined}
      />
      {footer ? <StickyFooter>{footer}</StickyFooter> : null}
    </View>
  );
}
