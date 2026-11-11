/**
 * wrk. design tokens.
 * Source: /mnt/project-files/storefront/src/00-core.css and wrk-design/visual-language.md (approved by naif).
 * Light mode only. No accent colour: the only "colour" is light on black.
 */
import { Platform } from 'react-native';

export const color = {
  /** Screen background: warm paper. */
  paper: '#F3F2EE',
  /** Cards, sheets, fields: white card stock. */
  stock: '#FBFAF7',
  ink: '#111112',
  mute: '#6B6A66',
  /** Placeholder text and disabled glyphs. */
  faint: '#B5B3AC',
  line: '#DCDAD3',
  /** Products and primary buttons. The product is the only black thing on a screen. */
  black: '#101011',
  black2: '#1A1A1C',
  /** Gloss-black foil highlight: light crossing black. */
  foil: '#47474B',
  onBlack: '#F3F2EE',
  /** Only for destructive and report actions. */
  danger: '#8A2B1F',
  /** Pressed state layers. */
  pressOnPaper: 'rgba(17,17,18,0.06)',
  pressOnBlack: 'rgba(243,242,238,0.14)',
  scrim: 'rgba(17,17,18,0.32)',
  transparent: 'transparent',
} as const;
export type ColorName = keyof typeof color;

/** 4pt grid. `space[4]` is the page gutter. */
export const space = {
  0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64,
  // Named steps (v1 names, used by the store code).
  gutter: 16, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 36, xxxl: 56,
} as const;
export const gutter = 16;
export const hairline = 1;

export const radius = {
  /** Underline fields have no radius. */
  field: 0,
  small: 10,
  sm: 10,
  md: 14,
  /** Sheets and panels (18 to 22 on the storefront). */
  panel: 20,
  /** Buttons and chips are always fully round. */
  pill: 999,
} as const;

/** Smallest comfortable touch target on both platforms. */
export const hit = { min: 44, button: 48, buttonLarge: 56, buttonSmall: 40 } as const;
export const size = { tap: 48, field: 46, twoPaneMin: 700, maxContent: 1120 } as const;

/** v1 names, kept: durations in ms and cubic-bezier control points for Easing.bezier(...ease.set). */
export const duration = { fast: 180, move: 550, lid: 1100 } as const;
export const ease = { lid: [0.6, 0, 0.2, 1], set: [0.2, 0.9, 0.25, 1] } as const;

/**
 * Motion behaves like a real object: weight, light, a lid lifting. Nothing bounces for show.
 * Springs are for touch feedback and sheets only.
 */
export const motion = {
  ...duration,
  /** `lid`: heavy things (a lid, a drawer, a sheet). `set`: an object being set down. */
  ease,
  spring: {
    /** Press feedback: quick, critically damped, no wobble. */
    press: { damping: 22, stiffness: 420, mass: 0.6 },
    /** An object set down on paper: one soft settle. */
    set: { damping: 18, stiffness: 220, mass: 0.9 },
    /** Sheets: heavy. */
    sheet: { damping: 30, stiffness: 300, mass: 1 },
  },
} as const;

/** Width breakpoints in points. Read the window at render time, never cache it. */
export const breakpoint = {
  /** Below this: one column (phone, folded outer screen). */
  medium: 600,
  /** List and detail side by side from here (PLAN.md). */
  twoPane: 700,
  /** Tablets and large unfolded screens. */
  expanded: 840,
  /** Longest comfortable line for Arabic body text. */
  readable: 640,
} as const;

/**
 * One light from the top-left, soft long shadow to the bottom-right (RTL does not flip light).
 * Use on product objects only, never on UI cards.
 */
export const shadow = {
  object: Platform.select({
    android: { elevation: 10, shadowColor: '#111112' },
    default: {
      boxShadow: '14px 22px 34px -16px rgba(17,17,18,0.42), 3px 5px 8px -3px rgba(17,17,18,0.28)',
    },
  }) as object,
  /** Floating chrome (toast, floating button) when glass is not available. */
  float: Platform.select({
    android: { elevation: 3, shadowColor: '#111112' },
    default: { boxShadow: '0px 8px 24px -10px rgba(17,17,18,0.28)' },
  }) as object,
} as const;

export const zIndex = { header: 10, sheet: 50, toast: 60 } as const;
