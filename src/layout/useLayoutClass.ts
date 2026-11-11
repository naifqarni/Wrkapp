/**
 * One hook for every adaptive decision.
 *
 *   const { widthClass, isTwoPane, posture } = useLayoutClass();
 *
 * Rules it encodes (Apple iPhone Duo guidance, Android large-screen guidance):
 * - Layout follows the WINDOW WIDTH, read at render time. Never the device model, never a cached size.
 *   The same code then handles iPhone Duo folded (compact) and open (regular), Split View
 *   (469pt left window), Galaxy/Pixel Fold, tablets, and desktop windows.
 * - The hinge is for interactions and effects (tabletop mode, a lid that follows the angle), not for
 *   choosing a layout.
 * - The fold rectangle only decides WHERE the seam between two panes goes.
 */
import * as React from 'react';
import { useWindowDimensions } from 'react-native';
import { useHinge, type Hinge } from 'expo-hinge';
import { breakpoint } from '../theme';
import { LayoutContext, type FoldRect } from './LayoutProvider';

export type WidthClass = 'compact' | 'medium' | 'expanded';

/**
 * - `none`: no hinge (ordinary phone, tablet, web).
 * - `closed`: folded shut, outer screen in use.
 * - `flat`: fully open.
 * - `tabletop`: half open, fold horizontal: the lower half lies on the table like a laptop.
 * - `book`: half open, fold vertical: held like a book.
 */
export type Posture = 'none' | 'closed' | 'flat' | 'tabletop' | 'book';

export interface LayoutClass {
  width: number;
  height: number;
  widthClass: WidthClass;
  /** True from 700pt: show list and detail side by side. */
  isTwoPane: boolean;
  /** True when the window is wider than tall. */
  isLandscape: boolean;
  hinge: Hinge | null;
  fold: FoldRect | null;
  posture: Posture;
}

export function widthClassFor(width: number): WidthClass {
  if (width >= breakpoint.expanded) return 'expanded';
  if (width >= breakpoint.medium) return 'medium';
  return 'compact';
}

export function postureFor(hinge: Hinge | null, fold: FoldRect | null, width: number, height: number): Posture {
  if (!hinge) return 'none';
  // Android never reports `closed`; an angle near zero means shut.
  if (hinge.status === 'closed' || hinge.angle < 15) return 'closed';
  if (hinge.status === 'fullyOpen' || hinge.angle > 165) return 'flat';
  if (hinge.status === 'unknown') return 'none';
  const orientation = fold ? fold.orientation : width >= height ? 'vertical' : 'horizontal';
  return orientation === 'horizontal' ? 'tabletop' : 'book';
}

export function useLayoutClass(): LayoutClass {
  const { width, height } = useWindowDimensions();
  const ctx = React.useContext(LayoutContext);
  const liveHinge = useHinge();
  const hinge = ctx.simulate?.hinge !== undefined ? ctx.simulate.hinge : liveHinge;
  const fold = ctx.fold;
  return React.useMemo(
    () => ({
      width,
      height,
      widthClass: widthClassFor(width),
      isTwoPane: width >= breakpoint.twoPane,
      isLandscape: width > height,
      hinge,
      fold,
      posture: postureFor(hinge, fold, width, height),
    }),
    [width, height, hinge, fold]
  );
}

/** Pick a value by width class. `pick({ compact: 2, medium: 3, expanded: 4 })`. */
export function useResponsive<T>(values: { compact: T; medium?: T; expanded?: T }): T {
  const { widthClass } = useLayoutClass();
  if (widthClass === 'expanded') return values.expanded ?? values.medium ?? values.compact;
  if (widthClass === 'medium') return values.medium ?? values.compact;
  return values.compact;
}
