import React from 'react';
import { Platform, Pressable, View } from 'react-native';

import { community as s } from '@/i18n/community';

import { can, pollOf } from '../api/features';
import type { Author, Comment, Post } from '../api/types';
import { useMemberGate, useVotePoll } from '../state/hooks';
import { Ago } from '../time';
import { color, font, IconButton, Num, space, T } from '../ui/kit';
import { BadgeMark } from './BadgeMark';
import { LikeDot } from './LikeDot';
import { PollView } from './PollView';

/** Who wrote it: badge, handle, company (if shown), when. */
export function Byline({ author, createdAt, mine, extra, onMore, moreTestID }: { author: Author; createdAt: string; mine?: boolean; extra?: string | null; onMore?: () => void; moreTestID?: string }) {
  const sub = [author.companyLabel, extra].filter(Boolean).join(' · ');
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      {author.id === 'wrk' ? <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: color.ink, marginHorizontal: 1 }} /> : <BadgeMark seed={author.handle} height={32} />}
      <View style={{ flex: 1 }}>
        <T v="label" numberOfLines={1} style={author.id === 'wrk' ? { fontFamily: font.mark, fontSize: 17, writingDirection: 'ltr', alignSelf: 'flex-start' } : undefined}>
          {author.handle}
          {mine ? <T v="caption" mute>{`  ${s.feed.you}`}</T> : null}
        </T>
        <T v="caption" mute numberOfLines={1}>
          {sub ? `${sub} · ` : ''}
          <Ago iso={createdAt} />
        </T>
      </View>
      {onMore ? <IconButton testID={moreTestID} name="more" label={s.feed.more} onPress={onMore} tint={color.mute} /> : null}
    </View>
  );
}

function Pending() {
  return (
    <View style={{ alignSelf: 'flex-start', borderWidth: 1, borderColor: color.line, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 2, marginTop: 10 }}>
      <T v="caption" mute>{s.feed.pending}</T>
    </View>
  );
}

export const PostCard = React.memo(function PostCard({
  post,
  showChannel,
  selected,
  full,
  onOpen,
  onLike,
  onMore,
}: {
  post: Post;
  /** Print the channel name next to the company (used in the "all" feed). */
  showChannel?: boolean;
  /** Two-pane layout: this post is the one open in the detail pane. */
  selected?: boolean;
  /** Detail view: whole text, selectable, not pressable. */
  full?: boolean;
  onOpen?: (post: Post) => void;
  onLike: (post: Post) => void;
  onMore: (post: Post) => void;
}) {
  const poll = can.polls() ? pollOf(post) : null;
  const vote = useVotePoll();
  const gate = useMemberGate();
  const channel = showChannel && post.channel !== 'all' && post.channel !== 'company' ? s.channels[post.channel] : null;
  const body = (
    <View style={{ paddingHorizontal: space.gutter, paddingTop: 16, paddingBottom: 8, backgroundColor: selected ? color.stock : 'transparent' }}>
      <Byline author={post.author} createdAt={post.createdAt} mine={post.mine} extra={channel} onMore={() => onMore(post)} moreTestID={`post-more-${post.id}`} />
      <T
        selectable={full}
        numberOfLines={full ? undefined : 6}
        style={[{ marginTop: 10 }, full && { fontSize: 18, lineHeight: 32 }]}>
        {post.body}
      </T>
      {poll ? <PollView poll={poll} busy={vote.isPending} onVote={(optionId) => gate() && vote.mutate({ postId: post.id, optionId })} /> : null}
      {post.status === 'pending' ? <Pending /> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 6 }}>
        <LikeDot testID={`like-${post.id}`} liked={post.likedByMe} count={post.likeCount} onToggle={() => onLike(post)} />
        <T v="caption" mute>
          <Num style={{ fontSize: 15 }}>{post.commentCount}</Num> {s.feed.comments}
        </T>
      </View>
    </View>
  );
  if (full || !onOpen) return body;
  return (
    <Pressable testID={`post-${post.id}`} accessibilityRole={Platform.OS === 'web' ? undefined : 'button'} onPress={() => onOpen(post)} style={({ pressed }) => pressed && { backgroundColor: color.stock }}>
      {body}
    </Pressable>
  );
});

export const CommentRow = React.memo(function CommentRow({ comment, isAuthor, onMore }: { comment: Comment; isAuthor: boolean; onMore: (c: Comment) => void }) {
  return (
    <View style={{ paddingHorizontal: space.gutter, paddingVertical: 14 }}>
      <Byline author={comment.author} createdAt={comment.createdAt} mine={comment.mine} extra={isAuthor ? s.post.author : null} onMore={() => onMore(comment)} moreTestID={`comment-more-${comment.id}`} />
      <T selectable style={{ marginTop: 6, marginStart: 31 }}>
        {comment.body}
      </T>
      {comment.status === 'pending' ? <View style={{ marginStart: 31 }}><Pending /></View> : null}
    </View>
  );
});
