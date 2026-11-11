/**
 * Shows the intro once, on the first launch, over the app. The app mounts underneath straight away,
 * so there is nothing to wait for when the member taps through or skips.
 *
 *   <IntroGate>{app}</IntroGate>
 */
import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { color, zIndex } from '../theme';
import { IntroScreen } from './IntroScreen';
import { hasSeenIntro, markIntroSeen } from './storage';

export function IntroGate({ children }: { children: React.ReactNode }) {
  // `checking` keeps a blank sheet of paper up for the few milliseconds storage takes, so a new
  // member never glimpses the app before the intro.
  const [state, setState] = React.useState<'checking' | 'intro' | 'leaving' | 'done'>('checking');
  const opacity = useSharedValue(1);

  React.useEffect(() => {
    let alive = true;
    hasSeenIntro().then((seen) => {
      if (alive) setState(seen ? 'done' : 'intro');
    });
    return () => {
      alive = false;
    };
  }, []);

  const done = React.useCallback(() => {
    void markIntroSeen();
    setState('leaving');
    const end = () => setState('done');
    opacity.value = withTiming(0, { duration: 280 }, () => runOnJS(end)());
  }, [opacity]);

  const cover = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <View style={styles.fill}>
      {children}
      {state === 'done' ? null : (
        <Animated.View
          accessibilityViewIsModal
          pointerEvents={state === 'leaving' ? 'none' : 'auto'}
          style={[StyleSheet.absoluteFill, styles.cover, cover]}>
          {state === 'checking' ? null : <IntroScreen onDone={done} />}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  cover: { backgroundColor: color.paper, zIndex: zIndex.toast + 1 },
});
