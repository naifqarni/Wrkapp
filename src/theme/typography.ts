/**
 * Type. Arabic display: Alexandria 200/300. Arabic body: Readex Pro 300/400.
 * "wrk.", numbers and mm: Jost 200/300, always LTR with tabular figures.
 */
import {
  Alexandria_200ExtraLight,
  Alexandria_300Light,
} from '@expo-google-fonts/alexandria';
import { Jost_200ExtraLight, Jost_300Light } from '@expo-google-fonts/jost';
import { ReadexPro_300Light, ReadexPro_400Regular } from '@expo-google-fonts/readex-pro';
import { useFonts } from 'expo-font';
import type { TextStyle } from 'react-native';

export const font = {
  display: 'Alexandria_300Light',
  displayThin: 'Alexandria_200ExtraLight',
  body: 'ReadexPro_300Light',
  bodyMedium: 'ReadexPro_400Regular',
  mark: 'Jost_300Light',
  markThin: 'Jost_200ExtraLight',
  // Aliases.
  displayLight: 'Alexandria_200ExtraLight',
  bodyRegular: 'ReadexPro_400Regular',
  markLight: 'Jost_200ExtraLight',
} as const;

/** Map for `useFonts`. Spread into the root layout if it loads other fonts too. */
export const wrkFontMap = {
  Alexandria_200ExtraLight,
  Alexandria_300Light,
  ReadexPro_300Light,
  ReadexPro_400Regular,
  Jost_200ExtraLight,
  Jost_300Light,
};

/** Loads the brand fonts. Returns true when ready (or when loading failed, so the app never blocks). */
export function useWrkFonts(): boolean {
  const [loaded, error] = useFonts(wrkFontMap);
  return loaded || error != null;
}

/**
 * Arabic needs tall lines: diacritics and descenders clip below 1.5.
 * Sizes are in points and scale with the system text size (capped per variant in <Text>).
 */
export const type = {
  /** Hero lines: a product name, a screen opener. */
  display: { fontFamily: font.displayLight, fontSize: 34, lineHeight: 52 },
  title: { fontFamily: font.displayLight, fontSize: 26, lineHeight: 42 },
  headline: { fontFamily: font.display, fontSize: 20, lineHeight: 32 },
  body: { fontFamily: font.body, fontSize: 16, lineHeight: 27 },
  bodyStrong: { fontFamily: font.bodyRegular, fontSize: 16, lineHeight: 27 },
  label: { fontFamily: font.bodyRegular, fontSize: 15, lineHeight: 22 },
  caption: { fontFamily: font.body, fontSize: 13, lineHeight: 20 },
  /** Latin, numbers, mm. */
  num: { fontFamily: font.mark, fontSize: 16, lineHeight: 22 },
  numLarge: { fontFamily: font.markLight, fontSize: 28, lineHeight: 34 },
} as const satisfies Record<string, TextStyle>;

export type TypeVariant = keyof typeof type;

/** Largest Dynamic Type multiplier per variant, so big titles do not break layouts. */
export const maxScale: Record<TypeVariant, number> = {
  display: 1.3,
  title: 1.4,
  headline: 1.5,
  body: 1.8,
  bodyStrong: 1.8,
  label: 1.6,
  caption: 1.8,
  num: 1.6,
  numLarge: 1.3,
};
