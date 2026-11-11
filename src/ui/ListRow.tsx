import * as React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { color, gutter, hit, space } from '../theme';
import { Icon } from './Icon';
import { Press, type PressProps } from './Pressable';
import { Text } from './Text';

export interface ListRowProps extends Omit<PressProps, 'children' | 'style'> {
  title: string;
  subtitle?: string;
  /** At the start edge: an avatar, an icon, a product thumbnail. */
  leading?: React.ReactNode;
  /** At the end edge: a value, a switch, a price. */
  trailing?: React.ReactNode;
  /** Show a disclosure chevron. Default: true when `onPress` is set and there is no trailing. */
  chevron?: boolean;
  destructive?: boolean;
  /** Draw the hairline under the row, starting at the text. Default true. */
  divider?: boolean;
  /** Apply the page gutter. Default true. Pass false inside an already padded container. */
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function ListRow({ title, subtitle, leading, trailing, chevron, destructive, divider = true, padded = true, onPress, style, ...rest }: ListRowProps) {
  const showChevron = chevron ?? (!!onPress && !trailing);
  const content = (
    <View style={[styles.row, padded ? { paddingHorizontal: gutter } : null]}>
      {leading ? <View style={styles.leading}>{leading}</View> : null}
      <View style={[styles.main, divider ? styles.divider : null]}>
        <View style={styles.text}>
          <Text variant="body" tone={destructive ? 'danger' : 'ink'} numberOfLines={2}>
            {title}
          </Text>
          {subtitle ? (
            <Text variant="caption" mute numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
        {showChevron ? <Icon name="forward" size={16} tone="faint" /> : null}
      </View>
    </View>
  );
  if (!onPress) return <View style={style}>{content}</View>;
  return (
    <Press accessibilityRole="button" onPress={onPress} pressScale={1} pressOpacity={0.6} haptic="select" style={style} {...rest}>
      {content}
    </Press>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'stretch', gap: space[3] },
  leading: { justifyContent: 'center', paddingVertical: space[2] },
  main: { flex: 1, minHeight: hit.button + 8, flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[3] },
  divider: { borderBottomWidth: 1, borderBottomColor: color.line },
  text: { flex: 1 },
  trailing: { alignSelf: 'center' },
});
