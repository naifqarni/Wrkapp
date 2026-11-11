/**
 * The intro's one object: the wrk. badge on its lanyard, the same artwork as the community avatar,
 * large. It moves the way a real badge would, with weight, and never swings.
 *
 *   t = -1  off the page          t = 0  set down, card blank
 *   t = 1   the name writes in    t = 2  the card lifts out of the holder (it has something to say)
 *   t = 3   two colleagues step out from behind it
 *   t = 4   everyone settles, cards back in
 */
import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { color } from '../theme';

const CLAMP = Extrapolation.CLAMP;

function Holder({ height, t, role }: { height: number; t: SharedValue<number>; role: 'main' | 'side' }) {
  const strap = Math.round(height * 0.2);
  const bodyH = height - strap;
  const w = Math.round(bodyH * 0.66);
  const pad = Math.max(3, Math.round(bodyH * 0.08));
  const cardTop = bodyH * 0.2;
  const cardH = bodyH - cardTop - pad;
  const line = Math.max(2, bodyH * 0.035);
  const main = role === 'main';

  const card = useAnimatedStyle(() => {
    const lift = main ? interpolate(t.value, [1, 2, 3, 4], [0, -cardH * 0.3, -cardH * 0.3, 0], CLAMP) : 0;
    return { transform: [{ translateY: lift }] };
  });
  const first = useAnimatedStyle(() => ({ width: `${interpolate(t.value, main ? [0.1, 0.8] : [2.3, 3], [0, main ? 62 : 48], CLAMP)}%` }));
  const second = useAnimatedStyle(() => ({ width: `${interpolate(t.value, main ? [0.4, 1] : [2.45, 3], [0, main ? 38 : 30], CLAMP)}%` }));

  return (
    <View style={{ width: w, height, alignItems: 'center' }}>
      <View style={{ width: Math.max(6, Math.round(w * 0.26)), height: strap + 3, backgroundColor: color.foil }} />
      <View style={{ width: w, height: bodyH, marginTop: -3, borderRadius: bodyH * 0.075, backgroundColor: color.black }}>
        {/* the slot the lanyard clips through */}
        <View style={{ alignSelf: 'center', marginTop: bodyH * 0.07, width: w * 0.3, height: Math.max(3, bodyH * 0.03), borderRadius: 99, backgroundColor: color.foil }} />
        <Animated.View
          style={[
            styles.card,
            { top: cardTop, height: cardH, left: pad, right: pad, borderRadius: Math.max(2, bodyH * 0.02), gap: line * 1.6 },
            card,
          ]}>
          <Animated.View style={[{ height: line, borderRadius: line, backgroundColor: color.ink }, first]} />
          <Animated.View style={[{ height: line, borderRadius: line, backgroundColor: color.faint }, second]} />
        </Animated.View>
      </View>
    </View>
  );
}

export function IntroBadge({ t, height }: { t: SharedValue<number>; height: number }) {
  const sideH = Math.round(height * 0.84);
  const spread = height * 0.5;
  // Room for the fanned-out neighbours, so the group stays centred whatever the beat.
  const width = Math.round(height * 0.8 * 0.66 + spread * 2 + sideH * 0.8 * 0.66);

  const group = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [-1, -0.5], [0, 1], CLAMP),
    transform: [{ translateY: interpolate(t.value, [-1, 0], [-height * 0.35, 0], CLAMP) }],
  }));
  const left = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [2.05, 2.4], [0, 1], CLAMP),
    transform: [{ translateX: -interpolate(t.value, [2, 3, 4], [0, spread, spread * 0.9], CLAMP) }],
  }));
  const right = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [2.05, 2.4], [0, 1], CLAMP),
    transform: [{ translateX: interpolate(t.value, [2, 3, 4], [0, spread, spread * 0.9], CLAMP) }],
  }));

  return (
    <Animated.View style={[{ width, height, alignItems: 'center', justifyContent: 'flex-end' }, group]}>
      <Animated.View style={[styles.side, left]}>
        <Holder height={sideH} t={t} role="side" />
      </Animated.View>
      <Animated.View style={[styles.side, right]}>
        <Holder height={sideH} t={t} role="side" />
      </Animated.View>
      <Holder height={height} t={t} role="main" />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { position: 'absolute', backgroundColor: color.stock, alignItems: 'center', justifyContent: 'center' },
  side: { position: 'absolute', bottom: 0 },
});
