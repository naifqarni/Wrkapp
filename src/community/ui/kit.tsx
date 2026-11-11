/**
 * Small primitives the community screens are built from. Everything visual comes from '@/theme'.
 * When the shared `src/ui` primitives are final, this file is the single place to re-point:
 * the screens import only from here.
 *
 * Layout rule: start/end only, never left/right, and no textAlign left/right (iOS swaps them in RTL,
 * Android and web do not).
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  Text as RNText,
  TextInput,
  View,
  useWindowDimensions,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { color, duration, ease, font, radius, size, space } from '@/theme';
import { haptic } from '@/ui/haptics';

export { color, duration, ease, font, radius, size, space };

export const easeSet = Easing.bezier(ease.set[0], ease.set[1], ease.set[2], ease.set[3]);
export const easeLid = Easing.bezier(ease.lid[0], ease.lid[1], ease.lid[2], ease.lid[3]);

/* ---------------------------------------------------------------- haptics */
// One haptic vocabulary for the whole app.
export { haptic };

/* ------------------------------------------------------------------- text */
type Variant = 'display' | 'title' | 'body' | 'bodyStrong' | 'label' | 'caption';
const variants: Record<Variant, TextStyle> = {
  display: { fontFamily: font.displayThin, fontSize: 30, lineHeight: 46 },
  title: { fontFamily: font.display, fontSize: 21, lineHeight: 34 },
  body: { fontFamily: font.body, fontSize: 16, lineHeight: 28 },
  bodyStrong: { fontFamily: font.bodyMedium, fontSize: 16, lineHeight: 28 },
  label: { fontFamily: font.bodyMedium, fontSize: 14, lineHeight: 22 },
  caption: { fontFamily: font.body, fontSize: 13, lineHeight: 21 },
};

export function T({ v = 'body', mute, danger, center, style, ...rest }: TextProps & { v?: Variant; mute?: boolean; danger?: boolean; center?: boolean }) {
  return (
    <RNText
      {...rest}
      style={[
        variants[v],
        { color: danger ? color.danger : mute ? color.mute : color.ink },
        center && { textAlign: 'center' },
        style,
      ]}
    />
  );
}

/** Latin digits in Jost, always left-to-right, tabular. Nest inside <T>. */
export function Num({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return (
    <RNText style={[{ fontFamily: font.mark, fontVariant: ['tabular-nums'], writingDirection: 'ltr' }, style]}>{children}</RNText>
  );
}

export function Hairline({ inset = 0, style }: { inset?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ height: 1, backgroundColor: color.line, marginStart: inset }, style]} />;
}

/* ---------------------------------------------------------------- buttons */
export function Tap({ style, onPress, haptics = true, ...rest }: PressableProps & { style?: StyleProp<ViewStyle>; haptics?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      {...rest}
      onPress={(e) => {
        if (haptics) haptic.tap();
        onPress?.(e);
      }}
      style={({ pressed }) => [style, pressed && { opacity: 0.6 }]}
    />
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  danger,
  small,
  style,
  testID,
}: {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'ghost' | 'quiet';
  loading?: boolean;
  disabled?: boolean;
  danger?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const off = disabled || loading;
  const fg = variant === 'primary' ? color.onBlack : danger ? color.danger : color.ink;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      disabled={off}
      onPress={() => {
        haptic.tap();
        onPress?.();
      }}
      style={({ pressed }) => [
        {
          minHeight: small ? 38 : size.tap,
          paddingHorizontal: small ? 16 : 26,
          borderRadius: radius.pill,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          backgroundColor: variant === 'primary' ? (danger ? color.danger : color.black) : 'transparent',
          borderWidth: variant === 'ghost' ? 1 : 0,
          borderColor: color.line,
          opacity: off ? 0.38 : pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={fg} size="small" />
      ) : (
        <RNText style={{ fontFamily: font.bodyMedium, fontSize: small ? 14 : 15, lineHeight: 24, color: fg }}>{label}</RNText>
      )}
    </Pressable>
  );
}

export function Chip({ label, selected, onPress, testID }: { label: string; selected?: boolean; onPress?: () => void; testID?: string }) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="tab"
      accessibilityState={{ selected: !!selected }}
      onPress={() => {
        haptic.select();
        onPress?.();
      }}
      style={({ pressed }) => ({
        height: 36,
        paddingHorizontal: 16,
        borderRadius: radius.pill,
        justifyContent: 'center',
        backgroundColor: selected ? color.black : 'transparent',
        borderWidth: 1,
        borderColor: selected ? color.black : color.line,
        opacity: pressed ? 0.7 : 1,
      })}>
      <RNText style={{ fontFamily: selected ? font.bodyMedium : font.body, fontSize: 14, lineHeight: 22, color: selected ? color.onBlack : color.ink }}>
        {label}
      </RNText>
    </Pressable>
  );
}

