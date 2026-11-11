-- wrk. community: the API the app calls (through supabase.rpc).
-- Errors are raised with the contract's error code as the message:
--   not-verified, rules-not-accepted, filtered, not-found, forbidden, rate-limited

-- ---------------------------------------------------------------- helpers ---
create or replace function private.fail(p_code text) returns void
language plpgsql set search_path = '' as $$
begin
  raise exception '%', p_code using errcode = 'P0001';
end $$;

create or replace function private.setting_int(p_key text) returns int
language sql stable set search_path = '' as $$
  select (value #>> '{}')::int from public.app_settings where key = p_key
$$;

create or replace function private.setting_bool(p_key text) returns boolean
language sql stable set search_path = '' as $$
  select coalesce((select (value #>> '{}')::boolean from public.app_settings where key = p_key), false)
$$;

create or replace function private.ts(t timestamptz) returns text
language sql immutable set search_path = '' as $$
  select to_char(t at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
$$;

create or replace function private.cursor_of(t timestamptz, i uuid) returns text
language sql immutable set search_path = '' as $$
  select private.ts(t) || '|' || i::text
$$;

create or replace function private.page_limit(p_limit int) returns int
language sql immutable set search_path = '' as $$
  select least(greatest(coalesce(p_limit, 20), 1), 50)
$$;

create or replace function private.is_blocked(a uuid, b uuid) returns boolean
language sql stable set search_path = '' as $$
  select a is not null and b is not null and exists (
    select 1 from public.blocks k
    where (k.blocker_id = a and k.blocked_id = b) or (k.blocker_id = b and k.blocked_id = a))
$$;

create or replace function private.verified_until(m public.members) returns timestamptz
language sql stable set search_path = '' as $$
  select m.verified_at + make_interval(months => private.setting_int('verification_months'))
$$;

-- The signed-in member, or null. A banned member is treated as signed out
-- everywhere; p_need = 'member' requires an account, 'write' additionally
-- requires not being suspended, 'post' additionally requires accepted rules.
create or replace function private.viewer(p_need text default 'none') returns public.members
language plpgsql set search_path = '' as $$
declare m public.members;
begin
  select * into m from public.members where id = auth.uid();
  if m.id is not null and m.status = 'banned' then
    if p_need = 'none' then return null; end if;
    perform private.fail('forbidden');
  end if;
  if p_need = 'none' then return m; end if;
  if m.id is null then perform private.fail('not-verified'); end if;
  if p_need in ('write','post') then
    if m.status = 'suspended' then
      if m.suspended_until is not null and m.suspended_until <= now() then
        update public.members set status = 'active', suspended_until = null where id = m.id returning * into m;
      else
        perform private.fail('forbidden');
      end if;
    end if;
  end if;
  if p_need = 'post' then
    if m.accepted_rules_at is null or coalesce(m.rules_version, 0) < private.setting_int('rules_version') then
      perform private.fail('rules-not-accepted');
    end if;
  end if;
  return m;
end $$;

create or replace function private.author_json(p_member uuid) returns jsonb
language sql stable set search_path = '' as $$
  select coalesce(
    (select jsonb_build_object(
        'id', m.id,
        'handle', m.handle,
        'companyLabel', case when m.show_company then c.name else c.sector end)
     from public.members m join public.companies c on c.id = m.company_id
     where m.id = p_member),
    jsonb_build_object('id', 'deleted', 'handle', 'عضو سابق', 'companyLabel', null))
$$;

create or replace function private.me_json(m public.members) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'id', m.id,
    'handle', m.handle,
    'companyId', c.id,
    'companyName', c.name,
    'showCompany', m.show_company,
    'acceptedRulesAt', case when coalesce(m.rules_version, 0) >= private.setting_int('rules_version')
                            then private.ts(m.accepted_rules_at) end,
    'role', m.role,
    'companyMemberCount', (select count(*) from public.members x where x.company_id = c.id and x.status <> 'banned'),
    'verifiedUntil', private.ts(private.verified_until(m)),
    'suspended', m.status = 'suspended' and (m.suspended_until is null or m.suspended_until > now()))
  from public.companies c where c.id = m.company_id
$$;

create or replace function private.client_status(p_status text) returns text
language sql immutable set search_path = '' as $$
  select case when p_status = 'published' then 'published' else 'pending' end
$$;

create or replace function private.post_json(p public.posts, p_viewer uuid) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'id', p.id,
    'channel', p.channel,
    'body', p.body,
    'author', private.author_json(p.author_id),
    'createdAt', private.ts(p.created_at),
    'likeCount', (select count(*) from public.post_likes l where l.post_id = p.id),
    'commentCount', (select count(*) from public.comments c where c.post_id = p.id and c.status = 'published'
                       and not private.is_blocked(p_viewer, c.author_id)),
    'likedByMe', p_viewer is not null and exists (select 1 from public.post_likes l where l.post_id = p.id and l.member_id = p_viewer),
    'mine', p_viewer is not null and p.author_id = p_viewer,
    'status', private.client_status(p.status),
    'aiPending', p.status = 'pending')
$$;

create or replace function private.comment_json(c public.comments, p_viewer uuid) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'id', c.id,
    'postId', c.post_id,
    'body', c.body,
    'author', private.author_json(c.author_id),
    'createdAt', private.ts(c.created_at),
    'mine', p_viewer is not null and c.author_id = p_viewer,
    'status', private.client_status(c.status),
    'aiPending', c.status = 'pending')
$$;

-- Can this viewer see this post at all? (company wall, blocks, moderation state)
create or replace function private.can_see_post(p public.posts, v public.members) returns boolean
language sql stable set search_path = '' as $$
  select (p.status = 'published' or (v.id is not null and p.author_id = v.id and p.status in ('pending','held')))
     and (p.channel <> 'company' or (v.id is not null and v.company_id = p.company_id
                                     and private.verified_until(v) > now()))
     and not private.is_blocked(v.id, p.author_id)
$$;

create or replace function private.visible_post(p_id uuid, v public.members) returns public.posts
language plpgsql stable set search_path = '' as $$
declare p public.posts;
begin
  select * into p from public.posts where id = p_id;
  if p.id is null or not private.can_see_post(p, v) then perform private.fail('not-found'); end if;
  return p;
end $$;

-- Handles: a desk object, a quiet adjective, two digits. "قلم هادئ 42".
create or replace function private.gen_handle() returns text
language plpgsql set search_path = '' as $$
declare
  nouns text[] := array['قلم','دفتر','مكتب','كوب','مفتاح','كرسي','مصباح','حبر','ملف','درج','رف','سطر',
                        'هامش','فاصل','ختم','ظرف','مشبك','تقويم','مقعد','باب','ممر','جدول','عنوان','فهرس'];
  adjs  text[] := array['هادئ','صبور','دقيق','نبيه','لبق','أمين','جاد','رزين','فطن','وفي','كتوم','طموح',
                        'مثابر','يقظ','بشوش','حازم','مرتب','واضح','ثابت','متأن','منصف','مبادر','متزن','ودود'];
  h text;
  i int := 0;
begin
  loop
    h := nouns[1 + floor(random() * array_length(nouns, 1))::int] || ' '
      || adjs[1 + floor(random() * array_length(adjs, 1))::int] || ' '
      || case when i < 20 then lpad((10 + floor(random() * 90))::int::text, 2, '0')
              else (100 + floor(random() * 9900))::int::text end;
    exit when not exists (select 1 from public.members where handle = h);
    i := i + 1;
  end loop;
  return h;
end $$;

-- Put something in front of the moderators (one open item per target).
create or replace function private.enqueue(p_type text, p_id uuid, p_author uuid, p_source text,
                                           p_reason text, p_ai_note text default null) returns uuid
language plpgsql set search_path = '' as $$
declare v_id uuid;
begin
  select id into v_id from public.moderation_items
   where target_type = p_type and target_id = p_id and state in ('open','in_review');
  if v_id is null then
    insert into public.moderation_items (target_type, target_id, target_author, source, reasons, ai_note, due_at)
    values (p_type, p_id, p_author, p_source, array_remove(array[p_reason], null), p_ai_note,
            now() + make_interval(hours => private.setting_int('review_sla_hours')))
    returning id into v_id;
  else
    update public.moderation_items
       set reasons = (select array(select distinct unnest(reasons || array_remove(array[p_reason], null)))),
           ai_note = coalesce(p_ai_note, ai_note)
     where id = v_id;
  end if;
  return v_id;
end $$;

-- Content has just become visible to others.
create or replace function private.mark_published(p_type text, p_id uuid) returns void
language plpgsql set search_path = '' as $$
declare c public.comments; v_post_author uuid; v_first boolean;
begin
  if p_type = 'post' then
    update public.posts set status = 'published', published_at = coalesce(published_at, now()) where id = p_id;
  else
    select published_at is null into v_first from public.comments where id = p_id;
    update public.comments set status = 'published', published_at = coalesce(published_at, now())
     where id = p_id returning * into c;
    if v_first then
      select author_id into v_post_author from public.posts where id = c.post_id;
      if v_post_author is not null and v_post_author <> c.author_id
         and not private.is_blocked(v_post_author, c.author_id) then
        insert into public.notifications (member_id, type, post_id, comment_id)
        values (v_post_author, 'comment', c.post_id, c.id);
      end if;
    end if;
  end if;
end $$;

-- Shared by create_post / create_comment: filter, then decide the first status.
create or replace function private.first_status(p_body text) returns text
language plpgsql stable set search_path = '' as $$
declare v record;
begin
  select * into v from private.check_text(p_body);
  if v.verdict = 'block' then perform private.fail('filtered'); end if;
  if v.verdict = 'hold' then return 'held:' || coalesce(v.category, 'filter'); end if;
  if private.setting_bool('ai_moderation') then return 'pending'; end if;
  return 'published';
end $$;

-- --------------------------------------------------------------- identity ---
create or replace function public.me() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare m public.members;
begin
  select * into m from public.members where id = auth.uid();
  if m.id is null or m.status = 'banned' then return null; end if;
  return private.me_json(m);
end $$;

create or replace function public.accept_rules() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare m public.members := private.viewer('member');
begin
  update public.members
     set accepted_rules_at = now(), rules_version = private.setting_int('rules_version')
   where id = m.id returning * into m;
  return private.me_json(m);
end $$;

create or replace function public.update_me(p_show_company boolean default null,
                                            p_regenerate_handle boolean default false) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare m public.members := private.viewer('member');
begin
  if p_show_company is not null then
    update public.members set show_company = p_show_company where id = m.id returning * into m;
  end if;
  if coalesce(p_regenerate_handle, false) then
    -- one new handle a week: enough to stop being recognised, not enough to harass under fresh names
    if m.handle_changed_at is not null and m.handle_changed_at > now() - interval '7 days' then
      perform private.fail('rate-limited');
    end if;
    update public.members set handle = private.gen_handle(), handle_changed_at = now()
     where id = m.id returning * into m;
  end if;
  return private.me_json(m);
end $$;

-- ---------------------------------------------------------------- content ---
create or replace function public.list_channels() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'title', title, 'companyOnly', company_only) order by sort), '[]'::jsonb)
  from public.channels
