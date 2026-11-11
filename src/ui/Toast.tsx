/**
 * One short line that confirms something happened, then leaves: "أضيف للسلة", "نُشر", "تم الحظر".
 * A black pill that is set down above the bottom edge and lifts away after 2.4 s.
 * Announced to VoiceOver / TalkBack. Wrap the app once in <ToastProvider>.
 */
import * as React from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, motion, radius, shadow, space, zIndex } from '../theme';
import { haptic, type HapticName } from './haptics';
import { Text } from './Text';

export interface ToastOptions {
  /** An action at the end of the pill, such as "تراجع". */
  action?: { label: string; onPress: () => void };
  haptic?: HapticName | false;
  duration?: number;
}
interface ToastState extends ToastOptions {
  id: number;
  message: string;
}

const ToastContext = React.createContext<{ show: (message: string, options?: ToastOptions) => void }>({
  show: () => {},
});

/** Lets a pinned footer (see <Screen footer>) push toasts up so they never cover the main button. */
const ToastLiftContext = React.createContext<(height: number) => void>(() => {});
export function useToastLift() {
  return React.useContext(ToastLiftContext);
}

export function useToast() {
  return React.useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = React.useState<ToastState | null>(null);
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const v = useSharedValue(0);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const seq = React.useRef(0);
  const [lift, setLift] = React.useState(0);

  const hide = React.useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    v.value = withTiming(0, { duration: motion.fast });
    timer.current = setTimeout(() => setToast(null), motion.fast + 40);
  }, [v]);

  const show = React.useCallback(
    (message: string, options: ToastOptions = {}) => {
      if (timer.current) clearTimeout(timer.current);
      seq.current += 1;
      setToast({ id: seq.current, message, ...options });
      if (options.haptic !== false) haptic[options.haptic ?? 'setDown']();
      AccessibilityInfo.announceForAccessibility(message);
      v.value = 0;
      v.value = reduced ? withTiming(1, { duration: 100 }) : withSpring(1, motion.spring.set);
      timer.current = setTimeout(hide, options.duration ?? (options.action ? 4200 : 2400));
    },
    [hide, reduced, v]
  );

  React.useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const style = useAnimatedStyle(() => ({ opacity: v.value, transform: [{ translateY: (1 - v.value) * 16 }] }));
  const value = React.useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      <ToastLiftContext.Provider value={setLift}>{children}</ToastLiftContext.Provider>
      {toast ? (
        <View
          pointerEvents="box-none"
          style={[styles.host, { bottom: (lift > 0 ? lift : insets.bottom) + space[4], paddingLeft: insets.left + space[4], paddingRight: insets.right + space[4] }]}>
          <Animated.View style={[styles.pill, style]} accessibilityLiveRegion="polite">
            <Text variant="label" tone="onBlack" numberOfLines={2} style={styles.msg}>
              {toast.message}
            </Text>
            {toast.action ? (
              <Pressable
                hitSlop={10}
                accessibilityRole="button"
                onPress={() => {
                  toast.action?.onPress();
                  hide();
                }}>
                <Text variant="label" tone="onBlack" style={styles.action}>
                  {toast.action.label}
                </Text>
              </Pressable>
            ) : null}
          </Animated.View>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: zIndex.toast },
  pill: { flexDirection: 'row', alignItems: 'center', gap: space[4], minHeight: 46, maxWidth: 420, paddingHorizontal: space[5], paddingVertical: space[2], borderRadius: radius.pill, backgroundColor: color.black, ...shadow.float },
  msg: { flexShrink: 1 },
  action: { textDecorationLine: 'underline' },
});
