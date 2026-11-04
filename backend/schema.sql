-- Run in the Supabase SQL editor as the project owner.
-- Re-runnable. No passwords or service-role keys belong in the website.
begin;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists public.site_content (
  id text primary key check (id = 'main'),
  data jsonb not null,
  revision bigint not null default 1,
  updated_at timestamptz not null default now()
);
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  email text not null check (char_length(email) between 3 and 254),
  interest text not null check (interest in ('mechanical','energy','robotics')),
  event_id text,
  status text not null default 'new' check (status in ('new','accepted','rejected')),
  created_at timestamptz not null default now()
);
create unique index if not exists application_email_event on public.applications
  (lower(email), coalesce('event:' || event_id, 'membership'));

alter table public.admin_users enable row level security;
alter table public.site_content enable row level security;
alter table public.applications enable row level security;

revoke all on public.admin_users,public.site_content,public.applications from anon,authenticated;
grant select on public.site_content to anon,authenticated;
grant select on public.admin_users,public.applications to authenticated;
grant update(status) on public.applications to authenticated;

drop policy if exists admin_read_self on public.admin_users;
create policy admin_read_self on public.admin_users for select to authenticated using (user_id=auth.uid());
drop policy if exists public_content on public.site_content;
create policy public_content on public.site_content for select to anon,authenticated using (id='main');
drop policy if exists admin_read_applications on public.applications;
create policy admin_read_applications on public.applications for select to authenticated
 using (exists(select 1 from public.admin_users a where a.user_id=auth.uid()));
drop policy if exists admin_update_applications on public.applications;
create policy admin_update_applications on public.applications for update to authenticated
 using (exists(select 1 from public.admin_users a where a.user_id=auth.uid()))
 with check (exists(select 1 from public.admin_users a where a.user_id=auth.uid()));

create or replace function public.validate_site_document(document jsonb)
returns void language plpgsql set search_path = '' as $$
declare collection text; item jsonb; key text; locale text;
begin
 if document is null or pg_column_size(document)>6000000 or document->>'version' is distinct from '1'
   or jsonb_typeof(document->'site') is distinct from 'object' then raise exception 'Invalid document'; end if;
 foreach key in array array['name','eyebrow','headline','intro','about','cta','announcement'] loop
  foreach locale in array array['ar','en'] loop
   if jsonb_typeof(document->'site'->key->locale) is distinct from 'string'
      or length(document->'site'->key->>locale)>5000 then raise exception 'Invalid bilingual site field'; end if;
  end loop;
 end loop;
 foreach key in array array['logo','email','instagram','linkedin'] loop
  if jsonb_typeof(document->'site'->key) is distinct from 'string' then raise exception 'Invalid site field'; end if;
 end loop;
 if jsonb_typeof(document->'site'->'showExamples') is distinct from 'boolean' then raise exception 'Invalid example visibility'; end if;
 foreach collection in array array['projects','events'] loop
  if jsonb_typeof(document->collection) is distinct from 'array' or jsonb_array_length(document->collection)>100 then raise exception 'Invalid collection'; end if;
  if (select count(*)<>count(distinct value->>'id') from jsonb_array_elements(document->collection)) then raise exception 'Duplicate IDs'; end if;
  for item in select value from jsonb_array_elements(document->collection) loop
   if jsonb_typeof(item->'id') is distinct from 'string' or length(item->>'id') not between 1 and 100
     or jsonb_typeof(item->'published') is distinct from 'boolean' or jsonb_typeof(item->'example') is distinct from 'boolean'
     then raise exception 'Invalid item'; end if;
   foreach key in array array['title','description'] loop
    foreach locale in array array['ar','en'] loop
     if jsonb_typeof(item->key->locale) is distinct from 'string' or length(item->key->>locale)>5000 then raise exception 'Invalid bilingual item'; end if;
    end loop;
   end loop;
   if collection='projects' then
    if coalesce(item->>'category','') not in ('mechanical','energy','robotics') or jsonb_typeof(item->'cover') is distinct from 'string' then raise exception 'Invalid project'; end if;
   else
    if jsonb_typeof(item->'date') is distinct from 'string' or jsonb_typeof(item->'registrationOpen') is distinct from 'boolean' then raise exception 'Invalid event'; end if;
    if item->>'date'<>'' then perform (item->>'date')::timestamp; end if;
    if item ? 'category' and coalesce(item->>'category','') not in ('activity','workshop','competition','visit','talk') then raise exception 'Invalid article category'; end if;
    if item ? 'cover' and jsonb_typeof(item->'cover') is distinct from 'string' then raise exception 'Invalid article image'; end if;
    if item ? 'body' then
     foreach locale in array array['ar','en'] loop
      if jsonb_typeof(item->'body'->locale) is distinct from 'string' or length(item->'body'->>locale)>20000 then raise exception 'Invalid article body'; end if;
     end loop;
    end if;
    foreach locale in array array['ar','en'] loop
     if jsonb_typeof(item->'location'->locale) is distinct from 'string' or length(item->'location'->>locale)>5000 then raise exception 'Invalid location'; end if;
    end loop;
   end if;
  end loop;
 end loop;
 foreach key in array array['vision','mission'] loop
  if document->'site' ? key then
   foreach locale in array array['ar','en'] loop
    if jsonb_typeof(document->'site'->key->locale) is distinct from 'string' or length(document->'site'->key->>locale)>5000 then raise exception 'Invalid club text'; end if;
   end loop;
  end if;
 end loop;
