/**
 * One company. For its own people it is their space: what colleagues wrote, and a way to write.
 * For everyone else it is a closed door with a nameplate: icon, sector, how many are inside.
 */
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, View } from 'react-native';

import { community as s } from '@/i18n/community';

import { canAddWorkEmail } from '../api/access';
import type { Company } from '../api/features';
import { CompanyTile } from '../components/CompanyTile';
import { PostListView } from '../components/PostListView';
import { LoadError, Notice, PostSkeleton } from '../components/States';
import { useCompany, useFeed, useMemberGate } from '../state/hooks';
import { useMe } from '../state/session';
import { Button, Hairline, Num, space, T, useShort } from '../ui/kit';

export function CompanyHeader({ c, action }: { c: Company; action?: React.ReactNode }) {
  const short = useShort();
  const sub = [c.sector, c.mine ? s.companies.yours : null].filter(Boolean).join(' · ');
  const counts = (
    <View style={{ flexDirection: 'row', gap: short ? 18 : 28, marginTop: short ? 2 : 10 }}>
      <T v="caption" mute>
        <Num style={{ fontSize: short ? 14 : 17 }}>{c.memberCount}</Num> {s.companies.members}
      </T>
      {c.postCount ? (
        <T v="caption" mute>
          <Num style={{ fontSize: short ? 14 : 17 }}>{c.postCount}</Num> {s.companies.posts}
        </T>
      ) : null}
    </View>
  );
  // On a short screen the nameplate lies on its side so the posts keep the height.
  if (short) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: space.gutter }}>
        <CompanyTile name={c.name} iconUrl={c.iconUrl} size={56} />
        <View style={{ flex: 1, gap: 2 }}>
          <T v="title" numberOfLines={1}>{c.name}</T>
          {sub ? <T v="caption" mute numberOfLines={1}>{sub}</T> : null}
          {c.memberCount ? counts : null}
        </View>
        {action}
      </View>
    );
  }
  return (
    <View style={{ alignItems: 'center', gap: 6, paddingTop: 26, paddingBottom: 22, paddingHorizontal: space.gutter }}>
      <CompanyTile name={c.name} iconUrl={c.iconUrl} size={84} />
      <T v="title" center style={{ marginTop: 10 }}>{c.name}</T>
      {sub ? <T v="caption" mute center>{sub}</T> : null}
      {c.memberCount ? counts : null}
      {action ? <View style={{ marginTop: 14 }}>{action}</View> : null}
    </View>
  );
}

export function CompanyView({ id }: { id: string }) {
  const router = useRouter();
  const me = useMe();
  const gate = useMemberGate();
  const q = useCompany(id);
  const mine = !!q.data?.mine;
  const feed = useFeed('company', mine);

  if (q.isError && !q.data) return <LoadError text={s.feed.loadError} onRetry={() => q.refetch()} />;
  if (!q.data) return <PostSkeleton count={2} />;
  const c = q.data;

  if (mine) {
    return (
      <PostListView
        testID="company-posts"
        query={feed}
        empty={s.feed.emptyCompany}
        header={
          <View>
            <CompanyHeader
              c={c}
              action={<Button testID="company-write" small label={s.feed.write} onPress={() => gate() && router.push({ pathname: '/community/compose', params: { channel: 'company' } })} />}
            />
            <Hairline />
          </View>
        }
      />
    );
  }
  const offerWork = !me?.companyName && canAddWorkEmail();
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }} testID="company-closed">
      <CompanyHeader c={c} />
      <Hairline />
      <Notice
        title={c.memberCount ? s.companies.closedTitle : s.companies.emptyTitle}
        body={c.memberCount ? s.companies.closedBody : s.companies.emptyBody}
        action={offerWork ? s.companies.isYours : undefined}
        onAction={() => router.push({ pathname: '/community/verify', params: { mode: 'work' } })}
        testID="company-note"
      />
    </ScrollView>
  );
}
