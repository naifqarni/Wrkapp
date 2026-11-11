import { useRouter } from 'expo-router';
import React, { useCallback, useMemo } from 'react';
import { ActivityIndicator, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { community as s } from '@/i18n/community';

import { savedOf } from '../api/features';
import type { Post } from '../api/types';
import { Page } from '../components/Page';
import { PostCard } from '../components/PostCard';
import { useSafetySheet } from '../components/SafetySheet';
import { LoadError, Notice, PostSkeleton } from '../components/States';
import { useLike, useMyPosts } from '../state/hooks';
import { color, Hairline } from '../ui/kit';

export function MyPostsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const q = useMyPosts();
  const like = useLike();
  const sheet = useSafetySheet();
  const posts = useMemo(() => q.data?.pages.flatMap((p) => p.items) ?? [], [q.data]);
  const onOpen = useCallback((p: Post) => router.push({ pathname: '/community/post/[id]', params: { id: p.id } }), [router]);
  const onLike = useCallback((p: Post) => like.mutate({ id: p.id, liked: !p.likedByMe }), [like]);
  const onMore = useCallback((p: Post) => sheet.open({ kind: 'post', id: p.id, postId: p.id, author: p.author, mine: p.mine, saved: savedOf(p) }), [sheet]);
  return (
    <Page title={s.profile.myPosts}>
      {q.isLoading ? (
        <PostSkeleton count={3} />
      ) : q.isError ? (
        <LoadError text={s.feed.loadError} onRetry={() => q.refetch()} />
      ) : (
        <FlatList
          testID="my-posts"
          data={posts}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => <PostCard post={item} showChannel onOpen={onOpen} onLike={onLike} onMore={onMore} />}
          ItemSeparatorComponent={Hairline}
          ListEmptyComponent={<Notice testID="mine-empty" title={s.profile.myPostsEmpty} />}
          onEndReached={() => q.hasNextPage && !q.isFetchingNextPage && q.fetchNextPage()}
          ListFooterComponent={q.isFetchingNextPage ? <ActivityIndicator color={color.mute} style={{ marginVertical: 24 }} /> : undefined}
          contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        />
      )}
      {sheet.element}
    </Page>
  );
}
