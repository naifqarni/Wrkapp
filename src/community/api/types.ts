/** Community API contract. Screens use only getCommunityApi() from './index'. Owner of changes: backend thread. */
export type ChannelId = 'company' | 'all' | 'first-day' | 'salaries' | 'interviews' | 'culture' | 'advice';
export interface Channel { id: ChannelId; title: string; companyOnly: boolean }
export interface Me {
  id: string;
  handle: string;
  companyId: string;
  companyName: string;
  showCompany: boolean;
  acceptedRulesAt: string | null;
  role: 'member' | 'moderator';
  /** verified colleagues in my company, me included. Small numbers mean the company channel is not very anonymous. */
  companyMemberCount?: number;
  /** after this date the work email must be confirmed again to post or to read the company channel */
  verifiedUntil?: string;
  /** a moderator paused this account: reading works, writing answers 'forbidden' */
  suspended?: boolean;
}
/** companyLabel null means the author chose to hide it */
export interface Author { id: string; handle: string; companyLabel: string | null }
export interface Post {
  id: string;
  channel: ChannelId;
  body: string;
  author: Author;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  mine: boolean;
  /** 'pending' appears only on my own items while the filter, the AI or a moderator is reviewing them */
  status?: ContentStatus;
}
export type ContentStatus = 'published' | 'pending';
export interface Comment {
  id: string;
  postId: string;
  body: string;
  author: Author;
  createdAt: string;
  mine: boolean;
  status?: ContentStatus;
}
/** comment: someone commented on my post. removed / approved: a moderator decided on something I wrote. */
export interface AppNotification {
  id: string;
  type: 'comment' | 'removed' | 'approved';
  postId: string | null;
  commentId: string | null;
  createdAt: string;
  read: boolean;
}
export type ModerationAction = 'approve' | 'remove' | 'suspend' | 'ban';
export interface ModerationItem {
  id: string;
  targetType: 'post' | 'comment' | 'user';
  targetId: string;
  source: 'report' | 'filter' | 'ai' | 'stale';
  reasons: string[];
  aiNote: string | null;
  reportCount: number;
  state: 'open' | 'in_review' | 'actioned' | 'dismissed';
  action: string | null;
  createdAt: string;
  dueAt: string;
  overdue: boolean;
  author: Author | null;
  content: { body: string; status: string; createdAt: string; channel?: ChannelId; postId?: string; postBody?: string } | null;
  reports: { reason: ReportReason; note: string | null; createdAt: string }[];
}
export interface Page<T> { items: T[]; nextCursor: string | null }
export type ReportReason = 'harassment' | 'defamation' | 'hate' | 'sexual' | 'spam' | 'private-info' | 'other';
export type ReportTarget = { type: 'post' | 'comment' | 'user'; id: string };
export type CommunityErrorCode =
  | 'free-mail' | 'invalid-email' | 'bad-code' | 'rate-limited' | 'not-verified' | 'rules-not-accepted'
  | 'filtered' | 'not-found' | 'forbidden' | 'network' | 'unknown';

export class CommunityError extends Error {
  code: CommunityErrorCode;
  constructor(code: CommunityErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'CommunityError';
    this.code = code;
  }
}

export const LIMITS = { postMax: 2000, commentMax: 800 } as const;

export interface CommunityApi {
  // identity
  requestEmailCode(workEmail: string): Promise<void>;
  verifyEmailCode(workEmail: string, code: string): Promise<Me>;
  getMe(): Promise<Me | null>;
  onAuthChange(cb: (me: Me | null) => void): () => void;
  acceptRules(): Promise<Me>;
  updateMe(patch: { showCompany?: boolean; regenerateHandle?: boolean }): Promise<Me>;
  signOut(): Promise<void>;
  deleteAccount(): Promise<void>;
  // content
  listChannels(): Promise<Channel[]>;
  listPosts(q: { channel: ChannelId; cursor?: string | null; limit?: number }): Promise<Page<Post>>;
  getPost(id: string): Promise<Post>;
  createPost(input: { channel: ChannelId; body: string }): Promise<Post>;
  deletePost(id: string): Promise<void>;
  listComments(q: { postId: string; cursor?: string | null; limit?: number }): Promise<Page<Comment>>;
  createComment(input: { postId: string; body: string }): Promise<Comment>;
  deleteComment(id: string): Promise<void>;
  setLike(postId: string, liked: boolean): Promise<{ likeCount: number; likedByMe: boolean }>;
  // safety
  report(target: ReportTarget, reason: ReportReason, note?: string): Promise<void>;
  blockUser(userId: string): Promise<void>;
  unblockUser(userId: string): Promise<void>;
  listBlocked(): Promise<Author[]>;

  // Optional extras (backend thread). Check `typeof api.x === 'function'` before use; the mock may omit them.
  listMyPosts?(q?: { cursor?: string | null; limit?: number }): Promise<Page<Post>>;
  listNotifications?(q?: { cursor?: string | null; limit?: number }): Promise<Page<AppNotification>>;
  unreadNotificationCount?(): Promise<number>;
  /** no ids = mark everything read */
  markNotificationsRead?(ids?: string[]): Promise<void>;
  registerPushToken?(token: string, platform: 'ios' | 'android' | 'web'): Promise<void>;
  unregisterPushToken?(token: string): Promise<void>;
  /** PDPL right of access: everything held about me, as one JSON document */
  exportMyData?(): Promise<unknown>;
  // moderators only ('forbidden' for everyone else)
  listModerationQueue?(q?: { state?: 'open' | 'closed'; cursor?: string | null; limit?: number }): Promise<Page<ModerationItem> & { openCount: number; overdueCount: number }>;
  resolveModerationItem?(id: string, action: ModerationAction, note?: string): Promise<ModerationItem>;
}
