-- wrk. community: report, block, the moderation queue, and the hooks the AI
-- moderation function uses.

-- ------------------------------------------------------------------ blocks ---
create or replace function public.block_user(p_user_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v public.members := private.viewer('member');
begin
  if p_user_id = v.id then perform private.fail('forbidden'); end if;
  if not exists (select 1 from public.members where id = p_user_id) then perform private.fail('not-found'); end if;
  insert into public.blocks (blocker_id, blocked_id) values (v.id, p_user_id) on conflict do nothing;
  -- nothing of theirs should keep pinging me
  delete from public.notifications n using public.comments c
   where n.member_id = v.id and n.comment_id = c.id and c.author_id = p_user_id;
end $$;

create or replace function public.unblock_user(p_user_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v public.members := private.viewer('member');
begin
  delete from public.blocks where blocker_id = v.id and blocked_id = p_user_id;
end $$;

create or replace function public.list_blocked() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v public.members := private.viewer('member');
begin
  return coalesce((select jsonb_agg(private.author_json(b.blocked_id) order by b.created_at desc)
                   from public.blocks b where b.blocker_id = v.id), '[]'::jsonb);
end $$;

-- ----------------------------------------------------------------- reports ---
create or replace function public.report(p_target_type text, p_target_id uuid, p_reason text, p_note text default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v public.members := private.viewer('member');
  v_author uuid;
  v_item uuid;
  v_count int;
  p public.posts;
  c public.comments;
begin
  if p_reason not in ('harassment','defamation','hate','sexual','spam','private-info','other') then
    perform private.fail('forbidden');
  end if;
  if (select count(*) from public.reports where reporter_id = v.id and created_at > now() - interval '1 day') >= 30 then
    perform private.fail('rate-limited');
  end if;

  if p_target_type = 'post' then
    p := private.visible_post(p_target_id, v);
    v_author := p.author_id;
  elsif p_target_type = 'comment' then
    select * into c from public.comments where id = p_target_id and status = 'published';
    if c.id is null then perform private.fail('not-found'); end if;
    perform private.visible_post(c.post_id, v);
    v_author := c.author_id;
  elsif p_target_type = 'user' then
    if not exists (select 1 from public.members where id = p_target_id) then perform private.fail('not-found'); end if;
    v_author := p_target_id;
  else
    perform private.fail('not-found');
  end if;
  if v_author = v.id then perform private.fail('forbidden'); end if;

  -- reporting twice is not an error; the second one changes nothing
  if exists (select 1 from public.reports where reporter_id = v.id and target_type = p_target_type and target_id = p_target_id) then
    return;
  end if;

  v_item := private.enqueue(p_target_type, p_target_id, v_author, 'report', p_reason);
  insert into public.reports (reporter_id, target_type, target_id, reason, note, item_id)
  values (v.id, p_target_type, p_target_id, p_reason, nullif(left(btrim(coalesce(p_note, '')), 500), ''), v_item);

  select count(distinct reporter_id) into v_count from public.reports
   where target_type = p_target_type and target_id = p_target_id and status = 'open';
  update public.moderation_items set report_count = v_count where id = v_item;

  -- enough different people reported it: hide it until a moderator decides
  if v_count >= private.setting_int('auto_hold_reports') then
    if p_target_type = 'post' then
      update public.posts set status = 'held' where id = p_target_id and status = 'published';
    elsif p_target_type = 'comment' then
      update public.comments set status = 'held' where id = p_target_id and status = 'published';
    end if;
  end if;
end $$;

-- -------------------------------------------------------- moderator tools ---
create or replace function private.moderator() returns public.members
language plpgsql set search_path = '' as $$
declare m public.members := private.viewer('member');
begin
  if m.role <> 'moderator' or m.status <> 'active' then perform private.fail('forbidden'); end if;
  return m;
end $$;

create or replace function private.item_json(i public.moderation_items) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'id', i.id,
    'targetType', i.target_type,
    'targetId', i.target_id,
    'source', i.source,
    'reasons', to_jsonb(i.reasons),
    'aiNote', i.ai_note,
    'reportCount', i.report_count,
    'state', i.state,
    'action', i.action,
    'note', i.note,
    'createdAt', private.ts(i.created_at),
    'dueAt', private.ts(i.due_at),
    'overdue', i.state in ('open','in_review') and i.due_at < now(),
    'assignedToMe', i.assigned_to is not null and i.assigned_to = auth.uid(),
    'author', case when i.target_author is null then null else private.author_json(i.target_author) end,
    'authorStatus', (select m.status from public.members m where m.id = i.target_author),
    'authorPriorRemovals', (select count(*) from public.moderation_actions a
        join public.moderation_items x on x.id = a.item_id
        where x.target_author = i.target_author and a.action in ('remove','suspend','ban')),
    'content', case i.target_type
        when 'post' then (select jsonb_build_object('body', p.body, 'channel', p.channel, 'status', p.status,
                                 'createdAt', private.ts(p.created_at)) from public.posts p where p.id = i.target_id)
        when 'comment' then (select jsonb_build_object('body', c.body, 'postId', c.post_id, 'status', c.status,
                                 'createdAt', private.ts(c.created_at),
                                 'postBody', (select left(p.body, 280) from public.posts p where p.id = c.post_id))
                             from public.comments c where c.id = i.target_id)
        else null end,
    'reports', coalesce((select jsonb_agg(jsonb_build_object('reason', r.reason, 'note', r.note,
                                'createdAt', private.ts(r.created_at)) order by r.created_at)
                         from public.reports r where r.item_id = i.id), '[]'::jsonb))
$$;

create or replace function public.mod_list_queue(p_state text default 'open', p_cursor text default null,
                                                 p_limit int default 20) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v public.members := private.moderator();
  n int := private.page_limit(p_limit);
  c_ts timestamptz; c_id uuid;
  rows public.moderation_items[];
  v_next text;
begin
  if p_cursor is not null then
    c_ts := split_part(p_cursor, '|', 1)::timestamptz; c_id := split_part(p_cursor, '|', 2)::uuid;
  end if;
  -- open work: most urgent first. history: newest first.
  if p_state = 'open' then
    select array(select i from public.moderation_items i
      where i.state in ('open','in_review') and (c_ts is null or (i.due_at, i.id) > (c_ts, c_id))
      order by i.due_at, i.id limit n + 1) into rows;
    if coalesce(array_length(rows, 1), 0) > n then
      v_next := private.cursor_of(rows[n].due_at, rows[n].id); rows := rows[1:n];
    end if;
  else
    select array(select i from public.moderation_items i
      where i.state in ('actioned','dismissed') and (c_ts is null or (i.created_at, i.id) < (c_ts, c_id))
      order by i.created_at desc, i.id desc limit n + 1) into rows;
    if coalesce(array_length(rows, 1), 0) > n then
      v_next := private.cursor_of(rows[n].created_at, rows[n].id); rows := rows[1:n];
    end if;
  end if;
  return jsonb_build_object(
    'items', coalesce((select jsonb_agg(private.item_json(rows[g.i]) order by g.i) from generate_subscripts(rows, 1) g(i)), '[]'::jsonb),
    'nextCursor', v_next,
    'openCount', (select count(*) from public.moderation_items where state in ('open','in_review')),
    'overdueCount', (select count(*) from public.moderation_items where state in ('open','in_review') and due_at < now()));
end $$;

create or replace function public.mod_claim(p_item_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v public.members := private.moderator(); i public.moderation_items;
begin
  update public.moderation_items set state = 'in_review', assigned_to = v.id
   where id = p_item_id and state in ('open','in_review') returning * into i;
  if i.id is null then perform private.fail('not-found'); end if;
  return private.item_json(i);
end $$;

-- Remove everything a member wrote from view and remember the identity so the
-- same work email cannot simply sign up again.
create or replace function private.ban_member(p_member uuid, p_reason text) returns void
language plpgsql set search_path = '' as $$
begin
  update public.members set status = 'banned', suspended_until = null where id = p_member;
  update public.posts set status = 'removed' where author_id = p_member and status <> 'removed';
  update public.comments set status = 'removed' where author_id = p_member and status <> 'removed';
  delete from public.push_tokens where member_id = p_member;
  insert into private.banned_identities (email_hash, reason)
  select email_hash, p_reason from private.identities where member_id = p_member
  on conflict (email_hash) do nothing;
end $$;

-- p_action: approve | remove | suspend | ban
--   approve : content is fine; show it (again) and close the reports
--   remove  : take the content down, tell the author
--   suspend : remove + the author cannot post, comment or like for p_days (default 7)
--   ban     : remove everything by the author and block the identity for good
create or replace function public.mod_resolve(p_item_id uuid, p_action text, p_note text default null,
                                              p_days int default 7) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v public.members := private.moderator();
  i public.moderation_items;
  v_was text;
  v_post uuid;
begin
  if p_action not in ('approve','remove','suspend','ban') then perform private.fail('forbidden'); end if;
  select * into i from public.moderation_items where id = p_item_id for update;
  if i.id is null then perform private.fail('not-found'); end if;
  if i.state in ('actioned','dismissed') then return private.item_json(i); end if;
  if i.target_author = v.id then perform private.fail('forbidden'); end if;  -- never judge your own content
  if p_action in ('suspend','ban') and exists
     (select 1 from public.members where id = i.target_author and role = 'moderator') then
    perform private.fail('forbidden');
  end if;

  if i.target_type = 'post' then
    select status into v_was from public.posts where id = i.target_id;
    v_post := i.target_id;
  elsif i.target_type = 'comment' then
    select status, post_id into v_was, v_post from public.comments where id = i.target_id;
  end if;

  if p_action = 'approve' then
    if i.target_type in ('post','comment') and v_was in ('pending','held','removed') then
      perform private.mark_published(i.target_type, i.target_id);
      if i.target_author is not null and v_was in ('held','removed') then
        insert into public.notifications (member_id, type, post_id, comment_id)
        values (i.target_author, 'approved', v_post, case when i.target_type = 'comment' then i.target_id end);
      end if;
    end if;
  else
    if i.target_type = 'post' and v_was is not null then
      update public.posts set status = 'removed' where id = i.target_id;
    elsif i.target_type = 'comment' and v_was is not null then
      update public.comments set status = 'removed' where id = i.target_id;
    end if;
    if i.target_type in ('post','comment') and v_was is not null and v_was <> 'removed'
       and exists (select 1 from public.members where id = i.target_author) then
      insert into public.notifications (member_id, type, post_id, comment_id)
      values (i.target_author, 'removed', v_post, case when i.target_type = 'comment' then i.target_id end);
    end if;
    if p_action = 'suspend' and i.target_author is not null then
      update public.members set status = 'suspended',
             suspended_until = now() + make_interval(days => least(greatest(coalesce(p_days, 7), 1), 365))
       where id = i.target_author and status <> 'banned';
    elsif p_action = 'ban' and i.target_author is not null then
      perform private.ban_member(i.target_author, coalesce(array_to_string(i.reasons, ','), 'moderation'));
    end if;
  end if;

  update public.moderation_items
     set state = case when p_action = 'approve' then 'dismissed' else 'actioned' end,
         action = p_action, note = nullif(left(btrim(coalesce(p_note, '')), 500), ''),
         resolved_by = v.id, resolved_at = now()
   where id = i.id returning * into i;
  update public.reports set status = 'resolved', resolved_at = now() where item_id = i.id and status = 'open';
  insert into public.moderation_actions (item_id, moderator_id, action, target_type, target_id, note)
  values (i.id, v.id, p_action, i.target_type, i.target_id, i.note);
  return private.item_json(i);
end $$;

create or replace function public.mod_update_company(p_company_id uuid, p_name text default null,
                                                     p_sector text default null, p_status text default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare v public.members := private.moderator();
begin
  update public.companies
     set name = coalesce(nullif(btrim(p_name), ''), name),
         sector = coalesce(nullif(btrim(p_sector), ''), sector),
         status = coalesce(p_status, status)
   where id = p_company_id;
  if not found then perform private.fail('not-found'); end if;
  insert into public.moderation_actions (moderator_id, action, target_type, target_id, note)
  values (v.id, 'company-update', 'user', p_company_id, concat_ws(' / ', p_name, p_sector, p_status));
end $$;

create or replace function public.mod_list_companies() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v public.members := private.moderator();
begin
  return coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'domain', c.domain, 'name', c.name,
      'sector', c.sector, 'status', c.status,
      'members', (select count(*) from public.members m where m.company_id = c.id)) order by c.created_at desc)
    from public.companies c), '[]'::jsonb);
