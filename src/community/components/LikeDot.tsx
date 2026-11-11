import React, { useEffect, useRef } from 'react';
import { Animated, Pressable } from 'react-native';

import { community as s } from '@/i18n/community';

import { color, easeSet, haptic, Num, T } from '../ui/kit';

/**
 * The like is the dot of "wrk.": hollow until you agree, filled when you do.
 * It presses in like something set down on paper. A count, nothing more.
 */
export function LikeDot({ liked, count, onToggle, testID }: { liked: boolean; count: number; onToggle: () => void; testID?: string }) {
  const a = useRef(new Animated.Value(1)).current;
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    a.setValue(liked ? 0.7 : 1.12);
    Animated.timing(a, { toValue: 1, duration: 260, easing: easeSet, useNativeDriver: true }).start();
  }, [liked, a]);
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={liked ? s.feed.unlike : s.feed.like}
      accessibilityState={{ selected: liked }}
      hitSlop={10}
      onPress={() => {
        haptic.select();
        onToggle();
      }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 36, paddingEnd: 6 }}>
      <Animated.View
        style={{
          width: 14,
          height: 14,
          borderRadius: 7,
          borderWidth: 1.5,
          borderColor: liked ? color.ink : color.mute,
          backgroundColor: liked ? color.ink : 'transparent',
          transform: [{ scale: a }],
        }}
      />
      <T v="caption" mute={!liked}>
        <Num style={{ fontSize: 15 }}>{count}</Num>
      </T>
    </Pressable>
  );
}
