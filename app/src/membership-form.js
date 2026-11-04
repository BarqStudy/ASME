import {t,text} from './lib/i18n';
import {escape as e} from './lib/content';
import {validateAnswers} from './lib/registration';
export function membershipFormHTML(reg,{preview=false,offline=false}={}){
 const fields=reg.fields.map((f,index)=>{
  const label=`${e(text(f.label))}${f.required?' <span class="required-mark">*</span>':''}`,name=`answer_${f.id}`,required=f.required?'required':'',help=text(f.help);
  let input='';
  if(f.type==='textarea')input=`<textarea name="${name}" rows="4" maxlength="5000" ${required}></textarea>`;
  else if(f.type==='select')input=`<select name="${name}" ${required}><option value="">${t('chooseAnswer')}</option>${f.options.map(o=>`<option value="${e(o.id)}">${e(text(o.label))}</option>`).join('')}</select>`;
  else if(['radio','multiselect'].includes(f.type))input=`<div class="question-options">${f.options.map(o=>`<label><input name="${name}" type="${f.type==='radio'?'radio':'checkbox'}" value="${e(o.id)}" ${f.type==='radio'?required:''}><span>${e(text(o.label))}</span></label>`).join('')}</div>`;
  else if(f.type==='checkbox')input=`<label class="check-label"><input name="${name}" type="checkbox" ${required}><span>${t('confirmChoice')}</span></label>`;
  else input=`<input name="${name}" type="${f.type}" ${f.type==='number'?'step="any"':''} maxlength="${f.purpose==='name'?120:f.type==='email'?254:1000}" ${f.type==='email'?'dir="ltr" autocomplete="email"':f.purpose==='name'?'autocomplete="name"':''} ${required}>`;
  const grouped=['radio','multiselect','checkbox'].includes(f.type);
  return `<fieldset class="question-block" data-question="${e(f.id)}"><legend><span>${String(index+1).padStart(2,'0')}</span>${grouped?label:`<label for="input_${e(f.id)}">${label}</label>`}</legend>${help?`<p class="question-help">${e(help)}</p>`:''}${input.replace('<input name=',`<input id="input_${e(f.id)}" name=`).replace('<textarea name=',`<textarea id="input_${e(f.id)}" name=`).replace('<select name=',`<select id="input_${e(f.id)}" name=`)}<p class="question-error" id="error_${e(f.id)}" hidden></p></fieldset>`;
 }).join('');
 return `<form id="membership-form" class="membership-form" data-form-version="${e(reg.version)}"><div class="membership-form-intro"><span class="eyebrow">ASME / ${preview?t('previewAction'):t('join')}</span><h1>${e(text(reg.title))}</h1><p>${e(text(reg.description))}</p>${preview?`<p class="form-preview-banner">${t('formPreviewOnly')}</p>`:''}${offline&&!preview?`<p class="form-offline-note">${t('notConnected')}</p>`:''}</div>${fields}<div class="question-block privacy-block"><p>${t('privacy')}</p><label class="check-label"><input id="membership-consent" type="checkbox" required><span>${t('consent')}</span></label></div><div class="membership-submit"><button class="primary" type="submit" ${offline&&!preview?'disabled':''}>${preview?t('testForm'):t('submit')}</button><p role="status" class="form-message"></p></div></form>`;
}
export function bindMembershipForm(form,reg,{submit,success}){
 form.addEventListener('submit',async event=>{
  event.preventDefault();form.querySelectorAll('.question-error').forEach(el=>el.hidden=true);form.querySelectorAll('[aria-invalid]').forEach(el=>el.removeAttribute('aria-invalid'));
  const raw=new FormData(form),values={};for(const field of reg.fields){const name=`answer_${field.id}`;values[field.id]=field.type==='multiselect'?raw.getAll(name):field.type==='checkbox'?raw.has(name):raw.get(name)??'';}
  let answers;try{answers=validateAnswers(reg,values);}catch(error){const question=[...form.querySelectorAll('[data-question]')].find(el=>el.dataset.question===error.field);if(question){const msg=question.querySelector('.question-error');msg.textContent=t('answerError');msg.hidden=false;const input=question.querySelector('input,select,textarea');input?.setAttribute('aria-invalid','true');input?.focus();}else form.querySelector('.form-message').textContent=t('answerError');return;}
  const button=form.querySelector('button[type=submit]');button.disabled=true;const original=button.textContent;button.textContent=t('sending');
  try{await submit(answers,form.querySelector('#membership-consent').checked);success();}catch(error){form.querySelector('.form-message').textContent=t('registrationChanged');}finally{if(button.isConnected){button.disabled=false;button.textContent=original;}}
 });
}
export function answerText(field,value){
 if(value===true)return t('yes');if(value===false)return t('no');
 const choice=id=>text(field.options?.find(o=>o.id===id)?.label)||String(id);
 return Array.isArray(value)?value.map(choice).join(' · '):['radio','select'].includes(field.type)?choice(value):String(value??'');
}
