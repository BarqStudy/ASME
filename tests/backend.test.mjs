import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {defaults,validateContent} from '../app/src/lib/content.js';
const db=new PGlite();
const admin='00000000-0000-4000-8000-000000000001';
const visitor='00000000-0000-4000-8000-000000000002';
async function as(role,id,fn){await db.exec(`set role ${role};`);await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id??'']);try{return await fn();}finally{await db.exec('reset role');}}
before(async()=>{
 await db.exec(`create role anon; create role authenticated;
 create schema auth; create schema storage;
 create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema auth to anon,authenticated;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid,bucket_id text);alter table storage.objects enable row level security;
 grant usage on schema storage to anon,authenticated;
 insert into auth.users values('${admin}'),('${visitor}');`);
 await db.exec(await readFile(new URL('../backend/schema.sql',import.meta.url),'utf8'));
 // A second application must not erase tables or require hand-editing policies.
 await db.exec(await readFile(new URL('../backend/schema.sql',import.meta.url),'utf8'));
 await db.query('insert into public.admin_users(user_id) values($1)',[admin]);
});
after(()=>db.close());
test('anonymous users cannot read private applications or grant themselves admin',async()=>{
 await assert.rejects(as('anon',null,()=>db.query('select * from public.applications')));
 await assert.rejects(as('authenticated',visitor,()=>db.query('insert into public.admin_users(user_id) values($1)',[visitor])));
 const rows=await as('authenticated',visitor,()=>db.query('select * from public.applications'));assert.equal(rows.rows.length,0);
 await assert.rejects(as('authenticated',visitor,()=>db.query('select public.publish_content($1::jsonb,null)',[JSON.stringify(defaults)])));
});
test('administrator publishes bilingual data, public reads it, stale revision cannot overwrite it',async()=>{
 const doc=structuredClone(defaults);doc.site.headline.en='Published from test';
 const result=await as('authenticated',admin,()=>db.query('select public.publish_content($1::jsonb,null) result',[JSON.stringify(doc)]));assert.equal(result.rows[0].result.revision,1);
 const published=await as('anon',null,()=>db.query("select data from public.site_content where id='main'"));assert.equal(published.rows[0].data.site.headline.en,'Published from test');
 const conflict=await as('authenticated',admin,()=>db.query('select public.publish_content($1::jsonb,null) result',[JSON.stringify(defaults)]));assert.equal(conflict.rows[0].result.conflict,true);
 await assert.rejects(as('anon',null,()=>db.query("update public.site_content set data='{}'")));
});
test('invalid documents and malformed imports are rejected',async()=>{
 const doc=structuredClone(defaults);doc.events[0].date='invalid';assert.throws(()=>validateContent(doc));
 await assert.rejects(as('authenticated',admin,()=>db.query('select public.publish_content($1::jsonb,1)',[JSON.stringify(doc)])));
 const duplicate=structuredClone(defaults);duplicate.projects.push(duplicate.projects[0]);assert.throws(()=>validateContent(duplicate));
 await assert.rejects(as('authenticated',admin,()=>db.query('select public.publish_content($1::jsonb,1)',[JSON.stringify(duplicate)])));
});
test('anonymous submission validates, deduplicates and hides private data',async()=>{
 const submit=(name,email,event=null)=>as('anon',null,()=>db.query('select public.submit_application($1,$2,$3,$4)',[name,email,'mechanical',event]));
 await assert.rejects(submit('A','bad-email'));
 await submit('Test member','member@example.com');await submit('Test member','MEMBER@example.com');
 const rows=await as('authenticated',admin,()=>db.query('select * from public.applications'));assert.equal(rows.rows.length,1);assert.equal(rows.rows[0].status,'new');
 await assert.rejects(submit('Test member','event@example.com','design-workshop'));
 const document=structuredClone(defaults);document.events[0].example=false;document.events[0].registrationOpen=true;
 await as('authenticated',admin,()=>db.query('select public.publish_content($1::jsonb,1)',[JSON.stringify(document)]));
 await submit('Event member','event@example.com','design-workshop');
 const registrations=await as('authenticated',admin,()=>db.query('select * from public.applications where event_id is not null'));assert.equal(registrations.rows.length,1);
 const id=registrations.rows[0].id;
 await as('authenticated',visitor,()=>db.query("update public.applications set status='accepted' where id=$1",[id]));
 const unchanged=await db.query('select status from public.applications where id=$1',[id]);assert.equal(unchanged.rows[0].status,'new');
 await as('authenticated',admin,()=>db.query("update public.applications set status='accepted' where id=$1",[id]));
 const updated=await db.query('select status from public.applications where id=$1',[id]);assert.equal(updated.rows[0].status,'accepted');
 await assert.rejects(as('authenticated',admin,()=>db.query("update public.applications set email='changed@example.com' where id=$1",[id])));
});
test('storage bucket limits formats and policy only permits administrator uploads',async()=>{
 const bucket=await db.query("select * from storage.buckets where id='club-media'");assert.equal(bucket.rows[0].file_size_limit,3145728);assert.deepEqual(bucket.rows[0].allowed_mime_types,['image/jpeg','image/png','image/webp']);
 await db.exec('grant insert,select on storage.objects to authenticated;');
 await assert.rejects(as('authenticated',visitor,()=>db.query("insert into storage.objects values(gen_random_uuid(),'club-media')")));
 await as('authenticated',admin,()=>db.query("insert into storage.objects values(gen_random_uuid(),'club-media')"));
 await assert.rejects(as('authenticated',admin,()=>db.query("insert into storage.objects values(gen_random_uuid(),'another-bucket')")));
});
test('revoked administrators lose publish access immediately',async()=>{
 await db.query('delete from public.admin_users where user_id=$1',[admin]);
 await assert.rejects(as('authenticated',admin,()=>db.query('select public.publish_content($1::jsonb,2)',[JSON.stringify(defaults)])));
 const rows=await as('authenticated',admin,()=>db.query('select * from public.applications'));assert.equal(rows.rows.length,0);
});