/* ------------------------------------------------------------------ field */
export const Field = React.forwardRef<React.ComponentRef<typeof TextInput>, TextInputProps & { label?: string; error?: string | null; ltr?: boolean }>(
  function Field({ label, error, ltr, style, onFocus, onBlur, ...rest }, ref) {
    const [focus, setFocus] = useState(false);
    return (
      <View>
        {label ? <T v="caption" mute nativeID={rest.nativeID ? `${rest.nativeID}-label` : undefined}>{label}</T> : null}
        <TextInput
          ref={ref}
          placeholderTextColor={color.faint}
          accessibilityLabel={label}
          {...rest}
          onFocus={(e) => {
            setFocus(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocus(false);
            onBlur?.(e);
          }}
          style={[
            {
              minHeight: size.field,
              paddingVertical: 6,
              paddingHorizontal: 0,
              borderBottomWidth: 1,
              borderBottomColor: error ? color.danger : focus ? color.ink : color.line,
              color: color.ink,
              fontFamily: ltr ? font.mark : font.display,
              fontSize: 20,
            },
            ltr && { writingDirection: 'ltr' },
            Platform.OS === 'web' && ({ outlineStyle: 'none' } as object),
            style,
          ]}
        />
        {error ? (
          <T v="caption" danger style={{ marginTop: 6 }} accessibilityLiveRegion="polite">
            {error}
          </T>
        ) : null}
      </View>
    );
  },
);

/* ------------------------------------------------------------------ icons */
type IconName = 'more' | 'bell' | 'close' | 'check' | 'chevron' | 'pen' | 'search';
export function Icon({ name, size: s = 22, tint = color.ink }: { name: IconName; size?: number; tint?: string }) {
  const p = { stroke: tint, strokeWidth: 1.4, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      {name === 'more' && (
        <>
          <Circle cx={5} cy={12} r={1.3} fill={tint} />
          <Circle cx={12} cy={12} r={1.3} fill={tint} />
          <Circle cx={19} cy={12} r={1.3} fill={tint} />
        </>
      )}
      {name === 'bell' && <Path {...p} d="M12 4a5 5 0 0 0-5 5v4.2L5.5 16.5h13L17 13.2V9a5 5 0 0 0-5-5ZM10.2 19.5a2 2 0 0 0 3.6 0" />}
      {name === 'close' && <Path {...p} d="M6 6l12 12M18 6L6 18" />}
      {name === 'check' && <Path {...p} d="M5 12.5l4.5 4.5L19 7.5" />}
      {/* points to the end edge in RTL (left), flipped by the caller when needed */}
      {name === 'chevron' && <Path {...p} d="M14.5 6l-6 6 6 6" />}
      {name === 'search' && <Path {...p} d="M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13Zm4.8-1.7L20 20" />}
      {name === 'pen' && <Path {...p} d="M4 20l1-4.2L16.6 4.2a1.7 1.7 0 0 1 2.4 0l.8.8a1.7 1.7 0 0 1 0 2.4L8.2 19 4 20Z" />}
    </Svg>
  );
}

export function IconButton({ name, label, onPress, tint, testID, children }: { name: IconName; label: string; onPress?: () => void; tint?: string; testID?: string; children?: React.ReactNode }) {
  return (
    <Tap testID={testID} accessibilityLabel={label} onPress={onPress} hitSlop={8} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={name} tint={tint} />
      {children}
    </Tap>
  );
}

/* ------------------------------------------------------------------ sheet */
/**
 * Bottom sheet on phones, centred panel on wide screens. Set down like an object: it arrives
 * with weight (ease.set) and no bounce. Closes on backdrop tap and the Android back button.
 */
export function Sheet({ visible, onClose, children, testID }: { visible: boolean; onClose: () => void; children: React.ReactNode; testID?: string }) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const wide = width >= size.twoPaneMin;
  const [mounted, setMounted] = useState(visible);
  const a = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(a, { toValue: 1, duration: 320, easing: easeSet, useNativeDriver: true }).start();
      haptic.setDown();
    } else {
      Animated.timing(a, { toValue: 0, duration: duration.fast, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [visible, a]);

  if (!mounted) return null;
  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: wide ? 'center' : 'flex-end', alignItems: wide ? 'center' : 'stretch' }}>
        <Animated.View style={{ position: 'absolute', top: 0, bottom: 0, start: 0, end: 0, backgroundColor: 'rgba(17,17,18,0.28)', opacity: a }}>
          <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="إغلاق" />
        </Animated.View>
        <Animated.View
          testID={testID}
          accessibilityViewIsModal
          style={{
            backgroundColor: color.stock,
            borderTopStartRadius: radius.panel,
            borderTopEndRadius: radius.panel,
            borderBottomStartRadius: wide ? radius.panel : 0,
            borderBottomEndRadius: wide ? radius.panel : 0,
            width: wide ? 440 : undefined,
            maxHeight: height * 0.86,
            paddingTop: 10,
            paddingBottom: (wide ? 0 : insets.bottom) + 16,
            opacity: wide ? a : 1,
            transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [wide ? 12 : 420, 0] }) }],
          }}>
          {!wide ? <View style={{ alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: color.line, marginBottom: 8 }} /> : null}
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

