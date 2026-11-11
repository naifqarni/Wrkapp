import * as React from 'react';
import { type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { color, radius } from '../theme';

export interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  round?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** A quiet placeholder while content loads. It breathes slowly; with Reduce Motion it is still. */
export function Skeleton({ width = '100%', height = 14, round, style }: SkeletonProps) {
  const v = useSharedValue(0.55);
  const reduced = useReducedMotion();
  React.useEffect(() => {
    if (reduced) return;
    v.value = withRepeat(withTiming(1, { duration: 900 }), -1, true);
  }, [reduced, v]);
  const a = useAnimatedStyle(() => ({ opacity: v.value }));
  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[{ width, height, borderRadius: round ? radius.pill : 6, backgroundColor: color.line }, a, style]}
    />
  );
}
