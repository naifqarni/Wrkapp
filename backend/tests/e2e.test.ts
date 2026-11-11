// End-to-end tests: the app's real client (wrk-app/src/community/api/supabase.ts)
// -> a fake supabase-js -> the real edge-function handlers -> the real
// migrations on a local PostgreSQL. Run with `npm test` in this folder.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { CRON, World } from './harness.ts';

const appDir = process.env.WRK_APP_DIR ?? path.resolve(import.meta.dirname, '../../wrk-app');
const { createSupabaseCommunityApi } = await import(pathToFileURL(path.join(appDir, 'src/community/api/supabase.ts')).href);
type Api = ReturnType<typeof createSupabaseCommunityApi>;

const w = new World();
const code = async (fn: () => Promise<unknown>) => { try { await fn(); return 'ok'; } catch (e: any) { return e.code ?? `threw:${e.message}`; } };

async function signIn(email: string): Promise<{ api: Api; raw: ReturnType<World['client']>; me: any }> {
  const raw = w.client();
  const api = createSupabaseCommunityApi(raw as any);
  await api.requestEmailCode(email);
  const sent = w.outbox.get(email.trim().toLowerCase());
  assert.ok(sent && /^\d{6}$/.test(sent), 'a 6-digit code was sent');
  const me = await api.verifyEmailCode(email, sent);
  return { api, raw, me };
}
// content inserted straight into the database (skips the hourly posting limit)
async function seedPost(authorId: string, channel: string, body: string, minutesAgo = 0): Promise<string> {
  const rows = await w.sql(
    `insert into public.posts (channel, author_id, company_id, body, status, published_at, created_at)
     select $2, m.id, m.company_id, $3, 'published', now(), now() - make_interval(mins => $4) from public.members m where m.id = $1 returning id`,
    [authorId, channel, body, minutesAgo]);
  return rows[0].id;
}

let A: Awaited<ReturnType<typeof signIn>>, B: typeof A, C: typeof A, D: typeof A, MOD: typeof A;
const anon = () => createSupabaseCommunityApi(w.client() as any);

before(async () => {
  await w.sql(`update public.app_settings set value = 'false' where key = 'ai_moderation'`);
});
after(() => w.close());

test('sign-in: personal and throw-away mail is refused, bad input is refused', async () => {
  const api = anon();
  for (const e of ['someone@gmail.com', 'x@yahoo.co.uk', 'x@outlook.sa', 'x@hotmail.com.tr', 'a@mailinator.com', 'x@mail.protonmail.com', 'x@icloud.com']) {
    assert.equal(await code(() => api.requestEmailCode(e)), 'free-mail', e);
  }
  for (const e of ['', 'not-an-email', 'a@b', 'a b@aramco.com', '@aramco.com']) {
    assert.equal(await code(() => api.requestEmailCode(e)), 'invalid-email', e);
  }
  assert.equal(w.outbox.size, 0, 'no code was sent to any of them');
});

test('sign-in: work email gets a code, wrong codes fail, the right one creates a pseudonymous member', async () => {
  const raw = w.client();
  const api = createSupabaseCommunityApi(raw as any);
  assert.equal(await api.getMe(), null);
  await api.requestEmailCode('  Ahmed.Alqahtani+news@Aramco.com ');
  const sent = w.outbox.get('ahmed.alqahtani@aramco.com')!;
  assert.match(sent, /^\d{6}$/);
  assert.equal(await code(() => api.requestEmailCode('ahmed.alqahtani@aramco.com')), 'rate-limited', 'one code a minute');
  const wrong = sent === '000000' ? '111111' : '000000';
  assert.equal(await code(() => api.verifyEmailCode('ahmed.alqahtani@aramco.com', wrong)), 'bad-code');
  assert.equal(await code(() => api.verifyEmailCode('ahmed.alqahtani@aramco.com', 'abc')), 'bad-code');
  const seen: any[] = [];
  api.onAuthChange((m) => seen.push(m));
  const me = await api.verifyEmailCode('Ahmed.Alqahtani@aramco.com', sent);
  assert.equal(me.companyName, 'أرامكو السعودية');
  assert.match(me.handle, /^\S+ \S+ \d{2,4}$/);
  assert.equal(me.role, 'member');
  assert.equal(me.acceptedRulesAt, null);
  assert.equal(me.showCompany, true);
  assert.equal(seen.length, 1);
  assert.equal(await code(() => api.verifyEmailCode('ahmed.alqahtani@aramco.com', sent)), 'bad-code', 'a code works once');
  A = { api, raw, me };
});

