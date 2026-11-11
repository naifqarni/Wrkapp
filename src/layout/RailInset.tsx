/**
 * Keeps content out from under the iPhone Duo side rail.
 *
 * The rail floats over the right edge of the open device and (as seen on a real device) the safe
 * area does not always include it, so in RTL the start of every line would sit under it. This view
 * measures where it is in the window and pads only by the part of it the rail actually covers, so a
 * centred form sheet or the far pane of a split is left alone. It pads the content, never the native
 * navigators, so iOS keeps moving the tabs and header buttons into the rail.
 *
 * The root Stack wraps every pushed screen in one (`screenLayout`), and each tab route wraps itself.
 * Sides are physical (left/right), never start/end.
 */
import * as React from 'react';
import { View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import { useLayoutClass } from './useLayoutClass';

/** True beneath a <RailInset>, so nested ones (and <Screen>) do not pad twice. */
const RailInsetContext = React.createContext(false);
export const useInsideRailInset = () => React.useContext(RailInsetContext);

export function RailInset({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { rail } = useLayoutClass();
  const nested = useInsideRailInset();
  const { width: windowWidth } = useWindowDimensions();
  const ref = React.useRef<React.ComponentRef<typeof View>>(null);
  const active = !nested && (rail.left > 0 || rail.right > 0);
  // Until measured, assume the view spans the window: content must never flash under the rail.
  const [box, setBox] = React.useState<{ x: number; w: number } | null>(null);

  const measure = React.useCallback(() => {
    ref.current?.measureInWindow((x: number, _y: number, w: number) => {
      if (!Number.isFinite(x) || !w) return;
      setBox((prev) => (prev && Math.abs(prev.x - x) < 0.5 && Math.abs(prev.w - w) < 0.5 ? prev : { x, w }));
    });
  }, []);

  if (!active) return <View style={[{ flex: 1 }, style]}>{children}</View>;

  const x = box ? box.x : 0;
  const w = box ? box.w : windowWidth;
  const padLeft = Math.min(rail.left, Math.max(0, rail.left - x));
  const padRight = Math.min(rail.right, Math.max(0, x + w - (windowWidth - rail.right)));
  return (
    <RailInsetContext.Provider value>
      <View ref={ref} onLayout={measure} style={[{ flex: 1, paddingLeft: padLeft, paddingRight: padRight }, style]}>
        {children}
      </View>
    </RailInsetContext.Provider>
  );
}
