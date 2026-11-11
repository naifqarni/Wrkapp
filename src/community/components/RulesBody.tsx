import React from 'react';
import { View } from 'react-native';

import { community as s } from '@/i18n/community';

import { color, Num, T } from '../ui/kit';

/** The rules, as short as they can be. Shown at sign-up and from the profile. */
export function RulesBody() {
  return (
    <View style={{ gap: 18 }}>
      <T mute>{s.rules.lead}</T>
      <View style={{ gap: 14 }}>
        {s.rules.items.map((line, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 14, alignItems: 'baseline' }}>
            <T mute style={{ width: 14 }}>
              <Num>{i + 1}</Num>
            </T>
            <T style={{ flex: 1 }}>{line}</T>
          </View>
        ))}
      </View>
      <View style={{ height: 1, backgroundColor: color.line }} />
      <T v="caption" mute>{s.rules.after}</T>
    </View>
  );
}