test('privacy: the email address is nowhere in the database', async () => {
  const tables = await w.sql(`select table_schema s, table_name t from information_schema.tables where table_schema in ('public','private','auth') and table_type = 'BASE TABLE'`);
  for (const { s, t } of tables) {
    const hit = await w.sql(`select count(*)::int n from ${s}."${t}" x where x::text ilike '%ahmed%' or x::text ilike '%alqahtani%'`);
    assert.equal(hit[0].n, 0, `${s}.${t} holds the address`);
  }
  const id = await w.sql(`select email_hash from private.identities where member_id = $1`, [A.me.id]);
  assert.match(id[0].email_hash, /^[0-9a-f]{64}$/, 'only a keyed hash is kept');
  const user = await w.sql(`select email from auth.users where id = $1`, [A.me.id]);
  assert.match(user[0].email, /@members\.wrk\.invalid$/, 'the auth user carries a random placeholder');
});

test('sign-in: five wrong codes burn the code', async () => {
  const api = anon();
  await api.requestEmailCode('lock@sabic.com');
  const sent = w.outbox.get('lock@sabic.com')!;
  for (let i = 0; i < 5; i++) assert.equal(await code(() => api.verifyEmailCode('lock@sabic.com', sent === '123456' ? '654321' : '123456')), 'bad-code');
  assert.equal(await code(() => api.verifyEmailCode('lock@sabic.com', sent)), 'bad-code', 'even the right code is dead now');
});

test('more members: same company, another company, an unknown company', async () => {
  B = await signIn('sara@aramco.com');
  C = await signIn('fahad@hq.stc.com.sa');
  D = await signIn('noura@smallstudio.sa');
  MOD = await signIn('mod@elm.sa');
  assert.equal(B.me.companyId, A.me.companyId);
  assert.equal(C.me.companyName, 'stc', 'sub-domains map to the company');
  assert.equal(D.me.companyName, 'smallstudio.sa', 'unknown employers are created from the domain');
  assert.notEqual(A.me.handle, B.me.handle);
  assert.equal((await B.api.getMe())!.companyMemberCount, 2);
  await w.sql(`update public.members set role = 'moderator' where id = $1`, [MOD.me.id]);
  for (const u of [B, C, D, MOD]) await u.api.acceptRules();
});

test('rules must be accepted before the first post', async () => {
  assert.equal(await code(() => A.api.createPost({ channel: 'all', body: 'مرحبا' })), 'rules-not-accepted');
  const me = await A.api.acceptRules();
  assert.ok(me.acceptedRulesAt);
  const p = await A.api.createPost({ channel: 'first-day', body: '  أول يوم لي، الاستقبال كان مرتباً والمكتب جاهز.  ' });
  assert.equal(p.body, 'أول يوم لي، الاستقبال كان مرتباً والمكتب جاهز.');
  assert.equal(p.status, 'published');
  assert.equal(p.mine, true);
  assert.equal(p.author.companyLabel, 'أرامكو السعودية');
  assert.equal((p as any).aiPending, undefined, 'internal field is not leaked to screens');
});

test('signed out: public channels are readable, everything else answers not-verified', async () => {
  const api = anon();
  const channels = await api.listChannels();
  assert.deepEqual(channels.map((c: any) => c.id), ['company', 'all', 'first-day', 'salaries', 'interviews', 'culture', 'advice']);
  const all = await api.listPosts({ channel: 'all' });
  assert.equal(all.items.length, 1);
  assert.equal(all.items[0].mine, false);
  assert.equal((await api.getPost(all.items[0].id)).id, all.items[0].id);
  assert.equal(await code(() => api.listPosts({ channel: 'company' })), 'not-verified');
  assert.equal(await code(() => api.createPost({ channel: 'all', body: 'x' })), 'not-verified');
  assert.equal(await code(() => api.setLike(all.items[0].id, true)), 'not-verified');
  assert.equal(await code(() => api.report({ type: 'post', id: all.items[0].id }, 'spam')), 'not-verified');
  assert.equal(await code(() => api.deleteAccount()), 'not-verified');
  assert.equal(await code(() => api.listPosts({ channel: 'nope' as any })), 'not-found');
  assert.equal(await code(() => api.getPost('not-a-uuid')), 'not-found');
});

