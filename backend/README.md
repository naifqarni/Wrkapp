# wrk. community backend

Supabase project for the المجتمع tab: sign-in by work email, pseudonymous members, channels, posts, comments, likes, notifications, report, block, a moderation queue, an Arabic and English text filter, optional AI review, and the data-protection functions (export, erase, retention).

```
supabase/migrations/   the whole database: tables, access rules, every function the app calls
supabase/functions/    4 edge functions: auth-request-code, auth-verify-code, moderate, push
supabase/seed.sql      optional demo posts
moderator-console/     one HTML page for whoever reviews reports each day
tests/                 22 end-to-end tests that run on a plain local PostgreSQL
DATA-HANDLING.md       what is stored, for how long, and what PDPL still needs from you
```

The app side is `wrk-app/src/community/api/supabase.ts` (+ `index.ts`). The app never touches a table: every table has row level security on with no policies, and all access goes through checked functions.

## Set it up (about ten minutes)

You need Node 20+ and a terminal (PowerShell is fine). Run commands from this `backend` folder.

**1. Create the project.** At supabase.com, New project. Pick the region closest to Saudi Arabia that is offered (see DATA-HANDLING.md about data leaving the Kingdom). Save the database password. From Project Settings, API, copy the **Project URL**, the **anon public** key and the **project ref** (the `xxxx` in `https://xxxx.supabase.co`).

**2. Push the database.**
```
npx supabase login
npx supabase link --project-ref YOUR_REF
npx supabase db push
```

**3. Set the secrets.** Generate two random values:
```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
```
The first is `EMAIL_PEPPER`, the second `CRON_SECRET`. **Save EMAIL_PEPPER in a password manager now.** If it is ever lost or changed, existing members can no longer be matched to their work email.
```
npx supabase secrets set EMAIL_PEPPER=first_value CRON_SECRET=second_value
```

**4. Sending the codes.** Create a resend.com account, add and verify the domain `ranlab.dev` (three DNS records, same place you manage shop.ranlab.dev), create an API key, then:
```
npx supabase secrets set RESEND_API_KEY=re_xxx "MAIL_FROM=wrk. <verify@ranlab.dev>"
```
To try the app before the domain is verified: `npx supabase secrets set DEV_ECHO_CODE=true`. The code then appears in the app's console instead of an inbox. Remove it before launch: `npx supabase secrets unset DEV_ECHO_CODE`.

**5. Deploy the functions.**
```
npx supabase functions deploy
```

**6. Point the app at it.** In `wrk-app/.env`:
```
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_REF.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=the anon public key
```
Restart the app. Without these two lines the community tab keeps running on its built-in mock.

**7. Make yourself a moderator.** Sign in once in the app with your work email, note your handle, then in the Supabase SQL editor:
```sql
update public.members set role = 'moderator' where handle = 'قلم هادئ 42';
```
Open `moderator-console/index.html` in a browser, paste the Project URL and anon key once, sign in with the same email. That page is the daily review queue. Apple and Google expect reports to be handled within 24 hours; the queue shows each item's deadline and what is overdue.

### Optional: AI review (Arabic and English)

Every post and comment always passes the word filter in the database. AI review adds a second reader that catches what a word list cannot: naming a person with an accusation, leaks, threats in dialect.
```
npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-xxx
npx supabase functions deploy moderate
```
```sql
update public.app_settings set value = 'true' where key = 'ai_moderation';
```
From then on a new post is visible only to its author until the AI answers (a few seconds): allowed posts are published, doubtful ones go to the moderator queue, clear violations are refused. If the AI cannot be reached, the post waits and is handed to a moderator after 10 minutes. It is never published unreviewed.

The model is `claude-opus-5-5` by default, with Anthropic's refusal fallback switched on so abusive text still gets a verdict. At launch volumes the cost is small; if it grows, `npx supabase secrets set MODERATION_MODEL=claude-haiku-5-5` is far cheaper and is your call.

Schedule the retry sweep (SQL editor, replace both placeholders; needs the `pg_net` extension, on by default):
```sql
select cron.schedule('wrk-moderate-sweep', '* * * * *', $$
  select net.http_post(
    url := 'https://YOUR_REF.supabase.co/functions/v1/moderate',
    headers := '{"content-type":"application/json","x-cron-secret":"YOUR_CRON_SECRET"}'::jsonb,
    body := '{"sweep":true}'::jsonb)
$$);
```

### Optional: push notifications
The database already records who should be notified. To deliver them to phones, schedule the push function the same way:
```sql
select cron.schedule('wrk-push', '* * * * *', $$
  select net.http_post(
    url := 'https://YOUR_REF.supabase.co/functions/v1/push',
    headers := '{"content-type":"application/json","x-cron-secret":"YOUR_CRON_SECRET"}'::jsonb,
    body := '{}'::jsonb)
$$);
```
The app must call `registerPushToken(expoPushToken, platform)` after the user allows notifications. Push text is generic ("تعليق جديد على منشورك"); nothing a member wrote is sent to Apple or Google.

