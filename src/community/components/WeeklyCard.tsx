import React from 'react';
import { Pressable, View } from 'react-native';

import { community as s } from '@/i18n/community';

import type { WeeklyQuestion } from '../api/features';
import { color, Num, radius, space, T } from '../ui/kit';

/**
 * سؤال الأسبوع: one question for everyone, changed every Sunday. It sits on the feed like a
 * message card from the kit: card stock on paper, one line, nothing else.
 */
export function WeeklyCard({ q, onOpen }: { q: WeeklyQuestion; onOpen: () => void }) {
  return (
    <View style={{ paddingHorizontal: space.gutter, paddingTop: 14, paddingBottom: 6 }}>
      <Pressable
        testID="weekly"
        accessibilityRole="button"
        onPress={onOpen}
        style={({ pressed }) => [
          { backgroundColor: color.stock, borderRadius: radius.panel, borderWidth: 1, borderColor: color.line, paddingHorizontal: 18, paddingVertical: 16, gap: 6, opacity: pressed ? 0.8 : 1 },
          { boxShadow: '6px 10px 18px -12px rgba(17,17,18,0.25)' } as object,
        ]}>
        <T v="caption" mute>{s.weekly.label}</T>
        <T v="title">{q.text}</T>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
          <T v="caption" mute>
            {q.answerCount ? (
              <>
                <Num>{q.answerCount}</Num> {s.weekly.answers}
              </>
            ) : (
              s.weekly.first
            )}
          </T>
          <T v="label">{s.weekly.answer}</T>
        </View>
      </Pressable>
    </View>
  );
}
