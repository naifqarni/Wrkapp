/**
 * A sheet that moves like a heavy drawer.
 * - Phones: slides up from the bottom, drag the handle down to close.
 * - Wide windows (700pt and up): a centred panel, because a full-width bottom sheet on a tablet or an
 *   unfolded phone looks stretched.
 * - Fold aware: with a vertical fold it sits wholly on the start half; in tabletop posture it stays
 *   on the lower half. It never straddles the crease.
 *
 * For a full route presented as a sheet, prefer the native one:
 *   <Stack.Screen name="compose" options={sheetRoute} />   (see ./native-options)
 */
import * as React from 'react';
import { AccessibilityInfo, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { Easing, runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, gutter, motion, radius, space } from '../theme';
import { isRTL } from '../layout/rtl';
import { useLayoutClass } from '../layout/useLayoutClass';
import { haptic } from './haptics';
import { IconButton } from './IconButton';
import { Text } from './Text';

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** Pinned under the content: the confirm button. */
  footer?: React.ReactNode;
  /** Tap outside or drag down to close. Default true. */
  dismissable?: boolean;
  /** Content scrolls when taller than the sheet. Default true. */
  scroll?: boolean;
  closeLabel?: string;
  contentStyle?: StyleProp<ViewStyle>;
}

export function Sheet({ visible, onClose, title, children, footer, dismissable = true, scroll = true, closeLabel = 'إغلاق', contentStyle }: SheetProps) {
  const insets = useSafeAreaInsets();
  const { width, height, isTwoPane, fold, posture } = useLayoutClass();
  const reduced = useReducedMotion();
  const [mounted, setMounted] = React.useState(visible);
  const progress = useSharedValue(0); // 0 closed, 1 open
  const drag = useSharedValue(0);

  React.useEffect(() => {
    if (visible) {
      setMounted(true);
      drag.value = 0;
      haptic.lid();
      progress.value = reduced ? withTiming(1, { duration: 120 }) : withSpring(1, motion.spring.sheet);
      if (title) AccessibilityInfo.announceForAccessibility(title);
    } else if (mounted) {
      progress.value = withTiming(0, { duration: reduced ? 120 : 260, easing: Easing.bezier(...motion.ease.lid) }, (done) => {
        if (done) runOnJS(setMounted)(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const close = React.useCallback(() => {
    if (dismissable) onClose();
  }, [dismissable, onClose]);

  const pan = React.useMemo(
    () =>
      Gesture.Pan()
        .enabled(dismissable && !isTwoPane)
        .activeOffsetY(8)
        .onUpdate((e) => {
          drag.value = Math.max(0, e.translationY);
        })
        .onEnd((e) => {
          if (e.translationY > 120 || e.velocityY > 900) {
            runOnJS(close)();
          }
          drag.value = withSpring(0, motion.spring.sheet);
        }),
    [dismissable, isTwoPane, close, drag]
  );

  // Where may the panel live?
  const rtl = isRTL();
  let area = { left: 0, top: 0, width, height };
  if (fold && fold.orientation === 'vertical' && isTwoPane) {
    const startIsRight = rtl;
    area = startIsRight
      ? { left: fold.x + fold.width, top: 0, width: width - (fold.x + fold.width), height }
      : { left: 0, top: 0, width: fold.x, height };
  } else if (fold && fold.orientation === 'horizontal' && posture === 'tabletop') {
    area = { left: 0, top: fold.y + fold.height, width, height: height - (fold.y + fold.height) };
  }
  const centred = isTwoPane;
  const maxHeight = centred ? Math.min(area.height - insets.top - insets.bottom - 48, 720) : area.height - insets.top - 24;

  const scrim = useAnimatedStyle(() => ({ opacity: progress.value }));
  const panel = useAnimatedStyle(() => {
    if (centred) {
      return { opacity: progress.value, transform: [{ translateY: (1 - progress.value) * 24 }] };
    }
    return { transform: [{ translateY: (1 - progress.value) * (maxHeight + 80) + drag.value }] };
  });

  if (!mounted) return null;

  const Body = scroll ? ScrollView : View;
  return (
    <Modal transparent visible animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={close} supportedOrientations={['portrait', 'landscape']}>
      <GestureHandlerRootView style={styles.fill}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, scrim]}>
          <Pressable style={styles.fill} onPress={close} accessibilityLabel={closeLabel} accessibilityRole="button" />
        </Animated.View>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          pointerEvents="box-none"
          style={[
            { position: 'absolute', left: area.left, top: area.top, width: area.width, height: area.height },
            centred ? styles.centre : styles.bottom,
          ]}>
          <Animated.View
            accessibilityViewIsModal
            style={[
              styles.panel,
              centred
                ? { width: Math.min(520, area.width - 48), borderRadius: radius.panel, maxHeight }
                : { borderTopLeftRadius: radius.panel, borderTopRightRadius: radius.panel, maxHeight, paddingBottom: insets.bottom },
              panel,
            ]}>
            <GestureDetector gesture={pan}>
              <View style={styles.head}>
                {!centred ? <View style={styles.handle} /> : null}
                <View style={styles.titleRow}>
                  <Text variant="headline" numberOfLines={1} style={styles.fill} accessibilityRole="header">
                    {title ?? ''}
                  </Text>
                  {centred && dismissable ? <IconButton icon="close" label={closeLabel} onPress={onClose} style={styles.close} /> : null}
                </View>
              </View>
            </GestureDetector>
            <Body
              {...(scroll ? { keyboardShouldPersistTaps: 'handled' as const, showsVerticalScrollIndicator: false, bounces: false } : null)}
              style={styles.body}
              {...(scroll ? { contentContainerStyle: [styles.content, contentStyle] } : null)}>
              {scroll ? children : <View style={[styles.content, contentStyle]}>{children}</View>}
            </Body>
            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </Animated.View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scrim: { backgroundColor: color.scrim },
  bottom: { justifyContent: 'flex-end' },
  centre: { justifyContent: 'center', alignItems: 'center' },
  panel: { backgroundColor: color.stock, overflow: 'hidden' },
  head: { paddingHorizontal: gutter, paddingTop: space[2] },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: color.line, marginBottom: space[2] },
  titleRow: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  close: { marginEnd: -10 },
  body: { flexGrow: 0, flexShrink: 1 },
  content: { paddingHorizontal: gutter, paddingBottom: space[5], paddingTop: space[1] },
  footer: { paddingHorizontal: gutter, paddingTop: space[3], paddingBottom: space[4], borderTopWidth: 1, borderTopColor: color.line },
});
