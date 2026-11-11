/**
 * Options that make expo-router's NATIVE navigation carry the brand, so screens get the real
 * platform chrome instead of an imitation:
 * - iOS 26+: Liquid Glass bars, edge-swipe back, large-title collapse, and on iPhone Duo the bar
 *   buttons move into the side rail automatically.
 * - Android: Material 3 top app bar and the predictive back animation.
 */
import { Platform } from 'react-native';
import type { NativeStackNavigationOptions } from 'expo-router';
import { color, font } from '../theme';

type ScreenOptions = NativeStackNavigationOptions;

/** Root stack: no header (tab roots draw <Header> with the wordmark). */
export const stackBase: ScreenOptions = {
  headerShown: false,
  contentStyle: { backgroundColor: color.paper },
};

/** Pushed screens: the native header. `title` is set per screen. */
export const stackHeader: ScreenOptions = {
  headerShown: true,
  headerTitleStyle: { fontFamily: font.display, fontSize: 17, color: color.ink },
  headerLargeTitleStyle: { fontFamily: font.displayThin, color: color.ink },
  headerTintColor: color.ink,
  headerBackButtonDisplayMode: 'minimal',
  headerShadowVisible: false,
  headerTitleAlign: 'center',
  // iOS 26+: leave the bar transparent so the system draws Liquid Glass over the paper.
  // Android and older iOS: a solid paper bar.
  ...(Platform.OS === 'ios' ? { headerTransparent: true } : { headerStyle: { backgroundColor: color.paper } }),
  contentStyle: { backgroundColor: color.paper },
};

/**
 * A route presented as a native sheet (compose a post, report, tier picker).
 * iOS: detents with a grabber. Android: Material bottom sheet. Wide windows: the system centres it.
 */
export const sheetRoute: ScreenOptions = {
  presentation: 'formSheet',
  headerShown: false,
  sheetAllowedDetents: [0.6, 1],
  sheetGrabberVisible: true,
  sheetCornerRadius: 20,
  contentStyle: { backgroundColor: color.stock },
};

/** Checkout and verification: a full modal that cannot be swiped away by accident. */
export const modalRoute: ScreenOptions = {
  presentation: 'modal',
  headerShown: false,
  gestureEnabled: false,
  contentStyle: { backgroundColor: color.paper },
};
