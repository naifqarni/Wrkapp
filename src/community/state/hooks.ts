/**
 * Server data for the community screens (react-query). Screens never call the API directly
 * for lists; they use these hooks so likes, deletes and blocks update every open list at once.
 */
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';

import { community as s } from '@/i18n/community';

import { getCommunityApi } from '../api';
import { can, createPostWithPoll, fx, type Company } from '../api/features';
import {
  CommunityError,
  type AppNotification,
  type Author,
  type ChannelId,
  type Comment,
  type CommunityErrorCode,
  type Me,
  type Page,
  type Post,
  type ReportReason,
  type ReportTarget,
} from '../api/types';
import { haptic, toast } from '../ui/kit';
import { useMe, useSession, useSessionBoot } from './session';

const ROOT = 'community';
export const keys = {
  root: [ROOT] as const,
  posts: (channel: ChannelId) => [ROOT, 'posts', channel] as const,
  allPosts: [ROOT, 'posts'] as const,
  mine: [ROOT, 'posts', '__mine'] as const,
  post: (id: string) => [ROOT, 'post', id] as const,
  comments: (postId: string) => [ROOT, 'comments', postId] as const,
  blocked: [ROOT, 'blocked'] as const,
  notifications: [ROOT, 'notifications'] as const,
  unread: [ROOT, 'unread'] as const,
};

export function errorCode(e: unknown): CommunityErrorCode {
  if (e instanceof CommunityError) return e.code;
  const c = (e as { code?: string } | null)?.code;
  return c && c in s.errors ? (c as CommunityErrorCode) : 'unknown';
}
export function errorText(e: unknown): string {
  return s.errors[errorCode(e)] ?? s.errors.unknown;
}

/** Call once at the top of every community screen. */
export function useCommunityBoot() {
  const qc = useQueryClient();
  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: keys.root });
  }, [qc]);
  useSessionBoot(invalidate);
}

/* ------------------------------------------------------------ cache edits */
type PostPages = InfiniteData<Page<Post>>;
type CommentPages = InfiniteData<Page<Comment>>;

function editPosts(qc: QueryClient, fn: (items: Post[]) => Post[]) {
  qc.setQueriesData<PostPages>({ queryKey: keys.allPosts }, (d) =>
    d ? { ...d, pages: d.pages.map((p) => ({ ...p, items: fn(p.items) })) } : d,
  );
}
export function patchPost(qc: QueryClient, id: string, patch: (p: Post) => Post) {
  editPosts(qc, (items) => items.map((p) => (p.id === id ? patch(p) : p)));
  qc.setQueryData<Post>(keys.post(id), (p) => (p ? patch(p) : p));
}
export function dropPost(qc: QueryClient, id: string) {
  editPosts(qc, (items) => items.filter((p) => p.id !== id));
  qc.removeQueries({ queryKey: keys.post(id) });
}
/** After a block: the author disappears from every open list at once, before any refetch. */
export function dropAuthor(qc: QueryClient, userId: string) {
  editPosts(qc, (items) => items.filter((p) => p.author.id !== userId));
  qc.setQueriesData<CommentPages>({ queryKey: [ROOT, 'comments'] }, (d) =>
    d ? { ...d, pages: d.pages.map((p) => ({ ...p, items: p.items.filter((c) => c.author.id !== userId) })) } : d,
  );
}

/* ---------------------------------------------------------------- reading */
export function useFeed(channel: ChannelId, enabled = true) {
  return useInfiniteQuery({
    queryKey: keys.posts(channel),
    enabled,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => getCommunityApi().listPosts({ channel, cursor: pageParam, limit: 10 }),
    getNextPageParam: (last) => last.nextCursor,
  });
}

export function useMyPosts() {
  const me = useMe();
  return useInfiniteQuery({
    queryKey: keys.mine,
    enabled: !!me,
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }): Promise<Page<Post>> => {
      const api = getCommunityApi();
      if (api.listMyPosts) return api.listMyPosts({ cursor: pageParam, limit: 10 });
      // Fallback for a backend without listMyPosts: walk the two feeds I can write to and keep mine.
      const [a, b] = await Promise.all([
        api.listPosts({ channel: 'all', limit: 50 }),
        api.listPosts({ channel: 'company', limit: 50 }).catch(() => ({ items: [], nextCursor: null })),
      ]);
      const items = [...a.items, ...b.items].filter((p) => p.mine).sort((p, q) => (p.createdAt < q.createdAt ? 1 : -1));
      return { items, nextCursor: null };
    },
    getNextPageParam: (last) => last.nextCursor,
  });
}