end $$;

-- ------------------------------------------------- hooks for AI moderation ---
-- Called only by the "moderate" edge function (service role).

create or replace function public.svc_moderation_fetch(p_type text, p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if p_type = 'post' then
    return (select jsonb_build_object('status', p.status, 'authorId', p.author_id, 'body', p.body,
                                      'channel', p.channel, 'context', null)
            from public.posts p where p.id = p_id);
  elsif p_type = 'comment' then
    return (select jsonb_build_object('status', c.status, 'authorId', c.author_id, 'body', c.body,
                                      'channel', p.channel, 'context', left(p.body, 600))
            from public.comments c join public.posts p on p.id = c.post_id where c.id = p_id);
  end if;
  return null;
end $$;

-- p_decision: allow | hold | block. Only acts on content that is still pending.
create or replace function public.svc_moderation_apply(p_type text, p_id uuid, p_decision text,
                                                       p_category text default null, p_note text default null)
returns text
language plpgsql security definer set search_path = '' as $$
declare v_status text; v_author uuid; v_post uuid; v_item uuid;
begin
  if p_type = 'post' then
    select status, author_id, id into v_status, v_author, v_post from public.posts where id = p_id for update;
  elsif p_type = 'comment' then
    select status, author_id, post_id into v_status, v_author, v_post from public.comments where id = p_id for update;
  end if;
  if v_status is null then return 'missing'; end if;
  if v_status <> 'pending' then return v_status; end if;

  if p_decision = 'allow' then
    perform private.mark_published(p_type, p_id);
    return 'published';
  elsif p_decision = 'block' then
    if p_type = 'post' then update public.posts set status = 'removed' where id = p_id;
    else update public.comments set status = 'removed' where id = p_id; end if;
    -- stays in the queue so a person can overturn the machine
    perform private.enqueue(p_type, p_id, v_author, 'ai', p_category, left(p_note, 500));
    insert into public.notifications (member_id, type, post_id, comment_id)
    values (v_author, 'removed', v_post, case when p_type = 'comment' then p_id end);
    return 'removed';
  else
    if p_type = 'post' then update public.posts set status = 'held' where id = p_id;
    else update public.comments set status = 'held' where id = p_id; end if;
    perform private.enqueue(p_type, p_id, v_author, 'ai', p_category, left(p_note, 500));
    return 'held';
  end if;
end $$;

-- Pending content the AI has not looked at yet (for the sweep).
create or replace function public.svc_moderation_pending(p_limit int default 20) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(x), '[]'::jsonb) from (
    select jsonb_build_object('type', 'post', 'id', id) x, created_at from public.posts where status = 'pending'
    union all
    select jsonb_build_object('type', 'comment', 'id', id), created_at from public.comments where status = 'pending'
    order by created_at limit least(coalesce(p_limit, 20), 100)) s
