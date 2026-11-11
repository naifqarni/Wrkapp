/**
 * Haptics with meaning. Call these by what happened, not by strength.
 * iOS uses the Taptic Engine patterns; Android uses the system haptic constants (they respect the
 * user's touch-feedback setting and need no VIBRATE permission). Web does nothing.
 */
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

let enabled = true;
/** Let the account tab offer a "haptics off" switch. */
export function setHapticsEnabled(value: boolean) {
  enabled = value;
}

function run(ios: () => Promise<unknown>, android?: Haptics.AndroidHaptics) {
  if (!enabled || Platform.OS === 'web') return;
  try {
    if (Platform.OS === 'android' && android) {
      Haptics.performAndroidHapticsAsync(android).catch(() => {});
    } else {
      ios().catch(() => {});
    }
  } catch {
    // Haptics must never break a tap.
  }
}

export const haptic = {
  /** Any button press. */
  tap: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), Haptics.AndroidHaptics.Virtual_Key),
  /** A choice changed: tab, segment, chip, quantity, tier. */
  select: () => run(() => Haptics.selectionAsync(), Haptics.AndroidHaptics.Segment_Tick),
  /** An object was set down: added to the cart, a sheet settled, a card dropped in place. */
  setDown: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), Haptics.AndroidHaptics.Confirm),
  /** A lid lifting or closing: the box opens, a sheet starts to move. Soft and low. */
  lid: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft), Haptics.AndroidHaptics.Gesture_Start),
  /** A firm stop: reached a limit, a toggle locked in. */
  stop: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid), Haptics.AndroidHaptics.Clock_Tick),
  /** Payment went through, post published, email verified. */
  success: () =>
    run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), Haptics.AndroidHaptics.Confirm),
  /** Something needs attention before continuing. */
  warning: () =>
    run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning), Haptics.AndroidHaptics.Reject),
  /** It failed. */
  error: () =>
    run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error), Haptics.AndroidHaptics.Reject),
  /** Long-press menus. */
  longPress: () =>
    run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), Haptics.AndroidHaptics.Long_Press),
} as const;

export type HapticName = keyof typeof haptic;