export function usePost(id: string | null) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: keys.post(id ?? ''),
    enabled: !!id,
    queryFn: () => getCommunityApi().getPost(id!),
    // Show the copy from the feed at once, then refresh.
    placeholderData: () => {
      const lists = qc.getQueriesData<PostPages>({ queryKey: keys.allPosts });
      for (const [, d] of lists) {
        const hit = d?.pages.flatMap((p) => p.items).find((p) => p.id === id);
        if (hit) return hit;
      }
      return undefined;
    },
    retry: (n, e) => errorCode(e) === 'network' && n < 1,
  });
}

export function useComments(postId: string | null) {
  return useInfiniteQuery({
    queryKey: keys.comments(postId ?? ''),
    enabled: !!postId,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => getCommunityApi().listComments({ postId: postId!, cursor: pageParam, limit: 30 }),
    getNextPageParam: (last) => last.nextCursor,
  });
}

export function useBlocked() {
  const me = useMe();
  return useQuery({ queryKey: keys.blocked, enabled: !!me, queryFn: () => getCommunityApi().listBlocked() });
}

/* ---------------------------------------------------------- notifications */
export function hasNotifications(): boolean {
  return typeof getCommunityApi().listNotifications === 'function';
}
export function useUnreadCount() {
  const me = useMe();
  return useQuery({
    queryKey: keys.unread,
    enabled: !!me && typeof getCommunityApi().unreadNotificationCount === 'function',
    queryFn: () => getCommunityApi().unreadNotificationCount!(),
    refetchInterval: 60_000,
  });
}
export function useNotifications() {
  const me = useMe();
  return useInfiniteQuery({
    queryKey: keys.notifications,
    enabled: !!me && hasNotifications(),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }): Promise<Page<AppNotification>> => getCommunityApi().listNotifications!({ cursor: pageParam, limit: 20 }),
    getNextPageParam: (last) => last.nextCursor,
  });
}
export function useMarkNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids?: string[]) => getCommunityApi().markNotificationsRead?.(ids) ?? Promise.resolve(),
    onMutate: (ids) => {
      qc.setQueryData<InfiniteData<Page<AppNotification>>>(keys.notifications, (d) =>
        d ? { ...d, pages: d.pages.map((p) => ({ ...p, items: p.items.map((n) => (!ids || ids.includes(n.id) ? { ...n, read: true } : n)) })) } : d,
      );
      if (!ids) qc.setQueryData(keys.unread, 0);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: keys.unread }),
  });
}

/* ---------------------------------------------------------------- writing */
export function useLike() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, liked }: { id: string; liked: boolean }) => getCommunityApi().setLike(id, liked),
    onMutate: ({ id, liked }) => {
      patchPost(qc, id, (p) => (p.likedByMe === liked ? p : { ...p, likedByMe: liked, likeCount: Math.max(0, p.likeCount + (liked ? 1 : -1)) }));
    },
    onSuccess: (r, { id }) => patchPost(qc, id, (p) => ({ ...p, ...r })),
    onError: (e, { id, liked }) => {
      patchPost(qc, id, (p) => ({ ...p, likedByMe: !liked, likeCount: Math.max(0, p.likeCount + (liked ? -1 : 1)) }));
      toast(errorText(e));
    },
  });
}

export function useCreatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { channel: ChannelId; body: string; poll?: { options: string[] } }) => createPostWithPoll(input),
    onSuccess: (post) => {
      qc.setQueryData(keys.post(post.id), post);
      qc.invalidateQueries({ queryKey: keys.allPosts });
      qc.invalidateQueries({ queryKey: [ROOT, 'companies'] });
    },
  });
}

export function useDeletePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => getCommunityApi().deletePost(id),
    onSuccess: (_r, id) => {
      dropPost(qc, id);
      toast(s.post.deleted);
    },
    onError: (e) => toast(errorText(e)),
  });
}

export function useCreateComment(postId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => getCommunityApi().createComment({ postId, body }),
    onSuccess: (c) => {
      qc.setQueryData<CommentPages>(keys.comments(postId), (d) => {
        if (!d) return d;
        const pages = d.pages.slice();
        const last = pages[pages.length - 1];
        pages[pages.length - 1] = { ...last, items: [...last.items, c] };
        return { ...d, pages };
      });
      patchPost(qc, postId, (p) => ({ ...p, commentCount: p.commentCount + 1 }));
    },
  });
}

export function useDeleteComment(postId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => getCommunityApi().deleteComment(id),
    onSuccess: (_r, id) => {
      qc.setQueryData<CommentPages>(keys.comments(postId), (d) =>
        d ? { ...d, pages: d.pages.map((p) => ({ ...p, items: p.items.filter((c) => c.id !== id) })) } : d,
      );
      patchPost(qc, postId, (p) => ({ ...p, commentCount: Math.max(0, p.commentCount - 1) }));
      toast(s.post.deleted);
    },
    onError: (e) => toast(errorText(e)),
  });
}

