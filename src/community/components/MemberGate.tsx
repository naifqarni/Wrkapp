/**
 * What someone who is not a member sees on the community tab: not a feed, a door.
 * The door has one handle: an invite code. Everything else is a quiet line underneath.
 * One object on paper (the badge, its name card still blank), set down once, dead centre.
 */
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, KeyboardAvoidingView, Platform, ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { community as s } from '@/i18n/community';

import { checkInvite, inviteComplete, normalizeInvite } from '../api/access';
import { errorCode, errorText } from '../state/hooks';
import { Button, color, easeLid, Field, font, haptic, Sheet, space, T, Tap } from '../ui/kit';

/** The badge holder before it has an owner: black leather, a blank cotton card. */
function BlankBadge({ height }: { height: number }) {
  const strap = Math.round(height * 0.2);
  const bodyH = height - strap;
  const w = Math.round(bodyH * 0.64);
  const pad = Math.round(bodyH * 0.085);
  return (
    <View style={{ width: w, height, alignItems: 'center' }} accessible={false}>
      <View style={{ width: Math.round(w * 0.2), height: strap + 3, backgroundColor: color.black2 }} />
      <View
        style={[
          { width: w, height: bodyH, marginTop: -3, borderRadius: Math.max(6, bodyH * 0.065), backgroundColor: color.black },
          // one light from the top-left, a long soft shadow to the bottom-right
          { boxShadow: '18px 28px 44px -20px rgba(17,17,18,0.5), 4px 6px 10px -4px rgba(17,17,18,0.3)' } as object,
        ]}>
        <View style={{ alignSelf: 'center', marginTop: pad * 0.9, width: w * 0.3, height: Math.max(3, bodyH * 0.032), borderRadius: 3, backgroundColor: color.paper }} />
        <View style={{ position: 'absolute', top: bodyH * 0.19, bottom: pad, left: pad, right: pad, borderRadius: 3, backgroundColor: color.stock, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: bodyH * 0.09 }}>
          <T style={{ fontFamily: font.mark, fontSize: Math.round(bodyH * 0.1), lineHeight: Math.round(bodyH * 0.14), color: color.ink, writingDirection: 'ltr' }}>wrk.</T>
        </View>
      </View>
    </View>
  );
}

export function MemberGate() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  // A phone on its side, or a folded Duo in landscape: no room to stack, so badge and form sit side by side.
  const sideBySide = width > height && height < 560;
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [why, setWhy] = useState(false);

  // The badge is set down once, with weight. Nothing loops. Only opacity and a straight drop,
  // so it lands exactly on the centre line at every size.
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(a, { toValue: 1, duration: 900, easing: easeLid, useNativeDriver: true }).start();
  }, [a]);

  const enter = async () => {
    if (!inviteComplete(code)) {
      haptic.warning();
      return setError(s.access.inviteBad);
    }
    setBusy(true);
    setError(null);
    try {
      await checkInvite(code);
      router.push({ pathname: '/community/verify', params: { mode: 'invite', code } });
    } catch (e) {
      haptic.error();
      setError(errorCode(e) === 'network' ? errorText(e) : s.access.inviteBad);
    } finally {
      setBusy(false);
    }
  };

  const badge = (
    <Animated.View style={{ alignItems: 'center', opacity: a.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }), transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [-14, 0] }) }] }}>
      <BlankBadge height={sideBySide ? Math.min(190, height - insets.top - insets.bottom - 120) : Math.min(190, Math.max(120, height * 0.22))} />
    </Animated.View>
  );

  const form = (
    <View style={{ width: '100%', maxWidth: 340, alignItems: 'stretch' }}>
      <View style={{ alignItems: 'center', gap: 6 }}>
        <T v="display" center accessibilityRole="header">{s.gate.title}</T>
        <T mute center>{s.gate.body}</T>
      </View>
      <View style={{ marginTop: 22 }}>
        <Field
          testID="gate-code"
          ltr
          accessibilityLabel={s.access.inviteLabel}
          value={code}
          onChangeText={(v) => {
            setCode(v.length < code.length ? v.toUpperCase() : normalizeInvite(v));
            if (error) setError(null);
          }}
          error={error}
          placeholder={s.access.invitePlaceholder}
          autoCapitalize="characters"
          autoCorrect={false}
          spellCheck={false}
          maxLength={13}
          returnKeyType="go"
          onSubmitEditing={enter}
          style={{ letterSpacing: 2, textAlign: 'center' }}
        />
      </View>
      <Button testID="gate-enter" label={s.gate.enter} onPress={enter} loading={busy} style={{ marginTop: 18 }} />
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 28, marginTop: 14 }}>
        <Tap testID="gate-why" onPress={() => setWhy(true)} hitSlop={12} style={{ minHeight: 44, justifyContent: 'center' }}>
          <T v="caption" mute>{s.gate.noInvite}</T>
        </Tap>
        <Tap testID="gate-member" onPress={() => router.push({ pathname: '/community/verify', params: { mode: 'member' } })} hitSlop={12} style={{ minHeight: 44, justifyContent: 'center' }}>
          <T v="caption" mute>{s.gate.member}</T>
        </Tap>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: color.paper }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        testID="member-gate"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          alignItems: 'center',
          flexDirection: sideBySide ? 'row' : 'column',
          gap: sideBySide ? 56 : 30,
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 24,
          paddingLeft: Math.max(insets.left, 28),
          paddingRight: Math.max(insets.right, 28),
        }}>
        {badge}
        {form}
      </ScrollView>

      <Sheet visible={why} onClose={() => setWhy(false)} testID="why-sheet">
        <View style={{ paddingHorizontal: space.gutter, gap: 10 }}>
          <T v="title">{s.gate.whyTitle}</T>
          <T>{s.gate.whyBody}</T>
          <T v="caption" mute style={{ marginTop: 10 }}>{s.gate.buyerLine}</T>
          <Button
            testID="gate-buyer"
            small
            variant="ghost"
            label={s.gate.buyerAction}
            style={{ alignSelf: 'flex-start' }}
            onPress={() => {
              setWhy(false);
              router.push({ pathname: '/community/verify', params: { mode: 'buyer' } });
            }}
          />
        </View>
      </Sheet>
    </KeyboardAvoidingView>
  );
}
