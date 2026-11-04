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
    foreach locale in array array['ar','en'] loop
     if jsonb_typeof(item->'location'->locale) is distinct from 'string' or length(item->'location'->>locale)>5000 then raise exception 'Invalid location'; end if;
    end loop;
   end if;
  end loop;
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
commit;
