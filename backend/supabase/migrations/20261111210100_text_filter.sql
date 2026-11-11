-- Server-side text filter, Arabic + English. Runs inside the database on every
-- post and comment, so no client can skip it.

-- Fold text to a form where spelling tricks stop working: diacritics and
-- tatweel removed, alef/ya/ta-marbuta variants unified, common digit-for-letter
-- swaps undone, punctuation dropped, stretched letters collapsed.
create or replace function private.normalize_text(t text) returns text
language sql immutable set search_path = '' as $$
  select trim(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          translate(
            regexp_replace(lower(coalesce(t,'')), '[ً-ٰٟـ]', '', 'g'),
            'أإآٱىؤئةکی01345@$',
            'اااايويهكيoieasas'
          ),
          '[^a-zء-ي]+', ' ', 'g'),
        '(.)\1{2,}', '\1', 'g'),
      ' +', ' ', 'g')
  )
$$;

-- second pass used only for matching: letters typed one by one are joined back
-- into a word (a run ends where the script changes)
create or replace function private.join_spelled(t text) returns text
language plpgsql immutable set search_path = '' as $$
declare
  out_text text := '';
  tok text;
  run text := '';
begin
  foreach tok in array string_to_array(t, ' ') loop
    if char_length(tok) = 1 and (run = '' or (tok ~ '[a-z]') = (right(run, 1) ~ '[a-z]')) then
      run := run || tok;
    elsif char_length(tok) = 1 then
      out_text := out_text || ' ' || run; run := tok;
    else
      if run <> '' then out_text := out_text || ' ' || run; run := ''; end if;
      out_text := out_text || ' ' || tok;
    end if;
  end loop;
  if run <> '' then out_text := out_text || ' ' || run; end if;
  return trim(out_text);
end $$;

create or replace function private.ascii_digits(t text) returns text
language sql immutable set search_path = '' as $$
  select translate(coalesce(t,''), '٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹', '01234567890123456789')
$$;

-- A term matches as a whole word. With p_flex, Arabic words may carry the usual
-- attached particles (و ف ب ك ل ال يا) and pronoun/plural endings, and English
-- words the usual endings. Without it only "ال" / "يا" / "و" may be attached.
create or replace function private.term_regex(p_term text, p_lang text, p_flex boolean) returns text
language sql immutable set search_path = '' as $$
  select case
    when p_lang = 'ar' and p_flex
      then ' (و|ف|ب|ك|ل)?(ال|لل|يا|يال|ها)?' || replace(p_term, ' ', ' +') || '(ه|ها|هم|هن|ك|كم|كن|ي|نا|ين|ون|ات)? '
    when p_lang = 'ar'
      then ' (و|يا|ال|وال|يال)?' || replace(p_term, ' ', ' +') || ' '
    when p_flex
      then ' ' || replace(p_term, ' ', ' +') || '(s|es|ed|er|ers|ing|in)? '
    else ' ' || replace(p_term, ' ', ' +') || ' '
  end
$$;

-- Returns verdict 'ok' | 'hold' | 'block' and the category that caused it.
-- block: refused outright (the app shows "filtered").
-- hold : saved but hidden until a moderator looks at it.
create or replace function private.check_text(p_body text, out verdict text, out category text)
language plpgsql stable set search_path = '' as $$
declare
  raw    text := private.ascii_digits(p_body);
  digits text;
  norm   text;
  joined text;
  hit    record;
begin
  verdict := 'ok'; category := null;

  -- personal data: phone numbers, national ID / iqama, IBAN, email addresses
  digits := regexp_replace(raw, '(\d)[\s\-\.\(\)]+(?=\d)', '\1', 'g');
  if digits ~ '(^|\D)(\+?966|00966|0)5\d{8}(\D|$)'
     or digits ~ '(^|\D)[12]\d{9}(\D|$)'
     or upper(regexp_replace(raw, '\s+', '', 'g')) ~ 'SA\d{22}'
     or raw ~* '[a-z0-9._%+\-]+\s*(@|\[at\])\s*[a-z0-9\-]+(\.[a-z0-9\-]+)+' then
    verdict := 'block'; category := 'private-info'; return;
  end if;

  norm := ' ' || private.normalize_text(p_body) || ' ';
  joined := ' ' || private.join_spelled(trim(norm)) || ' ';

  for hit in
    select f.severity, f.category
    from public.filter_terms f
    where (norm ~ private.term_regex(f.term, f.lang, f.flex) or joined ~ private.term_regex(f.term, f.lang, f.flex))
    order by (f.severity = 'block') desc
    limit 1
  loop
    verdict := hit.severity; category := hit.category;
    if verdict = 'block' then return; end if;
  end loop;

  -- links are a spam and doxxing vector: a person looks first
  if verdict = 'ok' and raw ~* '(https?://|www\.|\m[a-z0-9\-]+\.(com|net|org|sa|io|me|ly|co|app|link|xyz)(/|\M))' then
    verdict := 'hold'; category := 'link';
  end if;
end $$;

-- terms are normalised on the way in so the table can be edited in plain text
create or replace function private.filter_terms_normalize() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.term := private.normalize_text(new.term);
  if new.term = '' then return null; end if;
  return new;
end $$;
create trigger filter_terms_normalize before insert or update on public.filter_terms
  for each row execute function private.filter_terms_normalize();
