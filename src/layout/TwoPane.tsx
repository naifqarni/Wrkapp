/**
 * List and detail. One pane on phones and on the folded iPhone Duo; side by side from 700pt.
 * When the device reports a vertical fold, the seam between the panes sits exactly on it, so
 * nothing is ever drawn across the crease or hinge gap.
 *
 * Keep ONE piece of state for "what is selected" and render both panes from it. When the phone
 * is unfolded mid-task the detail simply appears beside the list; scroll position and state stay.
 */
import * as React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaInsetsContext, useSafeAreaInsets, type EdgeInsets } from 'react-native-safe-area-context';
import { color, hairline } from '../theme';
import { isRTL } from './rtl';
import { useLayoutClass } from './useLayoutClass';

export interface TwoPaneProps {
  list: React.ReactNode;
  /** The detail pane. Pass null when nothing is selected. */
  detail: React.ReactNode | null;
  /** One-pane mode only: which pane is visible. Defaults to "detail when there is one". */
  showDetail?: boolean;
  /** Two-pane mode only: shown in the detail pane while nothing is selected. */
  empty?: React.ReactNode;
  /** Preferred list width when there is no fold to align to. Default: 40% of the window, 320 to 420. */
  listWidth?: number;
  /** Force one pane (for flows that must stay focused, such as checkout). */
  single?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** True inside a TwoPane that is currently showing both panes. Lets a screen hide its own back button. */
const TwoPaneContext = React.createContext<{ twoPane: boolean; pane: 'list' | 'detail' | null }>({
  twoPane: false,
  pane: null,
});
export function useTwoPane() {
  return React.useContext(TwoPaneContext);
}

function PaneInsets({ zero, children }: { zero: 'left' | 'right'; children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const value = React.useMemo<EdgeInsets>(() => ({ ...insets, [zero]: 0 }), [insets, zero]);
  return <SafeAreaInsetsContext.Provider value={value}>{children}</SafeAreaInsetsContext.Provider>;
}

export function TwoPane({ list, detail, showDetail, empty, listWidth, single, style }: TwoPaneProps) {
  const { isTwoPane, width, fold } = useLayoutClass();
  const rtl = isRTL();

  if (!isTwoPane || single) {
    const detailVisible = showDetail ?? detail != null;
    return (
      <TwoPaneContext.Provider value={{ twoPane: false, pane: detailVisible ? 'detail' : 'list' }}>
        <View style={[styles.fill, style]}>
          {/* The list stays mounted so its scroll position survives opening a detail. */}
          <View style={[styles.fill, detailVisible && styles.hidden]} pointerEvents={detailVisible ? 'none' : 'auto'}>
            {list}
          </View>
          {detailVisible ? <View style={StyleSheet.absoluteFill}>{detail}</View> : null}
        </View>
      </TwoPaneContext.Provider>
    );
  }

  // Where does the seam go?
  let startWidth = listWidth ?? Math.min(420, Math.max(320, Math.round(width * 0.4)));
  let seam = hairline;
  let seamVisible = true;
  if (fold && fold.orientation === 'vertical' && fold.x >= 240 && fold.x + fold.width <= width - 240) {
    // The list is the START pane: on the right in RTL, on the left in LTR.
    startWidth = rtl ? width - (fold.x + fold.width) : fold.x;
    seam = Math.max(fold.width, fold.occludes ? fold.width : hairline);
    seamVisible = !fold.occludes;
  }

  return (
    <View style={[styles.row, style]}>
      <TwoPaneContext.Provider value={{ twoPane: true, pane: 'list' }}>
        <View style={{ width: startWidth }}>
          <PaneInsets zero={rtl ? 'left' : 'right'}>{list}</PaneInsets>
        </View>
      </TwoPaneContext.Provider>
      <View
        style={{ width: seam, backgroundColor: seamVisible && seam <= 2 ? color.line : color.paper }}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      <TwoPaneContext.Provider value={{ twoPane: true, pane: 'detail' }}>
        <View style={styles.fill}>
          <PaneInsets zero={rtl ? 'right' : 'left'}>{detail ?? empty ?? null}</PaneInsets>
        </View>
      </TwoPaneContext.Provider>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  row: { flex: 1, flexDirection: 'row' },
  hidden: { opacity: 0 },
});
