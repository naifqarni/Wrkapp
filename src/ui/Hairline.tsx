import * as React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { color, hairline } from '../theme';

export interface HairlineProps {
  /** Inset from the start edge (to align with text after a leading avatar). */
  inset?: number;
  vertical?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Hairline({ inset = 0, vertical, style }: HairlineProps) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[
        vertical ? { width: hairline, alignSelf: 'stretch' } : { height: hairline, alignSelf: 'stretch', marginStart: inset },
        { backgroundColor: color.line },
        style,
      ]}
    />
  );
}
