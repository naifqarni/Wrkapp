import * as React from 'react';
import { Platform, StyleSheet, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { color, font, motion, space } from '../theme';
import { Text } from './Text';

export interface FieldProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  /** Shown under the line in the mute colour. */
  hint?: string;
  /** Shown under the line; replaces `hint` and darkens the line. */
  error?: string | null;
  /** Latin content (email, code, English name): types and aligns left-to-right, in Jost. */
  ltr?: boolean;
  /** `display` is the big Alexandria line used for the name. `body` is for longer text. */
  size?: 'display' | 'body';
  trailing?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  ref?: React.Ref<React.ComponentRef<typeof TextInput>>;
}

/** The underline field from the storefront: no box, one line that turns ink when focused. */
export function Field({ label, hint, error, ltr, size = 'display', trailing, containerStyle, onFocus, onBlur, multiline, ref, ...rest }: FieldProps) {
  const focus = useSharedValue(0);
  const line = useAnimatedStyle(() => ({ opacity: focus.value }));
  const id = React.useId();
  // Web only: a browser <input> clips glyphs at the font's declared descent, which cuts the dots of a
  // final ي. A one-row <textarea> does not clip, so single-line Arabic fields render as one on web.
  const webOneLine = Platform.OS === 'web' && !multiline && !ltr && !rest.secureTextEntry;
  return (
    <View style={containerStyle}>
      {label ? (
        <Text variant="caption" mute nativeID={id}>
          {label}
        </Text>
      ) : null}
      <View style={styles.row}>
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          accessibilityLabelledBy={label ? id : undefined}
          placeholderTextColor={color.faint}
          selectionColor={color.ink}
          cursorColor={color.ink}
          multiline={multiline || webOneLine}
          {...(webOneLine ? { rows: 1, submitBehavior: 'blurAndSubmit' as const } : null)}
          maxFontSizeMultiplier={1.4}
          autoCapitalize={ltr ? 'none' : rest.autoCapitalize}
          {...rest}
          onFocus={(e) => {
            focus.value = withTiming(1, { duration: motion.fast });
            onFocus?.(e);
          }}
          onBlur={(e) => {
            focus.value = withTiming(0, { duration: motion.fast });
            onBlur?.(e);
          }}
          style={[
            styles.input,
            size === 'display'
              ? { fontFamily: ltr ? font.mark : font.display, fontSize: 20, lineHeight: 40, minHeight: 52 }
              : { fontFamily: ltr ? font.mark : font.body, fontSize: 16, lineHeight: 30 },
            { writingDirection: ltr ? 'ltr' : 'rtl', textAlign: ltr ? 'left' : 'right' },
            multiline ? styles.multiline : null,
            webOneLine ? (styles.webOneLine as object) : null,
          ]}
        />
        {trailing}
      </View>
      <View style={[styles.line, error ? { backgroundColor: color.danger } : null]}>
        <Animated.View style={[styles.lineOn, line]} />
      </View>
      {error || hint ? (
        <Text variant="caption" tone={error ? 'danger' : 'mute'} style={styles.help} accessibilityLiveRegion={error ? 'polite' : 'none'}>
          {error || hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  // Tall line and 6pt side padding (pulled back by the margin): the dots under ي and the tails of ص ع are
  // drawn outside the normal line box and a tight input cuts them off.
  input: { flex: 1, minHeight: 46, paddingVertical: 4, paddingHorizontal: 6, marginHorizontal: -6, color: color.ink, outlineStyle: 'none', outlineWidth: 0 } as object,
  multiline: { minHeight: 96, textAlignVertical: 'top', paddingTop: 10 },
  webOneLine: { resize: 'none', overflow: 'hidden', whiteSpace: 'nowrap', height: 52, paddingTop: 6, paddingBottom: 6 } as object,
  line: { height: 1, backgroundColor: color.line },
  lineOn: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: color.ink },
  help: { marginTop: space[1] },
});
