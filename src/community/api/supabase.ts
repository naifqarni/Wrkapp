/**
 * Supabase implementation of the community contract.
 *
 * The app never reads or writes a table. Everything is a database function
 * (`rpc`) that checks who is asking, plus edge functions for sign-in and AI
 * moderation. The community is members-only: an invite code or a store purchase
 * gets a new person in. The email is sent once to the sign-in function and is
 * not stored anywhere: not on the phone, not in the database.
 *
 * This file has no React Native imports so it can be tested under Node with a
 * fake client; `index.ts` builds the real client.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  CommunityError,
  type AppNotification,
  type Author,
  type Channel,
  type ChannelId,
  type Comment,
  type Company,
  type CommunityApi,
  type Invite,
  type SignInAccess,
  type CommunityErrorCode,
  type Me,
  type ModerationAction,
  type ModerationItem,
  type Page,
  type Post,
  type ReportReason,
  type ReportTarget,
  type WeeklyQuestion,
} from './types';

/** The slice of supabase-js this file uses (lets tests pass a fake). */
export type SupabaseLike = Pick<SupabaseClient, 'rpc' | 'functions' | 'auth'>;

const KNOWN: readonly CommunityErrorCode[] = [
  'free-mail', 'invalid-email', 'bad-code', 'rate-limited', 'not-verified', 'rules-not-accepted',
  'filtered', 'not-found', 'forbidden', 'network', 'unknown',
  'not-invited', 'invite-used', 'no-purchase', 'not-a-member',
];
const isCode = (v: unknown): v is CommunityErrorCode => typeof v === 'string' && (KNOWN as readonly string[]).includes(v);
const looksOffline = (msg: string) => /network request failed|failed to fetch|fetch failed|load failed|networkerror|timeout|aborted/i.test(msg);

/** How long createPost / createComment wait for the AI verdict before returning the item as 'pending'. */
const AI_WAIT_MS = 9000;

function toError(err: unknown): CommunityError {
  if (err instanceof CommunityError) return err;
  const e = (err ?? {}) as { message?: string; code?: string; status?: number; name?: string };
  const msg = String(e.message ?? '');
  if (isCode(msg)) return new CommunityError(msg);                       // raised by our database functions
  if (e.code === 'PGRST301' || e.code === 'PGRST302' || e.status === 401 || /jwt/i.test(msg)) return new CommunityError('not-verified', msg);
  if (e.code === '42501') return new CommunityError('forbidden', msg);   // permission denied (signed out)
  if (e.code === '22P02') return new CommunityError('not-found', msg);   // malformed id
  if (e.name === 'FunctionsFetchError' || looksOffline(msg)) return new CommunityError('network', msg);
  return new CommunityError('unknown', msg);
}

