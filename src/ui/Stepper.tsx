import * as React from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { color, radius } from '../theme';
import { haptic } from './haptics';
import { IconButton } from './IconButton';
import { Num } from './Text';

export interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  /** Accessibility labels. */
  labels?: { increase: string; decrease: string };
  style?: StyleProp<ViewStyle>;
}

/** Quantity. Stays physically minus-number-plus in RTL, as on every Arabic storefront. */
export function Stepper({ value, onChange, min = 1, max = 99, labels = { increase: 'زيادة', decrease: 'إنقاص' }, style }: StepperProps) {
  const step = (d: number) => {
    const next = Math.min(max, Math.max(min, value + d));
    if (next === value) return haptic.stop();
    onChange(next);
  };
  return (
    <View {...LTR} style={[styles.wrap, style]} accessibilityRole="adjustable" accessibilityValue={{ min, max, now: value }}>
      <IconButton icon="minus" label={labels.decrease} haptic="select" size={38} disabled={value <= min} onPress={() => step(-1)} />
      <Num style={styles.value}>{value}</Num>
      <IconButton icon="plus" label={labels.increase} haptic="select" size={38} disabled={value >= max} onPress={() => step(1)} />
    </View>
  );
}

// Web takes the `dir` attribute (react-native-web warns about the `direction` style); native takes the style.
const LTR = (Platform.OS === 'web' ? { dir: 'ltr' } : null) as object | null;

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', ...(Platform.OS === 'web' ? null : { direction: 'ltr' as const }), alignItems: 'center', alignSelf: 'flex-start', borderWidth: 1, borderColor: color.line, borderRadius: radius.pill, paddingHorizontal: 3, height: 44 },
  value: { minWidth: 28, textAlign: 'center', alignSelf: 'center' },
});
