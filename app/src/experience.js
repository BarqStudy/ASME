export function enhanceExperience(root){
 const abort=new AbortController();const signal=abort.signal;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const progress=document.createElement('div');progress.className='reading-progress';progress.setAttribute('aria-hidden','true');root.prepend(progress);
 let raf=0;const update=()=>{const length=document.documentElement.scrollHeight-innerHeight;progress.style.transform=`scaleX(${length>0?scrollY/length:0})`;raf=0;};
 const scroll=()=>{if(!raf)raf=requestAnimationFrame(update);};window.addEventListener('scroll',scroll,{passive:true,signal});window.addEventListener('resize',scroll,{passive:true,signal});update();
 const observed=root.querySelectorAll('.about-strip,.project-card,.event-list>button');
 const reveal=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-revealed');reveal.unobserve(entry.target);} }),{threshold:.05});
 if(!reduced.matches)observed.forEach((el,i)=>{el.classList.add('scroll-reveal');el.style.setProperty('--reveal-delay',`${i%3*50}ms`);reveal.observe(el);});
 if(!reduced.matches&&matchMedia('(pointer:fine)').matches){root.querySelectorAll('.project-image').forEach(el=>{el.addEventListener('pointermove',event=>{const rect=el.getBoundingClientRect();el.style.setProperty('--tilt-x',`${-(event.clientY-rect.top-rect.height/2)/rect.height*5}deg`);el.style.setProperty('--tilt-y',`${(event.clientX-rect.left-rect.width/2)/rect.width*5}deg`);},{signal});el.addEventListener('pointerleave',()=>{el.style.setProperty('--tilt-x','0deg');el.style.setProperty('--tilt-y','0deg');},{signal});});}
 const navLinks=[...root.querySelectorAll('#main-nav a')];
 const sections=[...root.querySelectorAll('main section[id]')];
 const spy=new IntersectionObserver(entries=>{const active=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];if(active){const href='#'+active.target.id;navLinks.forEach(a=>{const selected=a.getAttribute('href')===href;a.classList.toggle('active',selected);if(selected)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});}},{rootMargin:'-15% 0px -55% 0px',threshold:[0,.1,.4]});sections.forEach(section=>spy.observe(section));
 return ()=>{abort.abort();cancelAnimationFrame(raf);reveal.disconnect();spy.disconnect();progress.remove();};
}
