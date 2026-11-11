import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { community as s } from '@/i18n/community';

import { getCommunityApi } from '../api';
import { Page } from '../components/Page';
import { RulesBody } from '../components/RulesBody';
import { errorText } from '../state/hooks';
import { useSession } from '../state/session';
import { fullDate } from '../time';
import { Button, haptic, Icon, Num, space, T } from '../ui/kit';

/** Read the rules any time; accept them once before the first post, reply or like. */
export function RulesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { me } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const accept = async () => {
    setBusy(true);
    setError(null);
    try {
      const next = await getCommunityApi().acceptRules();
      useSession.getState().set(next);
      haptic.success();
      router.canGoBack() ? router.back() : router.replace('/');
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  const d = me?.acceptedRulesAt ? fullDate(me.acceptedRulesAt) : null;
  return (
    <Page title={s.rules.title} modal sheet open>
      <ScrollView contentContainerStyle={{ padding: space.gutter, paddingTop: 20, paddingBottom: 32 }}>
        <RulesBody />
      </ScrollView>
      <View style={{ paddingHorizontal: space.gutter, paddingBottom: Math.max(insets.bottom, 16), gap: 8 }}>
        {error ? <T v="caption" danger>{error}</T> : null}
        {me && !me.acceptedRulesAt ? (
          <Button testID="rules-accept" label={s.rules.accept} onPress={accept} loading={busy} />
        ) : d ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', minHeight: 48 }}>
            <Icon name="check" size={18} />
            <T v="caption" mute>
              {s.rules.accepted} · <Num>{d.day}</Num> {d.month} <Num>{d.year}</Num>
            </T>
          </View>
        ) : null}
      </View>
    </Page>
  );
}