export function useReport() {
  return useMutation({
    mutationFn: (v: { target: ReportTarget; reason: ReportReason; note?: string }) => getCommunityApi().report(v.target, v.reason, v.note),
  });
}

export function useBlock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (author: Author) => getCommunityApi().blockUser(author.id),
    onSuccess: (_r, author) => {
      dropAuthor(qc, author.id);
      qc.invalidateQueries({ queryKey: keys.blocked });
      qc.invalidateQueries({ queryKey: keys.allPosts });
      haptic.success();
      toast(s.block.done);
    },
    onError: (e) => toast(errorText(e)),
  });
}

export function useUnblock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => getCommunityApi().unblockUser(userId),
    onMutate: (userId) => {
      qc.setQueryData<Author[]>(keys.blocked, (d) => d?.filter((a) => a.id !== userId));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: keys.blocked });
      qc.invalidateQueries({ queryKey: keys.allPosts });
    },
    onError: (e) => toast(errorText(e)),
  });
}

export function useUpdateMe() {
  return useMutation({
    mutationFn: (patch: { showCompany?: boolean; regenerateHandle?: boolean }) => getCommunityApi().updateMe(patch),
    onSuccess: (me: Me) => useSession.getState().set(me),
    onError: (e) => toast(errorText(e)),
  });
}

/* ------------------------------------------------------------------ gates */
/**
 * Writing, liking, reporting and blocking need a verified member who accepted the rules.
 * Returns a function that either says yes or sends the person to the step they are missing.
 */
export function useMemberGate() {
  const me = useMe();
  const router = useRouter();
  return useCallback(
    (opts: { rules?: boolean } = { rules: true }): boolean => {
      if (!me) {
        // Not a member: the community tab itself is the door.
        router.replace('/');
        return false;
      }
      if (opts.rules !== false && !me.acceptedRulesAt) {
        router.push('/community/rules');
        return false;
      }
      return true;
    },
    [me, router],
  );
}

/* ------------------------------------------------- round 3: richer features */
export function useVotePoll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { postId: string; optionId: string }) => fx().votePoll!(v.postId, v.optionId),
    onSuccess: (post) => patchPost(qc, post.id, () => post),
    onError: (e) => toast(errorText(e)),
  });
}

export function useWeeklyQuestion() {
  const me = useMe();
  return useQuery({ queryKey: [ROOT, 'weekly'], enabled: !!me && can.weekly(), queryFn: () => fx().getWeeklyQuestion!(), staleTime: 5 * 60_000 });
}

export function useSave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; saved: boolean }) => fx().setSaved!(v.id, v.saved),
    onMutate: ({ id, saved }) => patchPost(qc, id, (p) => ({ ...p, savedByMe: saved }) as Post),
    onSuccess: (_r, { saved }) => {
      toast(saved ? s.actions.saved : s.actions.unsaved);
      qc.invalidateQueries({ queryKey: [ROOT, 'posts', '__saved'] });
    },
    onError: (e, { id, saved }) => {
      patchPost(qc, id, (p) => ({ ...p, savedByMe: !saved }) as Post);
      toast(errorText(e));
    },
  });
}

export function useSavedPosts() {
  const me = useMe();
  return useInfiniteQuery({
    queryKey: [ROOT, 'posts', '__saved'],
    enabled: !!me && can.save(),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => fx().listSavedPosts!({ cursor: pageParam, limit: 10 }),
    getNextPageParam: (last) => last.nextCursor,
  });
}

export function useSearchPosts(query: string) {
  const me = useMe();
  const term = query.trim();
  return useInfiniteQuery({
    queryKey: [ROOT, 'posts', '__search', term],
    enabled: !!me && can.search() && term.length >= 2,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => fx().searchPosts!({ query: term, cursor: pageParam, limit: 10 }),
    getNextPageParam: (last) => last.nextCursor,
  });
}

export function useCompanies(search: string) {
  const me = useMe();
  const term = search.trim();
  return useInfiniteQuery({
    queryKey: [ROOT, 'companies', term],
    enabled: !!me && can.companies(),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => fx().listCompanies!({ search: term || undefined, cursor: pageParam, limit: 30 }),
    getNextPageParam: (last) => last.nextCursor,
    placeholderData: (prev) => prev,
  });
}

export function useCompany(id: string | null) {
  const me = useMe();
  const qc = useQueryClient();
  return useQuery({
    queryKey: [ROOT, 'company', id ?? ''],
    enabled: !!me && !!id && typeof fx().getCompany === 'function',
    queryFn: () => fx().getCompany!(id!),
    placeholderData: () => {
      const lists = qc.getQueriesData<InfiniteData<Page<Company>>>({ queryKey: [ROOT, 'companies'] });
      for (const [, d] of lists) {
        const hit = d?.pages.flatMap((p) => p.items).find((c) => c.id === id);
        if (hit) return hit;
      }
      return undefined;
    },
  });
}
