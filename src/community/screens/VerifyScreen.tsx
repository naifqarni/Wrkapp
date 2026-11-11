/**
 * Getting in. The community is members only, and there are three doors (route param `mode`):
 *   invite : invite code, work email, six-digit code, pseudonym, rules
 *   buyer  : the email of a wrk. order, six-digit code, pseudonym, rules
 *   member : a returning member's email, six-digit code
 *   work   : a member without a company adds their work email
 * Short steps on one screen. Nothing here asks for a name, a photo or a phone number.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { community as s } from '@/i18n/community';

import { getCommunityApi } from '../api';
import { checkInvite, inviteComplete, normalizeInvite, requestCode, requestWorkCode, verifyWorkCode, type Access } from '../api/access';
import { BadgeMark } from '../components/BadgeMark';
import { Page } from '../components/Page';
import { RulesBody } from '../components/RulesBody';
import { errorCode, errorText, useUpdateMe } from '../state/hooks';
import { useSession } from '../state/session';
import { Button, color, easeSet, Field, font, haptic, Num, Row, space, T, Tap, Toggle, useShort } from '../ui/kit';

type Mode = 'invite' | 'buyer' | 'member' | 'work';
type Step = 'invite' | 'email' | 'code' | 'identity' | 'rules';
const FLOW: Record<Mode, Step[]> = {
  invite: ['invite', 'email', 'code', 'identity', 'rules'],
  buyer: ['email', 'code', 'identity', 'rules'],
  member: ['email', 'code'],
  work: ['email', 'code'],
};
const CODE_LEN = 6;
const RESEND_AFTER = 45;

/** Quick local check so the person hears about a personal address before waiting for the server. */
const FREE = /@(gmail|googlemail|hotmail|outlook|live|msn|yahoo|ymail|icloud|me|mac|proton|protonmail|aol|gmx|yandex|zoho)\.[a-z.]+$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function VerifyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const short = useShort();
  const { me, ready } = useSession();
  const params = useLocalSearchParams<{ mode?: string; code?: string }>();
  const mode: Mode = params.mode === 'buyer' || params.mode === 'member' || params.mode === 'work' ? params.mode : 'invite';
  const [invite, setInvite] = useState(() => normalizeInvite(params.code ?? ''));
  // A code already checked at the door goes straight to the email.
  const [step, setStep] = useState<Step>(mode === 'invite' && inviteComplete(normalizeInvite(params.code ?? '')) ? 'email' : FLOW[mode][0]);
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
    if (me && mode !== 'work') setStep(me.acceptedRulesAt ? 'identity' : 'rules');
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

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  // Only an invite and a work address must be a work email; a buyer uses the address they ordered with.
  const workOnly = mode === 'invite' || mode === 'work';
  const access: Access = mode === 'invite' ? { kind: 'invite', code: invite } : mode === 'buyer' ? { kind: 'buyer' } : { kind: 'member' };

  const submitInvite = async () => {
    if (!inviteComplete(invite)) return setError(s.access.inviteBad);
    setBusy(true);
    setError(null);
    try {
      await checkInvite(invite);
      setStep('email');
    } catch (e) {
      haptic.error();
      setError(errorCode(e) === 'network' ? errorText(e) : s.access.inviteBad);
    } finally {
      setBusy(false);
    }
  };
  const cleanEmail = email.trim().toLowerCase();

  const sendCode = async (resend = false) => {
    if (!EMAIL.test(cleanEmail)) return setError(s.errors['invalid-email']);
    if (workOnly && FREE.test(cleanEmail)) return setError(s.errors['free-mail']);
    setBusy(true);
    setError(null);
    try {
      await (mode === 'work' ? requestWorkCode(cleanEmail) : requestCode(cleanEmail, access));
      setWait(RESEND_AFTER);
      if (!resend) {
        setCode('');
        setStep('code');
      }
    } catch (e) {
      haptic.error();
      setError(errorText(e));
      if (errorCode(e) === 'rate-limited') setWait(RESEND_AFTER);
      // A code that stopped being valid sends the person back to fix it.
      if (mode === 'invite' && ['not-invited', 'invite-used'].includes(errorCode(e) as string)) setStep('invite');
    } finally {
      setBusy(false);
    }
  };

  const checkCode = async (value: string) => {
    if (value.length !== CODE_LEN || busy) return;
    setBusy(true);
    setError(null);
    try {
      const next = await (mode === 'work' ? verifyWorkCode(cleanEmail, value) : getCommunityApi().verifyEmailCode(cleanEmail, value));
      useSession.getState().set(next);
      haptic.success();
      // Someone who is already a member is simply in, whichever door they used.
      if (mode === 'work' || next.acceptedRulesAt) close();
      else setStep('identity');
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

  const flow = FLOW[mode];
  const index = Math.max(0, flow.indexOf(step));
  const emailTitle = mode === 'buyer' ? s.access.buyerTitle : mode === 'member' ? s.access.memberTitle : mode === 'work' ? s.access.workTitle : s.verify.emailTitle;
  const emailBody = mode === 'buyer' ? s.access.buyerBody : mode === 'member' ? s.access.memberBody : mode === 'work' ? s.access.workBody : s.verify.emailBody;

  return (
    <Page title={mode === 'work' ? s.gate.verify : s.gate.join} modal open>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={64}>
        {/* where you are: four dots, the brand's own mark */}
        <View accessibilityLabel={`${index + 1} / ${flow.length}`} style={{ flexDirection: 'row', gap: 8, paddingHorizontal: space.gutter, paddingTop: short ? 2 : 14 }}>
          {flow.map((_, i) => (
            <View key={i} style={{ width: 7, height: 7, borderRadius: 4, borderWidth: 1, borderColor: i <= index ? color.ink : color.faint, backgroundColor: i <= index ? color.ink : 'transparent' }} />
          ))}
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: space.gutter, paddingTop: short ? 10 : 22, paddingBottom: short ? 12 : 24, flexGrow: 1 }}>
          <Animated.View style={{ flex: 1, opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }}>
            {step === 'invite' && (
              <View style={{ gap: 12 }} testID="step-invite">
                <T v="display">{s.access.inviteTitle}</T>
                <T mute>{s.access.inviteBody}</T>
                <View style={{ marginTop: 18 }}>
                  <Field
                    testID="invite-input"
                    label={s.access.inviteLabel}
                    ltr
                    value={invite}
                    onChangeText={(v) => {
                      // Deleting the dash should not put it straight back.
                      setInvite(v.length < invite.length ? v.toUpperCase() : normalizeInvite(v));
                      if (error) setError(null);
                    }}
                    error={error}
                    placeholder={s.access.invitePlaceholder}
                    autoFocus
                    autoCapitalize="characters"
                    autoCorrect={false}
                    spellCheck={false}
                    maxLength={13}
                    returnKeyType="next"
                    onSubmitEditing={submitInvite}
                    style={{ letterSpacing: 2 }}
                  />
                </View>
              </View>
            )}

            {step === 'email' && (
              <View style={{ gap: 12 }} testID="step-email">
                <T v="display">{emailTitle}</T>
                <T mute>{emailBody}</T>
                <View style={{ marginTop: 18 }}>
                  <Field
                    testID="email-input"
                    label={s.access.emailLabelPlain}
                    ltr
                    value={email}
                    onChangeText={(v) => {
                      setEmail(v);
                      if (error) setError(null);
                    }}
                    error={error}
                    placeholder={workOnly ? s.verify.emailPlaceholder : s.access.placeholderPlain}
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
                {workOnly ? <T v="caption" mute style={{ marginTop: 8 }}>{s.verify.privacy}</T> : null}
              </View>
            )}

            {step === 'code' && (
              <View style={{ gap: 12 }} testID="step-code">
                <T v="display">{s.verify.codeTitle}</T>
                <T mute>
                  {s.verify.codeBody} <Num>{cleanEmail}</Num>
                </T>
                <Pressable onPress={() => codeRef.current?.focus()} accessible={false} style={{ marginTop: short ? 4 : 22 }}>
                  {/* Digits always read left to right, also inside an RTL screen. */}
                  <View style={[{ flexDirection: 'row', gap: 10, justifyContent: 'center' }, Platform.OS !== 'web' && { direction: 'ltr' }]} {...(Platform.OS === 'web' ? ({ dir: 'ltr' } as object) : null)} pointerEvents="none">
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
                <View style={{ alignItems: 'center', gap: 14, marginVertical: short ? 8 : 26 }}>
                  <View style={{ boxShadow: '10px 16px 26px -14px rgba(17,17,18,0.45)' } as object}>
                    <BadgeMark seed={me.handle} height={132} />
                  </View>
                  <T v="title" testID="my-handle">{me.handle}</T>
                  <Button testID="another-handle" small variant="ghost" label={s.verify.another} onPress={() => update.mutate({ regenerateHandle: true })} loading={update.isPending && update.variables?.regenerateHandle} />
                </View>
                {me.companyName ? (
                <View style={{ borderTopWidth: 1, borderBottomWidth: 1, borderColor: color.line, marginHorizontal: -space.gutter }}>
                  <Row
                    label={s.verify.showCompany}
                    detail={me.showCompany ? me.companyName : s.verify.showCompanyOff}
                    end={<Toggle testID="show-company" label={s.verify.showCompany} value={me.showCompany} onChange={(v) => update.mutate({ showCompany: v })} />}
                  />
                </View>
                ) : null}
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
          {step === 'invite' && <Button testID="invite-next" label={s.access.inviteNext} onPress={submitInvite} loading={busy} disabled={invite.length < 5} />}
          {step === 'email' && <Button testID="email-send" label={s.verify.send} onPress={() => sendCode()} loading={busy} disabled={!email.trim()} />}
          {step === 'code' && <Button testID="code-confirm" label={s.verify.confirm} onPress={() => checkCode(code)} loading={busy} disabled={code.length !== CODE_LEN} />}
          {step === 'identity' && <Button testID="identity-next" label={me?.acceptedRulesAt ? s.actions.done : s.verify.next} onPress={() => (me?.acceptedRulesAt ? close() : setStep('rules'))} />}
          {step === 'rules' && <Button testID="rules-accept" label={s.rules.accept} onPress={acceptRules} loading={busy} />}
        </View>
      </KeyboardAvoidingView>
    </Page>
  );
}
