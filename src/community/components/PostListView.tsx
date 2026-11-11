import type { InfiniteData, UseInfiniteQueryResult } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo } from 'react';
import { ActivityIndicator, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { community as s } from '@/i18n/community';

import { savedOf } from '../api/features';
import type { Page, Post } from '../api/types';
import { useLike } from '../state/hooks';
import { color, Hairline } from '../ui/kit';
import { PostCard } from './PostCard';
import { useSafetySheet } from './SafetySheet';
import { LoadError, Notice, PostSkeleton } from './States';

/** A plain list of posts from any paged query: saved, search results, a company's space. */
export function PostListView({
  query,
  empty,
  emptyBody,
  header,
  testID,
  idle,
}: {
  query: UseInfiniteQueryResult<InfiniteData<Page<Post>>, Error>;
  empty: string;
  emptyBody?: string;
  header?: React.ReactElement;
  testID?: string;
  /** Shown instead of the list while the query has nothing to ask yet (an empty search box). */
  idle?: React.ReactElement | null;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const like = useLike();
  const sheet = useSafetySheet();
  const posts = useMemo(() => query.data?.pages.flatMap((p) => p.items) ?? [], [query.data]);
  const onOpen = useCallback((p: Post) => router.push({ pathname: '/community/post/[id]', params: { id: p.id } }), [router]);
  const onLike = useCallback((p: Post) => like.mutate({ id: p.id, liked: !p.likedByMe }), [like]);
  const onMore = useCallback((p: Post) => sheet.open({ kind: 'post', id: p.id, postId: p.id, author: p.author, mine: p.mine, saved: savedOf(p) }), [sheet]);

  if (idle !== undefined && query.fetchStatus === 'idle' && !query.data) return idle;
  if (query.isLoading) return <>{header}<PostSkeleton count={3} /></>;
  if (query.isError && !posts.length) return <>{header}<LoadError text={s.feed.loadError} onRetry={() => query.refetch()} /></>;
  return (
    <>
      <FlatList
        testID={testID}
        data={posts}
        keyExtractor={(p) => p.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        renderItem={({ item }) => <PostCard post={item} showChannel onOpen={onOpen} onLike={onLike} onMore={onMore} />}
        ItemSeparatorComponent={Hairline}
        ListHeaderComponent={header}
        ListEmptyComponent={<Notice testID={testID ? `${testID}-empty` : undefined} title={empty} body={emptyBody} />}
        onEndReached={() => query.hasNextPage && !query.isFetchingNextPage && query.fetchNextPage()}
        onEndReachedThreshold={0.5}
        ListFooterComponent={query.isFetchingNextPage ? <ActivityIndicator color={color.mute} style={{ marginVertical: 24 }} /> : undefined}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      />
      {sheet.element}
    </>
  );
}
