/**
 * The community tab. Channels across the top, the newest posts below, one button to write.
 * On a wide screen (tablet, unfolded foldable) the open post sits beside the list instead of
 * replacing it.
 */
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { community as s } from '@/i18n/community';
import { TwoPane, useLayoutClass } from '@/layout';

import { getCommunityApi } from '../api';
import { can, savedOf } from '../api/features';
import type { Channel, ChannelId, Post } from '../api/types';
import { canAddWorkEmail } from '../api/access';
import { BadgeMark } from '../components/BadgeMark';
import { MemberGate } from '../components/MemberGate';
import { PostCard } from '../components/PostCard';
import { useSafetySheet } from '../components/SafetySheet';
import { WeeklyCard } from '../components/WeeklyCard';
import { LoadError, Notice, PostSkeleton } from '../components/States';
import { errorCode, hasNotifications, useCommunityBoot, useFeed, useLike, useMemberGate, useUnreadCount, useWeeklyQuestion } from '../state/hooks';
import { useSession } from '../state/session';
import { Button, Chip, color, Hairline, IconButton, space, T, Tap, ToastLayer, useShort } from '../ui/kit';
import { PostThread } from './PostThread';

const FALLBACK_CHANNELS: Channel[] = (Object.keys(s.channels) as ChannelId[]).map((id) => ({ id, title: s.channels[id], companyOnly: id === 'company' }));

/** One pane on a wide window: the column stays a readable width, in the middle. */
const WIDE = { width: '100%', maxWidth: 720, alignSelf: 'center' } as const;

