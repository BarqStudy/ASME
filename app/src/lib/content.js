export const defaults = {
  version: 1,
  site: {
    name: { ar: 'نادي ASME — جامعة نجران', en: 'ASME — Najran University' },
    eyebrow: { ar: 'نرسم ملامح المستقبل. بمعايير ASME.', en: 'Engineering tomorrow. The ASME way.' },
    headline: { ar: 'شغف بالهندسة.\nأثر بلا حدود.', en: 'Driven by engineering.\nDefined by impact.' },
    intro: { ar: 'مجتمع هندسي في جامعة نجران يحوّل الفضول إلى معرفة، والأفكار إلى تجارب. نتعلّم، نصمّم، ونبتكر معًا.', en: 'A community at Najran University turning curiosity into knowledge and ideas into experiences. We learn, design, and build together.' },
    about: { ar: 'مساحتك لتجربة الهندسة خارج حدود القاعة. نجمع الطلاب حول التعلّم العملي، والعمل الجماعي، وتبادل المعرفة في مجالات الهندسة الميكانيكية.', en: 'Your space to explore engineering beyond the classroom. We bring students together through hands-on learning, teamwork, and sharing knowledge in mechanical engineering.' },
    cta: { ar: 'المستقبل يبدأ بفكرة.\nوفريق يؤمن بها.', en: 'The future starts with an idea.\nAnd a team that believes in it.' },
    email: '', instagram: '', linkedin: '', logo: 'brand/asme-najran.png',
    announcement: {ar:'',en:''},
    showExamples: true,
  },
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
  if(data.projects.length>100||data.events.length>100)throw Error('Maximum 100 entries per section');
  for(const k of ['name','eyebrow','headline','intro','about','cta','announcement'])for(const lang of ['ar','en'])if(typeof data.site[k]?.[lang]!=='string'||data.site[k][lang].length>5000)throw Error(`Invalid ${k}.${lang}`);
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
      if(key==='events'&&x.date&&!Number.isFinite(new Date(x.date+'+03:00').getTime()))throw Error('Invalid event date');
    }
  }
  return clone(data);
}
