/**
 * A small set of thin line glyphs drawn to match the brand (1.5pt stroke, round caps).
 * For tab bars and native headers use SF Symbols / Material Symbols through expo-router instead.
 */
import * as React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { color, type ColorName } from '../theme';
import { isRTL } from '../layout/rtl';

const paths = {
  back: 'M15 5l-7 7 7 7',
  forward: 'M9 5l7 7-7 7',
  chevronDown: 'M5 9l7 7 7-7',
  close: 'M6 6l12 12M18 6L6 18',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  search: 'M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14zM16 16l4.5 4.5',
  heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',
  comment: 'M5 5h14v10.5H10l-5 4V5z',
  flag: 'M6 21V4M6 4.5h11l-2.2 4 2.2 4H6',
  share: 'M12 15V4M8 7.5L12 4l4 3.5M6 12v7.5h12V12',
  send: 'M4 12l16-7-6 15-2.5-6.5L4 12z',
  bag: 'M5 8h14l-1 12H6L5 8zM9 8V6.5a3 3 0 0 1 6 0V8',
  lock: 'M7 11h10v9H7v-9zM9 11V8a3 3 0 0 1 6 0v3',
  pencil: 'M5 19l1-4L16.5 4.5l3 3L9 18l-4 1z',
  trash: 'M5 7h14M10 7V4.5h4V7M7 7l1 13h8l1-13',
  block: 'M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17zM6 6l12 12',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20.5c1-4 4-5.5 7.5-5.5s6.5 1.5 7.5 5.5',
  box: 'M3.5 8.5l8.5-4 8.5 4v8l-8.5 4-8.5-4v-8zM3.5 8.5l8.5 4 8.5-4M12 12.5v8',
  info: 'M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17zM12 11v5.5',
} as const;

export type IconName = keyof typeof paths | 'more' | 'heartFilled';

const DIRECTIONAL: IconName[] = ['back', 'forward', 'send'];

export interface IconProps {
  name: IconName;
  size?: number;
  tone?: ColorName;
  /** Raw colour, wins over `tone`. */
  colour?: string;
  style?: StyleProp<ViewStyle>;
}

export function Icon({ name, size = 22, tone = 'ink', colour, style }: IconProps) {
  const stroke = colour ?? color[tone];
  const flip = DIRECTIONAL.includes(name) && isRTL();
  return (
    <View
      style={[{ width: size, height: size }, flip ? { transform: [{ scaleX: -1 }] } : null, style]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none">
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        {name === 'more' ? (
          <>
            <Circle cx={5.5} cy={12} r={1.4} fill={stroke} />
            <Circle cx={12} cy={12} r={1.4} fill={stroke} />
            <Circle cx={18.5} cy={12} r={1.4} fill={stroke} />
          </>
        ) : (
          <Path
            d={name === 'heartFilled' ? paths.heart : paths[name]}
            stroke={stroke}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={name === 'heartFilled' ? stroke : 'none'}
          />
        )}
        {name === 'info' ? <Circle cx={12} cy={8} r={0.9} fill={stroke} /> : null}
      </Svg>
    </View>
  );
}
