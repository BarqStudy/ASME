import { createServer } from 'node:http';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { writeSync } from 'node:fs';
import { access, readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { openStorage } from './storage.mjs';

const fonts = (await Promise.all(['Regular','Bold'].map(async weight => {
  const file = 'thmanyahserifdisplay-' + weight + '.otf';
  try { await access(join('public/assets', file)); return file; } catch { return null; }
}))).filter(Boolean);
const adminSecret = process.env.ASME_ADMIN_PASSWORD || '';
const kinds = ['committee','event','article','achievement','banner'];
const maxAge = 60 * 60 * 8;

function startupFailure(message) {
  writeSync(2, 'ASME startup failed: ' + message + '\n');
  process.exit(1);
}
if (adminSecret && adminSecret.length < 12) {
  startupFailure('ASME_ADMIN_PASSWORD must contain at least 12 characters');
}

let storage;
try {
  storage = await openStorage();
  for (const [id, name] of Object.entries({ admin: 'اللجنة الإدارية', media: 'لجنة الإعلام والتسويق', quality: 'لجنة التطوير والجودة', social: 'اللجنة الاجتماعية' })) {
    await storage.seed('committee', id, { name });
  }
  await storage.pruneSessions(Date.now());
} catch (error) {
  const code = /^[A-Z0-9_]{2,64}$/.test(error.code ?? '') ? error.code : 'UNKNOWN';
  const hints = {
    ERR_INVALID_URL: 'check that DATABASE_URL contains the complete PostgreSQL URI with URL-encoded credentials',
    '28P01': 'PostgreSQL rejected the credentials. Check the Session pooler username and the database password',
    28000: 'PostgreSQL rejected the connection authorization. Check the Session pooler settings',
    42501: 'the PostgreSQL account lacks permission to initialize ASME tables',
    ENOTFOUND: 'the database hostname could not be resolved. Copy the Session pooler URI again',
    ECONNREFUSED: 'the database refused the connection. Check that the project is active and the port is correct',
    DEPTH_ZERO_SELF_SIGNED_CERT: 'the database TLS certificate could not be verified'
  };
  const hint = /tenant or user not found/i.test(error.message)
    ? 'Supabase pooler could not find the project or user. Copy the Session pooler URI for this project again'
    : hints[code] || 'unable to initialize storage';
  startupFailure(code + ' — ' + hint);
}
const { list, get, save, removeSession } = storage;
const mime = { '.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.otf':'font/otf' };
class RequestError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
function requireValue(condition, message, status) {
  if (!condition) throw new RequestError(message, status);
}
function str(value, label, max = 200, optional = false) {
  const result = typeof value === 'string' ? value.trim() : '';
  requireValue((optional || result) && result.length <= max, 'تحقق من حقل ' + label);
  return result;
}
function number(value, label, min, max) {
  const result = Number(value);
  requireValue(value !== '' && value != null && Number.isFinite(result) && result >= min && result <= max, 'تحقق من حقل ' + label);
  return result;
}
function email(value) {
  const result = str(value, 'البريد الإلكتروني').toLowerCase();
  requireValue(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result), 'البريد الإلكتروني غير صالح');
  return result;
}
function fullName(value) {
  const result = str(value, 'الاسم الرباعي');
  requireValue(result.split(/\s+/).length >= 4, 'أدخل الاسم الرباعي');
  return result;
}
function image(value, optional = true) {
  if (!value && optional) return '';
  requireValue(typeof value === 'string' && value.length <= 4_250_000 && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value), 'استخدم صورة PNG أو JPEG أو WebP بحجم لا يتجاوز 3 ميغابايت');
  return value;
}
function secretHash(password, salt) {
  return scryptSync(password, salt, 64);
}
function sameSecret(left, right) {
  const salt = 'asme-login';
  return timingSafeEqual(secretHash(left, salt), secretHash(right, salt));
}
function cookie(req, token, age) {
  const secure = req.socket.encrypted || req.headers['x-forwarded-proto'] === 'https';
  return 'asme_session=' + token + '; Path=/; HttpOnly; SameSite=Lax; Max-Age=' + age + (secure ? '; Secure' : '');
}
async function session(req) {
  const token = /(?:^|;\s*)asme_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie || '')?.[1];
  const item = token && await get('session', token);
  return item?.expires > Date.now() ? item : null;
}
function memberView(item) {
  if (!item) return null;
  const { hash, salt, ...safe } = item;
  return safe;
}
async function current(req) {
  const item = await session(req);
  return { admin: item?.role === 'admin', member: item?.role === 'member' ? memberView(await get('member', item.member)) : null };
}
async function readBody(req) {
  requireValue(req.headers['content-type']?.split(';')[0] === 'application/json', 'صيغة الطلب غير مدعومة', 415);
  let length = 0;
  const chunks = [];
  for await (const chunk of req) {
    length += chunk.length;
    if (length > 5_000_000) throw new RequestError('حجم الطلب كبير', 413);
    chunks.push(chunk);
  }
  let value;
  try { value = JSON.parse(Buffer.concat(chunks).toString()); }
  catch { throw new RequestError('صيغة الطلب غير صالحة'); }
  requireValue(value && typeof value === 'object' && !Array.isArray(value), 'صيغة الطلب غير صالحة');
  return value;
}
async function publicContent(includeTemplates = false) {
  const entries = await Promise.all(kinds.map(async kind => [kind, await list(kind)]));
  const result = Object.fromEntries(entries);
  if (!includeTemplates) result.event = result.event.map(({ template, ...event }) => event);
  return { ...result, fonts, email: process.env.ASME_CONTACT_EMAIL || '' };
}
async function certificate(registration) {
  const event = await get('event', registration.event);
  if (!event?.template || registration.attendance == null || registration.attendance < event.threshold) return null;
  return { name: registration.name, title: event.title, template: event.template, code: registration.id };
}
function content(kind, v, previous) {
  if (kind === 'committee') return { name: str(v.name, 'اسم اللجنة') };
  const title = str(v.title, 'العنوان');
  if (kind === 'banner') return { title, text: str(v.text, 'الوصف', 500), image: image(v.image || previous?.image, false) };
  if (kind === 'article' || kind === 'achievement') return { title, text: str(v.text, 'المحتوى', 12000), image: image(v.image || previous?.image), date: str(v.date, 'التاريخ', 40, true) };
  const fields = Array.isArray(v.fields) ? v.fields : [];
  requireValue(fields.length <= 20, 'الحد الأقصى 20 حقلًا إضافيًا');
  const output = {
    title, audience: str(v.audience, 'الفئة المستهدفة'), date: str(v.date, 'الموعد'), place: str(v.place, 'المكان'),
    type: v.type === 'معسكر' ? 'معسكر' : 'دورة', open: v.open === true,
    threshold: number(v.threshold, 'نسبة الحضور', 0, 100),
    fields: fields.map(f => {
      requireValue(f && ['text','textarea','select'].includes(f.type), 'نوع الحقل غير صالح');
      const options = f.type === 'select' ? str(f.options, 'الخيارات', 1000).split('|').map(o => o.trim()).filter(Boolean) : [];
      requireValue(f.type !== 'select' || options.length > 1, 'أدخل خيارين على الأقل');
      return { label: str(f.label, 'اسم الحقل', 100), type: f.type, required: !!f.required, options };
    })
  };
  const template = image(v.image || previous?.template?.image);
  if (template) {
    const color = /^#[0-9a-f]{6}$/i.test(v.color) ? v.color : '#10243a';
    output.template = { image: template, x: number(v.x, 'الموضع الأفقي', 0, 100), y: number(v.y, 'الموضع العمودي', 0, 100), size: number(v.size, 'حجم الخط', 1, 20), font: v.font === 'Tahoma' ? 'Tahoma' : 'Thmanyah', color };
  }
  return output;
}
let attempts = new Map();
setInterval(() => { attempts = new Map(); }, 60_000).unref();
function loginLimit(req) {
  const address = req.socket.remoteAddress;
  const count = (attempts.get(address) || 0) + 1;
  attempts.set(address, count);
  requireValue(count <= 25, 'حاول مجددًا بعد دقيقة', 429);
}
function response(req, res, status, value, headers = {}) {
  res.writeHead(status, { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store', ...headers });
  res.end(JSON.stringify(value));
}
async function api(req, res, path) {
  const method = req.method;
  const who = await current(req);
  const ok = (value = { ok: true }, headers) => response(req, res, 200, value, headers);
  if (method === 'GET') {
    if (path === '/api/content') return ok(await publicContent());
    if (path === '/api/session') return ok(who);
    if (path === '/api/admin') {
      requireValue(who.admin, 'سجّل دخول الإدارة', 403);
      const [content, members, registration, message] = await Promise.all([
        publicContent(true), list('member'), list('registration'), list('message')
      ]);
      return ok({ ...content, member: members.map(memberView), registration, message });
    }
    if (path === '/api/certificates') {
      requireValue(who.member, 'سجّل الدخول بحساب الطالب', 403);
      const registrations = (await list('registration')).filter(r => r.member === who.member.id);
      return ok((await Promise.all(registrations.map(certificate))).filter(Boolean));
    }
  }
  requireValue(method === 'POST', 'المسار غير موجود', 404);
  const v = await readBody(req);
  if (path === '/api/login') {
    loginLimit(req);
    const password = str(v.password, 'كلمة المرور', 200);
    const admin = v.role === 'admin';
    let member;
    if (admin) requireValue(adminSecret && sameSecret(password, adminSecret), 'بيانات الإدارة غير صالحة أو الدخول غير مفعّل', 403);
    else {
      const student = str(v.student, 'الرقم الجامعي', 30).toLowerCase().replace(/@nu\.edu\.sa$/, '');
      member = (await list('member')).find(m => m.student === student);
      const hash = secretHash(password, member?.salt || 'asme-login');
      requireValue(member && timingSafeEqual(hash, Buffer.from(member.hash, 'hex')), 'بيانات الدخول غير صحيحة', 403);
    }
    const token = randomBytes(32).toString('hex');
    await save('session', { role: admin ? 'admin' : 'member', member: member?.id, expires: Date.now() + maxAge * 1000 }, token);
    return ok({ admin, member: memberView(member) }, { 'Set-Cookie': cookie(req, token, maxAge) });
  }
  if (path === '/api/logout') {
    const existing = await session(req);
    if (existing) await removeSession(existing.id);
    return ok(undefined, { 'Set-Cookie': cookie(req, '', 0) });
  }
  if (path === '/api/join') {
    const student = str(v.student, 'الرقم الجامعي', 20);
    requireValue(/^\d{4,20}$/.test(student), 'أدخل الرقم الجامعي بالأرقام');
    requireValue(!(await list('member')).some(m => m.student === student), 'يوجد طلب سابق لهذا الرقم الجامعي', 409);
    const level = number(v.level, 'المستوى الدراسي', 1, 12);
    requireValue(Number.isInteger(level), 'اختر مستوى دراسيًا صالحًا');
    requireValue(typeof v.committee === 'string' && await get('committee', v.committee), 'اختر لجنة من القائمة');
    const password = str(v.password, 'كلمة المرور', 200);
    requireValue(password.length >= 8, 'كلمة المرور تحتاج إلى 8 أحرف على الأقل');
    const phone = str(v.phone, 'رقم الجوال', 30);
    requireValue(/^\+?[0-9 ()-]{8,22}$/.test(phone), 'أدخل رقم جوال صالحًا');
    const salt = randomBytes(16).toString('hex');
    await save('member', { name: fullName(v.name), student, email: student + '@nu.edu.sa', phone,
      major: str(v.major, 'التخصص'), level, skills: str(v.skills, 'المهارات', 2000), committee: v.committee,
      hash: secretHash(password, salt).toString('hex'), salt, status: 'pending' });
    return ok();
  }
  if (path === '/api/register') {
    const event = typeof v.event === 'string' && await get('event', v.event);
    requireValue(event?.open, 'التسجيل مغلق', 409);
    const member = who.member?.status === 'accepted' ? who.member : null;
    const address = member?.email || email(v.email);
    requireValue(!(await list('registration')).some(r => r.event === event.id && r.email === address), 'هذا البريد مسجل مسبقًا في الفعالية', 409);
    const answers = member ? [] : event.fields.map((field, i) => {
      const answer = str(v.answers?.[i], field.label, 2000, !field.required);
      requireValue(!answer || field.type !== 'select' || field.options.includes(answer), 'اختر قيمة صالحة');
      return { label: field.label, answer };
    });
    const record = await save('registration', { event: event.id, member: member?.id || null, name: member?.name || fullName(v.name), email: address, answers, attendance: null });
    return ok({ code: record.id });
  }
  if (path === '/api/contact') {
    await save('message', { name: fullName(v.name), email: email(v.email), text: str(v.text, 'نص الرسالة', 6000), date: new Date().toISOString() });
    return ok();
  }
  if (path === '/api/certificate') {
    const code = str(v.code, 'رمز التسجيل', 60);
    const registration = await get('registration', code);
    const result = registration?.email === email(v.email) && await certificate(registration);
    requireValue(result, 'لا توجد شهادة متاحة بهذه البيانات', 404);
    return ok(result);
  }
  if (path === '/api/admin/member') {
    requireValue(who.admin, 'سجّل دخول الإدارة', 403);
    const item = await get('member', str(v.id, 'المعرّف', 60));
    requireValue(item && ['accepted','rejected','pending'].includes(v.status), 'الطلب غير صالح');
    await save('member', { ...item, status: v.status }, item.id);
    return ok();
  }
  if (path === '/api/admin/attendance') {
    requireValue(who.admin, 'سجّل دخول الإدارة', 403);
    const item = await get('registration', str(v.id, 'المعرّف', 60));
    requireValue(item, 'التسجيل غير موجود', 404);
    await save('registration', { ...item, attendance: number(v.attendance, 'نسبة الحضور', 0, 100) }, item.id);
    return ok();
  }
  if (path === '/api/admin/content') {
    requireValue(who.admin, 'سجّل دخول الإدارة', 403);
    requireValue(kinds.includes(v.kind), 'نوع المحتوى غير صالح');
    const previous = v.id ? await get(v.kind, str(v.id, 'المعرّف', 60)) : null;
    requireValue(!v.id || previous, 'العنصر غير موجود', 404);
    await save(v.kind, content(v.kind, v, previous), previous?.id);
    return ok();
  }
  throw new RequestError('المسار غير موجود', 404);
}

createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'none'; frame-ancestors 'self'; form-action 'self'");
  try {
    const path = new URL(req.url, 'http://localhost').pathname;
    if (path.startsWith('/api/')) return await api(req, res, path);
    const file = path === '/' ? '/index.html' : path;
    if (/^\/(?:assets\/)?[a-z0-9_.-]+$/i.test(file) && mime[extname(file)] && ['GET','HEAD'].includes(req.method)) {
      const value = await readFile(join('public', file)).catch(e => { if (e.code !== 'ENOENT') throw e; });
      if (value) {
        res.writeHead(200, { 'Content-Type':mime[extname(file)], 'Content-Length':value.length });
        return res.end(req.method === 'HEAD' ? undefined : value);
      }
    }
    response(req, res, 404, { error:'الصفحة غير موجودة' });
  } catch (e) {
    const duplicate = {
      unique_student: 'يوجد طلب سابق لهذا الرقم الجامعي',
      unique_registration: 'هذا البريد مسجل مسبقًا في الفعالية'
    };
    const conflict = e.code === '23505' ? duplicate[e.constraint]
      : e.errcode === 2067 ? Object.entries(duplicate).find(([name]) => e.message.includes(name))?.[1] : null;
    if (conflict && !res.headersSent) return response(req, res, 409, { error: conflict });
    if (!(e instanceof RequestError)) console.error('ASME request failed:', e.code || e.name);
    if (!res.headersSent) response(req, res, e.status || 500, { error:e.status ? e.message : 'تعذر إكمال الطلب' });
  }
}).listen(Number(process.env.PORT || 3000), '0.0.0.0', () => console.log('ASME ready on port ' + (process.env.PORT || 3000)));
