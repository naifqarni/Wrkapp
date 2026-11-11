/**
 * Tabletop mode: the phone half open on a desk, like a small laptop.
 * `stage` (the thing you look at: the 3D product, a photo) goes on the upright half;
 * `controls` (the things you touch: name field, add button) go on the half lying flat.
 * In every other posture it is a plain column: stage above, controls below.
 */
import * as React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useLayoutClass } from './useLayoutClass';

export interface TabletopSplitProps {
  stage: React.ReactNode;
  controls: React.ReactNode;
  /** Share of the height the stage takes when not in tabletop mode. Default 0.5. `auto` lets it size itself. */
  stageFlex?: number | 'auto';
  style?: StyleProp<ViewStyle>;
}

export function TabletopSplit({ stage, controls, stageFlex = 0.5, style }: TabletopSplitProps) {
  const { posture, fold } = useLayoutClass();
  if (posture === 'tabletop' && fold && fold.orientation === 'horizontal') {
    return (
      <View style={[styles.fill, style]}>
        <View style={{ height: fold.y }}>{stage}</View>
        <View style={{ height: fold.height }} />
        <View style={styles.fill}>{controls}</View>
      </View>
    );
  }
  return (
    <View style={[styles.fill, style]}>
      <View style={stageFlex === 'auto' ? undefined : { flex: stageFlex }}>{stage}</View>
      <View style={stageFlex === 'auto' ? styles.fill : { flex: 1 - stageFlex }}>{controls}</View>
    </View>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
