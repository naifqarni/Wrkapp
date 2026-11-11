import * as React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { space } from '../theme';
import { Button } from './Button';
import { Text } from './Text';

export interface EmptyStateProps {
  title: string;
  /** One short line. No selling. */
  body?: string;
  action?: { label: string; onPress: () => void };
  /** An object drawing above the title, if any. */
  art?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function EmptyState({ title, body, action, art, style }: EmptyStateProps) {
  return (
    <View style={[styles.wrap, style]}>
      {art}
      <Text variant="title" center>
        {title}
      </Text>
      {body ? (
        <Text mute center style={styles.body}>
          {body}
        </Text>
      ) : null}
      {action ? <Button label={action.label} variant="ghost" onPress={action.onPress} style={styles.action} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space[8], gap: space[2] },
  body: { maxWidth: 320 },
  action: { alignSelf: 'center', marginTop: space[4] },
});
