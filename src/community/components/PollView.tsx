import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, View } from 'react-native';

import { community as s } from '@/i18n/community';

import type { Poll } from '../api/features';
import { color, easeSet, haptic, Num, T } from '../ui/kit';

/**
 * A vote. Before you choose: plain options. After: each option fills like ink soaking into paper,
 * as far as its share, and yours carries the filled dot. One vote, no changing it.
 */
export function PollView({ poll, onVote, busy }: { poll: Poll; onVote: (optionId: string) => void; busy?: boolean }) {
  const voted = !!poll.myOptionId;
  const a = useRef(new Animated.Value(voted ? 1 : 0)).current;
  useEffect(() => {
    if (voted) Animated.timing(a, { toValue: 1, duration: 520, easing: easeSet, useNativeDriver: false }).start();
  }, [voted, a]);
  const total = Math.max(1, poll.totalVotes);
  return (
    <View style={{ gap: 8, marginTop: 12 }} testID="poll">
      {poll.options.map((o) => {
        const share = o.votes / total;
        const mine = poll.myOptionId === o.id;
        return (
          <Pressable
            key={o.id}
            testID={`poll-option-${o.id}`}
            accessibilityRole="button"
            accessibilityState={{ selected: mine, disabled: voted }}
            disabled={voted || busy}
            onPress={() => {
              haptic.setDown();
              onVote(o.id);
            }}
            style={({ pressed }) => ({ minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: mine ? color.ink : color.line, overflow: 'hidden', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}>
            {voted ? (
              <Animated.View
                style={{ position: 'absolute', top: 0, bottom: 0, start: 0, backgroundColor: color.line, opacity: 0.55, width: a.interpolate({ inputRange: [0, 1], outputRange: ['0%', `${Math.round(share * 100)}%`] }) }}
              />
            ) : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 8 }}>
              <View style={{ width: 12, height: 12, borderRadius: 6, borderWidth: 1.5, borderColor: mine ? color.ink : color.mute, backgroundColor: mine ? color.ink : 'transparent' }} />
              <T style={{ flex: 1, fontSize: 15, lineHeight: 24 }}>{o.text}</T>
              {voted ? (
                <T v="caption" mute={!mine}>
                  <Num style={{ fontSize: 15 }}>{Math.round(share * 100)}%</Num>
                </T>
              ) : null}
            </View>
          </Pressable>
        );
      })}
      <T v="caption" mute>
        {voted ? (
          <>
            <Num>{poll.totalVotes}</Num> {s.poll.votes}
          </>
        ) : (
          s.poll.tap
        )}
      </T>
    </View>
  );
}
