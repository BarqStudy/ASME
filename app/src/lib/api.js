import {validateContent} from './content';
let config={},session=null;
export let recoveryActive=false;
export let configured=false;
export let contentRevision=null;
export async function initialize(){
 const response=await fetch(`${import.meta.env.BASE_URL}config.json`,{cache:'no-store'});if(!response.ok)throw Error('config');config=await response.json();
 configured=!!(config.supabaseUrl&&config.supabasePublishableKey);
 if(configured){const u=new URL(config.supabaseUrl);if(u.protocol!=='https:'||u.username||u.password)throw Error('Invalid service URL');config.supabaseUrl=u.origin;}
}
async function request(path,{method='GET',body,auth=false,headers={}}={}){
 if(!configured)throw Error('Service not configured');
 const response=await fetch(`${config.supabaseUrl}${path}`,{method,headers:{apikey:config.supabasePublishableKey,...(auth?{Authorization:`Bearer ${session?.access_token??config.supabasePublishableKey}`}:{Authorization:`Bearer ${config.supabasePublishableKey}`}),...(body?{'Content-Type':'application/json'}:{}),...headers},body:body?JSON.stringify(body):undefined});
 if(!response.ok){const error=new Error(`Request failed (${response.status})`);error.status=response.status;throw error;}
 return response.status===204?null:response.json();
}
export async function loadContent(){const rows=await request('/rest/v1/site_content?id=eq.main&select=data,revision');if(!rows.length){contentRevision=null;return null;}contentRevision=rows[0].revision;return validateContent(rows[0].data);}
export async function login(email,password){session=await request('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password}});try{const rows=await request(`/rest/v1/admin_users?user_id=eq.${encodeURIComponent(session.user.id)}&select=user_id`,{auth:true});if(!rows.length)throw Error('Not an administrator');}catch(e){await logout();throw e;}}
export async function logout(){try{if(session)await request('/auth/v1/logout',{method:'POST',auth:true});}finally{session=null;}}
export const isAuthenticated=()=>!!session;
export async function publishContent(content,expectedRevision=contentRevision){const rows=await request('/rest/v1/rpc/publish_content',{method:'POST',body:{document:validateContent(content),expected_revision:expectedRevision},auth:true});if(rows?.conflict){const e=Error('conflict');e.conflict=true;throw e;}contentRevision=rows.revision;}
export async function submitApplication(data){await request('/rest/v1/rpc/submit_application',{method:'POST',body:{applicant_name:data.name,applicant_email:data.email,applicant_interest:data.interest,event_ref:data.eventId||null}});}
export const listApplications=()=>request('/rest/v1/applications?select=*&order=created_at.desc&limit=1000',{auth:true});
export const updateApplication=(id,status)=>request(`/rest/v1/applications?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',auth:true,body:{status},headers:{Prefer:'return=minimal'}});
export async function uploadImage(file){
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>3*1024*1024)throw Error('JPEG, PNG or WebP; maximum 3 MB');
 if(!isAuthenticated())throw Error('Sign in required');
 const path=`${crypto.randomUUID()}.${{'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[file.type]}`;
 const response=await fetch(`${config.supabaseUrl}/storage/v1/object/club-media/${path}`,{method:'POST',headers:{apikey:config.supabasePublishableKey,Authorization:`Bearer ${session.access_token}`,'Content-Type':file.type},body:file});
 if(!response.ok)throw Error('Image upload failed');return `${config.supabaseUrl}/storage/v1/object/public/club-media/${path}`;
}
export async function recover(email){const redirect=location.origin+location.pathname;await request('/auth/v1/recover?redirect_to='+encodeURIComponent(redirect),{method:'POST',body:{email}});}
export async function acceptRecovery(hash){const params=new URLSearchParams(hash.replace(/^#/,''));if(params.get('type')!=='recovery'||!params.get('access_token'))return false;session={access_token:params.get('access_token')};try{await request('/auth/v1/user',{auth:true});recoveryActive=true;return true;}catch{session=null;return false;}}
export async function resetPassword(password){await request('/auth/v1/user',{method:'PUT',auth:true,body:{password}});await logout();recoveryActive=false;}
export const configInfo=()=>({url:config.supabaseUrl||'',configured});