$$;

create or replace function public.list_posts(p_channel text, p_cursor text default null, p_limit int default 20)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v public.members := private.viewer('none');
  n int := private.page_limit(p_limit);
  c_ts timestamptz; c_id uuid;
  rows public.posts[];
  v_next text;
begin
  if not exists (select 1 from public.channels where id = p_channel) then perform private.fail('not-found'); end if;
  if p_channel = 'company' then
    if v.id is null or private.verified_until(v) <= now() then perform private.fail('not-verified'); end if;
  end if;
  if p_cursor is not null then
    begin
      c_ts := split_part(p_cursor, '|', 1)::timestamptz; c_id := split_part(p_cursor, '|', 2)::uuid;
    exception when others then perform private.fail('not-found'); end;
  end if;

  select array(
    select p from public.posts p
    where (case when p_channel = 'all' then p.channel <> 'company' else p.channel = p_channel end)
      and (p_channel <> 'company' or p.company_id = v.company_id)
      and private.can_see_post(p, v)
      and (c_ts is null or (p.created_at, p.id) < (c_ts, c_id))
    order by p.created_at desc, p.id desc
    limit n + 1) into rows;

  if coalesce(array_length(rows, 1), 0) > n then
    v_next := private.cursor_of(rows[n].created_at, rows[n].id);
    rows := rows[1:n];
  end if;
  return jsonb_build_object(
    'items', coalesce((select jsonb_agg(private.post_json(r, v.id) order by r.created_at desc, r.id desc) from unnest(rows) r), '[]'::jsonb),
    'nextCursor', v_next);
