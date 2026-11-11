-- wrk. community: tables.
-- Every table has row level security ON and NO policies, so the anon and
-- authenticated roles cannot read or write any table directly. All access goes
-- through the functions in the later migrations, which check who is asking.

create schema if not exists private;
revoke all on schema private from public;

-- Functions created from here on are not callable by app roles unless granted
-- explicitly in the grants migration.
alter default privileges in schema public revoke execute on functions from public;
do $$ begin
  execute 'alter default privileges in schema public revoke execute on functions from anon, authenticated';
exception when others then null; end $$;

create table public.app_settings (
  key   text primary key,
  value jsonb not null
);
insert into public.app_settings (key, value) values
  ('rules_version',            '1'),      -- bump to make everyone accept the rules again
  ('ai_moderation',            'false'),  -- true once the "moderate" function has its API key
  ('auto_hold_reports',        '3'),      -- distinct reporters that hide content until reviewed
  ('verification_months',      '12'),     -- work email must be re-confirmed after this long
  ('pending_timeout_minutes',  '10'),     -- AI never answered: send to human review
  ('review_sla_hours',         '24');     -- Apple 1.2 / Google UGC: act on reports within a day

create table public.channels (
  id           text primary key,
  title        text not null,
  company_only boolean not null default false,
  sort         int not null
);
insert into public.channels (id, title, company_only, sort) values
  ('company',    'شركتي',       true,  0),
  ('all',        'الكل',        false, 1),
  ('first-day',  'أول يوم',     false, 2),
  ('salaries',   'رواتب',       false, 3),
  ('interviews', 'مقابلات',     false, 4),
  ('culture',    'بيئة العمل',  false, 5),
  ('advice',     'نصيحة',       false, 6);

create table public.companies (
  id         uuid primary key default gen_random_uuid(),
  domain     text not null unique,          -- registrable domain, e.g. aramco.com
  name       text not null,                 -- shown next to the handle
  sector     text,                          -- shown instead of the name when the member hides the company
  status     text not null default 'active' check (status in ('active','blocked')),
  created_at timestamptz not null default now()
);

-- extra domains that belong to the same company (aliases, subsidiaries)
create table private.company_domains (
  domain     text primary key,
  company_id uuid not null references public.companies(id) on delete cascade
);

create table public.blocked_email_domains (
  domain text primary key,
  kind   text not null check (kind in ('free','disposable','manual'))
);

-- The public, pseudonymous profile. No name, no email, no phone.
create table public.members (
  id                uuid primary key references auth.users(id) on delete cascade,
  handle            text not null unique,
  company_id        uuid not null references public.companies(id),
  show_company      boolean not null default true,
  accepted_rules_at timestamptz,
  rules_version     int,
  role              text not null default 'member' check (role in ('member','moderator')),
  status            text not null default 'active' check (status in ('active','suspended','banned')),
  suspended_until   timestamptz,
  verified_at       timestamptz not null default now(),
  handle_changed_at timestamptz,
  created_at        timestamptz not null default now()
);
create index members_company_idx on public.members (company_id);

-- The only link between a work email and an account: a keyed one-way hash
-- (HMAC-SHA256 with a secret that lives in the edge function, never in the
-- database). Kept apart from the profile, in a schema the API does not expose.
create table private.identities (
  member_id  uuid primary key references auth.users(id) on delete cascade,
  email_hash text not null unique,
  created_at timestamptz not null default now()
);

create table private.banned_identities (
  email_hash text primary key,
  reason     text,
  created_at timestamptz not null default now()
);

create table private.email_challenges (
  id          uuid primary key default gen_random_uuid(),
  email_hash  text not null,
  domain      text not null,
  code_hash   text not null,
  ip_hash     text,
  attempts    int not null default 0,
  expires_at  timestamptz not null,
  consumed_at timestamptz,
  created_at  timestamptz not null default now()
);
create index email_challenges_hash_idx on private.email_challenges (email_hash, created_at desc);
create index email_challenges_ip_idx   on private.email_challenges (ip_hash, created_at desc);

create table public.posts (
  id           uuid primary key default gen_random_uuid(),
  channel      text not null references public.channels(id),
  author_id    uuid not null references public.members(id) on delete cascade,
  company_id   uuid not null references public.companies(id),  -- author's company when posted
  body         text not null check (char_length(body) between 1 and 2000),
  status       text not null default 'published'
               check (status in ('pending','published','held','removed')),
  published_at timestamptz,
  removed_at   timestamptz,
  created_at   timestamptz not null default now()
);
create index posts_feed_idx    on public.posts (created_at desc, id desc) where status = 'published';
create index posts_channel_idx on public.posts (channel, created_at desc, id desc);
create index posts_company_idx on public.posts (company_id, created_at desc) where channel = 'company';
create index posts_author_idx  on public.posts (author_id, created_at desc);

