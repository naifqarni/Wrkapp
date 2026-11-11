import * as React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { color, motion, radius } from '../theme';
import { haptic } from './haptics';
import { Text } from './Text';

export interface SegmentedProps<T extends string> {
  items: readonly { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  style?: StyleProp<ViewStyle>;
}

function Segment({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const on = useSharedValue(selected ? 1 : 0);
  React.useEffect(() => {
    on.value = withTiming(selected ? 1 : 0, { duration: motion.fast });
  }, [selected, on]);
  const bg = useAnimatedStyle(() => ({ opacity: on.value }));
  return (
    <Pressable accessibilityRole="tab" accessibilityState={{ selected }} onPress={onPress} style={styles.segment}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.thumb, bg]} />
      <Text variant="label" tone={selected ? 'onBlack' : 'mute'} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Two to four equal choices in one pill: kit tiers, "my company / everyone". */
export function Segmented<T extends string>({ items, value, onChange, style }: SegmentedProps<T>) {
  return (
    <View accessibilityRole="tablist" style={[styles.track, style]}>
      {items.map((item) => (
        <Segment
          key={item.id}
          label={item.label}
          selected={item.id === value}
          onPress={() => {
            if (item.id !== value) {
              haptic.select();
              onChange(item.id);
            }
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', borderRadius: radius.pill, borderWidth: 1, borderColor: color.line, padding: 3, minHeight: 46 },
  segment: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, minHeight: 38, paddingHorizontal: 8 },
  thumb: { backgroundColor: color.black, borderRadius: radius.pill },
});
