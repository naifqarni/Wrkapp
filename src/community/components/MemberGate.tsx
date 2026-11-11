/**
 * What someone who is not a member sees on the community tab: not a feed, a door.
 * One object on paper (the badge, its name card still blank), one line of copy, the ways in.
 */
import { useRouter, type Href } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Animated, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { community as s } from '@/i18n/community';
import { ltr } from '@/layout';

import { Button, color, easeLid, font, T, Tap } from '../ui/kit';

/** The badge holder before it has an owner: black leather, a blank cotton card. */
function BlankBadge({ height = 190 }: { height?: number }) {
  const strap = Math.round(height * 0.2);
  const bodyH = height - strap;
  const w = Math.round(bodyH * 0.64);
  const pad = Math.round(bodyH * 0.085);
  return (
    <View style={{ width: w, height, alignItems: 'center' }} accessible={false}>
      <View style={{ width: Math.round(w * 0.2), height: strap + 3, backgroundColor: color.black2 }} />
      <View
        style={[
          { width: w, height: bodyH, marginTop: -3, borderRadius: 10, backgroundColor: color.black },
          // one light from the top-left, a long soft shadow to the bottom-right
          { boxShadow: '18px 28px 44px -20px rgba(17,17,18,0.5), 4px 6px 10px -4px rgba(17,17,18,0.3)' } as object,
        ]}>
        <View style={{ alignSelf: 'center', marginTop: pad * 0.9, width: w * 0.3, height: 5, borderRadius: 3, backgroundColor: color.paper }} />
        <View style={{ position: 'absolute', top: bodyH * 0.19, bottom: pad, left: pad, right: pad, borderRadius: 3, backgroundColor: color.stock, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: bodyH * 0.09 }}>
          <T style={{ fontFamily: font.mark, fontSize: Math.round(bodyH * 0.1), lineHeight: Math.round(bodyH * 0.14), color: color.ink, writingDirection: 'ltr' }}>wrk.</T>
        </View>
      </View>
    </View>
  );
}

export function MemberGate() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // The badge is set down once, with weight. Nothing loops.
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(a, { toValue: 1, duration: 900, easing: easeLid, useNativeDriver: true }).start();
  }, [a]);
  const go = (mode: 'invite' | 'buyer' | 'member') => router.push({ pathname: '/community/verify', params: { mode } });
  return (
    <ScrollView
      testID="member-gate"
      style={{ flex: 1, backgroundColor: color.paper }}
      contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingTop: insets.top + 32, paddingBottom: insets.bottom + 32, paddingHorizontal: 28 }}>
      <Animated.View style={{ opacity: a.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }), transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [-14, 0] }) }] }}>
        <BlankBadge />
      </Animated.View>
      <View style={{ alignItems: 'center', gap: 8, marginTop: 40, maxWidth: 320 }}>
        <T v="display" center accessibilityRole="header">{s.gate.title}</T>
        <T mute center>
          {s.gate.body} <T style={{ fontFamily: font.mark, color: color.mute }}>{ltr('wrk.')}</T>
        </T>
      </View>
      <View style={{ alignSelf: 'stretch', maxWidth: 340, width: '100%', gap: 10, marginTop: 34, marginHorizontal: 'auto' }}>
        <Button testID="gate-invite" label={s.gate.invite} onPress={() => go('invite')} />
        <Button testID="gate-buyer" variant="ghost" label={`${s.gate.buyer} ${ltr('wrk.')}`} onPress={() => go('buyer')} />
      </View>
      <View style={{ flexDirection: 'row', gap: 28, marginTop: 22 }}>
        <Tap testID="gate-member" onPress={() => go('member')} hitSlop={12} style={{ minHeight: 44, justifyContent: 'center' }}>
          <T v="label">{s.gate.member}</T>
        </Tap>
        <Tap testID="gate-store" onPress={() => router.push('/store' as Href)} hitSlop={12} style={{ minHeight: 44, justifyContent: 'center' }}>
          <T v="label" mute>{s.gate.store}</T>
        </Tap>
      </View>
    </ScrollView>
  );
}
