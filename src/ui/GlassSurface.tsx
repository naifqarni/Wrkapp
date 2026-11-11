/**
 * Floating chrome: things that sit ABOVE content (a floating bar, a close button over a photo).
 * - iOS 26 and later: real Liquid Glass.
 * - Android, web, older iOS, or Reduce Transparency on: opaque card stock with a hairline. Material 3
 *   uses tonal surfaces rather than blur, so this is the native look there, not a downgrade.
 * Never put glass on content itself (lists, product photos, text blocks), and never stack glass on glass.
 */
import * as React from 'react';
import { AccessibilityInfo, Platform, StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { color, hairline, shadow } from '../theme';

let glassSupported: boolean | null = null;
export function hasLiquidGlass(): boolean {
  if (glassSupported == null) {
    try {
      glassSupported = Platform.OS === 'ios' && isLiquidGlassAvailable() && isGlassEffectAPIAvailable();
    } catch {
      glassSupported = false;
    }
  }
  return glassSupported;
}

function useReduceTransparency(): boolean {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    if (Platform.OS !== 'ios') return;
    let alive = true;
    AccessibilityInfo.isReduceTransparencyEnabled().then((v) => alive && setReduced(v));
    const sub = AccessibilityInfo.addEventListener('reduceTransparencyChanged', setReduced);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return reduced;
}

export interface GlassSurfaceProps extends ViewProps {
  /** The glass reacts to touch (use for buttons). */
  interactive?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function GlassSurface({ interactive, style, children, ...rest }: GlassSurfaceProps) {
  const reduced = useReduceTransparency();
  if (hasLiquidGlass() && !reduced) {
    return (
      <GlassView glassEffectStyle="regular" colorScheme="light" isInteractive={interactive} style={style} {...rest}>
        {children}
      </GlassView>
    );
  }
  return (
    <View style={[styles.fallback, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: color.stock,
    borderWidth: hairline,
    borderColor: color.line,
    ...shadow.float,
  },
});
