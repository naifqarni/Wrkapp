-- wrk. community: reference data the product cannot work without.
-- All three lists are ordinary tables: add or remove rows any time.

-- 1. Personal and throw-away mail. A row without a dot is a brand and matches
--    every country version (yahoo -> yahoo.com, yahoo.fr, yahoo.co.uk ...).
insert into public.blocked_email_domains (domain, kind) values
  ('gmail','free'),('googlemail','free'),('hotmail','free'),('outlook','free'),('live','free'),('msn','free'),
  ('windowslive','free'),('yahoo','free'),('ymail','free'),('rocketmail','free'),('icloud','free'),
  ('protonmail','free'),('proton','free'),('yandex','free'),('gmx','free'),('aol','free'),('zohomail','free'),
  ('tutanota','free'),('tutamail','free'),('fastmail','free'),('hushmail','free'),('mail','free'),
  ('me.com','free'),('mac.com','free'),('pm.me','free'),('tuta.io','free'),('tuta.com','free'),('hey.com','free'),
  ('zoho.com','free'),('mail.ru','free'),('inbox.ru','free'),('bk.ru','free'),('list.ru','free'),
  ('qq.com','free'),('163.com','free'),('126.com','free'),('sina.com','free'),('naver.com','free'),
  ('daum.net','free'),('rediffmail.com','free'),('inbox.com','free'),('email.com','free'),('usa.com','free'),
  ('consultant.com','free'),('engineer.com','free'),('post.com','free'),('europe.com','free'),
  ('maktoob.com','free'),('gawab.com','free'),('duck.com','free'),('skiff.com','free'),('mailfence.com','free'),
  ('posteo.de','free'),('web.de','free'),('t-online.de','free'),('orange.fr','free'),('free.fr','free'),
  ('laposte.net','free'),('libero.it','free'),('seznam.cz','free'),('wp.pl','free'),('o2.pl','free'),
  ('comcast.net','free'),('verizon.net','free'),('att.net','free'),('sbcglobal.net','free'),('cox.net','free'),
  ('btinternet.com','free'),('sky.com','free'),('shaw.ca','free'),('rogers.com','free'),
  ('privaterelay.appleid.com','free'),('mozmail.com','free'),('relay.firefox.com','free'),
  ('simplelogin.com','free'),('simplelogin.co','free'),('anonaddy.com','free'),('addy.io','free'),('33mail.com','free'),
  ('mailinator','disposable'),('guerrillamail','disposable'),('yopmail','disposable'),('10minutemail','disposable'),
  ('tempmail','disposable'),('temp-mail','disposable'),('trashmail','disposable'),('sharklasers.com','disposable'),
  ('grr.la','disposable'),('getnada.com','disposable'),('nada.email','disposable'),('dispostable.com','disposable'),
  ('throwawaymail.com','disposable'),('maildrop.cc','disposable'),('mohmal.com','disposable'),
  ('emailondeck.com','disposable'),('fakeinbox.com','disposable'),('mintemail.com','disposable'),
  ('moakt.com','disposable'),('mailnesia.com','disposable'),('spamgourmet.com','disposable'),
  ('tmpmail.org','disposable'),('tmpmail.net','disposable'),('tempmailo.com','disposable'),
  ('burnermail.io','disposable'),('mailcatch.com','disposable'),('getairmail.com','disposable'),
  ('tempinbox.com','disposable'),('mytemp.email','disposable'),('emailfake.com','disposable'),
  ('1secmail.com','disposable'),('1secmail.org','disposable'),('1secmail.net','disposable'),
  ('minuteinbox.com','disposable'),('tempr.email','disposable'),('discard.email','disposable'),
  ('mailsac.com','disposable'),('inboxkitten.com','disposable'),('harakirimail.com','disposable'),
  ('spam4.me','disposable'),('byom.de','disposable'),('trbvm.com','disposable'),('dropmail.me','disposable')
on conflict (domain) do nothing;