export function createSupabaseCommunityApi(client: SupabaseLike): CommunityApi {
  const listeners = new Set<(me: Me | null) => void>();
  let lastEmitted: string | null | undefined;

  function emit(me: Me | null) {
    const key = me ? JSON.stringify(me) : null;
    if (key === lastEmitted) return;
    lastEmitted = key;
    listeners.forEach((cb) => {
      try { cb(me); } catch { /* a listener must not break the others */ }
    });
  }

  async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
    let res: { data: unknown; error: unknown };
    try {
      res = await client.rpc(fn, args ?? {});
    } catch (err) {
      throw toError(err);
    }
    if (res.error) throw toError(res.error);
    return res.data as T;
  }

  /** Calls an edge function; resolves to its JSON body, rejects with the contract's error code. */
  async function fn<T>(name: string, body: Record<string, unknown>): Promise<T> {
    let res: { data: unknown; error: unknown };
    try {
      res = await client.functions.invoke(name, { body });
    } catch (err) {
      throw toError(err);
    }
    if (res.error) {
      const ctx = (res.error as { context?: { json?: () => Promise<unknown> } }).context;
      if (ctx && typeof ctx.json === 'function') {
        const parsed = (await ctx.json().catch(() => null)) as { error?: unknown } | null;
        if (parsed && isCode(parsed.error)) throw new CommunityError(parsed.error);
      }
      throw toError(res.error);
    }
    return res.data as T;
  }

  async function hasSession(): Promise<boolean> {
    try {
      const { data } = await client.auth.getSession();
      return !!data.session;
    } catch {
      return false;
    }
  }

  const page = <T>(p: Page<T> | null): Page<T> => ({ items: p?.items ?? [], nextCursor: p?.nextCursor ?? null });

  type Raw<T> = T & { aiPending?: boolean };
  const clean = <T extends object>(raw: Raw<T>): T => {
    const { aiPending: _drop, ...rest } = raw;
    return rest as unknown as T;
  };

  /**
   * With AI moderation on, a new item is saved as pending and only its author
   * sees it. Ask for the verdict now so the common case returns published.
   */
  async function settle<T extends { id: string; status?: 'published' | 'pending' }>(kind: 'post' | 'comment', raw: Raw<T>): Promise<T> {
    const item = clean(raw);
    if (!raw.aiPending) return item;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const verdict = await Promise.race([
      fn<{ status?: string }>('moderate', { type: kind, id: item.id }).then((r) => r?.status ?? 'pending', () => 'pending'),
      new Promise<string>((resolve) => { timer = setTimeout(() => resolve('pending'), AI_WAIT_MS); }),
    ]);
    if (timer) clearTimeout(timer);
    if (verdict === 'removed') throw new CommunityError('filtered');
    return { ...item, status: verdict === 'published' ? 'published' : 'pending' };
  }

  // Supabase tells us about sign-outs it causes itself (expired or revoked session).
  try {
    client.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') emit(null);
    });
  } catch { /* fake clients may not implement it */ }

  const api: CommunityApi = {
    // ------------------------------------------------------------ identity
    async requestEmailCode(email: string, access?: SignInAccess) {
      const a: SignInAccess = access ?? { kind: 'member' };
      const out = await fn<{ devCode?: string }>('auth-request-code', {
        email,
        access: a.kind,
        ...(a.kind === 'invite' ? { inviteCode: a.code } : {}),
      });
      // Only a test project started with DEV_ECHO_CODE=true answers with the code (no mail provider yet).
      if (out?.devCode) console.info(`[wrk] test sign-in code: ${out.devCode}`);
    },

    async verifyEmailCode(email, code) {
      const out = await fn<{ tokenHash: string }>('auth-verify-code', { email, code });
      // exchange the one-time token for a session
      let res = await client.auth.verifyOtp({ token_hash: out.tokenHash, type: 'magiclink' });
      if (res.error) res = await client.auth.verifyOtp({ token_hash: out.tokenHash, type: 'email' });
      if (res.error) throw toError(res.error);
      const me = await rpc<Me | null>('me');
      if (!me) throw new CommunityError('forbidden');
      emit(me);
      return me;
    },

    async checkInvite(code) {
      const out = await rpc<{ valid?: boolean } | null>('check_invite', { p_code: code });
      return { valid: out?.valid === true };
    },

    async listMyInvites() {
      return (await rpc<Invite[] | null>('list_my_invites')) ?? [];
    },

    async requestWorkEmailCode(workEmail) {
      const out = await fn<{ devCode?: string }>('auth-work-email', { action: 'request', email: workEmail });
      if (out?.devCode) console.info(`[wrk] test work-email code: ${out.devCode}`);
    },

    async verifyWorkEmailCode(workEmail, code) {
      await fn('auth-work-email', { action: 'verify', email: workEmail, code });
      const me = await rpc<Me | null>('me');
      if (!me) throw new CommunityError('forbidden');
      emit(me);
      return me;
    },

    async getMe() {
      if (!(await hasSession())) return null;
      const me = await rpc<Me | null>('me');
      if (!me) {
        // the account is gone or banned: drop the dead session
        await client.auth.signOut({ scope: 'local' }).catch(() => undefined);
        emit(null);
        return null;
      }
      emit(me);
      return me;
    },

    onAuthChange(cb) {
      listeners.add(cb);
      return () => { listeners.delete(cb); };
    },

    async acceptRules() {
      const me = await rpc<Me>('accept_rules');
      emit(me);
      return me;
    },

    async updateMe(patch) {
      const me = await rpc<Me>('update_me', {
        p_show_company: patch.showCompany ?? null,
        p_regenerate_handle: patch.regenerateHandle ?? false,
      });
      emit(me);
      return me;
    },

    async signOut() {
      const { error } = await client.auth.signOut({ scope: 'local' });
      emit(null);
      if (error && !/session/i.test(error.message)) throw toError(error);
    },

    async deleteAccount() {
      await rpc<void>('delete_my_account');
      await client.auth.signOut({ scope: 'local' }).catch(() => undefined);
      emit(null);
    },

    // ------------------------------------------------------------- content
    async listChannels() {
      return (await rpc<Channel[] | null>('list_channels')) ?? [];
    },

    async listPosts(q) {
      const p = await rpc<Page<Raw<Post>>>('list_posts', { p_channel: q.channel, p_cursor: q.cursor ?? null, p_limit: q.limit ?? 20 });
      return page({ items: (p?.items ?? []).map(clean), nextCursor: p?.nextCursor ?? null });
    },

    async getPost(id) {
      return clean(await rpc<Raw<Post>>('get_post', { p_id: id }));
    },

    async createPost(input: { channel: ChannelId; body: string; poll?: { options: string[] } }) {
      return settle('post', await rpc<Raw<Post>>('create_post', {
        p_channel: input.channel, p_body: input.body, p_poll: input.poll ? { options: input.poll.options } : null,
      }));
    },

    async deletePost(id) {
      await rpc<void>('delete_post', { p_id: id });
    },

    async listComments(q) {
      const p = await rpc<Page<Raw<Comment>>>('list_comments', { p_post_id: q.postId, p_cursor: q.cursor ?? null, p_limit: q.limit ?? 20 });
      return page({ items: (p?.items ?? []).map(clean), nextCursor: p?.nextCursor ?? null });
    },

    async createComment(input) {
      return settle('comment', await rpc<Raw<Comment>>('create_comment', { p_post_id: input.postId, p_body: input.body }));
    },

    async deleteComment(id) {
      await rpc<void>('delete_comment', { p_id: id });
    },

    async setLike(postId, liked) {
      return rpc<{ likeCount: number; likedByMe: boolean }>('set_like', { p_post_id: postId, p_liked: liked });
    },

    // -------------------------------------------------------------- safety
    async report(target: ReportTarget, reason: ReportReason, note?: string) {
      await rpc<void>('report', { p_target_type: target.type, p_target_id: target.id, p_reason: reason, p_note: note ?? null });
    },

    async blockUser(userId) {
      await rpc<void>('block_user', { p_user_id: userId });
    },

    async unblockUser(userId) {
      await rpc<void>('unblock_user', { p_user_id: userId });
    },

    async listBlocked() {
      return (await rpc<Author[] | null>('list_blocked')) ?? [];
    },

    // -------------------------------------------------------------- extras
    async listMyPosts(q) {
      const p = await rpc<Page<Raw<Post>>>('list_my_posts', { p_cursor: q?.cursor ?? null, p_limit: q?.limit ?? 20 });
      return page({ items: (p?.items ?? []).map(clean), nextCursor: p?.nextCursor ?? null });
    },

    async listNotifications(q) {
      return page(await rpc<Page<AppNotification>>('list_notifications', { p_cursor: q?.cursor ?? null, p_limit: q?.limit ?? 20 }));
    },

    async unreadNotificationCount() {
      if (!(await hasSession())) return 0;
      return (await rpc<number | null>('unread_notification_count')) ?? 0;
    },

    async markNotificationsRead(ids) {
      await rpc<void>('mark_notifications_read', { p_ids: ids && ids.length ? ids : null });
    },

    async registerPushToken(token, platform) {
      await rpc<void>('register_push_token', { p_token: token, p_platform: platform });
    },

    async unregisterPushToken(token) {
      await rpc<void>('unregister_push_token', { p_token: token });
    },

    async exportMyData() {
      return rpc<unknown>('export_my_data');
    },

    async listModerationQueue(q) {
      const p = await rpc<Page<ModerationItem> & { openCount: number; overdueCount: number }>('mod_list_queue', {
        p_state: q?.state === 'closed' ? 'closed' : 'open', p_cursor: q?.cursor ?? null, p_limit: q?.limit ?? 20,
      });
      return { ...page(p), openCount: p?.openCount ?? 0, overdueCount: p?.overdueCount ?? 0 };
    },

    async resolveModerationItem(id: string, action: ModerationAction, note?: string) {
      return rpc<ModerationItem>('mod_resolve', { p_item_id: id, p_action: action, p_note: note ?? null });
    },

    async createInvites(count, note) {
      return (await rpc<Invite[] | null>('mod_create_invites', { p_count: count, p_note: note ?? null })) ?? [];
    },

    // ------------------------------------------------------------- round 3
    async listCompanies(q) {
      return page(await rpc<Page<Company>>('list_companies', { p_search: q?.search ?? null, p_cursor: q?.cursor ?? null, p_limit: q?.limit ?? 30 }));
    },

    async getCompany(id) {
      return rpc<Company>('get_company', { p_id: id });
    },

    async votePoll(postId, optionId) {
      return clean(await rpc<Raw<Post>>('vote_poll', { p_post_id: postId, p_option_id: optionId }));
    },

    async getWeeklyQuestion() {
      return (await rpc<WeeklyQuestion | null>('get_weekly_question')) ?? null;
    },

    async setSaved(postId, saved) {
      await rpc<void>('set_saved', { p_post_id: postId, p_saved: saved });
    },

    async listSavedPosts(q) {
      const p = await rpc<Page<Raw<Post>>>('list_saved_posts', { p_cursor: q?.cursor ?? null, p_limit: q?.limit ?? 20 });
      return page({ items: (p?.items ?? []).map(clean), nextCursor: p?.nextCursor ?? null });
    },

    async searchPosts(q) {
      const p = await rpc<Page<Raw<Post>>>('search_posts', { p_query: q.query, p_cursor: q.cursor ?? null, p_limit: q.limit ?? 20 });
      return page({ items: (p?.items ?? []).map(clean), nextCursor: p?.nextCursor ?? null });
    },
  };

  return api;
}
