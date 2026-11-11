/**
 * Mount once at the app root (inside SafeAreaProvider). It measures the fold and feeds `useLayoutClass()`.
 * Everything works without it; you only lose fold-aware pane splitting.
 */
import * as React from 'react';
import { StyleSheet, type ViewProps } from 'react-native';
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

export interface LayoutSimulation {
  hinge?: Hinge | null;
  fold?: FoldRect | null;
}

interface Ctx {
  fold: FoldRect | null;
  simulate: LayoutSimulation | null;
}

export const LayoutContext = React.createContext<Ctx>({ fold: null, simulate: null });


function FoldReader({ simulate, children }: { simulate: LayoutSimulation | null; children: React.ReactNode }) {
  const regions = useReservedRegions();
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
    return { fold: simulate?.fold !== undefined ? simulate.fold : fold, simulate };
  }, [regions, simulate]);
  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>;
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
