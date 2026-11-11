/** Small store-only pieces built on the shared primitives in '@/ui'. */
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { color, gutter, space } from '@/theme';
import { Press, Text, Wordmark } from '@/ui';

import { cartCount, useCart } from './state';

/** The wordmark for native headers. Its dot is the cart. */
export function CartMark({ size = 22 }: { size?: number }) {
  const router = useRouter();
  const count = useCart((c) => cartCount(c.lines));
  return (
    <View style={{ paddingHorizontal: Platform.OS === 'web' ? gutter : 4 }}>
      <Wordmark size={size} count={count} onPressDot={() => router.push('/cart')} dotLabel={count > 0 ? `السلة، ${count}` : 'السلة، فارغة'} />
    </View>
  );
}

export function useCartHeader() {
  const router = useRouter();
  const count = useCart((c) => cartCount(c.lines));
  return { cartCount: count, onPressCart: () => router.push('/cart'), cartLabel: count > 0 ? `السلة، ${count}` : 'السلة، فارغة' };
}

/** One choice in a short list (tiers, payment method): a hairline row with a round mark. */
export function Choice({ title, note, end, selected, onPress }: { title: string; note?: string; end?: ReactNode; selected: boolean; onPress: () => void }) {
  return (
    <Press accessibilityRole="radio" accessibilityState={{ selected }} haptic="select" onPress={onPress} style={styles.choice}>
      <View style={[styles.radio, selected && { borderColor: color.ink }]}>{selected ? <View style={styles.radioDot} /> : null}</View>
      <View style={{ flex: 1 }}>
        <Text variant="body">{title}</Text>
        {note ? <Text variant="caption" mute>{note}</Text> : null}
      </View>
      {end}
    </Press>
  );
}

export function Section({ title, children, gap = space[4] }: { title?: string; children: ReactNode; gap?: number }) {
  return (
    <View style={{ gap, marginTop: space[8] }}>
      {title ? <Text variant="caption" mute>{title}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  choice: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: color.line },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.25, borderColor: color.faint, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: color.ink },
});