test('the database refuses direct table access and service functions', async () => {
  for (const [role, sub] of [['anon', null], ['authenticated', A.me.id]] as const) {
    const c = await w.pool.connect();
    try {
      for (const t of ['public.members', 'public.posts', 'public.reports', 'private.identities', 'private.email_challenges', 'public.filter_terms']) {
        await c.query('begin'); await c.query(`set local role ${role}`);
        await c.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub, role })]);
        await assert.rejects(c.query(`select * from ${t} limit 1`), /permission denied/, `${role} read ${t}`);
        await c.query('rollback');
      }
    } finally { c.release(); }
    for (const [fn, args] of [
      ['svc_verify_email_challenge', { p_email_hash: 'x', p_code_hash: 'y' }],
      ['svc_complete_signin', { p_user_id: A.me.id, p_email_hash: 'x' }],
      ['svc_moderation_apply', { p_type: 'post', p_id: A.me.id, p_decision: 'allow' }],
      ['svc_push_batch', {}],
    ] as const) {
      const r = await w.as(role, sub, fn, args as any);
      assert.match(r.error?.message ?? '', /permission denied/, `${role} call ${fn}`);
    }
  }
});

test('text filter: personal data is refused, insults and links wait for a moderator', async () => {
  for (const body of ['كلموني على 0551234567', 'رقمي ٠٥٥ ١٢٣ ٤٥٦٧', 'هويته 1098765432', 'راسلني ahmed@aramco.com', 'يا شرررموط', 'f.u.c.k this place', 'انتم روافض']) {
    assert.equal(await code(() => B.api.createPost({ channel: 'all', body })), 'filtered', body);
  }
  assert.equal(await code(() => B.api.createPost({ channel: 'all', body: '   ' })), 'filtered');
  assert.equal(await code(() => B.api.createPost({ channel: 'all', body: 'ا'.repeat(2001) })), 'filtered');
  const held = await B.api.createPost({ channel: 'culture', body: 'مديرنا حرامي ويختلس من الميزانية' });
  assert.equal(held.status, 'pending');
  const link = await B.api.createPost({ channel: 'advice', body: 'شوفوا هذا الموقع www.example.com' });
  assert.equal(link.status, 'pending');
  assert.equal((await anon().listPosts({ channel: 'all' })).items.length, 1, 'others do not see held posts');
  const mine = await B.api.listPosts({ channel: 'all' });
  assert.equal(mine.items.filter((p: any) => p.status === 'pending').length, 2, 'the author still sees them, marked pending');
  const q = await MOD.api.listModerationQueue!();
  assert.equal(q.items.length, 2);
  assert.deepEqual(q.items.map((i: any) => i.source), ['filter', 'filter']);
  assert.ok(q.items.some((i: any) => i.reasons.includes('defamation')));
  assert.ok((await B.api.createPost({ channel: 'salaries', body: 'الراتب 15000 ريال والبدلات 3000، والزبون دائماً على حق.' })).status === 'published');
});

test('company channel is a wall: only verified colleagues get in', async () => {
  const p = await A.api.createPost({ channel: 'company', body: 'متى تنزل تقييمات هذا الربع؟' });
  assert.equal((await B.api.listPosts({ channel: 'company' })).items[0].id, p.id);
  assert.equal((await C.api.listPosts({ channel: 'company' })).items.length, 0);
  assert.equal(await code(() => C.api.getPost(p.id)), 'not-found');
  assert.equal(await code(() => C.api.listComments({ postId: p.id })), 'not-found');
  assert.equal(await code(() => C.api.createComment({ postId: p.id, body: 'x' })), 'not-found');
  assert.equal(await code(() => C.api.setLike(p.id, true)), 'not-found');
  assert.equal(await code(() => C.api.report({ type: 'post', id: p.id }, 'spam')), 'not-found');
  assert.equal(await code(() => anon().getPost(p.id)), 'not-found');
  assert.ok(!(await C.api.listPosts({ channel: 'all' })).items.some((x: any) => x.id === p.id), 'company posts never leak into "all"');
});