-- 2. Known employers, so members see a proper name instead of a domain. Any
--    other work domain still works: the company is created on first sign-in
--    with the domain as its name, and a moderator can rename it.
insert into public.companies (domain, name, sector) values
  ('aramco.com','أرامكو السعودية','الطاقة'),
  ('sabic.com','سابك','البتروكيماويات'),
  ('maaden.com.sa','معادن','التعدين'),
  ('se.com.sa','السعودية للكهرباء','الطاقة'),
  ('acwapower.com','أكوا باور','الطاقة'),
  ('stc.com.sa','stc','الاتصالات'),
  ('mobily.com.sa','موبايلي','الاتصالات'),
  ('zain.com','زين','الاتصالات'),
  ('alrajhibank.com.sa','مصرف الراجحي','البنوك'),
  ('snb.com','البنك الأهلي السعودي','البنوك'),
  ('riyadbank.com','بنك الرياض','البنوك'),
  ('sab.com','البنك السعودي الأول','البنوك'),
  ('alinma.com','مصرف الإنماء','البنوك'),
  ('anb.com.sa','البنك العربي الوطني','البنوك'),
  ('bankalbilad.com','بنك البلاد','البنوك'),
  ('pif.gov.sa','صندوق الاستثمارات العامة','الاستثمار'),
  ('neom.com','نيوم','المشاريع الكبرى'),
  ('redseaglobal.com','البحر الأحمر الدولية','المشاريع الكبرى'),
  ('qiddiya.com','القدية','المشاريع الكبرى'),
  ('roshn.sa','روشن','التطوير العقاري'),
  ('saudia.com','الخطوط السعودية','الطيران'),
  ('flynas.com','طيران ناس','الطيران'),
  ('riyadhair.com','طيران الرياض','الطيران'),
  ('almarai.com','المراعي','الأغذية'),
  ('jarir.com','جرير','التجزئة'),
  ('noon.com','نون','التجارة الإلكترونية'),
  ('careem.com','كريم','التقنية'),
  ('elm.sa','علم','التقنية'),
  ('thiqah.sa','ثقة','التقنية'),
  ('sdaia.gov.sa','سدايا','القطاع الحكومي'),
  ('tamara.co','تمارا','التقنية المالية'),
  ('tabby.ai','تابي','التقنية المالية'),
  ('jahez.net','جاهز','التقنية'),
  ('tawuniya.com','التعاونية','التأمين'),
  ('bupa.com.sa','بوبا العربية','التأمين'),
  ('moh.gov.sa','وزارة الصحة','القطاع الحكومي'),
  ('kfshrc.edu.sa','مستشفى الملك فيصل التخصصي','الصحة'),
  ('kaust.edu.sa','كاوست','التعليم والبحث'),
  ('kfupm.edu.sa','جامعة الملك فهد للبترول والمعادن','التعليم والبحث'),
  ('ksu.edu.sa','جامعة الملك سعود','التعليم والبحث')
on conflict (domain) do nothing;