### Optional: demo posts
Paste `supabase/seed.sql` into the SQL editor. Six demo members, eight posts. Remove with `delete from auth.users where email like '%@demo.wrk.invalid';`

## How sign-in keeps people anonymous

1. The app sends the work email to `auth-request-code`. The function lower-cases it, drops any `+tag`, and computes `HMAC-SHA256(EMAIL_PEPPER, email)`. Only that hash and the domain go to the database. Personal mail is refused: gmail, hotmail, outlook, yahoo, icloud, proton and over a hundred more providers in every country version, including throw-away services.
2. A 6-digit code goes out by email. It lasts 10 minutes, works once, and dies after 5 wrong tries. Limits: one code a minute, 3 per 15 minutes, 10 a day per address.
3. `auth-verify-code` checks the code. On first sign-in it creates a Supabase auth user whose "email" is a random placeholder (`<uuid>@members.wrk.invalid`), creates the member with a random handle such as "قلم هادئ 42", and attaches the company from the email domain. It returns a one-time token; the app exchanges it for a normal Supabase session.

The address is not written to any table or log. One honest limit: whoever holds both the database and `EMAIL_PEPPER` can test whether one specific address has an account. That is unavoidable if the same email must lead back to the same account. Nobody can list the addresses.

Work email is confirmed again every 12 months (`verification_months` in `app_settings`); until then an expired member can read public channels but not post or open the company channel.

## What the app calls

All through `supabase.rpc(name, args)`; errors carry the contract's code as the message.

| Area | Functions |
|---|---|
| Identity | `me`, `accept_rules`, `update_me`, `export_my_data`, `delete_my_account` |
| Reading (works signed out) | `list_channels`, `list_posts`, `get_post`, `list_comments` |
| Writing | `create_post`, `delete_post`, `create_comment`, `delete_comment`, `set_like`, `list_my_posts` |
| Safety | `report`, `block_user`, `unblock_user`, `list_blocked` |
| Notifications | `list_notifications`, `unread_notification_count`, `mark_notifications_read`, `register_push_token`, `unregister_push_token` |
| Moderators | `mod_list_queue`, `mod_claim`, `mod_resolve` (approve, remove, suspend, ban), `mod_list_companies`, `mod_update_company` |
| Edge functions only | `svc_*` (service role) |

Rules worth knowing:
- `company` posts are visible only to verified members of the same company. `all` lists everything that is not a company post.
- A block hides both people from each other everywhere, immediately.
- Three different reporters hide an item until a moderator decides (`auto_hold_reports`).
- Limits: 5 posts an hour and 20 a day, 30 comments an hour, 30 reports a day, a new handle once a week.
- The filter refuses phone numbers, national ID or iqama numbers, IBANs, email addresses, slurs and explicit words. Insults, crime accusations and links are saved but held for a moderator. The word list is the table `public.filter_terms`; edit it freely.
- Unknown employers are created on first sign-in with the domain as the name. Rename them in the SQL editor (`update public.companies set name = 'الاسم', sector = 'القطاع' where domain = 'example.com';`). To refuse a domain, add it to `public.blocked_email_domains` with kind `manual`.

## Tests

```
cd tests
npm install
npm test          # rebuilds a scratch database and runs the 22 tests
npm run typecheck # type-checks the edge functions against the real SDK types
```
They need a local PostgreSQL 15+ (`TEST_DATABASE_URL`, default `postgres://postgres:postgres@127.0.0.1:5432/wrk_test`) and the app checkout next to this folder (`WRK_APP_DIR`). `tests/supabase-shim.sql` supplies the Supabase roles and `auth.uid()`, so the real migrations run unchanged and every call is made as the `anon` or `authenticated` role, the way Supabase makes it.

### What has and has not been run

Run and passing here: all migrations on PostgreSQL 16; the app's real client through the real edge-function logic into the real database functions (sign-in, free-mail refusal, hashing, the company wall, the filter, blocks, reports, the moderator flow, AI verdict handling, push batching, export, erasure, retention); type-checking of the edge functions against `@supabase/supabase-js` and `@anthropic-ai/sdk`.

Not run, because a live Supabase project cannot be created from the build machine: `supabase db push` against a hosted project, the deployed Deno functions, the Supabase Auth calls inside `auth-verify-code` (`createUser`, `generateLink`, then `verifyOtp` in the app), a real email through Resend, a real Claude verdict, a real Expo push. If step 2 or the first sign-in fails, the likely causes are:
- `verifyOtp` rejects the token: the client already retries with type `email`; if both fail, check that the Email provider is enabled under Authentication, Providers.
- `createUser` rejects the placeholder address: set `SYNTHETIC_EMAIL_DOMAIN` to a domain you own (no mail is ever sent to it) and redeploy.
- `pg_cron` could not be enabled by the migration: enable it under Database, Extensions, then run `select cron.schedule('wrk-retention', '*/5 * * * *', 'select private.run_retention()');`