end $$;

create or replace function public.list_my_posts(p_cursor text default null, p_limit int default 20) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v public.members := private.viewer('member');
  n int := private.page_limit(p_limit);
  c_ts timestamptz; c_id uuid;
  rows public.posts[];
  v_next text;
begin
  if p_cursor is not null then
    begin
      c_ts := split_part(p_cursor, '|', 1)::timestamptz; c_id := split_part(p_cursor, '|', 2)::uuid;
    exception when others then perform private.fail('not-found'); end;
  end if;
  select array(
    select p from public.posts p
    where p.author_id = v.id and p.status <> 'removed'
      and (c_ts is null or (p.created_at, p.id) < (c_ts, c_id))
    order by p.created_at desc, p.id desc limit n + 1) into rows;
  if coalesce(array_length(rows, 1), 0) > n then
    v_next := private.cursor_of(rows[n].created_at, rows[n].id);
    rows := rows[1:n];
  end if;
  return jsonb_build_object(
    'items', coalesce((select jsonb_agg(private.post_json(r, v.id) order by r.created_at desc, r.id desc) from unnest(rows) r), '[]'::jsonb),
    'nextCursor', v_next);
end $$;

create or replace function public.get_post(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v public.members := private.viewer('none');
begin
  return private.post_json(private.visible_post(p_id, v), v.id);
end $$;

create or replace function public.create_post(p_channel text, p_body text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v public.members := private.viewer('post');
  v_body text := btrim(coalesce(p_body, ''), E' \n\r\t');
  v_first text;
  p public.posts;
begin
  if not exists (select 1 from public.channels where id = p_channel) then perform private.fail('not-found'); end if;
  if private.verified_until(v) <= now() then perform private.fail('not-verified'); end if;
  if char_length(v_body) < 1 or char_length(v_body) > 2000 then perform private.fail('filtered'); end if;
  if (select count(*) from public.posts where author_id = v.id and created_at > now() - interval '1 hour') >= 5
     or (select count(*) from public.posts where author_id = v.id and created_at > now() - interval '1 day') >= 20
     or exists (select 1 from public.posts where author_id = v.id and body = v_body and created_at > now() - interval '10 minutes') then
    perform private.fail('rate-limited');
  end if;

  v_first := private.first_status(v_body);
  insert into public.posts (channel, author_id, company_id, body, status)
  values (p_channel, v.id, v.company_id, v_body, split_part(v_first, ':', 1))
  returning * into p;

  if p.status = 'published' then
    perform private.mark_published('post', p.id);
  elsif p.status = 'held' then
    perform private.enqueue('post', p.id, v.id, 'filter', split_part(v_first, ':', 2));
  end if;
  select * into p from public.posts where id = p.id;
  return private.post_json(p, v.id);
end $$;

create or replace function public.delete_post(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v public.members := private.viewer('member');
begin
  delete from public.posts where id = p_id and author_id = v.id;
  if not found then
    perform private.fail(case when exists (select 1 from public.posts where id = p_id) then 'forbidden' else 'not-found' end);
  end if;
  update public.moderation_items set state = 'dismissed', action = 'deleted-by-author', resolved_at = now()
   where target_type = 'post' and target_id = p_id and state in ('open','in_review');
end $$;

create or replace function public.list_comments(p_post_id uuid, p_cursor text default null, p_limit int default 20)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v public.members := private.viewer('none');
  n int := private.page_limit(p_limit);
  c_ts timestamptz; c_id uuid;
  rows public.comments[];
  v_next text;
begin
  perform private.visible_post(p_post_id, v);
  if p_cursor is not null then
    begin
      c_ts := split_part(p_cursor, '|', 1)::timestamptz; c_id := split_part(p_cursor, '|', 2)::uuid;
    exception when others then perform private.fail('not-found'); end;
  end if;
  select array(
    select c from public.comments c
    where c.post_id = p_post_id
      and (c.status = 'published' or (v.id is not null and c.author_id = v.id and c.status in ('pending','held')))
      and not private.is_blocked(v.id, c.author_id)
      and (c_ts is null or (c.created_at, c.id) > (c_ts, c_id))
    order by c.created_at, c.id limit n + 1) into rows;
  if coalesce(array_length(rows, 1), 0) > n then
    v_next := private.cursor_of(rows[n].created_at, rows[n].id);
    rows := rows[1:n];
  end if;
  return jsonb_build_object(
    'items', coalesce((select jsonb_agg(private.comment_json(r, v.id) order by r.created_at, r.id) from unnest(rows) r), '[]'::jsonb),
    'nextCursor', v_next);
end $$;

create or replace function public.create_comment(p_post_id uuid, p_body text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v public.members := private.viewer('post');
  v_body text := btrim(coalesce(p_body, ''), E' \n\r\t');
  v_post public.posts;
  v_first text;
  c public.comments;
begin
  v_post := private.visible_post(p_post_id, v);
  if v_post.status <> 'published' and v_post.author_id <> v.id then perform private.fail('not-found'); end if;
  if private.verified_until(v) <= now() then perform private.fail('not-verified'); end if;
  if char_length(v_body) < 1 or char_length(v_body) > 800 then perform private.fail('filtered'); end if;
  if (select count(*) from public.comments where author_id = v.id and created_at > now() - interval '1 hour') >= 30
     or (select count(*) from public.comments where author_id = v.id and created_at > now() - interval '1 day') >= 200
     or exists (select 1 from public.comments where author_id = v.id and post_id = p_post_id and body = v_body
                and created_at > now() - interval '10 minutes') then
    perform private.fail('rate-limited');
  end if;

  v_first := private.first_status(v_body);
  insert into public.comments (post_id, author_id, body, status)
  values (p_post_id, v.id, v_body, split_part(v_first, ':', 1))
  returning * into c;

  if c.status = 'published' then
    perform private.mark_published('comment', c.id);
  elsif c.status = 'held' then
    perform private.enqueue('comment', c.id, v.id, 'filter', split_part(v_first, ':', 2));
  end if;
  select * into c from public.comments where id = c.id;
  return private.comment_json(c, v.id);
end $$;

create or replace function public.delete_comment(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v public.members := private.viewer('member');
begin
  delete from public.comments where id = p_id and author_id = v.id;
  if not found then
    perform private.fail(case when exists (select 1 from public.comments where id = p_id) then 'forbidden' else 'not-found' end);
  end if;
  update public.moderation_items set state = 'dismissed', action = 'deleted-by-author', resolved_at = now()
   where target_type = 'comment' and target_id = p_id and state in ('open','in_review');
end $$;

create or replace function public.set_like(p_post_id uuid, p_liked boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v public.members := private.viewer('write'); p public.posts;
begin
  p := private.visible_post(p_post_id, v);
  if p.status <> 'published' then perform private.fail('not-found'); end if;
  if p_liked then
    insert into public.post_likes (post_id, member_id) values (p.id, v.id) on conflict do nothing;
  else
    delete from public.post_likes where post_id = p.id and member_id = v.id;
  end if;
  return jsonb_build_object(
    'likeCount', (select count(*) from public.post_likes where post_id = p.id),
    'likedByMe', coalesce(p_liked, false));
end $$;

-- ---------------------------------------------------------- notifications ---
create or replace function public.list_notifications(p_cursor text default null, p_limit int default 20) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v public.members := private.viewer('member');
  n int := private.page_limit(p_limit);
  c_ts timestamptz; c_id uuid;
  rows public.notifications[];
  v_next text;
begin
  if p_cursor is not null then
    begin
      c_ts := split_part(p_cursor, '|', 1)::timestamptz; c_id := split_part(p_cursor, '|', 2)::uuid;
    exception when others then perform private.fail('not-found'); end;
  end if;
  select array(
    select x from public.notifications x
    where x.member_id = v.id and (c_ts is null or (x.created_at, x.id) < (c_ts, c_id))
    order by x.created_at desc, x.id desc limit n + 1) into rows;
  if coalesce(array_length(rows, 1), 0) > n then
    v_next := private.cursor_of(rows[n].created_at, rows[n].id);
    rows := rows[1:n];
  end if;
  return jsonb_build_object(
    'items', coalesce((select jsonb_agg(jsonb_build_object(
        'id', r.id, 'type', r.type, 'postId', r.post_id, 'commentId', r.comment_id,
        'createdAt', private.ts(r.created_at), 'read', r.read_at is not null)
        order by r.created_at desc, r.id desc) from unnest(rows) r), '[]'::jsonb),
    'nextCursor', v_next);
end $$;

create or replace function public.unread_notification_count() returns int
language plpgsql stable security definer set search_path = '' as $$
declare v public.members := private.viewer('member');
begin
  return (select count(*) from public.notifications where member_id = v.id and read_at is null);
end $$;

create or replace function public.mark_notifications_read(p_ids uuid[] default null) returns void
language plpgsql security definer set search_path = '' as $$
declare v public.members := private.viewer('member');
begin
  update public.notifications set read_at = now()
   where member_id = v.id and read_at is null and (p_ids is null or id = any(p_ids));
end $$;

create or replace function public.register_push_token(p_token text, p_platform text) returns void
language plpgsql security definer set search_path = '' as $$
declare v public.members := private.viewer('member');
begin
  if p_token is null or char_length(p_token) not between 10 and 300 or p_platform not in ('ios','android','web') then
    perform private.fail('forbidden');
  end if;
  insert into public.push_tokens (token, member_id, platform) values (p_token, v.id, p_platform)
  on conflict (token) do update set member_id = excluded.member_id, platform = excluded.platform, created_at = now();
end $$;

create or replace function public.unregister_push_token(p_token text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.push_tokens where token = p_token and member_id = auth.uid();
end $$;
