/**
 * "هويتي هنا": the member's pseudonymous identity and everything they control about it.
 * The badge is the same badge holder wrk. sells, carrying a name nobody can read.
 */
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { community as s } from '@/i18n/community';

import { getCommunityApi } from '../api';
import { BadgeMark } from '../components/BadgeMark';
import { Page } from '../components/Page';
import { ConfirmSheet } from '../components/SafetySheet';
import { Notice } from '../components/States';
import { errorText, hasNotifications, useUpdateMe } from '../state/hooks';
import { useSession } from '../state/session';
import { Button, color, Hairline, Icon, Num, Row, space, T, toast, Toggle } from '../ui/kit';

type Ask = null | 'handle' | 'signout' | 'delete';

const Chevron = () => <Icon name="chevron" size={18} tint={color.faint} />;

export function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { me, ready } = useSession();
  const update = useUpdateMe();
  const [ask, setAsk] = useState<Ask>(null);
  const [busy, setBusy] = useState(false);
  const canExport = typeof getCommunityApi().exportMyData === 'function';

  if (ready && !me) {
    return (
      <Page title={s.profile.title}>
        <Notice testID="profile-signed-out" title={s.profile.notVerified} body={s.profile.notVerifiedBody} action={s.gate.verify} onAction={() => router.push('/community/verify')} />
      </Page>
    );
  }
  if (!me) return <Page title={s.profile.title}>{null}</Page>;

  const members = me.companyMemberCount ?? null;
  const leave = async (kind: 'signout' | 'delete') => {
    setBusy(true);
    try {
      const api = getCommunityApi();
      await (kind === 'delete' ? api.deleteAccount() : api.signOut());
      useSession.getState().set(null);
      setAsk(null);
      router.canGoBack() ? router.back() : router.replace('/community');
    } catch (e) {
      toast(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  const exportData = async () => {
    try {
      const data = await getCommunityApi().exportMyData!();
      await Clipboard.setStringAsync(JSON.stringify(data, null, 2));
      toast(s.profile.exported);
    } catch (e) {
      toast(errorText(e));
    }
  };

  return (
    <Page title={s.profile.title}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        <View style={{ alignItems: 'center', gap: 12, paddingTop: 28, paddingBottom: 26 }}>
          <View style={{ boxShadow: '10px 16px 26px -14px rgba(17,17,18,0.45)' } as object}>
            <BadgeMark seed={me.handle} height={132} />
          </View>
          <T v="title" testID="profile-handle">{me.handle}</T>
          <T v="caption" mute>
            {me.companyName}
            {members ? (
              <>
                {' · '}
                <Num>{members}</Num> {s.feed.members}
              </>
            ) : null}
          </T>
          <Button testID="new-handle" small variant="ghost" label={s.profile.newHandle} onPress={() => setAsk('handle')} />
        </View>

        <Hairline />
        <Row
          label={s.profile.showCompany}
          detail={me.showCompany ? null : s.verify.showCompanyOff}
          end={<Toggle testID="profile-show-company" label={s.profile.showCompany} value={me.showCompany} onChange={(v) => update.mutate({ showCompany: v })} />}
        />
        <Hairline inset={space.gutter} />
        <Row testID="row-mine" label={s.profile.myPosts} onPress={() => router.push('/community/mine')} end={<Chevron />} />
        {hasNotifications() ? (
          <>
            <Hairline inset={space.gutter} />
            <Row testID="row-notifications" label={s.profile.notifications} onPress={() => router.push('/community/notifications')} end={<Chevron />} />
          </>
        ) : null}
        {me.role === 'moderator' && typeof getCommunityApi().listModerationQueue === 'function' ? (
          <>
            <Hairline inset={space.gutter} />
            <Row testID="row-moderation" label={s.moderation.row} onPress={() => router.push('/community/moderation')} end={<Chevron />} />
          </>
        ) : null}
        <Hairline inset={space.gutter} />
        <Row testID="row-blocked" label={s.profile.blocked} onPress={() => router.push('/community/blocked')} end={<Chevron />} />
        <Hairline inset={space.gutter} />
        <Row testID="row-rules" label={s.profile.rules} onPress={() => router.push('/community/rules')} end={<Chevron />} />
        {canExport ? (
          <>
            <Hairline inset={space.gutter} />
            <Row testID="row-export" label={s.profile.exportData} onPress={exportData} />
          </>
        ) : null}
        <Hairline />

        <View style={{ height: 28 }} />
        <Hairline />
        <Row testID="row-signout" label={s.profile.signOut} onPress={() => setAsk('signout')} />
        <Hairline inset={space.gutter} />
        <Row testID="row-delete" label={s.profile.delete} danger onPress={() => setAsk('delete')} />
        <Hairline />
      </ScrollView>

      <ConfirmSheet
        testID="confirm-handle"
        visible={ask === 'handle'}
        title={s.profile.newHandleTitle}
        body={s.profile.newHandleBody}
        confirm={s.profile.change}
        loading={update.isPending}
        onConfirm={() => update.mutate({ regenerateHandle: true }, { onSettled: () => setAsk(null) })}
        onClose={() => setAsk(null)}
      />
      <ConfirmSheet testID="confirm-signout" visible={ask === 'signout'} title={s.profile.signOutTitle} body={s.profile.signOutBody} confirm={s.profile.signOut} loading={busy} onConfirm={() => leave('signout')} onClose={() => setAsk(null)} />
      <ConfirmSheet testID="confirm-delete" visible={ask === 'delete'} title={s.profile.deleteTitle} body={s.profile.deleteBody} confirm={s.profile.deleteConfirm} danger loading={busy} onConfirm={() => leave('delete')} onClose={() => setAsk(null)} />
    </Page>
  );
}
