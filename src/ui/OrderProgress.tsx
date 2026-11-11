/**
 * Where an order is, as one line the eye reads in a second. The same five steps appear in the
 * Lock Screen Live Activity, the Dynamic Island, the home-screen widget and the Android notification.
 */
import * as React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { color, space } from '../theme';
import { ORDER_STEPS, orderStatusLabel, orderStepIndex, type OrderStatus } from '../native/orderStatus';
import { Text } from './Text';

export interface OrderProgressProps {
  status: OrderStatus;
  /** A vertical timeline with every step named (order page). Default: one line with the current step above it. */
  detailed?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function OrderProgress({ status, detailed, style }: OrderProgressProps) {
  const at = orderStepIndex(status);
  const cancelled = status === 'cancelled';
  const a11y = {
    accessible: true,
    accessibilityRole: 'progressbar' as const,
    accessibilityLabel: orderStatusLabel(status),
    accessibilityValue: { min: 0, max: ORDER_STEPS.length - 1, now: Math.max(0, at) },
  };

  // Detailed: a vertical timeline, one step per line, for the order page.
  if (detailed) {
    return (
      <View style={style} {...a11y}>
        {ORDER_STEPS.map((step, i) => (
          <View key={step} style={styles.vRow}>
            <View style={styles.vRail}>
              <View style={[styles.vBar, { backgroundColor: i === 0 ? 'transparent' : i <= at ? color.ink : color.line }]} />
              <View style={[styles.dot, i <= at ? styles.dotDone : null, i === at ? styles.dotNow : null]} />
              <View style={[styles.vBar, { backgroundColor: i === ORDER_STEPS.length - 1 ? 'transparent' : i < at ? color.ink : color.line }]} />
            </View>
            <Text variant={i === at ? 'bodyStrong' : 'body'} tone={i <= at ? 'ink' : 'mute'} style={styles.vLabel}>
              {orderStatusLabel(step)}
            </Text>
          </View>
        ))}
      </View>
    );
  }

  // Compact: the current state in words, and one line.
  return (
    <View style={style} {...a11y}>
      <Text variant="headline" tone={cancelled ? 'mute' : 'ink'} style={styles.now}>
        {orderStatusLabel(status)}
      </Text>
      <View style={styles.track}>
        {ORDER_STEPS.map((step, i) => (
          <React.Fragment key={step}>
            {i > 0 ? <View style={[styles.bar, { backgroundColor: i <= at ? color.ink : color.line }]} /> : null}
            <View style={[styles.dot, i <= at ? styles.dotDone : null, i === at ? styles.dotNow : null]} />
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  now: { marginBottom: space[3] },
  track: { flexDirection: 'row', alignItems: 'center', height: 14 },
  bar: { flex: 1, height: 1.5 },
  dot: { width: 7, height: 7, borderRadius: 4, borderWidth: 1.5, borderColor: color.line, backgroundColor: color.paper },
  dotDone: { borderColor: color.ink, backgroundColor: color.ink },
  dotNow: { width: 13, height: 13, borderRadius: 7 },
  vRow: { flexDirection: 'row', alignItems: 'stretch', gap: space[3], minHeight: 40 },
  vRail: { width: 13, alignItems: 'center' },
  vBar: { flex: 1, width: 1.5 },
  vLabel: { alignSelf: 'center', paddingVertical: 6 },
});
