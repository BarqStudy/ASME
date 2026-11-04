export const fieldTypes=['text','textarea','email','number','date','radio','select','multiselect','checkbox'];
export const choiceTypes=['radio','select','multiselect'];
export const defaultRegistration={
 open:false,version:'membership-v1',
 title:{ar:'انضم إلى نادي ASME',en:'Join the ASME community'},
 description:{ar:'لطلاب كلية الهندسة بجامعة نجران. شاركنا شغفك بالميكانيكا، وكن جزءًا من تجارب النادي وأنشطته ومسابقاته.',en:'For College of Engineering students at Najran University. Share your interest in mechanical engineering and take part in our activities and competitions.'},
 fields:[
  {id:'name',purpose:'name',type:'text',label:{ar:'الاسم الكامل',en:'Full name'},help:{ar:'',en:''},required:true,options:[]},
  {id:'email',purpose:'email',type:'email',label:{ar:'البريد الجامعي',en:'University email'},help:{ar:'',en:''},required:true,options:[]},
  {id:'major',purpose:'',type:'radio',label:{ar:'التخصص الهندسي',en:'Engineering major'},help:{ar:'النادي يرحّب بطلاب كلية الهندسة، وتتركّز أنشطته على الميكانيكا.',en:'The club welcomes engineering students, with activities focused on mechanical engineering.'},required:true,options:[{id:'mechanical',label:{ar:'الهندسة الميكانيكية',en:'Mechanical engineering'}},{id:'electrical',label:{ar:'الهندسة الكهربائية',en:'Electrical engineering'}},{id:'civil',label:{ar:'الهندسة المدنية',en:'Civil engineering'}},{id:'other',label:{ar:'تخصص هندسي آخر',en:'Another engineering major'}}]},
  {id:'interests',purpose:'',type:'multiselect',label:{ar:'ماذا تحب أن تجرّب معنا؟',en:'What would you like to explore?'},help:{ar:'يمكن اختيار أكثر من إجابة.',en:'Select all that apply.'},required:true,options:[{id:'design',label:{ar:'التصميم والتصنيع',en:'Design and manufacturing'}},{id:'energy',label:{ar:'الطاقة والأنظمة الحرارية',en:'Energy and thermal systems'}},{id:'robotics',label:{ar:'الروبوتات والتحكم',en:'Robotics and control'}},{id:'activities',label:{ar:'الأنشطة والمسابقات',en:'Activities and competitions'}}]},
 ]
};
function bilingual(value,limit,empty=false){return value&&['ar','en'].every(l=>typeof value[l]==='string'&&value[l].length<=limit&&(empty||value[l].trim()));}
export function validateRegistration(input){
 if(!input||typeof input.open!=='boolean'||typeof input.version!=='string'||!/^[A-Za-z0-9_-]{1,100}$/.test(input.version)||!bilingual(input.title,300)||!bilingual(input.description,5000,true)||!Array.isArray(input.fields)||input.fields.length<2||input.fields.length>40)throw Error('Invalid registration form');
 const ids=new Set(),purposes=[];
 for(const field of input.fields){
  if(!field||typeof field.id!=='string'||!/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(field.id)||ids.has(field.id)||!fieldTypes.includes(field.type)||!bilingual(field.label,300)||!bilingual(field.help,1000,true)||typeof field.required!=='boolean'||!['','name','email'].includes(field.purpose)||!Array.isArray(field.options))throw Error('Invalid form field');ids.add(field.id);
  if(field.purpose){purposes.push(field.purpose);if(!field.required||field.type!==(field.purpose==='email'?'email':'text'))throw Error('Identity fields must remain required');}
  const optionIds=new Set();if(choiceTypes.includes(field.type)){if(field.options.length<2||field.options.length>20)throw Error('Use 2–20 choices');for(const option of field.options){if(typeof option.id!=='string'||!/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(option.id)||optionIds.has(option.id)||!bilingual(option.label,300))throw Error('Invalid choice');optionIds.add(option.id);}}
  else if(field.options.length)throw Error('Unexpected choices');
 }
 if(purposes.filter(p=>p==='name').length!==1||purposes.filter(p=>p==='email').length!==1)throw Error('One name and email field are required');return structuredClone(input);
}
export function validateAnswers(registration,raw){
 validateRegistration(registration);if(!raw||typeof raw!=='object'||Array.isArray(raw)||JSON.stringify(raw).length>200000)throw Error('Invalid answers');
 const ids=new Set(registration.fields.map(f=>f.id));if(Object.keys(raw).some(id=>!ids.has(id)))throw Error('Unknown question');const answers={};
 for(const field of registration.fields){let value=raw[field.id];if(value===undefined||value===null)value=field.type==='multiselect'?[]:field.type==='checkbox'?false:'';
  const fail=()=>{const error=Error('Invalid field');error.field=field.id;throw error;};
  if(field.type==='multiselect'){if(!Array.isArray(value)||value.length>20||new Set(value).size!==value.length||value.some(id=>typeof id!=='string'||!field.options.some(o=>o.id===id)))fail();}
  else if(field.type==='checkbox'){if(typeof value!=='boolean')fail();}
  else{if(typeof value!=='string')fail();value=value.trim();const limit=field.purpose==='name'?120:field.type==='email'?254:field.type==='textarea'?5000:1000;if(value.length>limit)fail();if(value){if(field.type==='email'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))fail();if(field.type==='number'&&(!/^-?(?:\d+(?:\.\d+)?|\.\d+)$/.test(value)||!Number.isFinite(Number(value))))fail();if(field.type==='date'&&(!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value))||new Date(value).toISOString().slice(0,10)!==value))fail();if(['radio','select'].includes(field.type)&&!field.options.some(o=>o.id===value))fail();}}
  if(field.required&&(!value||Array.isArray(value)&&!value.length||field.purpose==='name'&&value.length<2))fail();answers[field.id]=value;
 }return answers;
}
