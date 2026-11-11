-- wrk. community: the member's PDPL rights (access, erasure) and data retention.

-- Everything we hold about the signed-in member, in one document.
create or replace function public.export_my_data() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v public.members := private.viewer('member');
begin
  return jsonb_build_object(
    'exportedAt', private.ts(now()),
    'note', 'wrk. does not store your email address, name or phone number. Your account is linked to a one-way keyed hash of your work email and to your company domain.',
    'profile', private.me_json(v) || jsonb_build_object(
        'companyDomain', (select domain from public.companies where id = v.company_id),
        'joinedAt', private.ts(v.created_at), 'verifiedAt', private.ts(v.verified_at), 'status', v.status),
    'posts', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'channel', channel, 'body', body,
                'status', status, 'createdAt', private.ts(created_at)) order by created_at)
              from public.posts where author_id = v.id), '[]'::jsonb),
    'comments', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'postId', post_id, 'body', body,
                'status', status, 'createdAt', private.ts(created_at)) order by created_at)
              from public.comments where author_id = v.id), '[]'::jsonb),
    'likes', coalesce((select jsonb_agg(jsonb_build_object('postId', post_id, 'createdAt', private.ts(created_at)))
              from public.post_likes where member_id = v.id), '[]'::jsonb),
    'blocked', coalesce((select jsonb_agg(jsonb_build_object('userId', blocked_id, 'createdAt', private.ts(created_at)))
              from public.blocks where blocker_id = v.id), '[]'::jsonb),
    'reportsIMade', coalesce((select jsonb_agg(jsonb_build_object('targetType', target_type, 'targetId', target_id,
                'reason', reason, 'note', note, 'status', status, 'createdAt', private.ts(created_at)))
              from public.reports where reporter_id = v.id), '[]'::jsonb),
    'notifications', coalesce((select jsonb_agg(jsonb_build_object('type', type, 'postId', post_id,
                'createdAt', private.ts(created_at), 'read', read_at is not null))
              from public.notifications where member_id = v.id), '[]'::jsonb),
    'pushDevices', (select count(*) from public.push_tokens where member_id = v.id));
end $$;

-- Erasure: the account, the identity hash, every post, comment, like, block,
-- notification and push token go, immediately and for good. Reports the member
-- filed stay without their author. A ban record (hash only) survives so a
-- banned identity cannot return by deleting and signing up again.
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
declare v_id uuid := auth.uid();
begin
  if v_id is null then perform private.fail('not-verified'); end if;
  update public.moderation_items set state = 'dismissed', action = 'account-deleted', resolved_at = now()
   where target_author = v_id and state in ('open','in_review');
  update public.reports set status = 'resolved', resolved_at = now()
   where status = 'open' and item_id in (select id from public.moderation_items where target_author = v_id);
  delete from auth.users where id = v_id;   -- cascades to everything the member owns
end $$;

-- when something is taken down, note when (drives the purge below)
create or replace function private.stamp_removed() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.status = 'removed' and old.status is distinct from 'removed' then new.removed_at := now();
  elsif new.status <> 'removed' then new.removed_at := null; end if;
  return new;
end $$;
create trigger posts_stamp_removed before update of status on public.posts
  for each row execute function private.stamp_removed();
create trigger comments_stamp_removed before update of status on public.comments
  for each row execute function private.stamp_removed();

-- Housekeeping, run every few minutes by pg_cron (see the end of this file).
create or replace function private.run_retention() returns jsonb
language plpgsql set search_path = '' as $$
declare a int; b int; c int; d int; e int; f int;
begin
  a := private.release_stale_pending();
  -- sign-in codes and the network-address hashes that came with them: one day
  delete from private.email_challenges where created_at < now() - interval '1 day';
  get diagnostics b = row_count;
  -- removed content is kept 90 days for appeals and lawful requests, then destroyed
  delete from public.posts where status = 'removed' and removed_at < now() - interval '90 days';
  get diagnostics c = row_count;
  delete from public.comments where status = 'removed' and removed_at < now() - interval '90 days';
  get diagnostics d = row_count;
  delete from public.notifications where created_at < now() - interval '90 days';
  get diagnostics e = row_count;
  -- closed reports: after 180 days forget who reported and what they wrote
  update public.reports set reporter_id = null, note = null
   where status = 'resolved' and resolved_at < now() - interval '180 days' and (reporter_id is not null or note is not null);
  -- closed moderation cases and their audit trail: one year
  delete from public.moderation_actions where created_at < now() - interval '1 year';
  delete from public.moderation_items where state in ('actioned','dismissed') and resolved_at < now() - interval '1 year';
  get diagnostics f = row_count;
  update public.members set status = 'active', suspended_until = null
   where status = 'suspended' and suspended_until is not null and suspended_until <= now();
  return jsonb_build_object('staleToReview', a, 'codes', b, 'posts', c, 'comments', d, 'notifications', e, 'cases', f);
end $$;

-- Schedule it where pg_cron exists (it does on Supabase). On a plain
-- PostgreSQL this block quietly does nothing.
do $$
begin
  begin
    create extension if not exists pg_cron;
  exception when others then
    raise notice 'pg_cron not available here: schedule private.run_retention() yourself';
    return;
  end;
  perform cron.schedule('wrk-retention', '*/5 * * * *', 'select private.run_retention()');
exception when others then
  raise notice 'could not schedule retention: %', sqlerrm;
end $$;
