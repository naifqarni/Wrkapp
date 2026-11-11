import * as React from 'react';
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { color, hit, radius, space } from '../theme';
import type { HapticName } from './haptics';
import { Icon, type IconName } from './Icon';
import { Press, type PressProps } from './Pressable';
import { Text } from './Text';

export interface ButtonProps extends Omit<PressProps, 'children' | 'style'> {
  /** What the button does, as a verb: أضف، ادفع، انشر. */
  label: string;
  /** `primary`: black pill (one per screen). `ghost`: outlined pill. `quiet`: text only. `danger`: destructive text. */
  variant?: 'primary' | 'ghost' | 'quiet' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  /** Stretch to the container width. */
  full?: boolean;
  loading?: boolean;
  icon?: IconName;
  /** Extra content after the label, such as a <Price>. */
  trailing?: React.ReactNode;
  haptic?: HapticName | false;
  style?: StyleProp<ViewStyle>;
}

const HEIGHT = { sm: hit.buttonSmall, md: hit.button, lg: hit.buttonLarge } as const;

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  full,
  loading,
  icon,
  trailing,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const dark = variant === 'primary';
  const fg = dark ? 'onBlack' : variant === 'danger' ? 'danger' : 'ink';
  const h = HEIGHT[size];
  return (
    <Press
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      disabled={disabled || loading}
      onDark={dark}
      morph={{ from: h / 2, to: 16 }}
      hitSlop={size === 'sm' ? 4 : undefined}
      {...rest}
      style={[
        styles.base,
        { minHeight: h, borderRadius: radius.pill, paddingHorizontal: variant === 'quiet' || variant === 'danger' ? space[3] : size === 'sm' ? space[4] : 26 },
        dark && styles.primary,
        variant === 'ghost' && styles.ghost,
        full && styles.full,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={color[fg]} />
      ) : (
        <View style={styles.row}>
          {icon ? <Icon name={icon} size={18} tone={fg} /> : null}
          <Text variant="label" tone={fg} numberOfLines={1}>
            {label}
          </Text>
          {trailing}
        </View>
      )}
    </Press>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' },
  full: { alignSelf: 'stretch' },
  primary: { backgroundColor: color.black },
  ghost: { borderWidth: 1, borderColor: color.line },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
});
