/** Community API contract. Screens use only getCommunityApi() from './index'. Owner of changes: backend thread. */
export type ChannelId = 'company' | 'all' | 'first-day' | 'salaries' | 'interviews' | 'culture' | 'advice';
export interface Channel { id: ChannelId; title: string; companyOnly: boolean }
export interface Me {
  id: string;
  handle: string;
  /** null: joined as a store buyer with a personal email and has not added a work email yet */
  companyId: string | null;
  companyName: string | null;
  /** how this member got in */
  access?: 'invite' | 'buyer';
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
/**
 * companyLabel null means the author chose to hide it.
 * companyId and companyIconUrl are set only when the author shows their employer.
 * The author of the question of the week is always { id: 'wrk', handle: 'wrk.', companyLabel: null }.
 */
export interface Author { id: string; handle: string; companyLabel: string | null; companyId?: string | null; companyIconUrl?: string | null }
/**
 * A company in the directory. iconUrl is a copy held by our backend (null: draw the monogram).
 * The company's posts are listPosts({ channel: 'company' }) and only for its own verified members;
 * everyone else gets this card with its two counts.
 */
export interface Company {
  id: string;
  name: string;
  nameEn: string | null;
  domain: string | null;
  /** Arabic label, e.g. "البنوك" */
  sector: string | null;
  iconUrl: string | null;
  memberCount: number;
  postCount: number;
  mine: boolean;
}
/** One vote per member, never changed. Nobody can see who chose what. */
export interface Poll {
  options: { id: string; text: string; votes: number }[];
  totalVotes: number;
  myOptionId: string | null;
}
/**
 * One prompt a week for everyone. It is a normal post in 'all' written by the 'wrk' author;
 * answers are its comments (getPost / listComments / createComment). It is not in listPosts or searchPosts.
 * The week turns on Sunday 00:00 Riyadh time (endsAt).
 */
export interface WeeklyQuestion { id: string; postId: string; text: string; endsAt: string; answerCount: number }
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
  savedByMe?: boolean;
  poll?: Poll | null;
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
/**
 * comment: someone commented on my post. removed / approved: a moderator decided on something I wrote.
 * like: people liked my post (one row per post, re-used while unread; count = likes so far).
 * invite-joined: someone came in with one of my invitations (postId null).
 */
export interface AppNotification {
  id: string;
  type: 'comment' | 'removed' | 'approved' | 'like' | 'invite-joined';
  postId: string | null;
  commentId: string | null;
  createdAt: string;
  read: boolean;
  /** the first 80 characters of my own post, so the row can say which one */
  excerpt?: string | null;
  count?: number;
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
  | 'filtered' | 'not-found' | 'forbidden' | 'network' | 'unknown'
  /** invite code does not exist */
  | 'not-invited'
  /** invite code was already used by someone else */
  | 'invite-used'
  /** no store order was found for this email */
  | 'no-purchase'
  /** access 'member' but this email has no account yet */
  | 'not-a-member';

/**
 * The community is members-only. A new person gets in with an invite code (work email required)
 * or because they bought from the store (the order email; personal mail allowed).
 * A returning member signs in with just their email.
 */
export type SignInAccess = { kind: 'member' } | { kind: 'invite'; code: string } | { kind: 'buyer' };
/** Looks like WRK-7Q4K-2M9X. Any case, with or without dashes, is accepted on input. */
export interface Invite { code: string; usedAt: string | null }

export class CommunityError extends Error {
  code: CommunityErrorCode;
  constructor(code: CommunityErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'CommunityError';
    this.code = code;
  }
}

export const LIMITS = { postMax: 2000, commentMax: 800, pollOptionsMin: 2, pollOptionsMax: 4, pollOptionMax: 60, searchMin: 2 } as const;

export interface CommunityApi {
  // identity
  /** access omitted = { kind: 'member' } */
  requestEmailCode(email: string, access?: SignInAccess): Promise<void>;
  /** the server remembers which access path the code was requested on; an invite is consumed here */
  verifyEmailCode(email: string, code: string): Promise<Me>;
  /** works signed out. false for unknown and for used codes; never throws for a bad code */
  checkInvite(code: string): Promise<{ valid: boolean }>;
  /** my 3 single-use codes, oldest first */
  listMyInvites(): Promise<Invite[]>;
  /** a member without a company adds their employer: 'free-mail' for personal mail, 'forbidden' if the address already has an account */
  requestWorkEmailCode?(workEmail: string): Promise<void>;
  verifyWorkEmailCode?(workEmail: string, code: string): Promise<Me>;
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
  /** poll: 2 to 4 choices of 1 to 60 characters; the body is the question. Bad choices throw 'filtered'. */
  createPost(input: { channel: ChannelId; body: string; poll?: { options: string[] } }): Promise<Post>;
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
  /** mint extra invite codes (1 to 50) */
  createInvites?(count: number, note?: string): Promise<Invite[]>;

  // Round 3 (optional like the rest; the mock mirrors them)
  /** search matches Arabic and English names, the sector and the domain. Order: mine, most members, name. */
  listCompanies?(q?: { search?: string; cursor?: string | null; limit?: number }): Promise<Page<Company>>;
  getCompany?(id: string): Promise<Company>;
  /** 'not-found' for a post or option I cannot see, 'forbidden' when I already voted */
  votePoll?(postId: string, optionId: string): Promise<Post>;
  /** null when no question is scheduled */
  getWeeklyQuestion?(): Promise<WeeklyQuestion | null>;
  setSaved?(postId: string, saved: boolean): Promise<void>;
  /** most recently saved first */
  listSavedPosts?(q?: { cursor?: string | null; limit?: number }): Promise<Page<Post>>;
  /** post text I am allowed to see; fewer than 2 characters answers an empty page */
  searchPosts?(q: { query: string; cursor?: string | null; limit?: number }): Promise<Page<Post>>;
}
