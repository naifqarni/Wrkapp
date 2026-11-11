/**
 * Mount once at the app root (inside SafeAreaProvider). It measures the fold and feeds `useLayoutClass()`.
 * Everything works without it; you only lose fold-aware pane splitting.
 */
import * as React from 'react';
import { Platform, StyleSheet, View, useWindowDimensions, type ViewProps } from 'react-native';
import { ReservedRegionsProvider, useReservedRegions } from 'react-native-reserved-regions';
import type { Hinge } from 'expo-hinge';

export interface FoldRect {
  /** From the provider's left edge, in points. Physical, never flipped by RTL. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** True when pixels under the fold are hidden (a real gap). False for a seamless crease. */
  occludes: boolean;
  /** `vertical`: left and right halves (book). `horizontal`: top and bottom halves (tabletop). */
  orientation: 'vertical' | 'horizontal';
}

/** Width of the system side rail (iPhone Duo) on each PHYSICAL side, in points. Never flipped by RTL. */
export interface RailInsets {
  left: number;
  right: number;
  /** `regions`: measured by the system. `fallback`: assumed, because the system reported nothing. `none`: no rail. */
  source: 'regions' | 'fallback' | 'simulated' | 'none';
}

export const NO_RAIL: RailInsets = { left: 0, right: 0, source: 'none' };
/** Apple's documented width of the iPhone Duo side rail. Used only when the system reports no region. */
export const RAIL_FALLBACK = 84;

export interface LayoutSimulation {
  hinge?: Hinge | null;
  fold?: FoldRect | null;
  rail?: { left?: number; right?: number } | null;
}

interface Ctx {
  fold: FoldRect | null;
  /** Rail measured from the system's occlusion regions, or null when none was reported. */
  rail: RailInsets | null;
  simulate: LayoutSimulation | null;
}

export const LayoutContext = React.createContext<Ctx>({ fold: null, rail: null, simulate: null });

/**
 * The side rail from the occlusion regions. iOS only: on Android occlusions are display cutouts, which
 * the safe area already covers. A region counts as the rail when it is narrow and hugs a side edge;
 * anything wide or near the middle (a Dynamic Island) is ignored.
 */
function railFrom(regions: readonly { kind: string; frame: { x: number; y: number; width: number; height: number } }[], width: number): RailInsets | null {
  if (Platform.OS !== 'ios' || width <= 0) return null;
  let left = 0;
  let right = 0;
  for (const r of regions) {
    if (r.kind !== 'occlusion') continue;
    const f = r.frame;
    if (f.width <= 0 || f.width > 140) continue;
    const mid = f.x + f.width / 2;
    if (mid > width - 110) right = Math.max(right, width - f.x);
    else if (mid < 110) left = Math.max(left, f.x + f.width);
  }
  if (!left && !right) return null;
  // The regions are the floating pieces; keep the documented rail width as the floor.
  return { left: left ? Math.max(left, RAIL_FALLBACK) : 0, right: right ? Math.max(right, RAIL_FALLBACK) : 0, source: 'regions' };
}

/** Web preview only: `?rail=84` (or `?rail=-84` for the left side) pretends a rail exists. */
function railFromQuery(): RailInsets | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  if (!__DEV__ && process.env.EXPO_PUBLIC_DEV_GALLERY !== '1') return null;
  const n = Number(new URLSearchParams(window.location.search).get('rail'));
  if (!n) return null;
  return { left: n < 0 ? -n : 0, right: n > 0 ? n : 0, source: 'simulated' };
}


function FoldReader({ simulate, children }: { simulate: LayoutSimulation | null; children: React.ReactNode }) {
  const regions = useReservedRegions();
  const { width } = useWindowDimensions();
  const value = React.useMemo<Ctx>(() => {
    const division = regions.find((r) => r.kind === 'division');
    let fold: FoldRect | null = null;
    if (division && division.kind === 'division') {
      const f = division.frame;
      fold = {
        x: f.x,
        y: f.y,
        width: f.width,
        height: f.height,
        occludes: division.occludesContent,
        orientation: f.height >= f.width ? 'vertical' : 'horizontal',
      };
    }
    const sim = simulate?.rail;
    const rail: RailInsets | null = sim ? { left: sim.left ?? 0, right: sim.right ?? 0, source: 'simulated' } : sim === null ? null : railFromQuery() ?? railFrom(regions, width);
    return { fold: simulate?.fold !== undefined ? simulate.fold : fold, rail, simulate };
  }, [regions, simulate, width]);
  return (
    <LayoutContext.Provider value={value}>
      {children}
      {value.rail?.source === 'simulated' ? <FakeRail rail={value.rail} /> : null}
    </LayoutContext.Provider>
  );
}

/** Preview only: a grey pill where the system rail floats, so overlaps show up in screenshots. */
function FakeRail({ rail }: { rail: RailInsets }) {
  const w = rail.right || rail.left;
  return (
    <View
      pointerEvents="none"
      style={[
        { position: 'absolute', top: 24, width: w - 30, height: 150, borderRadius: 30, backgroundColor: 'rgba(17,17,18,0.16)' },
        rail.right ? { right: 15 } : { left: 15 },
      ]}
    />
  );
}

export interface LayoutProviderProps extends ViewProps {
  /** Development only: pretend a hinge and fold exist (web preview, screenshots, tests). */
  simulate?: LayoutSimulation | null;
}

export function LayoutProvider({ simulate = null, style, children, ...rest }: LayoutProviderProps) {
  return (
    <ReservedRegionsProvider style={[styles.fill, style]} {...rest}>
      <FoldReader simulate={simulate}>{children}</FoldReader>
    </ReservedRegionsProvider>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