create table public.comments (
  id           uuid primary key default gen_random_uuid(),
  post_id      uuid not null references public.posts(id) on delete cascade,
  author_id    uuid not null references public.members(id) on delete cascade,
  body         text not null check (char_length(body) between 1 and 800),
  status       text not null default 'published'
               check (status in ('pending','published','held','removed')),
  published_at timestamptz,
  removed_at   timestamptz,
  created_at   timestamptz not null default now()
);
create index comments_post_idx   on public.comments (post_id, created_at, id);
create index comments_author_idx on public.comments (author_id, created_at desc);

create table public.post_likes (
  post_id    uuid not null references public.posts(id) on delete cascade,
  member_id  uuid not null references public.members(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, member_id)
);

create table public.blocks (
  blocker_id uuid not null references public.members(id) on delete cascade,
  blocked_id uuid not null references public.members(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index blocks_blocked_idx on public.blocks (blocked_id);

create table public.moderation_items (
  id            uuid primary key default gen_random_uuid(),
  target_type   text not null check (target_type in ('post','comment','user')),
  target_id     uuid not null,
  target_author uuid,                       -- member the content belongs to (no FK: survives deletion as a bare id)
  source        text not null check (source in ('report','filter','ai','stale')),
  reasons       text[] not null default '{}',
  ai_note       text,
  report_count  int not null default 0,
  state         text not null default 'open' check (state in ('open','in_review','actioned','dismissed')),
  assigned_to   uuid references public.members(id) on delete set null,
  action        text,
  resolved_by   uuid references public.members(id) on delete set null,
  resolved_at   timestamptz,
  note          text,
  due_at        timestamptz not null,
  created_at    timestamptz not null default now()
);
create unique index moderation_items_open_idx on public.moderation_items (target_type, target_id)
  where state in ('open','in_review');
create index moderation_items_queue_idx on public.moderation_items (state, due_at);

create table public.reports (
  id           uuid primary key default gen_random_uuid(),
  reporter_id  uuid references public.members(id) on delete set null,
  target_type  text not null check (target_type in ('post','comment','user')),
  target_id    uuid not null,
  reason       text not null check (reason in ('harassment','defamation','hate','sexual','spam','private-info','other')),
  note         text check (note is null or char_length(note) <= 500),
  item_id      uuid references public.moderation_items(id) on delete set null,
  status       text not null default 'open' check (status in ('open','resolved')),
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz
);
create unique index reports_once_idx on public.reports (reporter_id, target_type, target_id);
create index reports_target_idx on public.reports (target_type, target_id);

-- what moderators did, for accountability
create table public.moderation_actions (
  id           uuid primary key default gen_random_uuid(),
  item_id      uuid references public.moderation_items(id) on delete set null,
  moderator_id uuid references public.members(id) on delete set null,
  action       text not null,
  target_type  text not null,
  target_id    uuid not null,
  note         text,
  created_at   timestamptz not null default now()
);

create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  member_id  uuid not null references public.members(id) on delete cascade,
  type       text not null check (type in ('comment','removed','approved')),
  post_id    uuid references public.posts(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  read_at    timestamptz,
  pushed_at  timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_member_idx on public.notifications (member_id, created_at desc, id desc);
create index notifications_unpushed_idx on public.notifications (created_at) where pushed_at is null;

create table public.push_tokens (
  token      text primary key,
  member_id  uuid not null references public.members(id) on delete cascade,
  platform   text not null check (platform in ('ios','android','web')),
  created_at timestamptz not null default now()
);
create index push_tokens_member_idx on public.push_tokens (member_id);

create table public.filter_terms (
  id       bigint generated always as identity primary key,
  term     text not null,            -- stored already normalised (see private.normalize_text)
  lang     text not null check (lang in ('ar','en')),
  severity text not null check (severity in ('block','hold')),
  category text not null,
  flex     boolean not null default true,  -- also match with attached particles / endings (off for short, risky words)
  unique (term, lang)
);

-- lock every table down
do $$
declare t record;
begin
  for t in select schemaname, tablename from pg_tables where schemaname in ('public','private')
           and tablename in ('app_settings','channels','companies','company_domains','blocked_email_domains',
             'members','identities','banned_identities','email_challenges','posts','comments','post_likes',
             'blocks','moderation_items','reports','moderation_actions','notifications','push_tokens','filter_terms')
  loop
    execute format('alter table %I.%I enable row level security', t.schemaname, t.tablename);
    execute format('revoke all on table %I.%I from public', t.schemaname, t.tablename);
    begin
      execute format('revoke all on table %I.%I from anon, authenticated', t.schemaname, t.tablename);
    exception when undefined_object then null; end;
  end loop;
end $$;
