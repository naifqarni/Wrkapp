/**
 * In-memory CommunityApi used when no backend is configured, in previews and in tests.
 * It behaves like the real thing where the screens can tell the difference: free-mail rejection,
 * code checking, rules gate, text filter, blocks hiding content, cursor pages, small latency.
 *
 * Members only. Ways in, same as the real service: an invite code (any code starting WRK-, except
 * the used WRK-H2V8-RT5N), a purchase (an address containing "buyer"), or a returning member (an address that
 * joined earlier in this run). Any 6-digit email code except 000000 is accepted.
 * An address that starts with "mod@" joins as a moderator.
 */
import {
  CommunityError,
  type AppNotification,
  type Author,
  type Channel,
  type ChannelId,
  type Comment,
  type CommunityApi,
  type Me,
  type ModerationAction,
  type ModerationItem,
  type Page,
  type Post,
  type ReportReason,
  type ReportTarget,
} from './types';
import { makeHandle } from '../handles';

export const FREE_MAIL = [
  'gmail.com', 'googlemail.com', 'hotmail.com', 'outlook.com', 'outlook.sa', 'live.com', 'msn.com',
  'yahoo.com', 'ymail.com', 'icloud.com', 'me.com', 'mac.com', 'proton.me', 'protonmail.com',
  'aol.com', 'gmx.com', 'mail.com', 'yandex.com', 'zoho.com', 'tutanota.com', 'hey.com',
];

export const CHANNELS: Channel[] = [
  { id: 'company', title: 'شركتي', companyOnly: true },
  { id: 'all', title: 'الكل', companyOnly: false },
  { id: 'first-day', title: 'أول يوم', companyOnly: false },
  { id: 'salaries', title: 'رواتب', companyOnly: false },
  { id: 'interviews', title: 'مقابلات', companyOnly: false },
  { id: 'culture', title: 'بيئة العمل', companyOnly: false },
  { id: 'advice', title: 'نصيحة', companyOnly: false },
];

// Fictional companies. No real employer appears in seed data.
const COMPANIES: Record<string, string> = {
  'almadar.example': 'المدار',
  'nasaq.example': 'نسق',
  'sariya.example': 'سارية',
  'rukn.example': 'ركن',
};

const FILTERED = ['غبي', 'حقير', 'idiot', 'stupid'];

interface Row {
  pending?: boolean;
  id: string;
  channel: ChannelId;
  body: string;
  authorId: string;
  companyId: string;
  createdAt: number;
  likes: Set<string>;
  baseLikes: number;
}
interface CRow { id: string; postId: string; body: string; authorId: string; createdAt: number }
interface Member { id: string; handle: string; companyId: string; showCompany: boolean }

export interface MockOptions {
  /** Milliseconds of fake latency. 0 in tests. */
  latency?: number;
  /** Start already signed in (previews and screenshots). */
  signedIn?: boolean;
  rulesAccepted?: boolean;
  /** Make every call fail with `network` (to preview error states). */
  offline?: boolean;
  now?: () => number;
}

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/** Every optional method of the contract is implemented, so previews show the whole UI. */
export type MockCommunityApi = Required<Pick<CommunityApi, 'listMyPosts' | 'listNotifications' | 'unreadNotificationCount' | 'markNotificationsRead' | 'exportMyData' | 'listModerationQueue' | 'resolveModerationItem'>> & CommunityApi;

