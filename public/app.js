const $ = selector => document.querySelector(selector);
const dialog = $('#dialog');
const body = $('#dialog-content');
let site = { committee: [], event: [], article: [], achievement: [], banner: [] };
let account = {};
let bannerIndex = 0;
let toastTimer;

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) if (value != null) node.setAttribute(key, value);
  node.append(...children.filter(child => child != null));
  return node;
}
function button(text, run, style = 'primary') {
  const node = el('button', { class: 'btn ' + style, type: 'button' }, text);
  node.addEventListener('click', run);
  return node;
}
function toast(text) {
  clearTimeout(toastTimer);
  $('#toast').textContent = text;
  $('#toast').classList.add('show');
  toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 4500);
}
async function api(path, data) {
  const response = await fetch('/api/' + path, data === undefined ? {} : {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'تعذر إكمال الطلب');
  return result;
}
function modal(title, content, wide = false) {
  $('#dialog-title').textContent = title;
  body.replaceChildren(content);
  dialog.classList.toggle('wide', wide);
  if (!dialog.open) dialog.showModal();
  dialog.scrollTop = 0;
}
function field(label, name, options = {}) {
  const { type = 'text', choices, value, required = true, ...attrs } = options;
  const common = { name, required: required ? '' : null, ...attrs };
  const control = choices
    ? el('select', common, el('option', { value: '' }, 'اختر'), ...choices.map(choice => {
        const [key, title] = Array.isArray(choice) ? choice : [choice, choice];
        return el('option', { value: key }, String(title));
      }))
    : type === 'textarea' ? el('textarea', common) : el('input', { ...common, type });
  if (value != null) control.value = value;
  return el('label', {}, label, control);
}
function form(children, submitName, onSubmit) {
  const error = el('p', { class: 'form-error', role: 'alert', hidden: '' });
  const submit = el('button', { type: 'submit', class: 'btn primary' }, submitName);
  const node = el('form', {}, ...children, error, submit);
  node.addEventListener('submit', async event => {
    event.preventDefault();
    error.hidden = true;
    submit.disabled = true;
    try { await onSubmit(Object.fromEntries(new FormData(node)), node); }
    catch (e) { error.textContent = e.message; error.hidden = false; }
    finally { submit.disabled = false; }
  });
  return node;
}
function empty(text) { return el('p', { class: 'empty' }, text); }
function grid(...children) { return el('div', { class: 'fields' }, ...children); }
function note(text) { return el('p', { class: 'hint' }, text); }
function done(text) { dialog.close(); toast(text); }
function setList(selector, items, render, message) {
  $(selector).replaceChildren(...(items.length ? items.map(render) : [empty(message)]));
}

const icons = {
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  user: '<circle cx="12" cy="8" r="3"/><path d="M5 21v-2a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v2"/>',
  left: '<path d="M19 12H5m6 6-6-6 6-6"/>',
  'up-left': '<path d="M17 17 7 7m0 8V7h8"/>',
  tree: '<rect x="9" y="2" width="6" height="5"/><path d="M12 7v6m-7 4v-4h14v4"/><rect x="2" y="17" width="6" height="5"/><rect x="16" y="17" width="6" height="5"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  eye: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z"/><circle cx="12" cy="12" r="2.5"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5.5"/><circle cx="12" cy="12" r="2"/>'
};
document.querySelectorAll('[data-icon]').forEach(node => {
  node.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + icons[node.dataset.icon] + '</svg>';
});
const originalTitle = $('#hero-title').innerHTML;
const originalDescription = $('#hero-description').textContent;
function renderBanner() {
  const banner = site.banner[bannerIndex - 1];
  const img = $('#banner-image');
  img.style.backgroundImage = banner ? 'url("' + banner.image + '")' : '';
  img.style.backgroundSize = 'cover';
  img.style.backgroundPosition = 'center';
  if (banner) $('#hero-title').textContent = banner.title;
  else $('#hero-title').innerHTML = originalTitle;
  $('#hero-description').textContent = banner?.text || originalDescription;
  $('#banner-nav').replaceChildren(...(site.banner.length ? [null, ...site.banner] : []).map((item, index) => {
    const dot = el('button', { 'aria-label': item?.title || 'البنر الرئيسي', 'aria-current': String(index === bannerIndex) });
    dot.onclick = () => { bannerIndex = index; renderBanner(); };
    return dot;
  }));
}
function story(item, action) {
  return el('article', { class: 'card' },
    item.image ? el('img', { src: item.image, alt: '', loading: 'lazy' }) : null,
    item.date ? el('span', { class: 'tag' }, item.date) : null,
    el('h3', {}, item.title), el('p', {}, item.text.length > 145 ? item.text.slice(0, 145) + '…' : item.text),
    button(action, () => modal(item.title, el('p', { class: 'story-text' }, item.text)), 'outline'));
}
async function refresh() {
  site = await api('content');
  renderBanner();
  setList('#events', site.event, event => el('article', { class: 'card' },
    el('span', { class: 'tag' }, event.type), el('h3', {}, event.title),
    el('p', {}, 'الفئة المستهدفة · ' + event.audience), el('p', {}, 'الموعد · ' + event.date),
    el('p', {}, 'المكان · ' + event.place),
    event.open ? button('سجّل الآن ←', () => registration(event)) : el('span', { class: 'tag' }, 'التسجيل مغلق')
  ), 'ستظهر الدورات والمعسكرات فور إعلانها.');
  setList('#articles', site.article, item => story(item, 'اقرأ الخبر'), 'ستظهر أخبار النادي هنا عند نشرها.');
  setList('#achievements-list', site.achievement, item => story(item, 'عرض الإنجاز'), 'ستظهر إنجازات النادي هنا عند نشرها.');
  $('#committees').replaceChildren(...site.committee.map(c => el('span', {}, c.name)));
  $('#club-email').hidden = !site.email;
  if (site.email) $('#club-email').href = 'mailto:' + site.email;
}
function setAccount(who) {
  account = who;
  $('[data-account-label]').textContent = who.member ? 'حسابي' : who.admin ? 'لوحة الإدارة' : 'تسجيل الدخول';
}
function login(role = 'member', next) {
  const admin = role === 'admin';
  modal(admin ? 'دخول الإدارة' : 'تسجيل الدخول', form([
    admin ? null : field('الرقم الجامعي أو البريد الجامعي', 'student', { autocomplete:'username' }),
    field('كلمة المرور', 'password', { type:'password', autocomplete:'current-password' })
  ], 'دخول', async data => {
    setAccount(await api('login', { ...data, role }));
    if (next) await next();
    else if (admin) await dashboard();
    else profile();
  }));
}
const statusNames = { pending:'قيد المراجعة', accepted:'مقبول', rejected:'مرفوض' };
async function logout() {
  await api('logout', {});
  setAccount({});
  done('تم تسجيل الخروج');
}
function profile() {
  if (account.admin) return dashboard();
  if (!account.member) return login();
  const member = account.member;
  modal('حسابي', el('div', {}, el('p', {}, member.name), el('p', { dir:'ltr' }, member.email),
    el('p', {}, 'حالة طلب العضوية · ' + statusNames[member.status]),
    button('شهاداتي', certificates), button('تسجيل الخروج', logout, 'outline')));
}
function join() {
  if (account.member) return profile();
  const universityEmail = el('output', { class:'hint', dir:'ltr', 'aria-live':'polite' });
  const student = field('الرقم الجامعي', 'student', { inputmode:'numeric', pattern:'[0-9]{4,20}', dir:'ltr' });
  student.querySelector('input').oninput = event => {
    universityEmail.textContent = event.target.value ? event.target.value + '@nu.edu.sa' : '';
  };
  student.append(universityEmail);
  modal('طلب الالتحاق بالنادي', form([
    grid(field('الاسم الرباعي', 'name'), student, field('رقم الجوال', 'phone', { type:'tel', dir:'ltr' }),
      field('التخصص', 'major'), field('المستوى الدراسي', 'level', { choices:Array.from({ length:12 }, (_,i) => i + 1) }),
      field('اللجنة', 'committee', { choices:site.committee.map(c => [c.id,c.name]) })),
    field('المهارات', 'skills', { type:'textarea' }),
    field('كلمة المرور لحسابك', 'password', { type:'password', minlength:8, autocomplete:'new-password' })
  ], 'إرسال الطلب', async data => {
    await api('join', data);
    done('استلمنا طلبك. يمكنك متابعة حالته من حسابك.');
  }));
}
function registration(event) {
  const member = account.member?.status === 'accepted' ? account.member : null;
  const custom = member ? [] : event.fields.map((f, i) => field(f.label, 'extra-' + i, {
    type:f.type, choices:f.type === 'select' ? f.options : undefined, required:f.required
  }));
  modal(event.title, form([
    note(event.date + ' · ' + event.place),
    member ? note('سيتم التسجيل باسم ' + member.name) : grid(field('الاسم الرباعي', 'name'), field('البريد الإلكتروني', 'email', { type:'email', dir:'ltr' })),
    ...custom
  ], 'تأكيد التسجيل', async data => {
    const result = await api('register', { ...data, event:event.id, answers:event.fields.map((_,i) => data['extra-' + i]) });
    modal('تم التسجيل', el('div', {}, note('احتفظ برمز التسجيل حتى تتمكن من استرجاع شهادتك بعد استيفاء الحضور.'), el('p', { dir:'ltr' }, result.code)));
  }));
}
function contact() {
  modal('أرسل رسالة إلى النادي', form([
    field('الاسم الرباعي', 'name'), field('البريد الإلكتروني', 'email', { type:'email', dir:'ltr' }),
    field('نص الرسالة', 'text', { type:'textarea' })
  ], 'إرسال الرسالة', async data => { await api('contact', data); done('وصلت رسالتك إلى النادي'); }));
}
function certificateView(template, name) {
  const item = el('div', { class:'certificate' },
    el('img', { src:template.image, alt:'قالب الشهادة' }),
    el('span', { dir:'auto' }, name));
  const text = item.lastElementChild;
  Object.assign(text.style, {
    left:template.x + '%', top:template.y + '%', color:template.color,
    fontFamily:template.font === 'Thmanyah' ? 'var(--display)' : 'Tahoma, Arial, sans-serif', fontSize:template.size + 'cqw'
  });
  return item;
}
function printCertificate(certificate) {
  modal(certificate.title, el('div', {}, certificateView(certificate.template, certificate.name),
    el('div', { class:'certificate-tools' }, button('طباعة أو حفظ PDF', () => window.print()))), true);
}
async function certificates() {
  const own = account.member ? await api('certificates') : [];
  modal('الشهادات الإلكترونية', el('div', {},
    ...own.map(c => el('div', { class:'admin-row' }, button(c.title, () => printCertificate(c), 'outline'))),
    note('يمكنك استرجاع شهادة فعالية باستخدام البريد ورمز التسجيل.'),
    form([field('البريد الإلكتروني', 'email', { type:'email', dir:'ltr' }), field('رمز التسجيل', 'code', { dir:'ltr' })],
      'عرض الشهادة', async data => printCertificate(await api('certificate', data)))));
}

const adminSections = { member:'طلبات العضوية', event:'الفعاليات', registration:'الحضور', banner:'البنرات', article:'الأخبار', achievement:'الإنجازات', committee:'اللجان', message:'الرسائل' };
async function dashboard(tab = 'member') {
  if (!account.admin) return login('admin');
  const data = await api('admin');
  const nav = el('div', { class:'admin-tabs' }, ...Object.entries(adminSections).map(([key,title]) =>
    button(title, () => safe(() => dashboard(key)), key === tab ? 'primary' : 'outline')),
    button('خروج', logout, 'outline'));
  const rows = data[tab].map(item => adminRow(tab, item, data));
  const add = ['event','banner','article','achievement','committee'].includes(tab)
    ? button('إضافة ' + ({ event:'فعالية', banner:'بنر', article:'خبر', achievement:'إنجاز', committee:'لجنة' })[tab], () => editor(tab)) : null;
  modal('لوحة الإدارة', el('div', {}, nav, add, ...rows, rows.length ? null : empty('لا توجد عناصر بعد.')), true);
}
function adminRow(tab, item, data) {
  const row = el('div', { class:'admin-row' }, el('strong', {}, item.title || item.name));
  if (tab === 'member') {
    row.append(el('p', {}, [item.student, item.email, item.phone, item.major, 'المستوى ' + item.level, data.committee.find(c => c.id === item.committee)?.name].join(' · ')),
      el('p', {}, item.skills), form([field('الحالة', 'status', { choices:Object.entries(statusNames), value:item.status })], 'حفظ الحالة', async data => {
        await api('admin/member', { ...data, id:item.id }); await dashboard(tab); toast('تم حفظ الحالة');
      }));
  } else if (tab === 'registration') {
    row.append(el('p', {}, [data.event.find(e => e.id === item.event)?.title, item.email, item.id].join(' · ')),
      ...item.answers.map(answer => el('p', {}, answer.label + ' · ' + answer.answer)),
      form([field('نسبة الحضور ٪', 'attendance', { type:'number', min:0, max:100, step:'any', value:item.attendance })], 'حفظ الحضور', async data => {
        await api('admin/attendance', { ...data, id:item.id }); await dashboard(tab); toast('تم حفظ الحضور');
      }));
  } else if (tab === 'message') {
    row.append(el('p', {}, item.text), el('a', { class:'link-button', href:'mailto:' + item.email }, 'الرد على ' + item.email));
  } else {
    row.append(el('p', {}, item.text?.slice(0, 130) || item.date || ''), button('تعديل', () => editor(tab, item), 'outline'));
  }
  return row;
}
function readImage(file) {
  if (!file?.size) return Promise.resolve('');
  if (file.size > 3 * 1024 * 1024 || !['image/png','image/jpeg','image/webp'].includes(file.type))
    return Promise.reject(new Error('اختر صورة PNG أو JPEG أو WebP بحجم لا يتجاوز 3 ميغابايت'));
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('تعذرت قراءة الصورة'));
    reader.readAsDataURL(file);
  });
}
function editor(kind, item = {}) {
  const isEvent = kind === 'event';
  const fields = [];
  let extras;
  let eventTools;
  if (kind === 'committee') fields.push(field('اسم اللجنة', 'name', { value:item.name }));
  else {
    fields.push(field('العنوان', 'title', { value:item.title }));
    if (!isEvent) fields.push(field('المحتوى', 'text', { type:'textarea', value:item.text }));
    if (kind === 'article' || kind === 'achievement') fields.push(field('التاريخ', 'date', { type:'date', value:item.date, required:false }));
    if (isEvent) {
      extras = el('div');
      const addField = (current = {}) => {
        const box = el('div', { class:'admin-row' }, grid(
          field('اسم الحقل', 'question-label', { value:current.label }),
          field('نوع الحقل', 'question-type', { choices:[['text','نص قصير'],['textarea','نص طويل'],['select','قائمة خيارات']], value:current.type || 'text' }),
          field('الخيارات مفصولة بعلامة |', 'question-options', { required:false, value:current.options?.join('|') }),
          field('إجباري', 'question-required', { choices:[['true','نعم'],['false','لا']], value:String(current.required ?? true) })
        ), button('حذف الحقل', () => box.remove(), 'outline'));
        extras.append(box);
      };
      for (const question of item.fields || []) addField(question);
      fields.push(grid(field('النوع', 'type', { choices:['دورة','معسكر'], value:item.type || 'دورة' }),
        field('الفئة المستهدفة', 'audience', { value:item.audience }), field('الموعد والوقت', 'date', { value:item.date }),
        field('المكان', 'place', { value:item.place }),
        field('حالة التسجيل', 'open', { choices:[['true','مفتوح'],['false','مغلق']], value:String(item.open ?? true) }),
        field('الحد الأدنى لحضور الشهادة ٪', 'threshold', { type:'number', min:0, max:100, step:'any', value:item.threshold ?? 80 })),
        extras, button('إضافة حقل تسجيل', () => addField(), 'outline'));
      const template = item.template || {};
      eventTools = el('div', { class:'admin-row' }, grid(
        field('الموضع الأفقي ٪', 'x', { type:'number', min:0, max:100, step:'any', value:template.x ?? 50 }),
        field('الموضع العمودي ٪', 'y', { type:'number', min:0, max:100, step:'any', value:template.y ?? 50 }),
        field('حجم الخط ٪ من عرض الشهادة', 'size', { type:'number', min:1, max:20, step:'any', value:template.size ?? 5 }),
        field('الخط', 'font', { choices:[['Thmanyah','ثمانية'],['Tahoma','Tahoma']], value:template.font || 'Thmanyah' }),
        field('لون الاسم', 'color', { type:'color', value:template.color || '#10243a' })));
    }
    fields.push(field(isEvent ? 'صورة قالب الشهادة' : 'الصورة', 'image', { type:'file', accept:'image/png,image/jpeg,image/webp', required:kind === 'banner' && !item.image }));
    if (kind === 'banner') fields.push(note('ارفع صورة أفقية بنسبة 16:9، وضع الموضوع في الوسط أو اليسار. تُقص الحواف تلقائيًا على الشاشات الضيقة.'));
    if (eventTools) fields.push(eventTools);
  }
  const editorForm = form(fields, 'حفظ', async data => {
    const output = { ...data, kind, id:item.id, open:data.open === 'true' };
    if (data.image) output.image = await readImage(data.image);
    if (extras) output.fields = [...extras.children].map(box => ({
      label:box.querySelector('[name=question-label]').value, type:box.querySelector('[name=question-type]').value,
      options:box.querySelector('[name=question-options]').value, required:box.querySelector('[name=question-required]').value === 'true'
    }));
    await api('admin/content', output);
    await Promise.all([refresh(), dashboard(kind)]);
    toast('تم الحفظ');
  });
  if (eventTools) {
    const preview = el('div');
    async function updatePreview() {
      const data = Object.fromEntries(new FormData(editorForm));
      const image = await readImage(data.image) || item.template?.image;
      preview.replaceChildren();
      if (!image) return;
      const canvas = certificateView({ ...data, image }, 'اسم الطالب الرباعي');
      canvas.title = 'انقر لتحديد موقع كتابة الاسم';
      canvas.addEventListener('click', event => {
        const rect = canvas.getBoundingClientRect();
        editorForm.elements.x.value = ((event.clientX - rect.left) / rect.width * 100).toFixed(1);
        editorForm.elements.y.value = ((event.clientY - rect.top) / rect.height * 100).toFixed(1);
        safe(updatePreview);
      });
      preview.append(note('انقر على القالب لتحديد موقع الاسم.'), canvas);
    }
    eventTools.append(preview);
    editorForm.elements.image.onchange = () => safe(updatePreview);
    eventTools.addEventListener('input', () => safe(updatePreview));
    safe(updatePreview);
  }
  modal(item.id ? 'تعديل المحتوى' : 'إضافة محتوى', editorForm, true);
}
async function safe(action) {
  try { await action(); } catch (error) { toast(error.message); }
}
const actions = { account:profile, join, contact, certificates, admin:dashboard, close:() => dialog.close() };
document.querySelectorAll('[data-action]').forEach(node => node.addEventListener('click', () => safe(actions[node.dataset.action])));
$('#menu').addEventListener('click', () => {
  $('#menu').setAttribute('aria-expanded', String($('#nav').classList.toggle('open')));
});
$('#nav').querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  $('#nav').classList.remove('open');
  $('#menu').setAttribute('aria-expanded', 'false');
  $('#nav').querySelector('.active')?.classList.remove('active');
  link.classList.add('active');
}));
safe(() => Promise.all([refresh(), api('session').then(setAccount)]));
