/**
 * The first thing a new member sees: who is behind wrk. and why, in five short lines.
 * One object on paper (the badge), one line under it, one button. Tap anywhere to move on.
 *
 * Centred on every window. When the window is short and wide (a phone on its side, an open iPhone
 * Duo in landscape) the badge and the words sit side by side instead of being squeezed in a column.
 * With Reduce Motion on, the badge changes state without travelling and the words simply swap.
 */
import { useRouter } from 'expo-router';
import * as React from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RailInset } from '../layout/RailInset';
import { color, gutter, motion, space } from '../theme';
import { Button } from '../ui/Button';
import { haptic } from '../ui/haptics';
import { Text } from '../ui/Text';
import { Wordmark } from '../ui/Wordmark';
import { IntroBadge } from './IntroBadge';
import { intro } from './strings';

export interface IntroScreenProps {
  /** Called when the member finishes or skips. Default: go back (the replay route). */
  onDone?: () => void;
}

const LAST = intro.beats.length - 1;

export function IntroScreen({ onDone }: IntroScreenProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const reduced = useReducedMotion();
  const [beat, setBeat] = React.useState(0);
  const t = useSharedValue(reduced ? 0 : -1);
  const words = useSharedValue(0);

  const finish = React.useCallback(() => {
    if (onDone) onDone();
    else if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [onDone, router]);

  React.useEffect(() => {
    const ease = Easing.bezier(...motion.ease.lid);
    t.value = reduced ? beat : withTiming(beat, { duration: beat === 0 ? 620 : 560, easing: ease });
    words.value = 0;
    words.value = reduced ? withTiming(1, { duration: 120 }) : withDelay(beat === 0 ? 260 : 120, withTiming(1, { duration: 360, easing: ease }));
  }, [beat, reduced, t, words]);

  const next = React.useCallback(() => {
    if (beat >= LAST) {
      haptic.setDown();
      finish();
    } else {
      haptic.tap();
      setBeat(beat + 1);
    }
  }, [beat, finish]);

  const skip = React.useCallback(() => {
    haptic.tap();
    finish();
  }, [finish]);

  const wordsStyle = useAnimatedStyle(() => ({ opacity: words.value, transform: [{ translateY: reduced ? 0 : (1 - words.value) * 8 }] }));

  // Short and wide: side by side. Otherwise a centred column.
  const side = width > height && height < 560;
  const badge = Math.round(side ? Math.min(190, height * 0.46) : Math.min(260, height * 0.28, width * 0.5));
  const current = intro.beats[beat];
  const big = !side && width >= 600;

  const stage = (
    <View accessible accessibilityRole="image" accessibilityLabel={intro.stageLabel} style={styles.stage}>
      <IntroBadge t={t} height={badge} />
    </View>
  );

  const copy = (
    <View style={[styles.copy, side ? { flex: 1, maxWidth: 420 } : { maxWidth: 520, minHeight: big ? 150 : 132 }]}>
      <Animated.View accessibilityLiveRegion="polite" style={[styles.words, wordsStyle]}>
        {'mark' in current && current.mark ? (
          <View style={styles.hello}>
            <Text variant={big ? 'display' : 'title'} center accessibilityRole="header">{current.line}</Text>
            <Wordmark size={big ? 40 : 30} />
          </View>
        ) : (
          <Text variant={big ? 'display' : 'title'} center style={big ? styles.bigLine : styles.line}>{current.line}</Text>
        )}
      </Animated.View>
    </View>
  );

  const controls = (
    <View style={styles.controls}>
      <View accessible accessibilityLabel={intro.step(beat + 1, intro.beats.length)} style={styles.dots}>
        {intro.beats.map((_, i) => (
          <View key={i} style={[styles.dot, i === beat && styles.dotOn]} />
        ))}
      </View>
      <Button testID="intro-next" label={beat >= LAST ? intro.enter : intro.next} onPress={next} haptic={false} style={styles.button} />
    </View>
  );

  return (
    <RailInset style={styles.root}>
      <Pressable
        testID="intro"
        accessible={false}
        onPress={next}
        style={[styles.fill, { paddingTop: insets.top, paddingBottom: insets.bottom + space[5], paddingLeft: insets.left + gutter, paddingRight: insets.right + gutter }]}>
        <View style={styles.top}>
          {beat < LAST ? <Button testID="intro-skip" label={intro.skip} variant="quiet" size="sm" onPress={skip} haptic={false} /> : null}
        </View>
        {side ? (
          <View style={styles.sideRow}>
            {stage}
            <View style={styles.sideCopy}>
              {copy}
              {controls}
            </View>
          </View>
        ) : (
          <>
            <View style={styles.column}>
              {stage}
              {copy}
            </View>
            {controls}
          </>
        )}
      </Pressable>
    </RailInset>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.paper },
  fill: { flex: 1 },
  top: { minHeight: 44, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
  column: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[10] },
  sideRow: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[10] },
  sideCopy: { flex: 1, maxWidth: 420, alignItems: 'center', justifyContent: 'center', gap: space[6] },
  stage: { alignItems: 'center', justifyContent: 'center' },
  copy: { width: '100%', alignItems: 'center', justifyContent: 'center' },
  words: { alignItems: 'center' },
  hello: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[3] },
  line: { lineHeight: 40 },
  bigLine: { lineHeight: 58 },
  controls: { alignItems: 'center', gap: space[5] },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: color.line },
  dotOn: { width: 18, backgroundColor: color.ink },
  button: { minWidth: 168, alignSelf: 'center' },
});