export function createMockCommunityApi(opts: MockOptions = {}): MockCommunityApi {
  const latency = opts.latency ?? 280;
  const now = opts.now ?? (() => Date.now());
  const t0 = now();
  let seq = 100;
  const nid = (p: string) => `${p}_${(seq++).toString(36)}`;

  const members = new Map<string, Member>();
  const addMember = (id: string, companyId: string, showCompany = true) => {
    members.set(id, { id, handle: makeHandle(id), companyId, showCompany });
    return id;
  };
  ['u1', 'u2', 'u3', 'u9'].forEach((id) => addMember(id, 'almadar.example'));
  ['u4', 'u5'].forEach((id) => addMember(id, 'nasaq.example'));
  addMember('u6', 'sariya.example', false);
  addMember('u7', 'sariya.example');
  addMember('u8', 'rukn.example');

  const posts: Row[] = [];
  const comments: CRow[] = [];
  const seedPost = (channel: ChannelId, authorId: string, ago: number, likes: number, body: string, replies: [string, number, string][] = []) => {
    const id = nid('p');
    posts.push({ id, channel, body, authorId, companyId: members.get(authorId)!.companyId, createdAt: t0 - ago, likes: new Set(), baseLikes: likes });
    replies.forEach(([a, cago, cbody]) => comments.push({ id: nid('c'), postId: id, body: cbody, authorId: a, createdAt: t0 - cago }));
    return id;
  };

  seedPost('company', 'u2', 38 * MIN, 14, 'اجتماع الإثنين صار ساعة ونصف كل أسبوع. هل فيه أحد جرّب يقترح نصف ساعة واقفين؟', [
    ['u3', 30 * MIN, 'جرّبناها في فريقنا شهر. اختصرنا الوقت للنصف وما نقص شيء.'],
    ['u9', 22 * MIN, 'اقترح جدول مكتوب قبل الاجتماع بيوم. اللي ما عنده بند ما يحضر.'],
  ]);
  const pFirst = seedPost('first-day', 'u4', 2 * HOUR, 41, 'أول يوم لي الأحد. وش الشيء اللي تمنّيت أحد قاله لك قبل أول يوم؟', [
    ['u1', 110 * MIN, 'اكتب أسماء اللي تقابلهم ودورهم. بعد أسبوع تنسى نصفهم.'],
    ['u7', 95 * MIN, 'اسأل عن طريقة التواصل المفضّلة لمديرك من أول يوم. رسالة أو مكالمة أو اجتماع.'],
    ['u8', 80 * MIN, 'لا تحكم على المكان من أول أسبوع.'],
    ['u5', 41 * MIN, 'تعال بدري ربع ساعة. الجهاز والبطاقة ياخذون وقت.'],
  ]);
  seedPost('salaries', 'u6', 5 * HOUR, 63, 'محلل بيانات، سنتين خبرة، الرياض. العرض 11,500 أساسي مع بدل سكن ونقل. هل هذا ضمن المعدل؟', [
    ['u8', 4 * HOUR, 'قريب من المعدل. فاوض على مراجعة بعد ستة أشهر مكتوبة في العرض.'],
    ['u4', 3 * HOUR, 'اسأل عن التأمين لأي فئة، والمكافأة السنوية كم راتب.'],
  ]);
  seedPost('company', 'u3', 7 * HOUR, 9, 'المواقف الجديدة في القبو: الدخول من البوابة الشرقية فقط حتى نهاية الشهر.');
  seedPost('interviews', 'u7', 11 * HOUR, 27, 'مقابلة تقنية ثالثة لنفس الوظيفة، وكل مرة مهمة منزلية جديدة. متى يصير الرفض المهذب هو الصح؟', [
    ['u2', 10 * HOUR, 'بعد المهمة الثانية اطلب وضوح: كم مرحلة باقي ومتى القرار.'],
  ]);
  seedPost('culture', 'u5', 26 * HOUR, 88, 'مديري يرسل بعد العاشرة مساءً ويكتب: لا ترد الآن. بس الإشعار وصل وخلاص.', [
    ['u1', 25 * HOUR, 'اقترح عليه الإرسال المجدول. أغلب الناس ما يعرفون أنها موجودة.'],
    ['u6', 20 * HOUR, 'وقّف إشعارات العمل بعد الثامنة. محد لاحظ عندي.'],
    ['u9', 19 * HOUR, 'نفس الشيء عندنا. كلمته بهدوء وتغيّر.'],
  ]);
  seedPost('advice', 'u8', 2 * DAY, 52, 'نصيحة أخذتها متأخر: وثّق إنجازاتك أول بأول في ملف واحد. يوم التقييم ما تتذكر شيء.');
  seedPost('all', 'u1', 3 * DAY, 19, 'وش أفضل طريقة تطلب فيها نقل لفريق ثاني بدون ما يتضايق مديرك الحالي؟', [
    ['u5', 3 * DAY - HOUR, 'كلّم مديرك أول. لو سمعها من غيرك تصير أصعب.'],
  ]);
  seedPost('first-day', 'u9', 4 * DAY, 33, 'أول يوم لقيت على مكتبي ورقة بخط اليد من الفريق. بسيطة، بس ما نسيتها.');
  seedPost('salaries', 'u2', 5 * DAY, 24, 'هل الزيادة السنوية عندكم نسبة ثابتة أو حسب التقييم؟ عندنا 3% للكل.');
  seedPost('culture', 'u4', 6 * DAY, 17, 'يومين من البيت في الأسبوع. الإنتاجية ما تغيّرت، بس المزاج تغيّر كثير.');
  seedPost('advice', 'u7', 8 * DAY, 45, 'لا توقّع على العرض في نفس الاجتماع. خذ يوم، واقرأ بند فترة التجربة وبند الإشعار.');
  seedPost('interviews', 'u6', 9 * DAY, 12, 'سؤال "وين تشوف نفسك بعد خمس سنين" باقي ينسأل. وش تجاوبون؟');
  seedPost('company', 'u9', 10 * DAY, 6, 'أحد يعرف متى ينفتح التسجيل في برنامج التدريب الداخلي؟');
  seedPost('all', 'u8', 12 * DAY, 30, 'قاعدة جرّبتها سنة: ما أفتح البريد قبل ما أخلّص أهم مهمة في اليوم.');

  let me: Me | null = null;
  const qItem = (r: Row, source: ModerationItem['source'], reasons: string[], ago: number, reports: ModerationItem['reports']): ModerationItem => ({
    id: nid('m'), targetType: 'post', targetId: r.id, source, reasons, aiNote: null, reportCount: reports.length, state: 'open', action: null,
    createdAt: iso(t0 - ago), dueAt: iso(t0 - ago + DAY), overdue: ago > DAY, author: author(r.authorId),
    content: { body: r.body, status: 'published', createdAt: iso(r.createdAt), channel: r.channel }, reports,
  });
  const blocked = new Set<string>();
  const authListeners = new Set<(m: Me | null) => void>();
  const pendingCodes = new Map<string, number>();
  const joined = new Set<string>();
  const usedInvites = new Set<string>(['WRK-H2V8-RT5N']);
  const pendingInvite = new Map<string, string>();
  const pendingBuyer = new Set<string>();
  const workCodes = new Set<string>();
  const myInvites = [{ code: 'WRK-H2V8-RT5N', usedAt: iso(t0 - 4 * DAY) as string | null }, { code: 'WRK-7Q4K-2M9X', usedAt: null as string | null }, { code: 'WRK-D9X3-PA6E', usedAt: null as string | null }];
  const inviteState = (raw: string) => {
    const body = raw.toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/^WRK/, '');
    if (body.length !== 8) return fail('not-invited' as never);
    const code = `WRK-${body.slice(0, 4)}-${body.slice(4)}`;
    if (usedInvites.has(code)) return fail('invite-used' as never);
    return code;
  };
  let notifications: AppNotification[] = [];

  const seedNotifications = () => {
    notifications = [
      { id: nid('n'), type: 'comment', createdAt: iso(t0 - 22 * MIN), read: false, postId: posts[0].id, commentId: null },
      { id: nid('n'), type: 'comment', createdAt: iso(t0 - 3 * HOUR), read: false, postId: pFirst, commentId: null },
      { id: nid('n'), type: 'approved', createdAt: iso(t0 - 2 * DAY), read: true, postId: posts[6].id, commentId: null },
      { id: nid('n'), type: 'removed', createdAt: iso(t0 - 6 * DAY), read: true, postId: null, commentId: null },
    ];
  };

  function iso(ms: number) { return new Date(ms).toISOString(); }
  const wait = <T,>(v: T): Promise<T> => new Promise((res, rej) => {
    const go = () => (opts.offline ? rej(new CommunityError('network')) : res(v));
    latency ? setTimeout(go, latency) : go();
  });
  const fail = (code: CommunityError['code']): never => { throw new CommunityError(code); };
  const emit = () => authListeners.forEach((cb) => cb(me));

  const author = (id: string): Author => {
    const m = members.get(id)!;
    return { id, handle: m.handle, companyLabel: m.showCompany && m.companyId ? COMPANIES[m.companyId] ?? m.companyId : null };
  };
  const toPost = (r: Row): Post => ({
    id: r.id,
    channel: r.channel,
    body: r.body,
    author: author(r.authorId),
    createdAt: iso(r.createdAt),
    likeCount: r.baseLikes + r.likes.size,
    commentCount: comments.filter((c) => c.postId === r.id && !blocked.has(c.authorId)).length,
    likedByMe: !!me && r.likes.has(me.id),
    mine: !!me && r.authorId === me.id,
    status: r.pending ? 'pending' : 'published',
  });
  const toComment = (c: CRow): Comment => ({
    id: c.id, postId: c.postId, body: c.body, author: author(c.authorId), createdAt: iso(c.createdAt), mine: !!me && c.authorId === me.id,
  });
  const canSee = (r: Row) => !blocked.has(r.authorId) && (!r.pending || (!!me && r.authorId === me.id)) && (r.channel !== 'company' || (!!me && r.companyId === me.companyId));
  function page<T>(all: T[], cursor: string | null | undefined, limit = 10): Page<T> {
    const start = cursor ? parseInt(cursor, 10) || 0 : 0;
    const items = all.slice(start, start + limit);
    return { items, nextCursor: start + limit < all.length ? String(start + limit) : null };
  }
  const needMe = (): Me => me ?? fail('not-verified');
  const needRules = (): Me => {
    const m = needMe();
    return m.acceptedRulesAt ? m : fail('rules-not-accepted');
  };
  const checkText = (body: string, max: number) => {
    const text = body.trim();
    if (!text || text.length > max) fail('filtered');
    const low = text.toLowerCase();
    if (FILTERED.some((w) => low.includes(w))) fail('filtered');
    // Same as the real filter: a phone number, an ID number or an email is refused outright.
    if (/\d[\d\s-]{7,}\d/.test(low) || /[^\s@]+@[^\s@]+\.[a-z]{2,}/.test(low)) fail('filtered');
    return text;
  };
  const signIn = (domain: string, rules: boolean) => {
    const id = 'me';
    addMember(id, domain);
    members.get(id)!.handle = makeHandle(`me-${domain}-${seq}`);
    me = { id, handle: members.get(id)!.handle, companyId: domain, companyName: COMPANIES[domain] ?? domain, showCompany: true, acceptedRulesAt: rules ? iso(t0 - 6 * DAY) : null, role: 'member', companyMemberCount: 212, verifiedUntil: iso(t0 + 300 * DAY) };
    seedNotifications();
  };
  const queue: ModerationItem[] = [
    qItem(posts[5], 'report', ['harassment'], 3 * HOUR, [{ reason: 'harassment', note: 'يقصد مديراً بعينه', createdAt: iso(t0 - 3 * HOUR) }, { reason: 'private-info', note: null, createdAt: iso(t0 - 2 * HOUR) }]),
    qItem(posts[2], 'filter', ['private-info'], 26 * HOUR, []),
  ];
  if (opts.signedIn) signIn('almadar.example', opts.rulesAccepted ?? true);

  const api: MockCommunityApi & { checkInvite(code: string): Promise<{ valid: boolean }>; listMyInvites(): Promise<{ code: string; usedAt: string | null }[]>; requestWorkEmailCode(workEmail: string): Promise<void>; verifyWorkEmailCode(workEmail: string, code: string): Promise<Me> } = {
    // ---- identity
    async requestEmailCode(workEmail: string, access?: { kind: 'invite'; code: string } | { kind: 'buyer' } | { kind: 'member' }) {
      const email = workEmail.trim().toLowerCase();
      const m = /^[^\s@]+@([^\s@]+\.[^\s@]{2,})$/.exec(email);
      await wait(0);
      if (!m) return fail('invalid-email');
      const kind = access?.kind ?? 'member';
      if (kind === 'member' && !joined.has(email)) return fail('not-a-member' as never);
      if (kind === 'buyer' && !email.includes('buyer')) return fail('no-purchase' as never);
      // An existing member is simply signed in on any path.
      if (!joined.has(email)) {
        if (access?.kind === 'invite') {
          if (FREE_MAIL.includes(m[1])) return fail('free-mail');
          pendingInvite.set(email, inviteState(access.code));
        }
        if (kind === 'buyer') pendingBuyer.add(email);
      }
      const last = pendingCodes.get(email);
      if (last && now() - last < 20_000) { await wait(0); return fail('rate-limited'); }
      pendingCodes.set(email, now());
      await wait(0);
    },
    async verifyEmailCode(workEmail, code) {
      const email = workEmail.trim().toLowerCase();
      await wait(0);
      if (!/^\d{6}$/.test(code) || code === '000000') fail('bad-code');
      // A real server maps the mail domain to a company. Demo addresses land in the seeded company.
      const domain = email.split('@')[1] ?? 'almadar.example';
      const returning = joined.has(email);
      signIn(COMPANIES[domain] ? domain : 'almadar.example', returning);
      if (FREE_MAIL.includes(domain) || (pendingBuyer.has(email) && !COMPANIES[domain])) {
        members.get('me')!.companyId = '';
        me = { ...me!, companyId: null, companyName: null, companyMemberCount: undefined } as unknown as Me;
      }
      pendingBuyer.delete(email);
      joined.add(email);
      const inv = pendingInvite.get(email);
      if (inv) { usedInvites.add(inv); pendingInvite.delete(email); }
      if (me!.companyName !== null && !COMPANIES[domain]) me!.companyName = COMPANIES['almadar.example'];
      if (email.startsWith('mod@')) me = { ...me!, role: 'moderator' };
      emit();
      return me!;
    },
    async getMe() { return wait(me); },
    onAuthChange(cb) { authListeners.add(cb); return () => { authListeners.delete(cb); }; },
    async acceptRules() {
      const m = needMe();
      me = { ...m, acceptedRulesAt: iso(now()) };
      emit();
      return wait(me);
    },
    async updateMe(patch) {
      const m = needMe();
      const mem = members.get(m.id)!;
      if (patch.regenerateHandle) mem.handle = makeHandle(`${m.id}-${now()}-${seq++}`);
      if (typeof patch.showCompany === 'boolean') mem.showCompany = patch.showCompany;
      me = { ...m, handle: mem.handle, showCompany: mem.showCompany };
      emit();
      return wait(me);
    },
    async signOut() { me = null; notifications = []; emit(); await wait(0); },
    async deleteAccount() {
      const m = needMe();
      for (let i = posts.length - 1; i >= 0; i--) if (posts[i].authorId === m.id) posts.splice(i, 1);
      for (let i = comments.length - 1; i >= 0; i--) if (comments[i].authorId === m.id) comments.splice(i, 1);
      posts.forEach((p) => p.likes.delete(m.id));
      blocked.clear();
      me = null; notifications = [];
      emit();
      await wait(0);
    },

    // ---- content
    async listChannels() { needMe(); return wait(CHANNELS); },
    async listPosts({ channel, cursor, limit }) {
      const viewer = needMe();
      if (channel === 'company' && !viewer.companyId) return fail('not-verified');
      const rows = posts
        .filter((r) => (channel === 'all' ? r.channel !== 'company' : r.channel === channel))
        .filter(canSee)
        .sort((a, b) => b.createdAt - a.createdAt);
      return wait(page(rows.map(toPost), cursor, limit));
    },
    async getPost(id) {
      needMe();
      const r = posts.find((p) => p.id === id);
      if (!r || !canSee(r)) { await wait(0); return fail('not-found'); }
      return wait(toPost(r));
    },
    async createPost({ channel, body }) {
      const m = needRules();
      if (channel === 'company' && !m.companyId) return fail('not-verified');
      const text = checkText(body, 2000);
      const r: Row = { id: nid('p'), channel, body: text, authorId: m.id, companyId: m.companyId ?? '', createdAt: now(), likes: new Set(), baseLikes: 0, pending: /https?:\/\/|www\./i.test(text) };
      posts.push(r);
      return wait(toPost(r));
    },
    async deletePost(id) {
      const m = needMe();
      const i = posts.findIndex((p) => p.id === id);
      if (i < 0) return fail('not-found');
      if (posts[i].authorId !== m.id && m.role !== 'moderator') return fail('forbidden');
      posts.splice(i, 1);
      await wait(0);
    },
    async listComments({ postId, cursor, limit }) {
      needMe();
      const rows = comments.filter((c) => c.postId === postId && !blocked.has(c.authorId)).sort((a, b) => a.createdAt - b.createdAt);
      return wait(page(rows.map(toComment), cursor, limit ?? 30));
    },
    async createComment({ postId, body }) {
      const m = needRules();
      const text = checkText(body, 800);
      if (!posts.some((p) => p.id === postId)) return fail('not-found');
      const c: CRow = { id: nid('c'), postId, body: text, authorId: m.id, createdAt: now() };
      comments.push(c);
      return wait(toComment(c));
    },
    async deleteComment(id) {
      const m = needMe();
      const i = comments.findIndex((c) => c.id === id);
      if (i < 0) return fail('not-found');
      if (comments[i].authorId !== m.id && m.role !== 'moderator') return fail('forbidden');
      comments.splice(i, 1);
      await wait(0);
    },
    async setLike(postId, liked) {
      const m = needMe();
      const r = posts.find((p) => p.id === postId) ?? fail('not-found');
      liked ? r.likes.add(m.id) : r.likes.delete(m.id);
      return wait({ likeCount: r.baseLikes + r.likes.size, likedByMe: liked });
    },

    // ---- safety
    async report(_target: ReportTarget, _reason: ReportReason, _note?: string) { needMe(); await wait(0); },
    async blockUser(userId) { needMe(); blocked.add(userId); await wait(0); },
    async unblockUser(userId) { needMe(); blocked.delete(userId); await wait(0); },
    async listBlocked() { needMe(); return wait([...blocked].filter((id) => members.has(id)).map(author)); },

    // ---- extras (not in the v1 contract)
    async listNotifications(q) { needMe(); return wait(page(notifications, q?.cursor, q?.limit ?? 20)); },
    async unreadNotificationCount() { return wait(me ? notifications.filter((n) => !n.read).length : 0); },
    async markNotificationsRead(ids) {
      notifications = notifications.map((n) => (!ids || ids.includes(n.id) ? { ...n, read: true } : n));
      await wait(0);
    },
    async exportMyData() {
      const m = needMe();
      return wait({ me: m, posts: posts.filter((p) => p.authorId === m.id).map(toPost), comments: comments.filter((c) => c.authorId === m.id).map(toComment) });
    },
    async checkInvite(code: string) {
      await wait(0);
      try { inviteState(code); return { valid: true }; } catch { return { valid: false }; }
    },
    async requestWorkEmailCode(workEmail: string) {
      needMe();
      const email = workEmail.trim().toLowerCase();
      const m = /^[^\s@]+@([^\s@]+\.[^\s@]{2,})$/.exec(email);
      await wait(0);
      if (!m) return fail('invalid-email');
      if (FREE_MAIL.includes(m[1])) return fail('free-mail');
      if (joined.has(email)) return fail('forbidden');
      workCodes.add(email);
    },
    async verifyWorkEmailCode(workEmail: string, code: string) {
      const cur = needMe();
      const email = workEmail.trim().toLowerCase();
      await wait(0);
      if (!workCodes.has(email) || !/^\d{6}$/.test(code) || code === '000000') return fail('bad-code');
      const domain = email.split('@')[1];
      const companyId = COMPANIES[domain] ? domain : 'almadar.example';
      members.get(cur.id)!.companyId = companyId;
      me = { ...cur, companyId, companyName: COMPANIES[companyId], companyMemberCount: 212 } as Me;
      emit();
      return me;
    },
    async listMyInvites() { needMe(); return wait(myInvites.map((i) => ({ ...i }))); },
    async listModerationQueue(q) {
      const m = needMe();
      if (m.role !== 'moderator') return fail('forbidden');
      const state = q?.state ?? 'open';
      const rows = queue.filter((i) => (state === 'open' ? i.state === 'open' || i.state === 'in_review' : i.state === 'actioned' || i.state === 'dismissed'));
      const open = queue.filter((i) => i.state === 'open' || i.state === 'in_review');
      return wait({ ...page(rows, q?.cursor, q?.limit ?? 20), openCount: open.length, overdueCount: open.filter((i) => i.overdue).length });
    },
    async resolveModerationItem(id, action: ModerationAction) {
      const m = needMe();
      if (m.role !== 'moderator') return fail('forbidden');
      const i = queue.findIndex((x) => x.id === id);
      if (i < 0) return fail('not-found');
      const item = queue[i];
      if (action !== 'approve') {
        if (item.targetType === 'post') { const k = posts.findIndex((p) => p.id === item.targetId); if (k >= 0) posts.splice(k, 1); }
        if (item.targetType === 'comment') { const k = comments.findIndex((c) => c.id === item.targetId); if (k >= 0) comments.splice(k, 1); }
      }
      queue[i] = { ...item, state: action === 'approve' ? 'dismissed' : 'actioned', action };
      return wait(queue[i]);
    },
    async listMyPosts(q) {
      const { cursor, limit } = q ?? {};
      const m = needMe();
      const rows = posts.filter((p) => p.authorId === m.id).sort((a, b) => b.createdAt - a.createdAt);
      return wait(page(rows.map(toPost), cursor, limit));
    },
  };
  return api;
}

/** Older name, kept for callers written before the contract settled. */
export const createMockApi = createMockCommunityApi;
export default createMockCommunityApi;