test('comments, likes and notifications', async () => {
  const post = (await A.api.listPosts({ channel: 'first-day' })).items[0];
  const c1 = await B.api.createComment({ postId: post.id, body: 'بالتوفيق، أول أسبوع يمر بسرعة.' });
  assert.equal(c1.status, 'published');
  await C.api.createComment({ postId: post.id, body: 'نفس التجربة عندنا.' });
  await A.api.createComment({ postId: post.id, body: 'شكراً لكم.' });
  const list = await anon().listComments({ postId: post.id, limit: 2 });
  assert.equal(list.items.length, 2);
  assert.ok(list.nextCursor);
  const rest = await anon().listComments({ postId: post.id, cursor: list.nextCursor });
  assert.equal(rest.items.length, 1);
  assert.equal(rest.nextCursor, null);
  assert.equal((await anon().getPost(post.id)).commentCount, 3);
  assert.equal(await code(() => B.api.createComment({ postId: post.id, body: 'x'.repeat(801) })), 'filtered');

  assert.equal(await A.api.unreadNotificationCount!(), 2, 'two people commented; my own comment does not notify me');
  const n = await A.api.listNotifications!();
  assert.deepEqual(n.items.map((x: any) => x.type), ['comment', 'comment']);
  assert.equal(n.items[0].postId, post.id);
  await A.api.markNotificationsRead!([n.items[0].id]);
  assert.equal(await A.api.unreadNotificationCount!(), 1);
  await A.api.markNotificationsRead!();
  assert.equal(await A.api.unreadNotificationCount!(), 0);

  assert.deepEqual(await B.api.setLike(post.id, true), { likeCount: 1, likedByMe: true });
  assert.deepEqual(await B.api.setLike(post.id, true), { likeCount: 1, likedByMe: true });
  assert.deepEqual(await C.api.setLike(post.id, true), { likeCount: 2, likedByMe: true });
  assert.equal((await B.api.getPost(post.id)).likedByMe, true);
  assert.equal((await A.api.getPost(post.id)).likedByMe, false);
  assert.deepEqual(await B.api.setLike(post.id, false), { likeCount: 1, likedByMe: false });

  const notMine = (await anon().listComments({ postId: post.id })).items[1].id;
  assert.equal(await code(() => B.api.deleteComment(notMine)), 'forbidden', 'not my comment');
  await B.api.deleteComment(c1.id);
  assert.equal((await anon().getPost(post.id)).commentCount, 2);
  assert.equal(await code(() => B.api.deletePost(post.id)), 'forbidden');
});

test('pagination: stable cursors, no duplicates, no gaps', async () => {
  const ids: string[] = [];
  for (let i = 0; i < 7; i++) ids.push(await seedPost(D.me.id, 'interviews', `سؤال مقابلة رقم ${i}`, 100 - i));
  const got: string[] = [];
  let cursor: string | null = null;
  let pages = 0;
  do {
    const page: any = await anon().listPosts({ channel: 'interviews', cursor, limit: 3 });
    got.push(...page.items.map((p: any) => p.id));
    cursor = page.nextCursor;
    pages++;
  } while (cursor);
  assert.equal(pages, 3);
  assert.deepEqual(got, [...ids].reverse());
  assert.equal(await code(() => anon().listPosts({ channel: 'interviews', cursor: 'garbage' })), 'not-found');
  const mine = await D.api.listMyPosts!({ limit: 50 });
  assert.equal(mine.items.length, 7);
});

test('rate limits on posting', async () => {
  const body = 'نصيحة قصيرة عن أول أسبوع';
  await D.api.createPost({ channel: 'advice', body });
  assert.equal(await code(() => D.api.createPost({ channel: 'advice', body })), 'rate-limited', 'same text twice');
  for (let i = 0; i < 4; i++) await D.api.createPost({ channel: 'advice', body: `${body} ${i}` });
  assert.equal(await code(() => D.api.createPost({ channel: 'advice', body: 'السادس خلال ساعة' })), 'rate-limited');
});