export function FeedScreen() {
  useCommunityBoot();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // Width class and fold position come from the shared layout system (phones, foldables, tablets).
  const { isTwoPane, fold } = useLayoutClass();
  // A phone on its side is wide enough for two panes on paper, but two panes 390pt tall show three
  // lines each. Without a fold to respect, it stays one pane and reads like a page.
  const short = useShort();
  const twoPane = isTwoPane && !(short && !fold);
  const { me, ready } = useSession();
  const gate = useMemberGate();

  // Members land in their company; readers land in the open feed.
  const [channel, setChannel] = useState<ChannelId | null>(null);
  useEffect(() => {
    if (ready && me && channel === null) setChannel(me.companyName ? 'company' : 'all');
  }, [ready, me, channel]);
  const current: ChannelId = channel ?? 'all';

  const channels = useQuery({ queryKey: ['community', 'channels'], enabled: !!me, queryFn: () => getCommunityApi().listChannels(), staleTime: Infinity });
  const locked = current === 'company' && !me?.companyName;
  const feed = useFeed(current, ready && !!me && channel !== null && !locked);
  const posts = useMemo(() => feed.data?.pages.flatMap((p) => p.items) ?? [], [feed.data]);
  const like = useLike();
  const unread = useUnreadCount();
  const weekly = useWeeklyQuestion();
  const weeklyId = weekly.data?.postId ?? null;

  const [selected, setSelected] = useState<string | null>(null);
  const sheet = useSafetySheet({ onDeletedPost: (id) => setSelected((cur) => (cur === id ? null : cur)) });
  const list = useRef<FlatList<Post>>(null);

  // Two panes always show something on the detail side.
  useEffect(() => {
    if (!twoPane) return;
    if (selected && selected === weeklyId) return;
    if (posts.length && !posts.some((p) => p.id === selected)) setSelected(posts[0].id);
    if (!posts.length && selected) setSelected(null);
  }, [twoPane, posts, selected, weeklyId]);

  const pick = (id: ChannelId) => {
    setChannel(id);
    list.current?.scrollToOffset({ offset: 0, animated: false });
  };
  const onOpen = useCallback(
    (p: Post) => {
      if (twoPane) setSelected(p.id);
      else router.push({ pathname: '/community/post/[id]', params: { id: p.id } });
    },
    [twoPane, router],
  );
  const onLike = useCallback(
    (p: Post) => {
      if (!gate({ rules: false })) return;
      like.mutate({ id: p.id, liked: !p.likedByMe });
    },
    [gate, like],
  );
  const onMore = useCallback((p: Post) => sheet.open({ kind: 'post', id: p.id, postId: p.id, author: p.author, mine: p.mine, saved: savedOf(p) }), [sheet]);
  const write = () => {
    if (!gate()) return;
    router.push({ pathname: '/community/compose', params: { channel: current } });
  };

  const q = weekly.data ?? null;
  const openWeekly = () => {
    if (!q) return;
    if (twoPane) setSelected(q.postId);
    else router.push({ pathname: '/community/post/[id]', params: { id: q.postId } });
  };
  // The question belongs to everyone, so it sits on the open feed only.
  const showWeekly = !!q && current === 'all';

  const chips = (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityRole="tablist"
      style={short ? { flex: 1 } : undefined}
      contentContainerStyle={short ? { paddingHorizontal: 12, gap: 8, alignItems: 'center' } : { paddingHorizontal: space.gutter, gap: 8, paddingTop: 4, paddingBottom: 12 }}>
      {(channels.data ?? FALLBACK_CHANNELS).map((c) => (
        <Chip key={c.id} testID={`channel-${c.id}`} label={c.id === 'company' && me?.companyName ? me.companyName : c.title} selected={c.id === current} onPress={() => pick(c.id)} />
      ))}
    </ScrollView>
  );
  const tools = (
    <>
      {me && can.search() ? (
        <IconButton testID="open-search" name="search" label={s.feed.search} onPress={() => router.push('/community/search')} />
      ) : null}
      {me && hasNotifications() ? (
        <IconButton testID="open-notifications" name="bell" label={s.notifications.title} onPress={() => router.push('/community/notifications')}>
          {unread.data ? (
            <View style={{ position: 'absolute', top: 11, end: 11, width: 8, height: 8, borderRadius: 4, backgroundColor: color.ink, borderWidth: 1.5, borderColor: color.paper }} />
          ) : null}
        </IconButton>
      ) : null}
      <Tap
        testID="open-profile"
        accessibilityLabel={s.profile.title}
        onPress={() => router.push('/community/profile')}
        hitSlop={6}
        style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
        {me ? (
          <BadgeMark seed={me.handle} height={30} />
        ) : (
          <View style={{ width: 19, height: 30, borderRadius: 4, borderWidth: 1.2, borderColor: color.mute, borderStyle: 'dashed' }} />
        )}
      </Tap>
    </>
  );
  // A phone on its side has width to spare and no height: title, channels and tools share one row,
  // and the write button moves up into it so nothing floats over the few lines that fit.
  const header = short ? (
    <View style={{ paddingTop: insets.top + 4, backgroundColor: color.paper }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingStart: space.gutter, paddingEnd: 8, minHeight: 52 }}>
        <T v="display" accessibilityRole="header" style={{ fontSize: 22, lineHeight: 36 }}>{s.tab}</T>
        {chips}
        {tools}
        <Button testID="write" small label={s.feed.write} onPress={write} style={{ marginStart: 4 }} />
      </View>
      <Hairline />
    </View>
  ) : (
    <View style={{ paddingTop: insets.top + 6, backgroundColor: color.paper }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingStart: space.gutter, paddingEnd: 6, minHeight: 52 }}>
        <View style={{ flex: 1 }}>
          <T v="display" accessibilityRole="header" style={{ fontSize: 26, lineHeight: 40 }}>{s.tab}</T>
        </View>
        {tools}
      </View>
      {chips}
      <Hairline />
    </View>
  );

  const body = locked ? (
    <Notice
      testID="company-gate"
      title={s.gate.companyTitle}
      body={s.gate.companyBody}
      action={canAddWorkEmail() ? s.gate.verify : undefined}
      onAction={() => router.push({ pathname: '/community/verify', params: { mode: 'work' } })}
    />
  ) : !ready || channel === null || feed.isLoading ? (
    <PostSkeleton />
  ) : feed.isError && !posts.length ? (
    <LoadError text={errorCode(feed.error) === 'network' ? s.errors.network : s.feed.loadError} onRetry={() => feed.refetch()} />
  ) : (
    <FlatList
      ref={list}
      testID="feed"
      data={posts}
      keyExtractor={(p) => p.id}
      renderItem={({ item }) => (
        <PostCard post={item} showChannel={current === 'all'} selected={twoPane && item.id === selected} onOpen={onOpen} onLike={onLike} onMore={onMore} />
      )}
      ItemSeparatorComponent={Hairline}
      ListHeaderComponent={showWeekly && q ? <WeeklyCard q={q} onOpen={openWeekly} /> : undefined}
      refreshControl={<RefreshControl refreshing={feed.isRefetching && !feed.isFetchingNextPage} onRefresh={() => void feed.refetch()} tintColor={color.mute} />}
      onEndReached={() => feed.hasNextPage && !feed.isFetchingNextPage && feed.fetchNextPage()}
      onEndReachedThreshold={0.5}
      ListEmptyComponent={<Notice testID="feed-empty" title={current === 'company' ? s.feed.emptyCompany : s.feed.empty} />}
      ListFooterComponent={
        feed.isFetchingNextPage ? (
          <ActivityIndicator color={color.mute} style={{ marginVertical: 24 }} />
        ) : posts.length > 6 && !feed.hasNextPage ? (
          <T v="caption" mute center style={{ marginVertical: 28 }}>{s.feed.end}</T>
        ) : undefined
      }
      contentContainerStyle={[{ paddingBottom: insets.bottom + (short ? 16 : 88) }, !twoPane && WIDE]}
    />
  );

  const writeButton = (
    <View pointerEvents="box-none" style={{ position: 'absolute', bottom: insets.bottom + 16, left: 0, right: 0, paddingHorizontal: space.gutter, flexDirection: 'row', justifyContent: 'flex-end' }}>
      <Button testID="write" label={s.feed.write} onPress={write} style={{ paddingHorizontal: 28, boxShadow: '0 10px 24px -12px rgba(17,17,18,0.55)' } as object} />
    </View>
  );

  // Members only. Anyone else gets the door, not a feed.
  if (ready && !me) {
    return (
      <View style={{ flex: 1, backgroundColor: color.paper }}>
        <MemberGate />
        <ToastLayer />
      </View>
    );
  }

  const listPane = (
    <View style={{ flex: 1, backgroundColor: color.paper }}>
      {header}
      <View style={{ flex: 1 }}>{body}</View>
      {short ? null : writeButton}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: color.paper }}>
      <TwoPane
        single={!twoPane}
        list={listPane}
        detail={
          twoPane && selected ? (
            <View style={{ flex: 1, paddingTop: insets.top }} testID="detail-pane">
              <PostThread key={selected} postId={selected} embedded onGone={() => setSelected(null)} />
            </View>
          ) : null
        }
        empty={
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <T mute>{locked ? '' : s.feed.pick}</T>
          </View>
        }
      />
      {sheet.element}
      <ToastLayer />
    </View>
  );
}