-- 3. Word list for the automatic filter. block = refused, hold = saved but
--    hidden until a moderator approves. Insults that also have an innocent
--    meaning, and words that accuse someone of a crime, are "hold": a person
--    decides. flex = false for short words that are part of ordinary words or
--    names when endings are attached.
insert into public.filter_terms (term, lang, severity, category, flex) values
  -- Arabic: vulgar / sexual
  ('شرموط','ar','block','sexual',true),('شرموطة','ar','block','sexual',true),('شراميط','ar','block','sexual',true),
  ('قحبة','ar','block','sexual',true),('قحاب','ar','block','sexual',true),('عاهرة','ar','block','sexual',true),
  ('عاهر','ar','block','sexual',false),('منيوك','ar','block','sexual',true),('منيك','ar','block','sexual',false),
  ('متناك','ar','block','sexual',true),('نيك','ar','block','sexual',false),('انيك','ar','block','sexual',true),
  ('زب','ar','block','sexual',false),('زبي','ar','block','sexual',false),('زبك','ar','block','sexual',false),
  ('كس','ar','block','sexual',false),('كسك','ar','block','sexual',false),('كسمك','ar','block','sexual',true),
  ('كس امك','ar','block','sexual',true),('كس اختك','ar','block','sexual',true),('طيز','ar','block','sexual',true),
  ('خول','ar','block','sexual',false),('خولات','ar','block','sexual',false),('لوطي','ar','block','sexual',true),
  ('ديوث','ar','block','sexual',true),('عرص','ar','block','sexual',false),('معرص','ar','block','sexual',true),
  ('مخنث','ar','block','sexual',true),('ممحون','ar','block','sexual',true),('ممحونة','ar','block','sexual',true),
  ('سكس','ar','block','sexual',true),('اباحي','ar','hold','sexual',true),
  -- Arabic: curses and family insults
  ('يلعن','ar','block','harassment',true),('ملعون','ar','hold','harassment',true),('لعنة الله','ar','block','harassment',true),
  ('ابن الكلب','ar','block','harassment',true),('ابن كلب','ar','block','harassment',true),
  ('ولد الكلب','ar','block','harassment',true),('بنت الكلب','ar','block','harassment',true),
  ('ابن الحرام','ar','block','harassment',true),('ولد الحرام','ar','block','harassment',true),
  ('ابن حرام','ar','block','harassment',true),('ابن الزنا','ar','block','harassment',true),
  ('ولد زنا','ar','block','harassment',true),('ابن العاهرة','ar','block','harassment',true),
  ('ابن القحبة','ar','block','harassment',true),('تفو','ar','hold','harassment',false),
  ('خرا','ar','hold','harassment',false),('زق','ar','hold','harassment',false),
  -- Arabic: threats
  ('بقتلك','ar','block','harassment',true),('اقتلك','ar','block','harassment',true),('بذبحك','ar','block','harassment',true),
  ('اذبحك','ar','block','harassment',true),('بكسر راسك','ar','block','harassment',true),('راح اقتلك','ar','block','harassment',true),
  ('انتحر','ar','hold','harassment',false),
  -- Arabic: insults that a person should look at
  ('كلب','ar','hold','harassment',true),('كلاب','ar','hold','harassment',true),('حمار','ar','hold','harassment',true),
  ('حمير','ar','hold','harassment',true),('حيوان','ar','hold','harassment',true),('حيوانات','ar','hold','harassment',false),
  ('بهيمة','ar','hold','harassment',true),('تيس','ar','hold','harassment',false),('خنزير','ar','hold','harassment',true),
  ('حقير','ar','hold','harassment',true),('سافل','ar','hold','harassment',true),('واطي','ar','hold','harassment',true),
  ('نذل','ar','hold','harassment',true),('منحط','ar','hold','harassment',true),('حثالة','ar','hold','harassment',true),
  ('زبالة','ar','hold','harassment',true),('قذر','ar','hold','harassment',true),('وسخ','ar','hold','harassment',true),
  ('معفن','ar','hold','harassment',true),('غبي','ar','hold','harassment',true),('اغبياء','ar','hold','harassment',false),
  ('متخلف','ar','hold','harassment',true),('معاق','ar','hold','harassment',true),('حقراء','ar','hold','harassment',false),
  -- Arabic: accusations of a crime (defamation risk under the Anti-Cyber Crime Law)
  ('حرامي','ar','hold','defamation',true),('حرامية','ar','hold','defamation',false),('لص','ar','hold','defamation',false),
  ('لصوص','ar','hold','defamation',false),('نصاب','ar','hold','defamation',true),('محتال','ar','hold','defamation',true),
  ('مرتشي','ar','hold','defamation',true),('رشوة','ar','hold','defamation',true),('مختلس','ar','hold','defamation',true),
  ('اختلاس','ar','hold','defamation',true),('فاسد','ar','hold','defamation',true),('متحرش','ar','hold','defamation',true),
  ('تحرش','ar','hold','defamation',true),('مزور','ar','hold','defamation',true),('تزوير','ar','hold','defamation',true),
  -- Arabic: sectarian, racist and takfir
  ('رافضي','ar','block','hate',true),('روافض','ar','block','hate',true),('رافضة','ar','block','hate',true),
  ('ناصبي','ar','block','hate',true),('نواصب','ar','block','hate',true),('مجوسي','ar','block','hate',true),
  ('مجوس','ar','block','hate',false),('زنجي','ar','block','hate',true),('زنوج','ar','block','hate',false),
  ('طرش بحر','ar','block','hate',true),('بقايا حجاج','ar','block','hate',true),('عبيد','ar','hold','hate',false),
  ('كافر','ar','hold','hate',true),('كفار','ar','hold','hate',false),('زنديق','ar','hold','hate',true),
  ('مرتد','ar','hold','hate',true),('ملحد','ar','hold','hate',true),
  -- Arabic written in Latin letters
  ('sharmoota','en','block','sexual',true),('sharmouta','en','block','sexual',true),('sharmuta','en','block','sexual',true),
  ('sharmota','en','block','sexual',true),('kosomak','en','block','sexual',false),('kos omak','en','block','sexual',false),
  ('kos emak','en','block','sexual',false),('kess emak','en','block','sexual',false),('kos ommak','en','block','sexual',false),
  ('khawal','en','block','sexual',true),('manyak','en','block','sexual',true),('manyook','en','block','sexual',true),
  ('ya kalb','en','hold','harassment',false),('ibn el kalb','en','block','harassment',false),
  ('ibn kalb','en','block','harassment',false),('yel3an','en','block','harassment',false),('yelan abok','en','block','harassment',false),
  -- English: vulgar / sexual
  ('fuck','en','block','sexual',true),('fuk','en','block','sexual',true),('fck','en','block','sexual',true),
  ('motherfucker','en','block','sexual',true),('motherfuck','en','block','sexual',true),('fuckface','en','block','harassment',true),
  ('fuckhead','en','block','harassment',true),('cunt','en','block','sexual',true),('pussy','en','block','sexual',false),
  ('cock','en','hold','sexual',false),('cocksucker','en','block','sexual',true),('dick','en','hold','sexual',false),
  ('dickhead','en','block','harassment',true),('blowjob','en','block','sexual',true),('handjob','en','block','sexual',true),
  ('dildo','en','block','sexual',true),('jerk off','en','block','sexual',false),('whore','en','block','sexual',true),
  ('slut','en','block','sexual',true),('porn','en','hold','sexual',true),('nudes','en','hold','sexual',false),
  ('bitch','en','hold','harassment',true),('bastard','en','hold','harassment',true),('asshole','en','hold','harassment',true),
  ('arsehole','en','hold','harassment',true),('wanker','en','hold','harassment',true),('twat','en','hold','harassment',true),
  ('scumbag','en','hold','harassment',true),('moron','en','hold','harassment',true),('idiot','en','hold','harassment',true),
  ('stfu','en','hold','harassment',false),('retard','en','block','hate',true),('retarded','en','block','hate',false),
  -- English: threats and self-harm baiting
  ('kill yourself','en','block','harassment',false),('kys','en','block','harassment',false),
  ('i will kill you','en','block','harassment',false),('ill kill you','en','block','harassment',false),
  ('i will find you','en','hold','harassment',false),('rape','en','hold','harassment',true),('rapist','en','hold','defamation',true),
  -- English: slurs
  ('nigger','en','block','hate',true),('nigga','en','block','hate',true),('faggot','en','block','hate',true),
  ('fag','en','block','hate',false),('kike','en','block','hate',true),('chink','en','block','hate',true),
  ('paki','en','block','hate',true),('raghead','en','block','hate',true),('towelhead','en','block','hate',true),
  ('sandnigger','en','block','hate',true),('camel jockey','en','block','hate',true),('tranny','en','block','hate',true),
  ('spic','en','block','hate',false),('wetback','en','block','hate',true),('coon','en','block','hate',false),
  -- English: accusations of a crime
  ('thief','en','hold','defamation',false),('thieves','en','hold','defamation',false),('fraudster','en','hold','defamation',true),
  ('scammer','en','hold','defamation',true),('embezzle','en','hold','defamation',true),('embezzlement','en','hold','defamation',false),
  ('bribe','en','hold','defamation',true),('bribery','en','hold','defamation',false),('corrupt','en','hold','defamation',false),
  ('harasser','en','hold','defamation',true),('molester','en','hold','defamation',true),('pedophile','en','hold','defamation',true)
on conflict (term, lang) do nothing;