test('block hides both ways, instantly', async () => {
  const cPost = await C.api.createPost({ channel: 'culture', body: 'الدوام المرن فرق معي كثيراً.' });
  const aPost = (await A.api.listPosts({ channel: 'first-day' })).items[0];
  assert.ok((await A.api.listPosts({ channel: 'all' })).items.some((p: any) => p.id === cPost.id));
  assert.equal((await A.api.listComments({ postId: aPost.id })).items.length, 2);
  await A.api.blockUser(C.me.id);
  assert.ok(!(await A.api.listPosts({ channel: 'all' })).items.some((p: any) => p.id === cPost.id), 'I stop seeing them');
  assert.ok(!(await C.api.listPosts({ channel: 'all' })).items.some((p: any) => p.id === aPost.id), 'they stop seeing me');
  assert.equal(await code(() => A.api.getPost(cPost.id)), 'not-found');
  assert.equal(await code(() => C.api.createComment({ postId: aPost.id, body: 'ما زلت هنا' })), 'not-found');
  assert.equal((await A.api.listComments({ postId: aPost.id })).items.length, 1, "their comment under my post is gone for me");
  assert.equal((await A.api.getPost(aPost.id)).commentCount, 1);
  assert.deepEqual((await A.api.listBlocked()).map((a: any) => a.id), [C.me.id]);
  assert.equal(await code(() => A.api.blockUser(A.me.id)), 'forbidden');
  await A.api.unblockUser(C.me.id);
  assert.equal((await A.api.listBlocked()).length, 0);
  assert.ok((await A.api.listPosts({ channel: 'all' })).items.some((p: any) => p.id === cPost.id));
});

test('reports: three different people hide a post; the moderator decides', async () => {
  const target = await seedPost(D.me.id, 'culture', 'منشور سيبلّغ عنه ثلاثة أشخاص');
  assert.equal(await code(() => D.api.report({ type: 'post', id: target }, 'spam')), 'forbidden', 'cannot report myself');
  await A.api.report({ type: 'post', id: target }, 'harassment', 'يستهدف زميلاً');
  await A.api.report({ type: 'post', id: target }, 'harassment');   // twice changes nothing
  await B.api.report({ type: 'post', id: target }, 'defamation');
  assert.equal((await anon().getPost(target)).id, target, 'still visible after two reports');
  await C.api.report({ type: 'post', id: target }, 'harassment');
  assert.equal(await code(() => anon().getPost(target)), 'not-found', 'hidden after the third');
  assert.equal((await D.api.getPost(target)).status, 'pending', 'the author sees it as under review');

  assert.equal(await code(() => A.api.listModerationQueue!()), 'forbidden');
  assert.equal(await code(() => A.api.resolveModerationItem!(target, 'remove')), 'forbidden');
  const q = await MOD.api.listModerationQueue!();
  const item = q.items.find((i: any) => i.targetId === target)!;
  assert.equal(item.reportCount, 3);
  assert.deepEqual([...item.reasons].sort(), ['defamation', 'harassment']);
  assert.equal(item.reports.length, 3);
  assert.equal(item.content!.body, 'منشور سيبلّغ عنه ثلاثة أشخاص');
  assert.equal(item.overdue, false);
  assert.ok(new Date(item.dueAt).getTime() - new Date(item.createdAt).getTime() <= 24 * 3600 * 1000 + 1000, '24-hour review deadline');

  const done = await MOD.api.resolveModerationItem!(item.id, 'approve', 'رأي عادي');
  assert.equal(done.state, 'dismissed');
  assert.equal((await anon().getPost(target)).id, target, 'approved: back in the feed');
  assert.ok((await D.api.listNotifications!()).items.some((n: any) => n.type === 'approved' && n.postId === target));

  // a comment and a user can be reported too
  const post = (await A.api.listPosts({ channel: 'first-day' })).items[0];
  const cm = (await anon().listComments({ postId: post.id })).items.find((c: any) => c.author.id === C.me.id)!;
  await B.api.report({ type: 'comment', id: cm.id }, 'spam');
  await B.api.report({ type: 'user', id: C.me.id }, 'harassment');
  const q2 = await MOD.api.listModerationQueue!();
  const cItem = q2.items.find((i: any) => i.targetId === cm.id)!;
  await MOD.api.resolveModerationItem!(cItem.id, 'remove');
  assert.ok(!(await anon().listComments({ postId: post.id })).items.some((c: any) => c.id === cm.id));
  assert.ok((await C.api.listNotifications!()).items.some((n: any) => n.type === 'removed'));
  const closed = await MOD.api.listModerationQueue!({ state: 'closed' });
  assert.ok(closed.items.length >= 2);
  assert.equal((await w.sql(`select count(*)::int n from public.moderation_actions`))[0].n, 2, 'every decision is logged');
});

