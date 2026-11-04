import {defaultRegistration,validateRegistration} from './registration.js';
export const defaults = {
  version: 1,
  site: {
    name: { ar: 'نادي ASME — جامعة نجران', en: 'ASME — Najran University' },
    eyebrow: { ar: 'نرسم ملامح المستقبل. بمعايير ASME.', en: 'Engineering tomorrow. The ASME way.' },
    headline: { ar: 'الهندسةُ\nتبدأ بحركة.', en: 'Great ideas.\nSet in motion.' },
    intro: { ar: 'نادي طلابي لطلاب كلية الهندسة بجامعة نجران. نتعلّم الميكانيكا بالتجربة، ونصنع فرصًا للابتكار من خلال الأنشطة والفعاليات والمسابقات.', en: 'A student club for the College of Engineering at Najran University. We explore mechanical engineering through hands-on activities, events, and competitions.' },
    about: { ar: 'مساحتك لتجربة الهندسة خارج حدود القاعة. نجمع الطلاب حول التعلّم العملي، والعمل الجماعي، وتبادل المعرفة في مجالات الهندسة الميكانيكية.', en: 'Your space to explore engineering beyond the classroom. We bring students together through hands-on learning, teamwork, and sharing knowledge in mechanical engineering.' },
    vision:{ar:'أن نكون مجتمعًا طلابيًا ملهمًا يطوّر شغف الهندسة الميكانيكية، ويحوّل أفكار طلاب كلية الهندسة إلى مهارات وأثر.',en:'To be an inspiring student community that develops a passion for mechanical engineering and turns engineering students’ ideas into skills and impact.'},
    mission:{ar:'نربط المعرفة بالتطبيق عبر تجارب ميكانيكية، وورش عملية، وأنشطة طلابية ومسابقات؛ لننمي مهارات التصميم والعمل الجماعي وحل المشكلات.',en:'We connect knowledge with practice through mechanical experiences, hands-on workshops, student activities, and competitions, developing design, teamwork, and problem-solving skills.'},
    cta: { ar: 'المستقبل يبدأ بفكرة.\nوفريق يؤمن بها.', en: 'The future starts with an idea.\nAnd a team that believes in it.' },
    email: '', instagram: '', linkedin: '', logo: 'brand/asme-najran.png',
    announcement: {ar:'',en:''},
    showExamples: true,
  },
  registration:structuredClone(defaultRegistration),
  projects: [
    {id:'turbine',category:'mechanical',title:{ar:'هندسة الحركة، بدقة متناهية',en:'Precision in every revolution'},description:{ar:'تصوّر تعليمي لدراسة تصميم التوربينات وعلاقة شكل الريش بكفاءة تحويل الطاقة.',en:'An educational concept exploring turbine design and how blade geometry affects energy conversion.'},cover:'',published:true,example:true},
    {id:'solar',category:'energy',title:{ar:'طاقة اليوم، لمستقبل أفضل',en:'Today’s energy. Tomorrow’s possibilities.'},description:{ar:'تصوّر لنظام شمسي ذكي يجمع بين التصميم الميكانيكي وقياس الإنتاج لتحسين الكفاءة.',en:'A smart solar concept combining mechanical design and production monitoring to improve efficiency.'},cover:'',published:true,example:true},
    {id:'robot',category:'robotics',title:{ar:'حين تتحوّل الفكرة إلى حركة',en:'Ideas, set in motion'},description:{ar:'تصوّر لذراع روبوتية تعليمية لتجربة الحركة المبرمجة والتحكم الدقيق.',en:'An educational robotic arm concept for exploring programmed motion and precision control.'},cover:'',published:true,example:true},
  ],
  events: [
    {id:'design-workshop',title:{ar:'من الفكرة إلى النموذج ثلاثي الأبعاد',en:'From idea to 3D prototype'},description:{ar:'تعرّف على أساسيات التصميم الهندسي والتصنيع الرقمي في ورشة عملية.',en:'Explore the fundamentals of engineering design and digital fabrication in a practical workshop.'},location:{ar:'يُعلن لاحقًا',en:'To be announced'},date:'',registrationOpen:false,published:true,example:true},
    {id:'community',title:{ar:'تعرّف على مجتمع ASME',en:'Meet your ASME community'},description:{ar:'اكتشف مسارات النادي والتقِ بفريقك الهندسي القادم.',en:'Explore the club’s pathways and meet your next engineering team.'},location:{ar:'يُعلن لاحقًا',en:'To be announced'},date:'',registrationOpen:false,published:true,example:true},
  ],
};
defaults.events.push({id:'mechanical-design-challenge',title:{ar:'تحدّي التصميم الميكانيكي',en:'Mechanical design challenge'},description:{ar:'تصوّر لمسابقة طلابية تجمع التصميم وحل المشكلات والعمل الجماعي.',en:'An illustrative student competition combining design, problem-solving, and teamwork.'},location:{ar:'يُعلن لاحقًا',en:'To be announced'},date:'',registrationOpen:false,published:true,example:true});
for(const event of defaults.events){event.category=event.id==='design-workshop'?'workshop':'activity';event.body=structuredClone(event.description);event.cover='';}
defaults.events[2].category='competition';
defaults.events[0].body={ar:'تبدأ التجربة بفكرة بسيطة: كيف نحول تصورًا هندسيًا إلى نموذج يمكن دراسته وتطويره؟ في هذا التصوّر لورشة النادي، يتعرّف الطالب على التفكير التصميمي ومراحل بناء النموذج ثلاثي الأبعاد.\n\nتتضمن المحاور المقترحة قراءة الأبعاد، وبناء الأجزاء، وفهم علاقة التصميم بإمكانات التصنيع. يركّز العمل على تبادل المعرفة وتجربة الحلول مع الزملاء.\n\nهذا محتوى توضيحي لهيكلة صفحة الفعالية. سيُضاف الموعد والمكان وآلية المشاركة عند اعتماد الفعالية من إدارة النادي.',en:'How can an engineering idea become a model that can be studied and improved? This illustrative workshop introduces design thinking and the stages of building a three-dimensional prototype.\n\nProposed topics include reading dimensions, creating parts, and understanding how design connects with manufacturing. The focus is on shared learning and exploring solutions with peers.\n\nThis is sample content demonstrating the event article format. Dates, venue, and participation details will be added when approved by the club.'};
defaults.events[1].body={ar:'مساحة لطلاب كلية الهندسة للتعرّف على نادي ASME ومجالاته الميكانيكية، من التصميم والتصنيع إلى الطاقة والتحكم.\n\nفي هذا التصوّر للقاء التعريفي، يستكشف الطالب الفرق التي يمكنه المشاركة معها، ويشارك أفكاره للأنشطة والورش والمسابقات. لا تتطلب البداية خبرة كبيرة؛ الفضول والاستعداد للتعلّم هما الخطوة الأولى.\n\nهذا لقاء توضيحي غير معتمد بموعد حتى الآن. ستنشر إدارة النادي التفاصيل الرسمية عند تحديدها.',en:'A space for College of Engineering students to discover ASME and its mechanical engineering interests, from design and manufacturing to energy and control.\n\nThis illustrative introduction explores ways to participate and share ideas for activities, workshops, and competitions. Curiosity and a willingness to learn are the first steps.\n\nThis is an illustrative event with no confirmed schedule. The club will publish official details when available.'};
defaults.events[2].body={ar:'كيف يمكن لفريق طلابي أن يقدم حلًا ميكانيكيًا لفكرة محددة ضمن قيود واضحة؟ يقترح هذا التصوّر تحديًا يجمع تحليل المشكلة، والتصميم، وعرض الفكرة.\n\nيمكن أن تتضمن مراحل التحدي تكوين الفرق، ودراسة البدائل، وتطوير نموذج أولي، ثم شرح قرارات التصميم أمام لجنة التقييم. تركز التجربة على الإبداع والعمل الجماعي والتعلّم من الاختبار.\n\nهذه فكرة توضيحية لمسار المسابقات في النادي، وليست إعلانًا عن مسابقة مفتوحة. ستحدد الإدارة الموضوع والقواعد والمواعيد عند اعتمادها.',en:'How can a student team propose a mechanical solution within a clear set of constraints? This concept combines problem analysis, design, and presenting an idea.\n\nPossible stages include forming teams, exploring alternatives, developing a prototype, and explaining design decisions to reviewers. The emphasis is on creativity, collaboration, and learning through testing.\n\nThis is an illustrative competition concept, not an open competition announcement. The club will set the brief, rules, and dates when approved.'};
export const clone = value => structuredClone(value);
export const escape = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const safeURL = (value, image=false) => {
  if (!value) return '';
  if (image && /^data:image\/(png|jpeg|webp);base64,[a-z\d+/=]+$/i.test(value)) return value;
  if(image && ['brand/asme-najran.jpg','brand/asme-najran.png'].includes(value))return `${import.meta.env.BASE_URL}brand/asme-najran.png`;
  try {const u=new URL(value);return u.protocol==='https:'?u.href:'';} catch{return '';}
};
export function validateContent(data) {
  if(!data || data.version!==1 || !data.site || !Array.isArray(data.projects)||!Array.isArray(data.events))throw Error('Invalid content format');
  data=clone(data);data.site.vision??=clone(defaults.site.vision);data.site.mission??=clone(defaults.site.mission);data.registration=validateRegistration(data.registration??defaultRegistration);
  if(data.projects.length>100||data.events.length>100)throw Error('Maximum 100 entries per section');
  for(const k of ['name','eyebrow','headline','intro','about','vision','mission','cta','announcement'])for(const lang of ['ar','en'])if(typeof data.site[k]?.[lang]!=='string'||data.site[k][lang].length>5000)throw Error(`Invalid ${k}.${lang}`);
  if(typeof data.site.showExamples!=='boolean')throw Error('Invalid example visibility');
  for(const key of ['email','instagram','linkedin','logo'])if(typeof data.site[key]!=='string')throw Error(`Invalid ${key}`);
  for(const key of ['projects','events']){
    const ids=new Set();
    for(const x of data[key]){
      if(typeof x.id!=='string'||!x.id||x.id.length>100||ids.has(x.id))throw Error('Invalid or duplicate ID');ids.add(x.id);
      for(const field of ['title','description',...(key==='events'?['location']:[])])for(const lang of ['ar','en'])if(typeof x[field]?.[lang]!=='string'||x[field][lang].length>5000)throw Error(`Invalid ${field}.${lang}`);
      if(typeof x.published!=='boolean'||typeof x.example!=='boolean')throw Error('Invalid publication status');
      if(key==='projects'&&(!['mechanical','energy','robotics'].includes(x.category)||typeof x.cover!=='string'))throw Error('Invalid project');
      if(key==='events'&&(typeof x.date!=='string'||(x.date&&!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(x.date))||typeof x.registrationOpen!=='boolean'))throw Error('Invalid event');
      if(key==='events'){x.category??='activity';x.body??=clone(x.description);x.cover??='';if(!['activity','workshop','competition','visit','talk'].includes(x.category)||typeof x.cover!=='string')throw Error('Invalid article');for(const l of ['ar','en'])if(typeof x.body?.[l]!=='string'||x.body[l].length>20000)throw Error('Invalid article body');}
      if(key==='events'&&x.date&&!Number.isFinite(new Date(x.date+'+03:00').getTime()))throw Error('Invalid event date');
    }
  }
  return clone(data);
}
