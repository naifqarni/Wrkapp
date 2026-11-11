/**
 * One post with its replies and the reply box. Used full-screen on phones (route community/post/[id])
 * and as the detail pane next to the feed on tablets and unfolded foldables.
 */
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { community as s } from '@/i18n/community';

import { savedOf } from '../api/features';
import type { Comment, Post } from '../api/types';
import { CommentRow, PostCard } from '../components/PostCard';
import { useSafetySheet } from '../components/SafetySheet';
import { LoadError, Notice, PostSkeleton } from '../components/States';
import { errorCode, errorText, useComments, useCreateComment, useLike, useMemberGate, usePost } from '../state/hooks';
import { useMe } from '../state/session';
import { Button, color, font, Hairline, haptic, inputRTL, Num, space, T } from '../ui/kit';

const MAX = 800;

export function PostThread({ postId, embedded, onGone }: { postId: string; embedded?: boolean; onGone?: () => void }) {
  const insets = useSafeAreaInsets();
  const me = useMe();
  const gate = useMemberGate();
  const post = usePost(postId);
  const comments = useComments(postId);
  const like = useLike();
  const create = useCreateComment(postId);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const list = useRef<FlatList<Comment>>(null);
  const sheet = useSafetySheet({ onDeletedPost: onGone, onBlocked: (a) => { if (post.data?.author.id === a.id) onGone?.(); } });

  const items = useMemo(() => comments.data?.pages.flatMap((p) => p.items) ?? [], [comments.data]);

  const onLike = useCallback(
    (p: Post) => {
      if (!gate({ rules: false })) return;
      like.mutate({ id: p.id, liked: !p.likedByMe });
    },
    [gate, like],
  );
  const onMorePost = useCallback((p: Post) => sheet.open({ kind: 'post', id: p.id, postId: p.id, author: p.author, mine: p.mine, saved: savedOf(p) }), [sheet]);
  const onMoreComment = useCallback((c: Comment) => sheet.open({ kind: 'comment', id: c.id, postId: c.postId, author: c.author, mine: c.mine }), [sheet]);

  const send = () => {
    const body = text.trim();
    if (!body || create.isPending) return;
    if (!gate()) return;
    setError(null);
    create.mutate(body, {
      onSuccess: () => {
        setText('');
        haptic.setDown();
        setTimeout(() => list.current?.scrollToEnd({ animated: true }), 60);
      },
      onError: (e) => {
        errorCode(e) === 'filtered' ? haptic.warning() : haptic.error();
        setError(errorText(e));
      },
    });
  };

  if (post.isError && !post.data) {
    return errorCode(post.error) === 'network' ? (
      <LoadError text={s.errors.network} onRetry={() => post.refetch()} />
    ) : (
      <Notice testID="post-gone" title={s.post.removed} />
    );
  }
  if (!post.data) return <PostSkeleton count={1} />;
  const p = post.data;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={embedded ? 0 : 96}>
      <FlatList
        ref={list}
        testID="thread"
        data={items}
        keyExtractor={(c) => c.id}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View>
            <PostCard post={p} full showChannel onLike={onLike} onMore={onMorePost} />
            <Hairline />
          </View>
        }
        ItemSeparatorComponent={() => <Hairline inset={space.gutter + 31} />}
        renderItem={({ item }) => <CommentRow comment={item} isAuthor={item.author.id === p.author.id} onMore={onMoreComment} />}
        ListEmptyComponent={
          comments.isLoading ? (
            <ActivityIndicator color={color.mute} style={{ marginTop: 28 }} />
          ) : comments.isError ? (
            <LoadError text={s.feed.loadError} onRetry={() => comments.refetch()} />
          ) : (
            <T mute center style={{ marginTop: 36 }}>{s.post.noComments}</T>
          )
        }
        onEndReached={() => comments.hasNextPage && !comments.isFetchingNextPage && comments.fetchNextPage()}
        onEndReachedThreshold={0.4}
        contentContainerStyle={{ paddingBottom: 24 }}
      />
      <Hairline />
      <View style={{ paddingHorizontal: space.gutter, paddingTop: 8, paddingBottom: Math.max(insets.bottom, 10), backgroundColor: color.paper }}>
        {error ? <T v="caption" danger style={{ marginBottom: 4 }} testID="comment-error">{error}</T> : null}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
          <TextInput
            testID="comment-input"
            value={text}
            onChangeText={(v) => {
              setText(v);
              if (error) setError(null);
            }}
            onFocus={() => {
              if (!me) gate();
            }}
            placeholder={post.data?.author.id === 'wrk' ? s.weekly.answerPlaceholder : s.post.commentPlaceholder}
            placeholderTextColor={color.faint}
            accessibilityLabel={s.post.commentPlaceholder}
            multiline
            maxLength={MAX}
            style={[
              { flex: 1, minHeight: 40, maxHeight: 120, paddingVertical: 8, fontFamily: font.body, fontSize: 16, lineHeight: 24, color: color.ink },
              inputRTL,
            ]}
          />
          {text.length > MAX - 100 ? (
            <T v="caption" mute style={{ paddingBottom: 9 }}>
              <Num>{MAX - text.length}</Num>
            </T>
          ) : null}
          <Button testID="comment-send" small label={s.post.send} onPress={send} disabled={!text.trim()} loading={create.isPending} />
        </View>
      </View>
      {sheet.element}
    </KeyboardAvoidingView>
  );
}
