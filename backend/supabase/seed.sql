-- Demo content so the community is not empty on first launch. OPTIONAL.
-- Run it once in the SQL editor if you want it. Nobody can sign in as these
-- members. Remove all of it at any time with:
--   delete from auth.users where email like '%@demo.wrk.invalid';
do $$
declare
  demo record;
  v_id uuid;
  v_company uuid;
  ids uuid[] := '{}';
  p1 uuid; p2 uuid; p3 uuid; p4 uuid; p5 uuid; p6 uuid; p7 uuid; p8 uuid;
  has_gotrue boolean := exists (select 1 from information_schema.columns
                                where table_schema = 'auth' and table_name = 'users' and column_name = 'aud');
begin
  if exists (select 1 from auth.users where email like '%@demo.wrk.invalid') then
    raise notice 'demo content already present'; return;
  end if;

  for demo in select * from (values
      (1, 'aramco.com',  'قلم هادئ 42'),
      (2, 'aramco.com',  'دفتر صبور 17'),
      (3, 'stc.com.sa',  'مفتاح نبيه 63'),
      (4, 'alrajhibank.com.sa', 'مصباح دقيق 28'),
      (5, 'neom.com',    'سطر متزن 91'),
      (6, 'elm.sa',      'هامش لبق 35')) as t(n, domain, handle)
  loop
    v_id := gen_random_uuid();
    if has_gotrue then
      execute $q$insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                   raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
                 values ('00000000-0000-0000-0000-000000000000', $1, 'authenticated', 'authenticated', $2, '', now(),
                   '{"provider":"email","providers":["email"]}', '{}', now(), now())$q$
        using v_id, 'demo' || demo.n || '@demo.wrk.invalid';
    else
      insert into auth.users (id, email) values (v_id, 'demo' || demo.n || '@demo.wrk.invalid');
    end if;
    select id into v_company from public.companies where domain = demo.domain;
    insert into private.identities (member_id, email_hash) values (v_id, 'demo:' || demo.n);
    insert into public.members (id, handle, company_id, accepted_rules_at, rules_version)
    values (v_id, demo.handle, v_company, now(), 1);
    ids := ids || v_id;
  end loop;

  insert into public.posts (channel, author_id, company_id, body, status, published_at, created_at)
  select 'first-day', m.id, m.company_id, 'أول يوم: وصلت قبل الدوام بنصف ساعة ولقيت المكتب جاهز والبطاقة باسمي. تفصيلة صغيرة لكنها فرقت.', 'published', now(), now() - interval '26 hours'
  from public.members m where m.id = ids[1] returning id into p1;
  insert into public.posts (channel, author_id, company_id, body, status, published_at, created_at)
  select 'salaries', m.id, m.company_id, 'للمقارنة: مهندس برمجيات، خبرة ٤ سنوات، الرياض. الأساسي ١٨ ألف والسكن والنقل فوقها. هل الرقم منطقي عندكم؟', 'published', now(), now() - interval '20 hours'
  from public.members m where m.id = ids[3] returning id into p2;
  insert into public.posts (channel, author_id, company_id, body, status, published_at, created_at)
  select 'interviews', m.id, m.company_id, 'سؤال تكرر علي في ثلاث مقابلات: احكِ عن مرة خالفت فيها رأي مديرك. جهزوا له مثالاً حقيقياً، الإجابة العامة تنكشف بسرعة.', 'published', now(), now() - interval '15 hours'
  from public.members m where m.id = ids[4] returning id into p3;
  insert into public.posts (channel, author_id, company_id, body, status, published_at, created_at)
  select 'culture', m.id, m.company_id, 'عندنا اجتماع الأحد صار عشر دقائق واقفين بدل ساعة جالسين. نفس القرارات، وقت أقل بكثير.', 'published', now(), now() - interval '9 hours'
  from public.members m where m.id = ids[5] returning id into p4;
  insert into public.posts (channel, author_id, company_id, body, status, published_at, created_at)
  select 'advice', m.id, m.company_id, 'نصيحة لأول أسبوع: اكتب كل اسم تسمعه ومعه دور صاحبه. بعد شهر تصير هذه الورقة أهم ملف عندك.', 'published', now(), now() - interval '6 hours'
  from public.members m where m.id = ids[6] returning id into p5;
  insert into public.posts (channel, author_id, company_id, body, status, published_at, created_at)
  select 'all', m.id, m.company_id, 'كم يوم احتجتوا حتى حسّيتوا إنكم فعلاً جزء من الفريق؟ أنا في الأسبوع الثالث وما زلت أسأل عن مكان الطابعة.', 'published', now(), now() - interval '3 hours'
  from public.members m where m.id = ids[2] returning id into p6;
  insert into public.posts (channel, author_id, company_id, body, status, published_at, created_at)
  select 'company', m.id, m.company_id, 'أحد يعرف متى تبدأ دورة التقييم هذا الربع؟', 'published', now(), now() - interval '2 hours'
  from public.members m where m.id = ids[1] returning id into p7;
  insert into public.posts (channel, author_id, company_id, body, status, published_at, created_at)
  select 'salaries', m.id, m.company_id, 'هل الزيادة السنوية عندكم نسبة ثابتة أم مربوطة بالتقييم؟ عندنا مربوطة بالتقييم ومتوسطها ٤٪.', 'published', now(), now() - interval '50 minutes'
  from public.members m where m.id = ids[4] returning id into p8;

  insert into public.comments (post_id, author_id, body, status, published_at, created_at) values
    (p1, ids[3], 'نفس الشعور. البطاقة الجاهزة تقول إنهم كانوا ينتظرونك.', 'published', now(), now() - interval '25 hours'),
    (p1, ids[5], 'عندنا استلمت اللابتوب بعد أسبوع. محظوظ.', 'published', now(), now() - interval '24 hours'),
    (p2, ids[6], 'منطقي لخبرة أربع سنوات. اسأل عن البونص السنوي، يغيّر الصورة.', 'published', now(), now() - interval '19 hours'),
    (p2, ids[1], 'قريب من الأرقام عندنا لنفس المستوى.', 'published', now(), now() - interval '18 hours'),
    (p3, ids[2], 'وسؤال «ليش تركت شغلك السابق» دائماً موجود.', 'published', now(), now() - interval '14 hours'),
    (p6, ids[4], 'ثلاثة أشهر تقريباً. الطابعة أخذت أربعة.', 'published', now(), now() - interval '2 hours'),
    (p6, ids[6], 'أول مرة أحد طلب رأيي في اجتماع. وقتها حسّيت.', 'published', now(), now() - interval '90 minutes'),
    (p7, ids[2], 'الأسبوع الجاي حسب آخر إيميل.', 'published', now(), now() - interval '100 minutes');

  insert into public.post_likes (post_id, member_id) values
    (p1, ids[2]), (p1, ids[3]), (p1, ids[4]), (p2, ids[1]), (p2, ids[5]), (p3, ids[1]), (p3, ids[6]),
    (p4, ids[2]), (p5, ids[1]), (p5, ids[3]), (p5, ids[4]), (p6, ids[5]);
end $$;
