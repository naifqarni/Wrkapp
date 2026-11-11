import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { community as s } from '@/i18n/community';

import type { ChannelId } from '../api/types';
import { BadgeMark } from '../components/BadgeMark';
import { Page } from '../components/Page';
import { ConfirmSheet } from '../components/SafetySheet';
import { errorText, useCreatePost } from '../state/hooks';
import { useSession } from '../state/session';
import { Button, Chip, color, font, Hairline, haptic, inputRTL, Num, space, T, toast } from '../ui/kit';

const MAX = 2000;
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
  const initial = ORDER.includes(params.channel as ChannelId) ? (params.channel as ChannelId) : 'company';
  const [channel, setChannel] = useState<ChannelId>(initial);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const create = useCreatePost();
  const personal = useMemo(() => looksPersonal(text), [text]);

  if (ready && !me) return <Redirect href="/community/verify" />;
  if (ready && me && !me.acceptedRulesAt) return <Redirect href="/community/rules" />;

  const close = () => (router.canGoBack() ? router.back() : router.replace('/community'));
  const tryClose = () => (text.trim() ? setConfirmDiscard(true) : close());
  const publish = () => {
    const body = text.trim();
    if (!body) return;
    setError(null);
    create.mutate(
      { channel, body },
      {
        onSuccess: (post) => {
          haptic.success();
          toast(post.status === 'pending' ? s.compose.held : s.compose.posted);
          close();
        },
        onError: (e) => {
          haptic.error();
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
            {ORDER.map((id) => (
              <Chip key={id} testID={`compose-channel-${id}`} label={id === 'company' && me ? me.companyName : s.channels[id]} selected={id === channel} onPress={() => setChannel(id)} />
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
            placeholder={s.compose.placeholder}
            placeholderTextColor={color.faint}
            accessibilityLabel={s.compose.placeholder}
            autoFocus
            multiline
            maxLength={MAX}
            textAlignVertical="top"
            style={[
              { flex: 1, minHeight: 160, fontFamily: font.body, fontSize: 18, lineHeight: 32, color: color.ink, paddingVertical: 6 },
              inputRTL,
            ]}
          />
        </ScrollView>
        <Hairline />
        <View style={{ paddingHorizontal: space.gutter, paddingTop: 10, paddingBottom: Math.max(insets.bottom, 12), gap: 8 }}>
          {error ? (
            <T v="caption" danger testID="compose-error" accessibilityLiveRegion="polite">{error}</T>
          ) : personal ? (
            <T v="caption" mute testID="compose-pii">{s.compose.piiHint}</T>
          ) : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <T v="caption" mute>
              <Num>{text.length}</Num>
              <Num> / {MAX}</Num>
            </T>
            <Button testID="compose-publish" label={s.compose.publish} onPress={publish} disabled={!text.trim()} loading={create.isPending} />
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
