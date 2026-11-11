/**
 * "wrk." Always lowercase, always Jost, always left-to-right, always with the dot.
 * The dot is the cart: a hollow ring when empty, solid when something is inside.
 * When an item is added the dot is "set down": it drops in with one soft settle and a haptic.
 */
import * as React from 'react';
import { Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { color, font, motion } from '../theme';
import { Text } from './Text';

export interface WordmarkProps {
  size?: number;
  /** Number of items in the cart. 0 or undefined: hollow dot. */
  count?: number;
  /** Makes the dot a button that opens the cart. */
  onPressDot?: () => void;
  /** Accessibility label for the dot button, such as "السلة، ٢". */
  dotLabel?: string;
  onDark?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Wordmark({ size = 26, count = 0, onPressDot, dotLabel, onDark, style }: WordmarkProps) {
  const filled = count > 0;
  const ink = onDark ? color.onBlack : color.ink;
  const dot = Math.max(5, Math.round(size * 0.2));
  const fill = useSharedValue(filled ? 1 : 0);
  const drop = useSharedValue(1);
  const reduced = useReducedMotion();
  const previous = React.useRef(count);

  React.useEffect(() => {
    fill.value = withTiming(filled ? 1 : 0, { duration: motion.fast });
    if (count > previous.current && !reduced) {
      drop.value = withSequence(withTiming(1.7, { duration: 90 }), withSpring(1, motion.spring.set));
    }
    previous.current = count;
  }, [count, filled, fill, drop, reduced]);

  const inner = useAnimatedStyle(() => ({ opacity: fill.value }));
  const outer = useAnimatedStyle(() => ({ transform: [{ scale: drop.value }] }));

  const dotView = (
    <Animated.View
      style={[
        { width: dot, height: dot, borderRadius: dot / 2, borderWidth: Math.max(1, size / 22), borderColor: ink, marginBottom: size * 0.2, marginLeft: size * 0.06 },
        outer,
      ]}>
      <Animated.View style={[StyleSheet.absoluteFill, { borderRadius: dot / 2, backgroundColor: ink, margin: -0.5 }, inner]} />
    </Animated.View>
  );

  return (
    <View {...LTR} style={[styles.row, style]} accessibilityRole="header" accessibilityLabel="wrk.">
      <Text
        ltr
        maxFontSizeMultiplier={1.2}
        style={{ fontFamily: font.mark, fontSize: size, lineHeight: size * 1.25, letterSpacing: -size * 0.01, color: ink }}>
        wrk
      </Text>
      {onPressDot ? (
        <Pressable
          onPress={onPressDot}
          hitSlop={{ top: 18, bottom: 14, left: 14, right: 22 }}
          accessibilityRole="button"
          accessibilityLabel={dotLabel ?? 'السلة'}
          style={styles.dotHit}>
          {dotView}
        </Pressable>
      ) : (
        dotView
      )}
    </View>
  );
}

// Web takes the `dir` attribute (react-native-web warns about the `direction` style); native takes the style.
const LTR = (Platform.OS === 'web' ? { dir: 'ltr' } : null) as object | null;

const styles = StyleSheet.create({
  // Physically LTR in every locale: the dot always follows the k.
  row: { flexDirection: 'row', ...(Platform.OS === 'web' ? null : { direction: 'ltr' as const }), alignItems: 'flex-end', alignSelf: 'flex-start' },
  dotHit: { alignSelf: 'flex-end' },
});
