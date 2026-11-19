const paths={
 spark:'M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z M20 2v4 M18 4h4',
 camera:'M3 6h13v13H3z M16 10l5-3v11l-5-3 M7 6l1-3h4l1 3',
 arrow:'M5 12h14 M13 6l6 6-6 6',shield:'M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6z M8 12l3 3 5-6',
 eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z M9 12a3 3 0 106 0 3 3 0 10-6 0',
 check:'M5 12l4 4L19 6',receipt:'M5 3h14v18l-3-2-4 2-4-2-3 2z M9 8h6 M9 12h6 M9 16h3',
 people:'M8 11a4 4 0 100-8 4 4 0 100 8 M1 21v-2a7 7 0 0114 0v2 M17 4a4 4 0 010 8 M18 15a5 5 0 015 5v1',
 wallet:'M3 6h18v14H3z M3 6V4h15v2 M16 10h5v6h-5z',
 database:'M3 6c0-4 18-4 18 0s-18 4-18 0v12c0 4 18 4 18 0V6 M3 12c0 4 18 4 18 0',
 shelf:'M3 3v18 M21 3v18 M3 10h18 M3 19h18 M6 4h4v6H6z M13 3h5v7h-5z M7 13h4v6H7z M14 14h4v5h-4z',
 chart:'M3 3v18h18 M7 16v-5 M12 16V8 M17 16V4',
 scan:'M3 8V3h5 M16 3h5v5 M21 16v5h-5 M8 21H3v-5 M2 12h20',
 focus:'M4 9V4h5 M15 4h5v5 M20 15v5h-5 M9 20H4v-5 M8 12h8 M12 8v8',
 search:'M10 17a7 7 0 110-14 7 7 0 010 14 M15 15l6 6',
 balance:'M12 3v18 M6 21h12 M4 7h16 M5 7l-4 8h8z M19 7l-4 8h8z',
 clipboard:'M8 3h8v4H8z M8 5H4v17h16V5h-4 M8 12h8 M8 17h5',
 research:'M9 3h6 M10 3v6l-6 10q-1 2 2 2h12q3 0 2-2L14 9V3 M7 15h10',
 help:'M12 22a10 10 0 110-20 10 10 0 010 20 M9 8a3 3 0 116 0c0 2-3 2-3 5 M12 17h.01',
 pause:'M8 5v14 M16 5v14',play:'M7 4l14 8-14 8z'
};
export function icon(name){return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.spark}"/></svg>`;}
const guide=[
 {title:'Conoce tus productos y tu espacio.',text:'Empieza con lo que sí sabes de tu tienda. Esa información define lo que el modelo puede recomendar.',list:['Reemplaza el catálogo de ejemplo por tus productos.','Anota precio, costo variable, stock y ancho de cada producto.','Mide el ancho útil de tus anaqueles y el capital disponible.'],example:'Un labial de 3 cm con 4 frentes ocupa 12 cm del anaquel. Los frentes siempre son enteros.',page:'catalogo',action:'Preparar mi catálogo',label:'PREPARA LA BASE'},
 {title:'Observa un producto a la vez.',text:'Las cámaras te ayudan a observar. Una detección de persona todavía no confirma una interacción comercial.',list:['Abre el reproductor 3 × 3 de Hik-Connect y comparte esa pestaña.','Ajusta el encuadre para que cada cuadro contenga una sola cámara.','En Visión artificial, elige producto y anaquel; dibuja la zona de piso junto al producto.'],example:'También puedes abrir un video local. Una sesión necesita al menos 10 segundos de cobertura válida para guardarse.',page:'actividad',action:'Ir a Visión artificial',label:'OBSERVA CON UN PROPÓSITO'},
 {title:'Convierte observaciones en evidencia.',text:'La revisión humana conecta los candidatos del detector con tu definición de interacción comercial.',list:['Detén la medición y confirma o descarta cada evento.','Anota interacciones que el detector haya omitido y guarda la sesión.','Registra ventas reales con cantidad, precio y costo variable.'],example:'Si vendes 3 labiales a S/ 8 y cada uno tiene S/ 4.80 de costo variable, el margen observado es S/ 9.60.',page:'evidencia',action:'Ver mis interacciones y ventas',label:'REVISA Y REGISTRA'},
 {title:'Compara. Decide. Vuelve a medir.',text:'La programación entera busca una distribución factible para equilibrar interacción estimada y margen estimado.',list:['Elige modo exploratorio o calibrado; este último requiere sesiones por producto.','Ajusta el peso de cada objetivo, calcula y selecciona una alternativa.','Aplica una distribución y registra el después en horarios y condiciones comparables.'],example:'El gráfico compara propuestas del modelo. El informe compara datos observados antes y después; no prueba causalidad por sí solo.',page:'optimizar',action:'Comparar distribuciones',label:'OPTIMIZA Y CONTRASTA'}
];
export function initExperience({navigate}){
 const $=id=>document.getElementById(id),reduced=matchMedia('(prefers-reduced-motion: reduce)');
 document.querySelectorAll('[data-icon]').forEach(e=>e.innerHTML=icon(e.dataset.icon));
 const dialog=$('quick-guide');let step=0;
 const render=()=>{const g=guide[step];$('guide-title').textContent=g.title;$('guide-description').textContent=g.text;$('guide-step-label').textContent=`${step+1} DE 4 · ${g.label}`;$('guide-progress').innerHTML=guide.map((x,i)=>`<button data-guide-step="${i}" class="${i===step?'active':i<step?'done':''}" aria-label="Paso ${i+1}: ${x.label}" ${i===step?'aria-current="step"':''}></button>`).join('');$('guide-checklist').innerHTML=g.list.map(x=>`<li>${icon('check')}<span>${x}</span></li>`).join('');$('guide-example').textContent=g.example;$('guide-back').disabled=step===0;$('guide-next').disabled=step===3;$('guide-action').textContent=g.action;};
 document.querySelectorAll('[data-guide]').forEach(b=>b.addEventListener('click',()=>{step=Number(b.dataset.guide)||0;render();if(!dialog.open)dialog.showModal();}));
 $('guide-close').onclick=()=>dialog.close();dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
 $('guide-progress').onclick=e=>{const b=e.target.closest('[data-guide-step]');if(b){step=Number(b.dataset.guideStep);render();}};
 $('guide-back').onclick=()=>{step=Math.max(0,step-1);render();};$('guide-next').onclick=()=>{step=Math.min(3,step+1);render();};$('guide-action').onclick=()=>{dialog.close();navigate(guide[step].page);};
 document.querySelectorAll('[data-focus]').forEach(b=>b.onclick=()=>{const e=$(b.dataset.focus);e.scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'center'});e.tabIndex=e.tabIndex<0?-1:e.tabIndex;e.focus({preventScroll:true});e.classList.remove('focus-hint');void e.offsetWidth;e.classList.add('focus-hint');setTimeout(()=>e.classList.remove('focus-hint'),1600);});
 const explain=()=>{const w=Number($('weight').value);$('weight-explanation').textContent=(w===50?'Ambos objetivos tienen el mismo peso.':w>50?`Priorizas el margen (${w}%) y mantienes la interacción (${100-w}%).`:`Priorizas la interacción (${100-w}%) y mantienes el margen (${w}%).`)+' Pulsa «Calcular distribución» para actualizar la propuesta.';document.querySelectorAll('[data-weight]').forEach(b=>{const on=Number(b.dataset.weight)===w;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});};
 $('weight').addEventListener('input',explain);document.querySelectorAll('[data-weight]').forEach(b=>b.onclick=()=>{$('weight').value=b.dataset.weight;$('weight').dispatchEvent(new Event('input',{bubbles:true}));});explain();
 const search=()=>{const query=$('product-search').value.toLocaleLowerCase('es').trim();const rows=[...$('product-table').querySelectorAll('tbody tr')];let count=0;for(const row of rows){const text=[...row.querySelectorAll('[data-field="sku"],[data-field="name"]')].map(x=>x.value).join(' ').toLocaleLowerCase('es');row.hidden=!!query&&!text.includes(query);if(!row.hidden)count++;}$('product-search-count').textContent=`${count} de ${rows.length}`;};
 $('product-search').oninput=search;new MutationObserver(search).observe($('product-table'),{childList:true,subtree:true});$('product-table').addEventListener('change',search);search();
 let paused=reduced.matches;try{paused=paused||localStorage.getItem('anaquellab.animations-paused')==='true';}catch{}
 const animations=new Map();let runtime;
 const setState=()=>{document.body.classList.toggle('motion-paused',paused||reduced.matches);$('animation-toggle').setAttribute('aria-pressed',String(paused));$('animation-toggle').innerHTML=icon(paused?'play':'pause')+(paused?' Activar animaciones':' Pausar animaciones');for(const [el,a] of animations){if(paused||reduced.matches||!el.dataset.inView||document.hidden)a.pause();else a.play();}};
 const load=()=>runtime??=(new Promise((resolve,reject)=>{if(window.lottie)return resolve(window.lottie);const s=document.createElement('script');s.src='/vendor/lottie_light.min.js';s.onload=()=>resolve(window.lottie);s.onerror=reject;document.head.append(s);}));
 const observer=new IntersectionObserver(entries=>{for(const entry of entries){const el=entry.target;el.dataset.inView=entry.isIntersecting?'yes':'';if(entry.isIntersecting&&!animations.has(el)&&!el.dataset.loading){el.dataset.loading='yes';load().then(lottie=>{const fallback=el.querySelector('[data-icon]');const a=lottie.loadAnimation({container:el,renderer:'svg',loop:true,autoplay:false,path:`/assets/ui/${el.dataset.lottie}.json`,rendererSettings:{progressiveLoad:true}});animations.set(el,a);a.addEventListener('DOMLoaded',()=>{fallback?.remove();a.goToAndStop(45,true);setState();});a.addEventListener('data_failed',()=>{a.destroy();animations.delete(el);if(!el.firstChild)el.innerHTML=icon(el.dataset.lottie==='scan'?'scan':'chart');});}).catch(()=>{});}setState();}},{threshold:.15});
 document.querySelectorAll('[data-lottie]').forEach(el=>observer.observe(el));
 $('animation-toggle').onclick=()=>{paused=!paused;try{localStorage.setItem('anaquellab.animations-paused',String(paused));}catch{}setState();};reduced.addEventListener('change',setState);document.addEventListener('visibilitychange',setState);setState();
}
