import * as React from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { color, hit } from '../theme';
import { GlassSurface } from './GlassSurface';
import { Icon, type IconName } from './Icon';
import { Press, type PressProps } from './Pressable';
import type { ColorName } from '../theme';

export interface IconButtonProps extends Omit<PressProps, 'children' | 'style'> {
  icon: IconName;
  /** Required: what the button does, for VoiceOver and TalkBack. */
  label: string;
  /** `plain`: just the glyph. `filled`: black circle. `glass`: floating over content (liquid glass on iOS 26+). */
  variant?: 'plain' | 'filled' | 'glass';
  tone?: ColorName;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export function IconButton({ icon, label, variant = 'plain', tone, size = hit.min, style, ...rest }: IconButtonProps) {
  const glyph = <Icon name={icon} tone={tone ?? (variant === 'filled' ? 'onBlack' : 'ink')} />;
  return (
    <Press
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      onDark={variant === 'filled'}
      {...rest}
      style={[styles.base, { width: size, height: size, borderRadius: size / 2 }, variant === 'filled' && styles.filled, style]}>
      {variant === 'glass' ? (
        <GlassSurface interactive style={[styles.base, { width: size, height: size, borderRadius: size / 2 }]}>
          {glyph}
        </GlassSurface>
      ) : (
        glyph
      )}
    </Press>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  filled: { backgroundColor: color.black },
});
