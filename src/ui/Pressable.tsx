/**
 * The one press behaviour for the whole app.
 * - Feels like pressing a real object: it gives a little (scale .97) and comes back with no wobble.
 * - iOS: opacity dip. Android: a ripple state layer and, Material 3 Expressive style, the shape
 *   squares off slightly while held (pass `morph`).
 * - Fires a light haptic on press (pass `haptic={false}` or another name to change it).
 * - Respects Reduce Motion.
 */
import * as React from 'react';
import { Platform, Pressable as RNPressable, type PressableProps as RNPressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';
import { color, motion } from '../theme';
import { haptic as haptics, type HapticName } from './haptics';

const AnimatedPressable = Animated.createAnimatedComponent(RNPressable);

export interface PressProps extends Omit<RNPressableProps, 'style' | 'children'> {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Haptic to fire on press. Default `tap`. */
  haptic?: HapticName | false;
  /** Scale while pressed. Default 0.97. Use 1 for rows. */
  pressScale?: number;
  /** Android: corner radius at rest and while held, for the Expressive shape morph. */
  morph?: { from: number; to: number };
  /** Ripple / state layer on a dark surface. */
  onDark?: boolean;
  /** Dim to this opacity while pressed (iOS and web). Default 0.88; rows use 1 with a background instead. */
  pressOpacity?: number;
}

export function Press({
  children,
  style,
  haptic = 'tap',
  pressScale = 0.97,
  morph,
  onDark,
  pressOpacity = 0.88,
  onPressIn,
  onPressOut,
  onPress,
  disabled,
  ...rest
}: PressProps) {
  const pressed = useSharedValue(0);
  const reduced = useReducedMotion();

  const animated = useAnimatedStyle(() => {
    const p = pressed.value;
    const scale = reduced ? 1 : 1 - (1 - pressScale) * p;
    if (Platform.OS === 'android') {
      return morph
        ? { transform: [{ scale }], borderRadius: morph.from + (morph.to - morph.from) * p }
        : { transform: [{ scale }] };
    }
    return { transform: [{ scale }], opacity: 1 - (1 - pressOpacity) * p };
  });

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      android_ripple={
        Platform.OS === 'android'
          ? { color: onDark ? color.pressOnBlack : color.pressOnPaper, borderless: false, foreground: true }
          : undefined
      }
      onPressIn={(e) => {
        pressed.value = withSpring(1, motion.spring.press);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        pressed.value = withSpring(0, motion.spring.press);
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (haptic) haptics[haptic]();
        onPress?.(e);
      }}
      style={[style, Platform.OS === 'android' ? { overflow: 'hidden' } : null, animated, disabled ? { opacity: 0.4 } : null]}>
      {children}
    </AnimatedPressable>
  );
}
