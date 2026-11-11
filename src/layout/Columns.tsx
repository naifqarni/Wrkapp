/**
 * A calm grid that adds columns as the window widens: 2 on phones, 3 on medium, 4 on expanded.
 * If a vertical fold is reported and the column count is even, the middle gutter sits on the fold.
 */
import * as React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { space } from '../theme';
import { useLayoutClass } from './useLayoutClass';

export interface ColumnsProps {
  children: React.ReactNode;
  columns?: { compact: number; medium?: number; expanded?: number };
  gap?: number;
  style?: StyleProp<ViewStyle>;
}

export function Columns({ children, columns = { compact: 2, medium: 3, expanded: 4 }, gap = space[4], style }: ColumnsProps) {
  const { widthClass, fold } = useLayoutClass();
  let n =
    widthClass === 'expanded'
      ? columns.expanded ?? columns.medium ?? columns.compact
      : widthClass === 'medium'
        ? columns.medium ?? columns.compact
        : columns.compact;
  // Odd column counts would put a column of products on the crease: round up to even.
  if (fold && fold.orientation === 'vertical' && n % 2 === 1 && n > 1) n += 1;
  const items = React.Children.toArray(children);
  const rows: React.ReactNode[][] = [];
  for (let i = 0; i < items.length; i += n) rows.push(items.slice(i, i + n));
  return (
    <View style={[{ gap }, style]}>
      {rows.map((row, r) => (
        <View key={r} style={[styles.row, { gap }]}>
          {row.map((child, c) => (
            <View key={c} style={styles.cell}>
              {child}
            </View>
          ))}
          {row.length < n
            ? Array.from({ length: n - row.length }, (_, k) => <View key={`pad${k}`} style={styles.cell} />)
            : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  cell: { flex: 1, minWidth: 0 },
});
