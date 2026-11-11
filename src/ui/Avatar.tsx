/**
 * The community is pseudonymous: there are no photos, ever. An avatar is the first Latin letter or
 * Arabic letter of the random handle, set in a card-stock circle, like initials debossed on leather.
 */
import * as React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { color, font } from '../theme';
import { Text } from './Text';

export interface AvatarProps {
  /** The handle; its first letter is shown. */
  name: string;
  size?: number;
  /** Black disc for "me". */
  filled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Avatar({ name, size = 36, filled, style }: AvatarProps) {
  const letter = (Array.from(name.trim())[0] ?? '·').toLowerCase();
  const latin = /[a-z0-9]/i.test(letter);
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        { width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: filled ? color.black : color.stock, borderWidth: filled ? 0 : 1, borderColor: color.line },
        style,
      ]}>
      <Text
        ltr={latin}
        maxFontSizeMultiplier={1}
        style={{ fontFamily: latin ? font.mark : font.display, fontSize: size * 0.42, lineHeight: size * 0.62, color: filled ? color.onBlack : color.ink, textAlign: 'center' }}>
        {letter}
      </Text>
    </View>
  );
}
