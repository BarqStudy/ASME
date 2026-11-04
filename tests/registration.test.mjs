import {test} from 'node:test';import assert from 'node:assert/strict';
import {defaultRegistration,validateRegistration,validateAnswers} from '../app/src/lib/registration.js';
import {defaults,validateContent} from '../app/src/lib/content.js';
const good={name:'Student engineer',email:'student@nu.edu.sa',major:'mechanical',interests:['design','energy']};
test('membership schema keeps required identity fields and validates unique choices',()=>{
 assert.equal(validateRegistration(defaultRegistration).open,false);const invalid=structuredClone(defaultRegistration);invalid.fields.shift();assert.throws(()=>validateRegistration(invalid));const optional=structuredClone(defaultRegistration);optional.fields[0].required=false;assert.throws(()=>validateRegistration(optional));const duplicate=structuredClone(defaultRegistration);duplicate.fields[2].options.push(duplicate.fields[2].options[0]);assert.throws(()=>validateRegistration(duplicate));
});
test('answer validation trims identity and validates required and multi-choice fields',()=>{
 const answers=validateAnswers(defaultRegistration,{...good,name:'  Student engineer  '});assert.equal(answers.name,'Student engineer');assert.deepEqual(answers.interests,['design','energy']);
 for(const change of [{major:''},{major:'not-a-choice'},{email:'bad email'},{name:'A'},{interests:[]},{interests:['design','design']},{interests:['invalid']},{extra:'unrecognized'}])assert.throws(()=>validateAnswers(defaultRegistration,{...good,...change}));
});
test('all nine question types accept valid values and reject malformed numbers/dates',()=>{
 const form=structuredClone(defaultRegistration);for(const [id,type] of [['notes','textarea'],['score','number'],['day','date'],['confirm','checkbox'],['choice','select']])form.fields.push({id,type,purpose:'',required:true,label:{ar:id,en:id},help:{ar:'',en:''},options:type==='select'?[{id:'first',label:{ar:'الأول',en:'First'}},{id:'second',label:{ar:'الثاني',en:'Second'}}]:[]});
 const answers={...good,notes:'A long answer',score:'1.5',day:'2026-11-20',confirm:true,choice:'first'};assert.equal(validateAnswers(form,answers).score,'1.5');
 for(const change of [{score:'Infinity'},{score:'1e99'},{day:'2026-02-30'},{confirm:false},{choice:'unknown'}])assert.throws(()=>validateAnswers(form,{...answers,...change}));
});
test('old content upgrades to closed registration and editable vision/mission without mutation',()=>{
 const old=structuredClone(defaults);delete old.registration;delete old.site.vision;delete old.site.mission;for(const ev of old.events){delete ev.body;delete ev.category;delete ev.cover;}
 const normalized=validateContent(old);assert.equal(normalized.registration.open,false);assert.ok(normalized.site.vision.ar);assert.ok(normalized.site.mission.en);assert.ok(normalized.events[0].body.ar);assert.equal(old.registration,undefined);
});