test('suspension stops writing, not reading; a ban removes everything and the identity cannot return', async () => {
  const bad = await signIn('troll@noon.com');
  await bad.api.acceptRules();
  const p1 = await bad.api.createPost({ channel: 'all', body: 'منشور أول من الحساب المخالف' });
  await A.api.report({ type: 'post', id: p1.id }, 'harassment');
  let item = (await MOD.api.listModerationQueue!()).items.find((i: any) => i.targetId === p1.id)!;
  await MOD.api.resolveModerationItem!(item.id, 'suspend');
  assert.equal((await bad.api.getMe())!.suspended, true);
  assert.equal(await code(() => bad.api.createPost({ channel: 'all', body: 'محاولة' })), 'forbidden');
  const anyPost = (await anon().listPosts({ channel: 'all' })).items[0].id;
  assert.equal(await code(() => bad.api.setLike(anyPost, true)), 'forbidden');
  assert.ok((await bad.api.listPosts({ channel: 'all' })).items.length > 0, 'can still read');

  await w.sql(`update public.members set suspended_until = now() - interval '1 minute' where id = $1`, [bad.me.id]);
  const p2 = await bad.api.createPost({ channel: 'all', body: 'انتهى الإيقاف' });
  await A.api.report({ type: 'post', id: p2.id }, 'hate');
  item = (await MOD.api.listModerationQueue!()).items.find((i: any) => i.targetId === p2.id)!;
  await MOD.api.resolveModerationItem!(item.id, 'ban');
  assert.equal(await bad.api.getMe(), null, 'banned: signed out');
  assert.equal(await code(() => bad.api.listPosts({ channel: 'company' })), 'not-verified');
  assert.ok(!(await anon().listPosts({ channel: 'all', limit: 50 })).items.some((p: any) => p.author.id === bad.me.id));
  await w.sql(`update private.email_challenges set created_at = created_at - interval '2 minutes'`);
  assert.equal(await code(() => anon().requestEmailCode('troll@noon.com')), 'forbidden', 'the same work email cannot sign up again');
  await w.sql(`delete from auth.users where id = $1`, [bad.me.id]);
  assert.equal(await code(() => anon().requestEmailCode('troll@noon.com')), 'forbidden', 'even after the account row is gone');
});

