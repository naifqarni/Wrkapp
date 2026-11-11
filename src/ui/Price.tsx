import * as React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import type { ColorName } from '../theme';
import { Num, Text } from './Text';

export interface PriceProps {
  amount: number;
  /** Currency label. Default ر.س */
  currency?: string;
  large?: boolean;
  mute?: boolean;
  tone?: ColorName;
  style?: StyleProp<ViewStyle>;
}

function format(amount: number) {
  const fixed = Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
  return fixed.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** 299 ر.س : the number in Jost (LTR, tabular), the currency in Arabic after it. */
export function Price({ amount, currency = 'ر.س', large, mute, tone, style }: PriceProps) {
  return (
    <View style={[styles.row, style]} accessible accessibilityLabel={`${format(amount)} ${currency}`}>
      <Num large={large} mute={mute} tone={tone}>
        {format(amount)}
      </Num>
      <Text variant="caption" mute={mute ?? !tone} tone={tone}>
        {currency}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // No alignSelf here: the parent row decides (centre in list rows, baseline beside a title).
  row: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
});
