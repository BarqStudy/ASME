import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createMechanism} from './mechanisms';
import {t} from './lib/i18n';
const TAU=Math.PI*2;
const pauseSVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 5v14M16 5v14"/></svg>';
const playSVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m8 5 11 7-11 7Z"/></svg>';
export function mountLab(grid){
 const abort=new AbortController();const signal=abort.signal;
 let renderer,observer,intersection,views=[],disposed=false;
 const dispose=()=>{if(disposed)return;disposed=true;abort.abort();observer?.disconnect();intersection?.disconnect();renderer?.setAnimationLoop(null);const geometries=new Set(),materials=new Set();views.forEach(v=>{v.controls.dispose();v.scene.traverse(m=>{if(m.geometry)geometries.add(m.geometry);if(m.material)(Array.isArray(m.material)?m.material:[m.material]).forEach(a=>materials.add(a));});});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());renderer?.dispose();renderer?.forceContextLoss();renderer?.domElement.remove();};
 try{
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');const coarse=matchMedia('(pointer: coarse)').matches;
 renderer=new THREE.WebGLRenderer({antialias:!coarse,alpha:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio,coarse?1:1.25));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setClearColor(0x000000,0);renderer.domElement.className='lab-canvas';renderer.domElement.setAttribute('aria-hidden','true');grid.prepend(renderer.domElement);renderer.setScissorTest(true);
 let dirty=true,active=false,last=0,readout=0;
 const status=document.querySelector('#lab-status');
 const announce=value=>{status.textContent=value;};
 const updatePlay=v=>{v.play.innerHTML=v.running?pauseSVG:playSVG;v.play.setAttribute('aria-pressed',String(!v.running));v.play.setAttribute('aria-label',`${v.running?t('pause'):t('play')} — ${t('model_'+v.type)}`);};
 const updateAll=()=>{const allPaused=views.every(v=>!v.running);const button=document.querySelector('#lab-pause-all');button.textContent=allPaused?t('labPlayAll'):t('labPauseAll');button.setAttribute('aria-pressed',String(allPaused));};
 const manual=(v,phase)=>{v.phase=phase;v.running=false;v.dirty=true;dirty=true;v.range.value=String(Math.round(((phase%TAU+TAU)%TAU)/TAU*360));v.output.textContent=`${v.range.value}°`;updatePlay(v);updateAll();};
 for(const card of grid.querySelectorAll('[data-mechanism]')){
  const type=card.dataset.mechanism,stage=card.querySelector('.mechanism-stage');const scene=new THREE.Scene();scene.add(new THREE.AmbientLight(0xd9edff,2.4));const key=new THREE.DirectionalLight(0xffffff,4);key.position.set(3,5,7);scene.add(key);const fill=new THREE.DirectionalLight(0x43a9ff,2);fill.position.set(-4,1,-2);scene.add(fill);
  const camera=new THREE.PerspectiveCamera(38,1,.1,50);camera.position.set(3,2,7.5);const model=createMechanism(type);scene.add(model.root);
  const controls=new OrbitControls(camera,stage);controls.enablePan=false;controls.enableZoom=false;controls.enableDamping=true;controls.enabled=false;controls.target.set(0,.15,0);controls.update();stage.style.touchAction='pan-y';
  const v={card,type,stage,scene,camera,model,controls,phase:.65,running:!reduced.matches,spread:0,targetSpread:0,visible:false,dirty:true,mode:'drive',range:card.querySelector('[data-phase]'),output:card.querySelector('[data-angle]'),play:card.querySelector('[data-play]')};views.push(v);updatePlay(v);
  controls.addEventListener('change',()=>{dirty=true;v.dirty=true;});
  const setMode=mode=>{v.mode=mode;controls.enabled=mode==='inspect';card.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));stage.querySelector('.stage-hint').textContent=mode==='drive'?t('labDrag'):t('labOrbit');};
  card.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',()=>{setMode(button.dataset.mode);announce(`${t('model_'+type)} — ${t(button.dataset.mode==='drive'?'labDrive':'labInspect')}`);},{signal}));
  let drag=null;
  stage.addEventListener('pointerdown',event=>{if(v.mode!=='drive'||event.button!==0)return;drag={id:event.pointerId,x:event.clientX,y:event.clientY,start:v.phase};stage.setPointerCapture(event.pointerId);stage.classList.add('is-dragging');manual(v,v.phase);},{signal});
  stage.addEventListener('pointermove',event=>{if(drag?.id!==event.pointerId)return;const dx=event.clientX-drag.x,dy=event.clientY-drag.y;manual(v,drag.start+(dx-dy*.4)*.018);},{signal});
  const end=event=>{if(drag?.id!==event.pointerId)return;drag=null;stage.classList.remove('is-dragging');if(stage.hasPointerCapture(event.pointerId))stage.releasePointerCapture(event.pointerId);};
  stage.addEventListener('pointerup',end,{signal});stage.addEventListener('pointercancel',end,{signal});stage.addEventListener('lostpointercapture',()=>{drag=null;stage.classList.remove('is-dragging');},{signal});
  stage.addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();if(v.mode==='drive')manual(v,v.phase+(['ArrowRight','ArrowUp'].includes(event.key)?1:-1)*Math.PI/36);else{const offset=camera.position.clone().sub(controls.target);if(['ArrowLeft','ArrowRight'].includes(event.key))offset.applyAxisAngle(new THREE.Vector3(0,1,0),event.key==='ArrowRight'?.12:-.12);else offset.y+=event.key==='ArrowUp'?.2:-.2;camera.position.copy(controls.target).add(offset);controls.update();dirty=true;}}if(event.key==='Home'){event.preventDefault();reset();}},{signal});
  v.range.addEventListener('input',()=>manual(v,Number(v.range.value)/360*TAU),{signal});
  v.play.addEventListener('click',()=>{v.running=!v.running;dirty=true;updatePlay(v);updateAll();announce(`${t('model_'+type)} — ${v.running?t('play'):t('pause')}`);},{signal});
  const reset=()=>{manual(v,.65);v.targetSpread=0;card.querySelector('[data-explode]').checked=false;v.camera.position.set(3,2,7.5);controls.target.set(0,.15,0);controls.update();Object.values(model.materials).forEach(m=>m.wireframe=false);card.querySelector('[data-wire]').setAttribute('aria-pressed','false');setMode('drive');announce(t('reset'));};
  card.querySelector('[data-reset]').addEventListener('click',reset,{signal});
  card.querySelector('[data-wire]').addEventListener('click',event=>{const value=event.currentTarget.getAttribute('aria-pressed')!=='true';event.currentTarget.setAttribute('aria-pressed',String(value));Object.values(model.materials).forEach(m=>m.wireframe=value);dirty=true;},{signal});
  card.querySelector('[data-explode]').addEventListener('change',event=>{v.targetSpread=event.target.checked?1:0;dirty=true;},{signal});
  card.querySelector('.expand-model').addEventListener('click',event=>{const expanded=card.classList.toggle('is-expanded');event.currentTarget.setAttribute('aria-expanded',String(expanded));event.currentTarget.setAttribute('aria-label',`${expanded?t('labCollapse'):t('labExpand')} — ${t('model_'+type)}`);dirty=true;},{signal});
 }
 updateAll();
 document.querySelector('#lab-pause-all').addEventListener('click',()=>{const play=views.every(v=>!v.running);views.forEach(v=>{v.running=play;updatePlay(v);});updateAll();dirty=true;},{signal});
 reduced.addEventListener('change',event=>{if(event.matches){views.forEach(v=>{v.running=false;updatePlay(v);});updateAll();dirty=true;}},{signal});
 grid.addEventListener('keydown',event=>{if(event.key==='Escape'){grid.querySelectorAll('.is-expanded').forEach(card=>{card.classList.remove('is-expanded');card.querySelector('.expand-model').setAttribute('aria-expanded','false');});dirty=true;}},{signal});
 observer=new ResizeObserver(()=>{renderer.setSize(grid.clientWidth,grid.clientHeight,false);dirty=true;});observer.observe(grid);views.forEach(v=>observer.observe(v.stage));
 intersection=new IntersectionObserver(entries=>{for(const entry of entries){const v=views.find(v=>v.stage===entry.target);if(v)v.visible=entry.isIntersecting;}active=views.some(v=>v.visible);dirty=true;},{rootMargin:'40px'});views.forEach(v=>intersection.observe(v.stage));
 document.addEventListener('visibilitychange',()=>{dirty=true;last=0;},{signal});
 renderer.setAnimationLoop(time=>{
  if(disposed||document.hidden||!active)return;
  if(last&&time-last<(coarse?32:22))return;const dt=last?Math.min((time-last)/1000,.05):0;last=time;
  let animate=dirty;for(const v of views){if(!v.visible)continue;if(v.running){v.phase+=dt*.85;animate=true;}if(Math.abs(v.targetSpread-v.spread)>.001){v.spread=reduced.matches?v.targetSpread:THREE.MathUtils.lerp(v.spread,v.targetSpread,.14);animate=true;}if(v.controls.update())animate=true;}
  if(!animate)return;dirty=false;const bounds=grid.getBoundingClientRect();renderer.setScissorTest(false);renderer.clear();renderer.setScissorTest(true);
  for(const v of views){if(!v.visible)continue;const rect=v.stage.getBoundingClientRect();if(rect.width<=0||rect.height<=0)continue;v.model.update(v.phase,v.spread);v.stage.dataset.phase=v.phase.toFixed(3);const x=rect.left-bounds.left,y=bounds.bottom-rect.bottom;renderer.setViewport(x,y,rect.width,rect.height);renderer.setScissor(x,y,rect.width,rect.height);v.camera.aspect=rect.width/rect.height;v.camera.updateProjectionMatrix();renderer.render(v.scene,v.camera);if(time-readout>100){v.range.value=String(Math.round(((v.phase%TAU+TAU)%TAU)/TAU*360));v.output.textContent=`${v.range.value}°`;}}
  if(time-readout>100)readout=time;
 });
 }catch(error){dispose();grid.querySelectorAll('.mechanism-stage').forEach(stage=>{stage.textContent=t('labUnavailable');stage.removeAttribute('tabindex');});grid.querySelectorAll('button,input').forEach(control=>control.disabled=true);const globalPause=document.querySelector('#lab-pause-all');if(globalPause)globalPause.disabled=true;}
 return dispose;
}
