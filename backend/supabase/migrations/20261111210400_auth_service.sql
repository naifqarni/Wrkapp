-- wrk. community: sign-in with a work email, without keeping the email.
--
-- The edge functions never hand the address to the database. They compute
--   email_hash = HMAC-SHA256(secret pepper, normalised email)
-- and pass only that hash plus the domain part. The pepper lives in the edge
-- function's secrets, so the database alone cannot be used to test addresses.
-- These functions are callable by the service role only.

-- aramco.com from mail.aramco.com, stc.com.sa from hq.stc.com.sa
create or replace function private.registrable_domain(p_domain text) returns text
language plpgsql immutable set search_path = '' as $$
declare
  labels text[] := string_to_array(lower(btrim(p_domain)), '.');
  n int := array_length(labels, 1);
  second_level text[] := array['com','net','org','gov','edu','med','sch','pub','co','ac','mil'];
begin
  if n is null or n < 2 then return lower(btrim(p_domain)); end if;
  if n >= 3 and char_length(labels[n]) = 2 and labels[n-1] = any(second_level) then
    return labels[n-2] || '.' || labels[n-1] || '.' || labels[n];
  end if;
  return labels[n-1] || '.' || labels[n];
end $$;

-- 'ok' | 'free-mail' | 'forbidden'
create or replace function private.domain_verdict(p_domain text) returns text
language plpgsql stable set search_path = '' as $$
declare d text := lower(btrim(p_domain)); r text := private.registrable_domain(p_domain);
begin
  if d !~ '^([a-z0-9]([a-z0-9\-]*[a-z0-9])?\.)+[a-z]{2,}$' then return 'invalid-email'; end if;
  if exists (select 1 from public.blocked_email_domains b
             where b.domain in (d, r)                         -- listed domain
                or (position('.' in b.domain) = 0 and b.domain = split_part(r, '.', 1)))  -- brand: gmail.*, yahoo.*
  then return 'free-mail'; end if;
  if exists (select 1 from public.companies c
             left join private.company_domains cd on cd.company_id = c.id
             where c.status = 'blocked' and (c.domain = r or cd.domain in (d, r))) then
    return 'forbidden';
  end if;
  return 'ok';
end $$;

create or replace function private.company_for_domain(p_domain text) returns uuid
language plpgsql set search_path = '' as $$
declare d text := lower(btrim(p_domain)); r text := private.registrable_domain(p_domain); v uuid;
begin
  select company_id into v from private.company_domains where domain = d;
  if v is null then select company_id into v from private.company_domains where domain = r; end if;
  if v is null then select id into v from public.companies where domain = r; end if;
  if v is null then
    insert into public.companies (domain, name) values (r, r)
    on conflict (domain) do update set domain = excluded.domain returning id into v;
  end if;
  return v;
end $$;

-- Step 1: may we send a code to this address?
create or replace function public.svc_start_email_challenge(p_email_hash text, p_domain text, p_code_hash text,
                                                            p_ip_hash text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_verdict text := private.domain_verdict(p_domain); v_company text;
begin
  if v_verdict <> 'ok' then return jsonb_build_object('ok', false, 'error', v_verdict); end if;
  if exists (select 1 from private.banned_identities where email_hash = p_email_hash) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  -- one code a minute, 3 per 15 minutes, 10 a day per address; 20 an hour per network address
  if exists (select 1 from private.email_challenges where email_hash = p_email_hash and created_at > now() - interval '60 seconds')
     or (select count(*) from private.email_challenges where email_hash = p_email_hash and created_at > now() - interval '15 minutes') >= 3
     or (select count(*) from private.email_challenges where email_hash = p_email_hash and created_at > now() - interval '1 day') >= 10
     or (p_ip_hash is not null and
         (select count(*) from private.email_challenges where ip_hash = p_ip_hash and created_at > now() - interval '1 hour') >= 20)
  then
    return jsonb_build_object('ok', false, 'error', 'rate-limited');
  end if;

  update private.email_challenges set consumed_at = now() where email_hash = p_email_hash and consumed_at is null;
  insert into private.email_challenges (email_hash, domain, code_hash, ip_hash, expires_at)
  values (p_email_hash, lower(btrim(p_domain)), p_code_hash, p_ip_hash, now() + interval '10 minutes');

  select c.name into v_company from public.companies c
   where c.domain = private.registrable_domain(p_domain);
  return jsonb_build_object('ok', true, 'expiresInSeconds', 600, 'companyName', v_company);
end $$;

-- Step 2: is the code right? Five wrong tries burn the code.
create or replace function public.svc_verify_email_challenge(p_email_hash text, p_code_hash text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare ch private.email_challenges; v_member uuid;
begin
  select * into ch from private.email_challenges
   where email_hash = p_email_hash and consumed_at is null and expires_at > now()
   order by created_at desc limit 1 for update;
  if ch.id is null then return jsonb_build_object('ok', false, 'error', 'bad-code'); end if;
  if ch.code_hash <> p_code_hash then
    update private.email_challenges
       set attempts = attempts + 1, consumed_at = case when attempts + 1 >= 5 then now() end
     where id = ch.id;
    return jsonb_build_object('ok', false, 'error', 'bad-code');
  end if;
  update private.email_challenges set consumed_at = now() where id = ch.id;
  if exists (select 1 from private.banned_identities where email_hash = p_email_hash) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  select member_id into v_member from private.identities where email_hash = p_email_hash;
  return jsonb_build_object('ok', true, 'memberId', v_member, 'domain', ch.domain);
end $$;

-- Step 3: attach the verified identity to an auth user (new member) or refresh
-- the verification date (returning member). Refuses unless a code for this hash
-- was confirmed in the last five minutes.
create or replace function public.svc_complete_signin(p_user_id uuid, p_email_hash text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare ch private.email_challenges; v_member uuid; m public.members;
begin
  select * into ch from private.email_challenges
   where email_hash = p_email_hash and consumed_at > now() - interval '5 minutes' and attempts < 5
   order by consumed_at desc limit 1;
  if ch.id is null then return jsonb_build_object('ok', false, 'error', 'bad-code'); end if;

  select member_id into v_member from private.identities where email_hash = p_email_hash;
  if v_member is null then
    if p_user_id is null then return jsonb_build_object('ok', false, 'error', 'unknown'); end if;
    insert into private.identities (member_id, email_hash) values (p_user_id, p_email_hash);
    insert into public.members (id, handle, company_id)
    values (p_user_id, private.gen_handle(), private.company_for_domain(ch.domain))
    returning * into m;
  else
    update public.members set verified_at = now() where id = v_member returning * into m;
    if m.status = 'banned' then return jsonb_build_object('ok', false, 'error', 'forbidden'); end if;
  end if;
  return jsonb_build_object('ok', true, 'memberId', m.id, 'isNew', v_member is null);
end $$;