test('AI moderation: allow publishes, block is refused, hold waits for a person, an outage never publishes blind', async () => {
  await w.sql(`update public.app_settings set value = 'true' where key = 'ai_moderation'`);
  await w.sql(`update public.posts set created_at = created_at - interval '2 hours' where author_id = $1`, [C.me.id]);
  const seen: string[] = [];
  w.classify = (_k, body) => { seen.push(body); return { decision: 'allow', category: 'none', reason: 'fine' }; };
  const ok = await C.api.createPost({ channel: 'salaries', body: 'عرض جديد: 18 ألف أساسي لمهندس بخبرة خمس سنوات.' });
  assert.equal(ok.status, 'published');
  assert.equal(seen.length, 1);
  assert.equal((await anon().getPost(ok.id)).id, ok.id);

  w.classify = () => ({ decision: 'block', category: 'hate', reason: 'slur aimed at a group' });
  assert.equal(await code(() => C.api.createPost({ channel: 'all', body: 'نص يعتبره الذكاء الاصطناعي مخالفاً' })), 'filtered');
  assert.ok((await C.api.listNotifications!()).items.some((n: any) => n.type === 'removed'));

  w.classify = () => ({ decision: 'hold', category: 'defamation', reason: 'names a manager and alleges fraud' });
  const held = await C.api.createPost({ channel: 'culture', body: 'مدير الفرع فلان الفلاني يتلاعب بالعقود' });
  assert.equal(held.status, 'pending');
  assert.equal(await code(() => anon().getPost(held.id)), 'not-found');
  const item = (await MOD.api.listModerationQueue!()).items.find((i: any) => i.targetId === held.id)!;
  assert.equal(item.source, 'ai');
  assert.equal(item.aiNote, 'names a manager and alleges fraud');

  w.classify = () => null;   // provider down
  const stuck = await C.api.createPost({ channel: 'advice', body: 'منشور أثناء انقطاع خدمة الذكاء الاصطناعي' });
  assert.equal(stuck.status, 'pending');
  assert.equal(await code(() => anon().getPost(stuck.id)), 'not-found');
  // someone else cannot poke the moderation function for a post that is not theirs
  const poke = await (A.raw as any).functions.invoke('moderate', { body: { type: 'post', id: stuck.id } });
  assert.equal((await poke.error.context.json()).error, 'not-found');
  // the scheduled sweep needs the secret, then retries
  const noSecret = await (w.client() as any).functions.invoke('moderate', { body: { sweep: true } });
  assert.equal((await noSecret.error.context.json()).error, 'forbidden');
  w.classify = () => ({ decision: 'allow', category: 'none', reason: 'fine' });
  const sweep = await (w.client() as any).functions.invoke('moderate', { body: { sweep: true }, headers: { 'x-cron-secret': CRON } });
  assert.equal(sweep.data.reviewed, 1);
  assert.equal((await anon().getPost(stuck.id)).id, stuck.id);

  // comments go through the same path
  w.classify = () => ({ decision: 'allow', category: 'none', reason: 'fine' });
  assert.equal((await B.api.createComment({ postId: ok.id, body: 'رقم ممتاز.' })).status, 'published');

  // AI never answers at all: after the timeout a person gets it, it is not published
  w.classify = () => null;
  const orphan = await C.api.createComment({ postId: ok.id, body: 'تعليق لم يراجعه أحد' });
  await w.sql(`update public.comments set created_at = now() - interval '11 minutes' where id = $1`, [orphan.id]);
  const r = (await w.sql(`select private.run_retention() r`))[0].r;
  assert.equal(r.staleToReview, 1);
  assert.equal((await w.sql(`select status from public.comments where id = $1`, [orphan.id]))[0].status, 'held');
  await w.sql(`update public.app_settings set value = 'false' where key = 'ai_moderation'`);
});

test('push: generic text only, dead tokens are forgotten', async () => {
  await A.api.registerPushToken!('ExponentPushToken[aaaaaaaaaaaaaaaaaaaaaa]', 'ios');
  await w.sql(`update public.notifications set pushed_at = now()`);
  const post = (await A.api.listPosts({ channel: 'first-day' })).items[0];
  await B.api.createComment({ postId: post.id, body: 'تعليق يطلق إشعاراً على الجوال' });
  const denied = await (w.client() as any).functions.invoke('push', { body: {} });
  assert.equal((await denied.error.context.json()).error, 'forbidden');
  w.deadTokens = ['ExponentPushToken[aaaaaaaaaaaaaaaaaaaaaa]'];
  const out = await (w.client() as any).functions.invoke('push', { body: {}, headers: { 'x-cron-secret': CRON } });
  assert.equal(out.data.sent, 1);
  assert.deepEqual(w.pushes, [{ to: 'ExponentPushToken[aaaaaaaaaaaaaaaaaaaaaa]', body: 'تعليق جديد على منشورك' }]);
  assert.equal((await w.sql(`select count(*)::int n from public.push_tokens`))[0].n, 0);
  const again = await (w.client() as any).functions.invoke('push', { body: {}, headers: { 'x-cron-secret': CRON } });
  assert.equal(again.data.sent, 0, 'nothing is pushed twice');
});

test('profile: hide the company, new handle once a week', async () => {
  let me = await C.api.updateMe({ showCompany: false });
  assert.equal(me.showCompany, false);
  const p = (await anon().listPosts({ channel: 'salaries' })).items.find((x: any) => x.author.id === C.me.id)!;
  assert.equal(p.author.companyLabel, 'الاتصالات', 'the sector is shown instead of the company');
  await D.api.updateMe({ showCompany: false });
  assert.equal((await anon().listPosts({ channel: 'interviews', limit: 1 })).items[0].author.companyLabel, null, 'no sector known: nothing shown');
  me = await C.api.updateMe({ regenerateHandle: true });
  assert.notEqual(me.handle, C.me.handle);
  assert.equal(await code(() => C.api.updateMe({ regenerateHandle: true })), 'rate-limited');
});