$$;

-- The AI never answered: do not publish blind, hand it to a person.
create or replace function private.release_stale_pending() returns int
language plpgsql set search_path = '' as $$
declare r record; n int := 0;
        cutoff timestamptz := now() - make_interval(mins => private.setting_int('pending_timeout_minutes'));
begin
  for r in update public.posts set status = 'held' where status = 'pending' and created_at < cutoff
           returning id, author_id loop
    perform private.enqueue('post', r.id, r.author_id, 'stale', 'ai-timeout'); n := n + 1;
  end loop;
  for r in update public.comments set status = 'held' where status = 'pending' and created_at < cutoff
           returning id, author_id loop
    perform private.enqueue('comment', r.id, r.author_id, 'stale', 'ai-timeout'); n := n + 1;
  end loop;
  return n;
end $$;

-- ------------------------------------------------------------ push hooks ---
create or replace function public.svc_push_batch(p_limit int default 100) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v jsonb;
begin
  with picked as (
    select n.id from public.notifications n
    where n.pushed_at is null and n.created_at > now() - interval '1 hour'
    order by n.created_at limit least(coalesce(p_limit, 100), 500) for update skip locked
  ), done as (
    update public.notifications n set pushed_at = now() from picked where n.id = picked.id
    returning n.id, n.member_id, n.type, n.post_id
  )
  select coalesce(jsonb_agg(jsonb_build_object('id', d.id, 'type', d.type, 'postId', d.post_id, 'token', t.token)), '[]'::jsonb)
    into v
  from done d join public.push_tokens t on t.member_id = d.member_id;
  return v;
end $$;

create or replace function public.svc_push_forget(p_tokens text[]) returns void
language sql security definer set search_path = '' as $$
  delete from public.push_tokens where token = any(p_tokens)
$$;
