/**
 * Joining: work email, a six-digit code, the pseudonym you get, the rules.
 * Four short steps on one screen. Nothing here asks for a name, a photo or a phone number.
 */
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { community as s } from '@/i18n/community';

import { getCommunityApi } from '../api';
import { BadgeMark } from '../components/BadgeMark';
import { Page } from '../components/Page';
import { RulesBody } from '../components/RulesBody';
import { errorCode, errorText, useUpdateMe } from '../state/hooks';
import { useSession } from '../state/session';
import { Button, color, easeSet, Field, font, haptic, Num, Row, space, T, Tap, Toggle } from '../ui/kit';

type Step = 'email' | 'code' | 'identity' | 'rules';
const CODE_LEN = 6;
const RESEND_AFTER = 45;

/** Quick local check so the person hears about a personal address before waiting for the server. */
const FREE = /@(gmail|googlemail|hotmail|outlook|live|msn|yahoo|ymail|icloud|me|mac|proton|protonmail|aol|gmx|yandex|zoho)\.[a-z.]+$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function VerifyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { me, ready } = useSession();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);
  const codeRef = useRef<React.ComponentRef<typeof TextInput>>(null);
  const update = useUpdateMe();
  const started = useRef(false);

  // Someone who is already verified but never accepted the rules resumes at the rules.
  useEffect(() => {
    if (!ready || started.current) return;
    started.current = true;
    if (me) setStep(me.acceptedRulesAt ? 'identity' : 'rules');
  }, [ready, me]);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  // Each step arrives like a card set down: a short rise, no bounce.
  const a = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    a.setValue(0);
    Animated.timing(a, { toValue: 1, duration: 380, easing: easeSet, useNativeDriver: true }).start();
  }, [step, a]);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/community'));
  const cleanEmail = email.trim().toLowerCase();

  const sendCode = async (resend = false) => {
    if (!EMAIL.test(cleanEmail)) return setError(s.errors['invalid-email']);
    if (FREE.test(cleanEmail)) return setError(s.errors['free-mail']);
    setBusy(true);
    setError(null);
    try {
      await getCommunityApi().requestEmailCode(cleanEmail);
      setWait(RESEND_AFTER);
      if (!resend) {
        setCode('');
        setStep('code');
      }
    } catch (e) {
      haptic.error();
      setError(errorText(e));
      if (errorCode(e) === 'rate-limited') setWait(RESEND_AFTER);
    } finally {
      setBusy(false);
    }
  };

  const checkCode = async (value: string) => {
    if (value.length !== CODE_LEN || busy) return;
    setBusy(true);
    setError(null);
    try {
      const next = await getCommunityApi().verifyEmailCode(cleanEmail, value);
      useSession.getState().set(next);
      haptic.success();
      setStep('identity');
    } catch (e) {
      haptic.error();
      setError(errorText(e));
      setCode('');
      codeRef.current?.focus();
    } finally {
      setBusy(false);
    }
  };

  const acceptRules = async () => {
    setBusy(true);
    setError(null);
    try {
      const next = await getCommunityApi().acceptRules();
      useSession.getState().set(next);
      haptic.success();
      close();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const index = ['email', 'code', 'identity', 'rules'].indexOf(step);

  return (
    <Page title={s.verify.title} modal>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={64}>
        {/* where you are: four dots, the brand's own mark */}
        <View accessibilityLabel={`${index + 1} / 4`} style={{ flexDirection: 'row', gap: 8, paddingHorizontal: space.gutter, paddingTop: 14 }}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={{ width: 7, height: 7, borderRadius: 4, borderWidth: 1, borderColor: i <= index ? color.ink : color.faint, backgroundColor: i <= index ? color.ink : 'transparent' }} />
          ))}
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: space.gutter, paddingTop: 22, paddingBottom: 24, flexGrow: 1 }}>
          <Animated.View style={{ flex: 1, opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }}>
            {step === 'email' && (
              <View style={{ gap: 12 }} testID="step-email">
                <T v="display">{s.verify.emailTitle}</T>
                <T mute>{s.verify.emailBody}</T>
                <View style={{ marginTop: 18 }}>
                  <Field
                    testID="email-input"
                    label={s.verify.emailLabel}
                    ltr
                    value={email}
                    onChangeText={(v) => {
                      setEmail(v);
                      if (error) setError(null);
                    }}
                    error={error}
                    placeholder={s.verify.emailPlaceholder}
                    autoFocus
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    textContentType="emailAddress"
                    keyboardType="email-address"
                    returnKeyType="send"
                    onSubmitEditing={() => sendCode()}
                  />
                </View>
                <T v="caption" mute style={{ marginTop: 8 }}>{s.verify.privacy}</T>
              </View>
            )}

            {step === 'code' && (
              <View style={{ gap: 12 }} testID="step-code">
                <T v="display">{s.verify.codeTitle}</T>
                <T mute>
                  {s.verify.codeBody} <Num>{cleanEmail}</Num>
                </T>
                <Pressable onPress={() => codeRef.current?.focus()} accessible={false} style={{ marginTop: 22 }}>
                  {/* Digits always read left to right, also inside an RTL screen. */}
                  <View style={{ flexDirection: 'row', direction: 'ltr', gap: 10, justifyContent: 'center' }} pointerEvents="none">
                    {Array.from({ length: CODE_LEN }).map((_, i) => (
                      <View
                        key={i}
                        style={{ width: 40, height: 54, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 1.5, borderBottomColor: error ? color.danger : i === code.length ? color.ink : color.line }}>
                        <Num style={{ fontSize: 30, color: color.ink }}>{code[i] ?? ''}</Num>
                      </View>
                    ))}
                  </View>
                  <TextInput
                    ref={codeRef}
                    testID="code-input"
                    accessibilityLabel={s.verify.codeLabel}
                    value={code}
                    onChangeText={(v) => {
                      const digits = v.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/\D/g, '').slice(0, CODE_LEN);
                      setCode(digits);
                      if (error) setError(null);
                      if (digits.length === CODE_LEN) checkCode(digits);
                    }}
                    autoFocus
                    keyboardType="number-pad"
                    textContentType="oneTimeCode"
                    autoComplete="one-time-code"
                    maxLength={CODE_LEN}
                    caretHidden
                    style={{ position: 'absolute', top: 0, bottom: 0, start: 0, end: 0, opacity: 0.02, color: 'transparent', fontFamily: font.mark }}
                  />
                </Pressable>
                {error ? <T v="caption" danger center testID="code-error" accessibilityLiveRegion="polite">{error}</T> : null}
                <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 22, marginTop: 14 }}>
                  {wait > 0 ? (
                    <T v="caption" mute>
                      {s.verify.resendIn} <Num>{wait}</Num> {s.verify.seconds}
                    </T>
                  ) : (
                    <Tap testID="code-resend" onPress={() => sendCode(true)} hitSlop={10}>
                      <T v="label">{s.verify.resend}</T>
                    </Tap>
                  )}
                  <Tap
                    testID="code-change-email"
                    hitSlop={10}
                    onPress={() => {
                      setError(null);
                      setStep('email');
                    }}>
                    <T v="label" mute>{s.verify.changeEmail}</T>
                  </Tap>
                </View>
              </View>
            )}

            {step === 'identity' && me && (
              <View style={{ gap: 12 }} testID="step-identity">
                <T v="display">{s.verify.identityTitle}</T>
                <T mute>{s.verify.identityBody}</T>
                <View style={{ alignItems: 'center', gap: 14, marginVertical: 26 }}>
                  <View style={{ boxShadow: '10px 16px 26px -14px rgba(17,17,18,0.45)' } as object}>
                    <BadgeMark seed={me.handle} height={132} />
                  </View>
                  <T v="title" testID="my-handle">{me.handle}</T>
                  <Button testID="another-handle" small variant="ghost" label={s.verify.another} onPress={() => update.mutate({ regenerateHandle: true })} loading={update.isPending && update.variables?.regenerateHandle} />
                </View>
                <View style={{ borderTopWidth: 1, borderBottomWidth: 1, borderColor: color.line, marginHorizontal: -space.gutter }}>
                  <Row
                    label={s.verify.showCompany}
                    detail={me.showCompany ? me.companyName : s.verify.showCompanyOff}
                    end={<Toggle testID="show-company" label={s.verify.showCompany} value={me.showCompany} onChange={(v) => update.mutate({ showCompany: v })} />}
                  />
                </View>
              </View>
            )}

            {step === 'rules' && (
              <View style={{ gap: 16 }} testID="step-rules">
                <T v="display">{s.rules.title}</T>
                <RulesBody />
                {error ? <T v="caption" danger>{error}</T> : null}
              </View>
            )}
          </Animated.View>
        </ScrollView>

        <View style={{ paddingHorizontal: space.gutter, paddingBottom: Math.max(insets.bottom, 16), paddingTop: 8 }}>
          {step === 'email' && <Button testID="email-send" label={s.verify.send} onPress={() => sendCode()} loading={busy} disabled={!email.trim()} />}
          {step === 'code' && <Button testID="code-confirm" label={s.verify.confirm} onPress={() => checkCode(code)} loading={busy} disabled={code.length !== CODE_LEN} />}
          {step === 'identity' && <Button testID="identity-next" label={me?.acceptedRulesAt ? s.actions.done : s.verify.next} onPress={() => (me?.acceptedRulesAt ? close() : setStep('rules'))} />}
          {step === 'rules' && <Button testID="rules-accept" label={s.rules.accept} onPress={acceptRules} loading={busy} />}
        </View>
      </KeyboardAvoidingView>
    </Page>
  );
}
