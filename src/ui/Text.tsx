import * as React from 'react';
import { Platform, Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';
import { color, maxScale, type, type ColorName, type TypeVariant } from '../theme';

export interface TextProps extends RNTextProps {
  /** display | title | headline | body | bodyStrong | label | caption | num | numLarge. Default body. */
  variant?: TypeVariant;
  /** Secondary text colour. */
  mute?: boolean;
  /** Any token colour. Wins over `mute`. */
  tone?: ColorName;
  center?: boolean;
  /** Latin or numeric content: lays out left-to-right. */
  ltr?: boolean;
}

/**
 * All text in the app. Arabic by default (RTL, aligned to the start edge).
 * Scales with the system text size, capped per variant so large titles do not break layouts.
 */
export function Text({ variant = 'body', mute, tone, center, ltr, style, ...rest }: TextProps) {
  const base: TextStyle = {
    ...type[variant],
    color: tone ? color[tone] : mute ? color.mute : color.ink,
    writingDirection: ltr ? 'ltr' : 'rtl',
    ...(center ? { textAlign: 'center' } : null),
  };
  const webDir = Platform.OS === 'web' ? ({ dir: ltr ? 'ltr' : 'rtl' } as object) : null;
  // Web only: a truncating line clips at its box, and Alexandria / Readex draw the dots of ي and the
  // tails of ع ص below the declared descent. Give the box room below and take it back with a margin.
  const size = type[variant].fontSize;
  const webRoom: TextStyle | null =
    Platform.OS === 'web' && !ltr && rest.numberOfLines != null
      ? { paddingBottom: Math.round(size * 0.4), marginBottom: -Math.round(size * 0.4) }
      : null;
  return <RNText maxFontSizeMultiplier={maxScale[variant]} {...webDir} {...rest} style={[base, webRoom, style]} />;
}

export interface NumProps extends Omit<TextProps, 'variant' | 'ltr'> {
  large?: boolean;
}

/** Numbers, prices, mm, order numbers: Jost, tabular figures, always left-to-right. */
export function Num({ large, style, ...rest }: NumProps) {
  return (
    <Text
      variant={large ? 'numLarge' : 'num'}
      ltr
      {...rest}
      style={[{ fontVariant: ['tabular-nums'], alignSelf: 'flex-start' }, style]}
    />
  );
}
