import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { community as s } from '@/i18n/community';

import { can } from '../api/features';
import type { ChannelId } from '../api/types';
import { BadgeMark } from '../components/BadgeMark';
import { Page } from '../components/Page';
import { ConfirmSheet } from '../components/SafetySheet';
import { errorCode, errorText, useCreatePost } from '../state/hooks';
import { useSession } from '../state/session';
import { Button, Chip, color, Field, font, Hairline, haptic, inputRTL, Num, space, T, Tap, toast } from '../ui/kit';

const MAX = 2000;
const OPTION_MAX = 60;
const MAX_OPTIONS = 4;
const ORDER: ChannelId[] = ['company', 'all', 'first-day', 'salaries', 'interviews', 'culture', 'advice'];

/** A phone number, an email or an @account: the things that most often point at one person. */
export function looksPersonal(text: string): boolean {
  const latin = text.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
  return /(\+?\d[\d\s-]{7,}\d)/.test(latin) || /[^\s@]+@[^\s@]+\.[a-z]{2,}/i.test(latin) || /(^|\s)@[\w.]{3,}/.test(latin);
}

export function ComposeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ channel?: string }>();
  const { me, ready } = useSession();
  const hasCompany = !!me?.companyName;
  const asked = ORDER.includes(params.channel as ChannelId) ? (params.channel as ChannelId) : 'company';
  const initial: ChannelId = asked === 'company' && !hasCompany ? 'all' : asked;
  const [channel, setChannel] = useState<ChannelId>(initial);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  // A poll is the post's own question plus two to four short answers.
  const [options, setOptions] = useState<string[] | null>(null);
  const create = useCreatePost();
  const personal = useMemo(() => looksPersonal([text, ...(options ?? [])].join(' ')), [text, options]);
  const filled = (options ?? []).map((o) => o.trim()).filter(Boolean);
  const pollReady = options === null || (filled.length >= 2 && filled.length === options.length);
  const setOption = (i: number, v: string) => {
    setOptions((cur) => (cur ? cur.map((o, n) => (n === i ? v : o)) : cur));
    if (error) setError(null);
  };

  if (ready && !me) return <Redirect href="/" />;
  if (ready && me && !me.acceptedRulesAt) return <Redirect href="/community/rules" />;

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const tryClose = () => (text.trim() ? setConfirmDiscard(true) : close());
  const publish = () => {
    const body = text.trim();
    if (!body || !pollReady) return;
    setError(null);
    create.mutate(
      options ? { channel, body, poll: { options: filled } } : { channel, body },
      {
        onSuccess: (post) => {
          haptic.success();
          toast(post.status === 'pending' ? s.compose.held : s.compose.posted);
          close();
        },
        onError: (e) => {
          errorCode(e) === 'filtered' ? haptic.warning() : haptic.error();
          setError(errorText(e));
        },
      },
    );
  };

  return (
    <Page title={s.compose.title} modal onClose={tryClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={64}>
        <View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: space.gutter, gap: 8, paddingVertical: 12 }}>
            {ORDER.filter((id) => id !== 'company' || hasCompany).map((id) => (
              <Chip key={id} testID={`compose-channel-${id}`} label={id === 'company' && me?.companyName ? me.companyName : s.channels[id]} selected={id === channel} onPress={() => setChannel(id)} />
            ))}
          </ScrollView>
          <Hairline />
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: space.gutter, flexGrow: 1 }}>
          {me ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <BadgeMark seed={me.handle} height={30} />
              <View>
                <T v="caption" mute>{s.compose.as}</T>
                <T v="label">{me.handle}</T>
              </View>
            </View>
          ) : null}
          <TextInput
            testID="compose-input"
            value={text}
            onChangeText={(v) => {
              setText(v);
              if (error) setError(null);
            }}
            placeholder={options ? s.compose.pollQuestion : s.compose.placeholder}
            placeholderTextColor={color.faint}
            accessibilityLabel={s.compose.placeholder}
            autoFocus
            multiline
            maxLength={MAX}
            textAlignVertical="top"
            style={[
              { flex: options ? undefined : 1, minHeight: options ? 96 : 160, fontFamily: font.body, fontSize: 18, lineHeight: 32, color: color.ink, paddingVertical: 6 },
              inputRTL,
            ]}
          />
          {options ? (
            <View testID="compose-poll" style={{ gap: 6, marginTop: 8, maxWidth: 520 }}>
              {options.map((o, i) => (
                <Field
                  key={i}
                  testID={`poll-option-${i}`}
                  value={o}
                  onChangeText={(v) => setOption(i, v)}
                  placeholder={`${s.compose.option} ${'١٢٣٤'[i]}`}
                  accessibilityLabel={`${s.compose.option} ${i + 1}`}
                  maxLength={OPTION_MAX}
                  returnKeyType="next"
                  style={[{ fontFamily: font.body, fontSize: 17 }, inputRTL]}
                />
              ))}
              {options.length < MAX_OPTIONS ? (
                <Tap testID="poll-add" accessibilityRole="button" onPress={() => setOptions([...options, ''])} hitSlop={8} style={{ alignSelf: 'flex-start', paddingVertical: 12 }}>
                  <T v="label">{s.compose.addOption}</T>
                </Tap>
              ) : null}
            </View>
          ) : null}
        </ScrollView>
        <Hairline />
        <View style={{ paddingHorizontal: space.gutter, paddingTop: 10, paddingBottom: Math.max(insets.bottom, 12), gap: 8 }}>
          {error ? (
            <T v="caption" danger testID="compose-error" accessibilityLiveRegion="polite">{error}</T>
          ) : personal ? (
            <T v="caption" mute testID="compose-pii">{s.compose.piiHint}</T>
          ) : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              {can.polls() ? (
                <Chip testID="compose-poll-toggle" label={options ? s.compose.pollOn : s.compose.poll} selected={!!options} onPress={() => setOptions(options ? null : ['', ''])} />
              ) : null}
              <T v="caption" mute>
                <Num>{text.length}</Num>
                <Num> / {MAX}</Num>
              </T>
            </View>
            <Button testID="compose-publish" label={s.compose.publish} onPress={publish} disabled={!text.trim() || !pollReady} loading={create.isPending} />
          </View>
        </View>
      </KeyboardAvoidingView>
      <ConfirmSheet
        testID="discard"
        visible={confirmDiscard}
        title={s.compose.discardTitle}
        confirm={s.compose.discard}
        danger
        onConfirm={() => {
          setConfirmDiscard(false);
          close();
        }}
        onClose={() => setConfirmDiscard(false)}
      />
    </Page>
  );
}