end;
$$;
revoke all on function public.validate_site_document(jsonb) from public,anon,authenticated;

create or replace function public.publish_content(document jsonb, expected_revision bigint)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare current_revision bigint; next_revision bigint;
begin
 if not exists(select 1 from public.admin_users a where a.user_id=auth.uid()) then raise exception 'Administrator required' using errcode='42501'; end if;
 perform public.validate_site_document(document);
 if document ? 'registration' then perform public.validate_registration_form(document->'registration'); end if;
 perform pg_advisory_xact_lock(742831901);
 select revision into current_revision from public.site_content where id='main' for update;
 if current_revision is distinct from expected_revision then return jsonb_build_object('conflict',true); end if;
 next_revision:=coalesce(current_revision,0)+1;
 insert into public.site_content(id,data,revision) values('main',document,next_revision)
 on conflict(id) do update set data=excluded.data,revision=excluded.revision,updated_at=now();
 return jsonb_build_object('revision',next_revision);
end;
$$;
revoke all on function public.publish_content(jsonb,bigint) from public,anon;
grant execute on function public.publish_content(jsonb,bigint) to authenticated;

create or replace function public.submit_application(applicant_name text,applicant_email text,applicant_interest text,event_ref text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
 if event_ref is null then raise exception 'Use the club membership form' using errcode='22023'; end if;
 applicant_name:=btrim(applicant_name);applicant_email:=lower(btrim(applicant_email));
 if applicant_name is null or length(applicant_name) not between 2 and 120 or applicant_email is null or length(applicant_email)>254
   or applicant_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
   or applicant_interest is null or applicant_interest not in ('mechanical','energy','robotics') then raise exception 'Invalid application' using errcode='22023'; end if;
 if event_ref is not null and not exists(
   select 1 from public.site_content c cross join lateral jsonb_array_elements(c.data->'events') ev
   where c.id='main' and ev->>'id'=event_ref and ev->>'published'='true' and ev->>'registrationOpen'='true' and ev->>'example'='false'
 ) then raise exception 'Event registration is closed' using errcode='22023'; end if;
 insert into public.applications(name,email,interest,event_id) values(applicant_name,applicant_email,applicant_interest,event_ref)
 on conflict do nothing;
end;
$$;
revoke all on function public.submit_application(text,text,text,text) from public;
grant execute on function public.submit_application(text,text,text,text) to anon,authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('club-media','club-media',true,3145728,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=true,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists club_admin_upload on storage.objects;
create policy club_admin_upload on storage.objects for insert to authenticated
 with check (bucket_id='club-media' and exists(select 1 from public.admin_users a where a.user_id=auth.uid()));
drop policy if exists club_admin_media_select on storage.objects;
create policy club_admin_media_select on storage.objects for select to authenticated
 using (bucket_id='club-media' and exists(select 1 from public.admin_users a where a.user_id=auth.uid()));
-- Dynamic club membership forms. Existing event registrations keep their own RPC.
alter table public.applications add column if not exists answers jsonb not null default '{}'::jsonb;
alter table public.applications add column if not exists form_snapshot jsonb not null default '{}'::jsonb;
alter table public.applications add column if not exists form_version text;
alter table public.applications add column if not exists consent_at timestamptz;

create or replace function public.validate_registration_form(form jsonb)
returns void language plpgsql set search_path='' as $$
declare question jsonb; option_value jsonb; locale text; key text; field_type text; purpose text;
begin
 if jsonb_typeof(form) is distinct from 'object' or jsonb_typeof(form->'open') is distinct from 'boolean'
 or jsonb_typeof(form->'version') is distinct from 'string' or coalesce(form->>'version','') !~ '^[A-Za-z0-9_-]{1,100}$'
 or jsonb_typeof(form->'fields') is distinct from 'array' then raise exception 'Invalid registration form'; end if;
 if jsonb_array_length(form->'fields') not between 2 and 40 then raise exception 'Invalid question count'; end if;
 foreach key in array array['title','description'] loop
  foreach locale in array array['ar','en'] loop
   if jsonb_typeof(form->key->locale) is distinct from 'string' or length(form->key->>locale)>(case when key='title' then 300 else 5000 end)
   or (key='title' and btrim(form->key->>locale)='') then raise exception 'Invalid form text'; end if;
  end loop;
 end loop;
 if (select count(*)<>count(distinct value->>'id') from jsonb_array_elements(form->'fields')) then raise exception 'Duplicate questions'; end if;
 if (select count(*) from jsonb_array_elements(form->'fields') q where q->>'purpose'='name')<>1
 or (select count(*) from jsonb_array_elements(form->'fields') q where q->>'purpose'='email')<>1 then raise exception 'Name and email required'; end if;
 for question in select value from jsonb_array_elements(form->'fields') loop
  field_type:=question->>'type';purpose:=question->>'purpose';
  if jsonb_typeof(question->'id') is distinct from 'string' or coalesce(question->>'id','') !~ '^[A-Za-z][A-Za-z0-9_-]{0,63}$'
  or coalesce(field_type,'') not in ('text','textarea','email','number','date','radio','select','multiselect','checkbox')
  or purpose is null or purpose not in ('','name','email') or jsonb_typeof(question->'required') is distinct from 'boolean'
  or jsonb_typeof(question->'options') is distinct from 'array' then raise exception 'Invalid question'; end if;
  if purpose<>'' and (question->>'required'<>'true' or field_type<>(case when purpose='email' then 'email' else 'text' end)) then raise exception 'Invalid identity question'; end if;
  foreach key in array array['label','help'] loop
   foreach locale in array array['ar','en'] loop
    if jsonb_typeof(question->key->locale) is distinct from 'string' or length(question->key->>locale)>(case when key='label' then 300 else 1000 end)
    or (key='label' and btrim(question->key->>locale)='') then raise exception 'Invalid question text'; end if;
   end loop;
  end loop;
  if field_type in ('radio','select','multiselect') then
   if jsonb_array_length(question->'options') not between 2 and 20 then raise exception 'Invalid choices'; end if;
   if (select count(*)<>count(distinct value->>'id') from jsonb_array_elements(question->'options')) then raise exception 'Duplicate choices'; end if;
   for option_value in select value from jsonb_array_elements(question->'options') loop
    if jsonb_typeof(option_value->'id') is distinct from 'string' or coalesce(option_value->>'id','') !~ '^[A-Za-z][A-Za-z0-9_-]{0,63}$' then raise exception 'Invalid choice'; end if;
    foreach locale in array array['ar','en'] loop
     if jsonb_typeof(option_value->'label'->locale) is distinct from 'string' or btrim(option_value->'label'->>locale)='' or length(option_value->'label'->>locale)>300 then raise exception 'Invalid choice label'; end if;
    end loop;
   end loop;
  elsif jsonb_array_length(question->'options')<>0 then raise exception 'Unexpected choices'; end if;
 end loop;
end;
$$;
revoke all on function public.validate_registration_form(jsonb) from public,anon,authenticated;

create or replace function public.validate_membership_answers(form jsonb, input jsonb)
returns jsonb language plpgsql set search_path='' as $$
declare question jsonb; value jsonb; selected jsonb; str text; field_type text; purpose text; result jsonb:='{}'::jsonb; answer_key text; empty_answer boolean;
begin
 perform public.validate_registration_form(form);
 if jsonb_typeof(input) is distinct from 'object' or length(input::text)>200000 then raise exception 'Invalid answers'; end if;
 for answer_key in select jsonb_object_keys(input) loop
  if not exists(select 1 from jsonb_array_elements(form->'fields') q where q->>'id'=answer_key) then raise exception 'Unknown question'; end if;
 end loop;
 for question in select q.element from jsonb_array_elements(form->'fields') as q(element) loop
  field_type:=question->>'type';purpose:=question->>'purpose';value:=input->(question->>'id');
  if value is null or value='null'::jsonb then value:=case when field_type='multiselect' then '[]'::jsonb when field_type='checkbox' then 'false'::jsonb else '""'::jsonb end; end if;
  if field_type='multiselect' then
   if jsonb_typeof(value)<>'array' or jsonb_array_length(value)>20 then raise exception 'Invalid multi-choice answer'; end if;
   if (select count(*)<>count(distinct i.element) from jsonb_array_elements(value) as i(element)) then raise exception 'Duplicate answer'; end if;
   for selected in select i.element from jsonb_array_elements(value) as i(element) loop
    if jsonb_typeof(selected)<>'string' or not exists(select 1 from jsonb_array_elements(question->'options') o where o->>'id'=selected#>>'{}') then raise exception 'Invalid choice answer'; end if;
   end loop;
   empty_answer:=jsonb_array_length(value)=0;
  elsif field_type='checkbox' then
   if jsonb_typeof(value)<>'boolean' then raise exception 'Invalid checkbox answer'; end if;empty_answer:=value='false'::jsonb;
  else
   if jsonb_typeof(value)<>'string' then raise exception 'Invalid text answer'; end if;str:=btrim(value#>>'{}');
   if length(str)>(case when purpose='name' then 120 when field_type='email' then 254 when field_type='textarea' then 5000 else 1000 end) then raise exception 'Answer too long'; end if;
   if str<>'' then
    if field_type='email' and str !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Invalid email'; end if;
    if field_type='number' then if str !~ '^-?([0-9]+(\.[0-9]+)?|\.[0-9]+)$' then raise exception 'Invalid number'; end if;perform str::double precision;end if;
    if field_type='date' then if str !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception 'Invalid date'; end if;perform str::date;end if;
    if field_type in ('radio','select') and not exists(select 1 from jsonb_array_elements(question->'options') o where o->>'id'=str) then raise exception 'Invalid choice'; end if;
   end if;
   empty_answer:=str='' or (purpose='name' and length(str)<2);value:=to_jsonb(str);
  end if;
  if question->>'required'='true' and empty_answer then raise exception 'Required answer missing'; end if;
  result:=result||jsonb_build_object(question->>'id',value);
 end loop;
 return result;
end;
$$;
revoke all on function public.validate_membership_answers(jsonb,jsonb) from public,anon,authenticated;

create or replace function public.submit_membership(form_version text, submitted_answers jsonb, consent boolean)
returns void language plpgsql security definer set search_path='' as $$
declare form jsonb; clean jsonb; name_value text; email_value text; submitted_version text:=form_version;
begin
 if consent is distinct from true then raise exception 'Consent is required' using errcode='22023'; end if;
 select data->'registration' into form from public.site_content where id='main' for share;
 if form is null or form->>'open' is distinct from 'true' then raise exception 'Membership registration is closed' using errcode='22023'; end if;
 if form->>'version' is distinct from submitted_version then raise exception 'The registration form changed' using errcode='22023'; end if;
 clean:=public.validate_membership_answers(form,submitted_answers);
 select clean->>(q->>'id') into name_value from jsonb_array_elements(form->'fields') q where q->>'purpose'='name';
 select lower(clean->>(q->>'id')) into email_value from jsonb_array_elements(form->'fields') q where q->>'purpose'='email';
 insert into public.applications(name,email,interest,event_id,answers,form_snapshot,form_version,consent_at)
 values(name_value,email_value,'mechanical',null,clean,form,submitted_version,now()) on conflict do nothing;
end;
$$;
revoke all on function public.submit_membership(text,jsonb,boolean) from public;
grant execute on function public.submit_membership(text,jsonb,boolean) to anon,authenticated;

commit;
