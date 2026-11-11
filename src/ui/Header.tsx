/**
 * In-content header for TAB ROOT screens: the wordmark at the start, actions at the end.
 * For pushed screens use the native Stack header instead (see `stackHeader` in ./native-options),
 * so iOS 27 can move the buttons into the iPhone Duo rail and Android gets predictive back.
 */
import * as React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, gutter, space } from '../theme';
import { useTwoPane } from '../layout/TwoPane';
import { ScreenColumnContext } from './Screen';
import { IconButton } from './IconButton';
import { Text } from './Text';
import { Wordmark } from './Wordmark';

export interface HeaderProps {
  /** A title instead of the wordmark. */
  title?: string;
  /** Shows a back button at the start. Hidden automatically in the detail pane of a two-pane layout. */
  onBack?: () => void;
  backLabel?: string;
  /** Cart count for the wordmark dot. */
  cartCount?: number;
  onPressCart?: () => void;
  cartLabel?: string;
  /** Buttons at the end edge. */
  trailing?: React.ReactNode;
  /** Pad for the status bar and side rail. Default true. */
  inset?: boolean;
  /** Draw a hairline under the header (when content scrolls beneath). */
  divider?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Header({ title, onBack, backLabel = 'رجوع', cartCount, onPressCart, cartLabel, trailing, inset = true, divider, style }: HeaderProps) {
  const insets = useSafeAreaInsets();
  const column = React.useContext(ScreenColumnContext);
  const pane = useTwoPane();
  const showBack = !!onBack && !(pane.twoPane && pane.pane === 'detail');
  return (
    <View
      style={[
        styles.wrap,
        inset ? { paddingTop: insets.top, paddingLeft: insets.left + gutter, paddingRight: insets.right + gutter } : { paddingHorizontal: gutter },
        divider ? styles.divider : null,
        style,
      ]}>
      <View style={[styles.row, column ? { width: '100%', maxWidth: column, alignSelf: 'center' } : null]}>
        <View style={[styles.side, title ? styles.titleSide : null]}>
          {showBack ? <IconButton icon="back" label={backLabel} onPress={onBack} style={styles.back} /> : null}
          {title ? (
            <Text variant="headline" numberOfLines={1} accessibilityRole="header" style={styles.title}>
              {title}
            </Text>
          ) : (
            <Wordmark count={cartCount} onPressDot={onPressCart} dotLabel={cartLabel} />
          )}
        </View>
        <View style={styles.trailing}>{trailing}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: color.paper },
  divider: { borderBottomWidth: 1, borderBottomColor: color.line },
  row: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[3] },
  side: { flexDirection: 'row', alignItems: 'center', gap: space[1], flexShrink: 1 },
  back: { marginStart: -10 },
  // Side padding (pulled back by the margin) so single-line clipping never cuts an Arabic glyph's overhang.
  title: { flexShrink: 1, paddingHorizontal: 6 },
  titleSide: { marginHorizontal: -6 },
  trailing: { flexDirection: 'row', alignItems: 'center', gap: space[1], marginEnd: -10 },
});
