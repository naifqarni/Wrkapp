/**
 * The root of every screen.
 * - Paper background that runs edge to edge, under the status bar, the home indicator and the
 *   iPhone Duo side rail.
 * - CONTENT is inset: safe areas (including the 84pt rail, on whichever physical edge it is) plus the
 *   16pt gutter. Insets are physical, so they are applied to left/right, not start/end.
 * - On wide windows the content column is capped and centred so lines stay readable.
 * - `footer` is pinned above the home indicator and the keyboard (the "add to cart" bar).
 */
import * as React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, type ScrollViewProps, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, gutter, size, space } from '../theme';
import { useToastLift } from './Toast';

/** The content column width of the surrounding <Screen>, so <Header> lines up with it on wide windows. */
export const ScreenColumnContext = React.createContext<number | false>(false);

export interface ScreenProps {
  children: React.ReactNode;
  /** Scrolls by default. Pass false for screens that manage their own list. */
  scroll?: boolean;
  /** Apply the 16pt gutter. Default true. Lists that draw full-bleed rows pass false. */
  padded?: boolean;
  /** Which safe-area edges to pad. Inside a native Stack header or NativeTabs, the system already handles top and bottom: pass ['left','right']. */
  edges?: readonly ('top' | 'bottom' | 'left' | 'right')[];
  /** Cap the content width (points). Default 720. `false` to fill. */
  maxWidth?: number | false;
  footer?: React.ReactNode;
  /** A header rendered above the scroll area (see <Header>). */
  header?: React.ReactNode;
  background?: string;
  contentStyle?: StyleProp<ViewStyle>;
  scrollProps?: ScrollViewProps;
  style?: StyleProp<ViewStyle>;
}

const ALL = ['top', 'bottom', 'left', 'right'] as const;

export function Screen({
  children,
  scroll = true,
  padded = true,
  edges = ALL,
  maxWidth = 720,
  footer,
  header,
  background = color.paper,
  contentStyle,
  scrollProps,
  style,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const liftToast = useToastLift();
  React.useEffect(() => () => liftToast(0), [liftToast]);
  const pad = padded ? gutter : 0;
  const side: ViewStyle = {
    paddingLeft: (edges.includes('left') ? insets.left : 0) + pad,
    paddingRight: (edges.includes('right') ? insets.right : 0) + pad,
  };
  const top = !header && edges.includes('top') ? insets.top : 0;
  const bottom = edges.includes('bottom') ? insets.bottom : 0;
  const column: ViewStyle | null = maxWidth === false ? null : { width: '100%', maxWidth: Math.min(maxWidth, size.maxContent), alignSelf: 'center' };

  const body = scroll ? (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      showsVerticalScrollIndicator={false}
      {...scrollProps}
      style={styles.fill}
      contentContainerStyle={[side, { paddingTop: top, paddingBottom: (footer ? 0 : bottom) + space[6] }, scrollProps?.contentContainerStyle]}>
      <View style={[column, contentStyle]}>{children}</View>
    </ScrollView>
  ) : (
    <View style={[styles.fill, side, { paddingTop: top, paddingBottom: footer ? 0 : bottom }]}>
      <View style={[styles.fill, column, contentStyle]}>{children}</View>
    </View>
  );

  return (
    <KeyboardAvoidingView style={[styles.fill, { backgroundColor: background }, style]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {header ? <ScreenColumnContext.Provider value={maxWidth === false ? false : Math.min(maxWidth, size.maxContent)}>{header}</ScreenColumnContext.Provider> : null}
      {body}
      {footer ? (
        <View
          onLayout={(e) => liftToast(e.nativeEvent.layout.height)}
          style={[side, styles.footer, { paddingBottom: bottom + space[3], backgroundColor: background }]}>
          <View style={column}>{footer}</View>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  footer: { paddingTop: space[3], borderTopWidth: 1, borderTopColor: color.line },
});