test('verification expires after 12 months and is renewed by a new code', async () => {
  await w.sql(`update public.members set verified_at = now() - interval '13 months' where id = $1`, [B.me.id]);
  assert.equal(await code(() => B.api.listPosts({ channel: 'company' })), 'not-verified');
  assert.equal(await code(() => B.api.createPost({ channel: 'all', body: 'بعد انتهاء التحقق' })), 'not-verified');
  assert.ok((await B.api.listPosts({ channel: 'all' })).items.length > 0, 'public reading still works');
  await w.sql(`update private.email_challenges set created_at = created_at - interval '2 minutes'`);
  const again = await signIn('sara@aramco.com');
  assert.equal(again.me.id, B.me.id, 'same account, same handle');
  assert.equal(again.me.handle, B.me.handle);
  assert.equal((await again.api.listPosts({ channel: 'company' })).items.length, 1);
});

test('PDPL: export everything, then erase everything', async () => {
  const data: any = await A.api.exportMyData!();
  assert.equal(data.profile.handle, A.me.handle);
  assert.equal(data.profile.companyDomain, 'aramco.com');
  assert.ok(data.posts.length >= 2 && data.comments.length >= 1);
  assert.ok(!JSON.stringify(data).includes('ahmed'));

  const myPosts = (await A.api.listMyPosts!()).items.map((p: any) => p.id);
  const events: any[] = [];
  A.api.onAuthChange((m: any) => events.push(m));
  await A.api.deleteAccount();
  assert.equal(events.at(-1), null);
  assert.equal(await A.api.getMe(), null);
  for (const [t, col] of [['auth.users', 'id'], ['public.members', 'id'], ['private.identities', 'member_id'], ['public.posts', 'author_id'],
    ['public.comments', 'author_id'], ['public.post_likes', 'member_id'], ['public.notifications', 'member_id'], ['public.blocks', 'blocker_id'], ['public.push_tokens', 'member_id']] as const) {
    assert.equal((await w.sql(`select count(*)::int n from ${t} where ${col} = $1`, [A.me.id]))[0].n, 0, `${t} still has rows`);
  }
  for (const id of myPosts) assert.equal(await code(() => anon().getPost(id)), 'not-found');
  assert.equal((await w.sql(`select count(*)::int n from public.reports where reporter_id is null`))[0].n >= 1, true, 'reports they filed stay, without their author');
  // the same person can come back as a brand-new member
  await w.sql(`update private.email_challenges set created_at = created_at - interval '2 minutes'`);
  const back = await signIn('ahmed.alqahtani@aramco.com');
  assert.notEqual(back.me.id, A.me.id);
  assert.equal(back.me.acceptedRulesAt, null);
});

test('retention: old codes, removed content, notifications and closed reports are destroyed on schedule', async () => {
  await w.sql(`update private.email_challenges set created_at = now() - interval '25 hours'`);
  await w.sql(`update public.comments set removed_at = now() - interval '91 days' where status = 'removed'`);
  await w.sql(`update public.posts set removed_at = now() - interval '91 days' where status = 'removed'`);
  await w.sql(`update public.notifications set created_at = now() - interval '91 days'`);
  await w.sql(`update public.reports set resolved_at = now() - interval '181 days' where status = 'resolved'`);
  const r = (await w.sql(`select private.run_retention() r`))[0].r;
  assert.ok(r.codes > 0 && r.notifications > 0 && r.posts > 0, JSON.stringify(r));
  assert.equal((await w.sql(`select count(*)::int n from private.email_challenges`))[0].n, 0);
  assert.equal((await w.sql(`select count(*)::int n from public.posts where status = 'removed'`))[0].n, 0);
  assert.equal((await w.sql(`select count(*)::int n from public.reports where status = 'resolved' and (reporter_id is not null or note is not null)`))[0].n, 0);
});
