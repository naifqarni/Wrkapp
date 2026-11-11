import * as React from 'react';
import { ScrollView, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { color, gutter, radius, space } from '../theme';
import { Press, type PressProps } from './Pressable';
import { Text } from './Text';

export interface ChipProps extends Omit<PressProps, 'children' | 'style'> {
  label: string;
  selected?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** A fully round filter pill: channels, tiers, topics. Selected = black. */
export function Chip({ label, selected, style, ...rest }: ChipProps) {
  return (
    <Press
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      haptic="select"
      onDark={selected}
      morph={{ from: 18, to: 12 }}
      {...rest}
      style={[styles.chip, selected ? styles.on : styles.off, style]}>
      <Text variant="label" tone={selected ? 'onBlack' : 'ink'} numberOfLines={1}>
        {label}
      </Text>
    </Press>
  );
}

export interface ChipRowProps<T extends string> {
  items: readonly { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  /** Bleed to the screen edges and scroll sideways. Default true. */
  bleed?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** One horizontally scrolling row of chips with single selection. Starts at the right in Arabic. */
export function ChipRow<T extends string>({ items, value, onChange, bleed = true, style }: ChipRowProps<T>) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[bleed ? { marginHorizontal: -gutter } : null, styles.rowWrap, style]}
      contentContainerStyle={[styles.row, bleed ? { paddingHorizontal: gutter } : null]}>
      {items.map((item) => (
        <Chip key={item.id} label={item.label} selected={item.id === value} onPress={() => onChange(item.id)} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  chip: { minHeight: 36, paddingHorizontal: space[4], borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  on: { backgroundColor: color.black, borderWidth: 1, borderColor: color.black },
  off: { borderWidth: 1, borderColor: color.line },
  rowWrap: { flexGrow: 0 },
  row: { gap: space[2], alignItems: 'center' },
});