/** A row inside a sheet or a settings list. */
export function Row({
  label,
  detail,
  onPress,
  danger,
  end,
  testID,
  disabled,
}: {
  label: string;
  detail?: string | null;
  onPress?: () => void;
  danger?: boolean;
  end?: React.ReactNode;
  testID?: string;
  disabled?: boolean;
}) {
  const body = (
    <View style={{ minHeight: 54, paddingHorizontal: space.gutter, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ flex: 1 }}>
        <T danger={danger}>{label}</T>
        {detail ? <T v="caption" mute>{detail}</T> : null}
      </View>
      {end}
    </View>
  );
  if (!onPress) return body;
  return (
    <Tap testID={testID} onPress={onPress} disabled={disabled} style={disabled ? { opacity: 0.4 } : undefined}>
      {body}
    </Tap>
  );
}

/** Quiet on/off control: a track with the brand dot. Hollow when off, filled when on. */
export function Toggle({ value, onChange, label, testID }: { value: boolean; onChange: (v: boolean) => void; label: string; testID?: string }) {
  const a = useRef(new Animated.Value(value ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(a, { toValue: value ? 1 : 0, duration: duration.fast, easing: easeSet, useNativeDriver: true }).start();
  }, [value, a]);
  return (
    <Pressable
      testID={testID}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      hitSlop={10}
      onPress={() => {
        haptic.select();
        onChange(!value);
      }}
      style={{ width: 46, height: 28, borderRadius: 14, borderWidth: 1, borderColor: value ? color.black : color.line, justifyContent: 'center', paddingHorizontal: 4 }}>
      <Animated.View
        style={{
          width: 18,
          height: 18,
          borderRadius: 9,
          borderWidth: 1.5,
          borderColor: color.ink,
          backgroundColor: value ? color.ink : 'transparent',
          // In RTL the row starts on the right, so "on" travels toward the end edge in both directions.
          transform: [{ translateX: a.interpolate({ inputRange: [0, 1], outputRange: [0, 18 * dirSign()] }) }],
        }}
      />
    </Pressable>
  );
}

/** +1 when the layout is LTR, -1 when RTL: for the rare translateX that must follow the reading direction. */
/** Web only: an empty input has no text to take its direction from, so say it. Native follows the app's RTL. */
export const inputRTL = Platform.OS === 'web' ? ({ outlineStyle: 'none', textAlign: 'right' } as object) : null;

export function dirSign(): 1 | -1 {
  if (Platform.OS === 'web') return typeof document !== 'undefined' && document.documentElement.getAttribute('dir') === 'rtl' ? -1 : 1;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('react-native').I18nManager.isRTL ? -1 : 1;
}

/* ------------------------------------------------------------------ toast */
/**
 * One quiet line that confirms an action ("نُشر."). `toast()` can be called from anywhere, also
 * right before a screen closes; every community screen renders a <ToastLayer/> so the screen
 * underneath shows it.
 */
let toastSeq = 0;
let toastState: { id: number; text: string } | null = null;
const toastSubs = new Set<() => void>();
export function toast(text: string) {
  toastState = { id: ++toastSeq, text };
  toastSubs.forEach((f) => f());
}

export function ToastLayer() {
  const insets = useSafeAreaInsets();
  const cur = React.useSyncExternalStore(
    (cb) => {
      toastSubs.add(cb);
      return () => toastSubs.delete(cb);
    },
    () => toastState,
    () => null,
  );
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!cur) return;
    const id = cur.id;
    Animated.timing(a, { toValue: 1, duration: 260, easing: easeSet, useNativeDriver: true }).start();
    const t = setTimeout(() => {
      Animated.timing(a, { toValue: 0, duration: duration.fast, useNativeDriver: true }).start(() => {
        if (toastState?.id === id) {
          toastState = null;
          toastSubs.forEach((f) => f());
        }
      });
    }, 2200);
    return () => clearTimeout(t);
  }, [cur, a]);
  if (!cur) return null;
  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={{
        position: 'absolute',
        alignSelf: 'center',
        bottom: insets.bottom + 96,
        backgroundColor: color.black,
        borderRadius: radius.pill,
        paddingHorizontal: 18,
        paddingVertical: 9,
        opacity: a,
        transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
      }}>
      <RNText style={{ fontFamily: font.body, fontSize: 14, lineHeight: 22, color: color.onBlack }}>{cur.text}</RNText>
    </Animated.View>
  );
}

/* --------------------------------------------------------------- skeleton */
export function Bone({ w, h = 12, style }: { w: number | `${number}%`; h?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ width: w, height: h, borderRadius: 3, backgroundColor: color.line, opacity: 0.6 }, style]} />;
}

/** A phone on its side, or a folded Duo in landscape: wide but very short. Screens trade height for width here. */
export function useShort(): boolean {
  const { width, height } = useWindowDimensions();
  return width > height && height < 560;
}
