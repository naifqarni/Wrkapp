-- wrk. community: who may call what. Nothing else is reachable.
do $$
declare
  f record;
  signed_out text[] := array['list_channels','list_posts','get_post','list_comments','me'];
  signed_in  text[] := array['accept_rules','update_me','list_my_posts','create_post','delete_post',
    'create_comment','delete_comment','set_like','list_notifications','unread_notification_count',
    'mark_notifications_read','register_push_token','unregister_push_token','block_user','unblock_user',
    'list_blocked','report','export_my_data','delete_my_account',
    'mod_list_queue','mod_claim','mod_resolve','mod_update_company','mod_list_companies'];
  service    text[] := array['svc_start_email_challenge','svc_verify_email_challenge','svc_complete_signin',
    'svc_moderation_fetch','svc_moderation_apply','svc_moderation_pending','svc_push_batch','svc_push_forget'];
begin
  for f in select p.oid::regprocedure as sig, p.proname
           from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname = any(signed_out || signed_in || service)
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    if f.proname = any(signed_out) then
      execute format('grant execute on function %s to anon, authenticated, service_role', f.sig);
    elsif f.proname = any(signed_in) then
      -- anon may call these too: each one answers 'not-verified' itself when nobody is signed in
      execute format('grant execute on function %s to anon, authenticated, service_role', f.sig);
    else
      execute format('grant execute on function %s to service_role', f.sig);
    end if;
  end loop;
  -- internal helpers: nobody but the owner
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'private'
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
  end loop;
end $$;
revoke all on schema private from anon, authenticated;
