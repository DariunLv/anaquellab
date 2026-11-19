// Tablero de la tienda · SOLO DATOS REALES (cámaras con YOLO + OpenCV, y lo que registras en AnaquelLab). Nada simulado.
const $=id=>document.getElementById(id),sum=a=>a.reduce((x,y)=>x+y,0),esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const HS=[...Array(14).keys()].map(i=>i+9),BASES=['','http://localhost:8000','http://127.0.0.1:8000'];
let prodCache={},timer=null,live=false,base='',busy=false,n=0,hist=null,selDay='',selHr=Math.min(22,Math.max(9,new Date().getHours())),ajustes={detector:true,mapa_calor:true,trayectorias:false,roi:true,intensidad:.7,transparencia:.6};
async function api(path,opt){for(const b of (live?[base]:BASES)){try{const r=await fetch(b+path,{...opt,signal:AbortSignal.timeout(2500)});if(r.ok&&(r.headers.get('content-type')||'').includes('json')){base=b;return r.json();}}catch{}}return null;}
const proj=()=>window.AnaquelLab?.getProject?.(),num=s=>parseInt(String(s).replace(/\D/g,''))||0,zn=name=>{const m=/Cám\.\s*(\d+)/.exec(name||'');return m?+m[1]:0;};
function bars(el,items,max){el.innerHTML=items.length?items.map(([nm,v,c,x])=>`<div class="tb-bar"><span class="n">${esc(nm)}</span><i style="width:${Math.max(2,v/Math.max(1,max)*55)}%;background:${c}"></i><span class="v">${x||Math.round(v)}</span></div>`).join(''):'<p class="tb-note">Sin datos todavía.</p>';}
function tiles(cams){const box=$('tb-cams');cams.forEach(cam=>{if(!$('tb-t-'+cam.id))box.insertAdjacentHTML('beforeend',`<div class="tb-card tb-6 tb-cam" id="tb-t-${cam.id}"><h2>${esc(cam.nombre)} · ${esc(cam.zona||'Anaquel '+cam.anaquel)} <small id="tb-l-${cam.id}"></small></h2><div class="tb-view" id="tb-v-${cam.id}"></div><p class="tb-note" id="tb-i-${cam.id}"></p></div>`);
 const v=$('tb-v-'+cam.id);if(cam.conectado&&!v.querySelector('img'))v.innerHTML=`<img alt="Imagen procesada con YOLO de ${esc(cam.nombre)}" src="${base}/api/camara/${cam.id}/stream">`;if(!cam.conectado)v.innerHTML=`<p class="tb-note" style="padding:18px;text-align:center">${esc(cam.error||'Sin señal de la cámara.')} Revisa la fuente en config.json.</p>`;
 $('tb-l-'+cam.id).textContent=cam.conectado?'● en vivo':'● sin señal';$('tb-l-'+cam.id).className=cam.conectado?'on':'off';$('tb-i-'+cam.id).textContent=`Hoy: ${cam.acercamientos} acercamientos · ${cam.interacciones} interacciones candidatas · permanencia ${cam.interacciones?Math.round(cam.permanencia_prom_s)+' s':'—'} · ocupación máx. ${cam.ocupacion_max||0} pers.`;});}
function draw(st){const P=proj(),R=window.AnaquelLab?.getSelected?.();
 const hoy=st?.dia_hoy||new Date().toLocaleDateString('sv-SE'),dias=[...new Set([hoy,...Object.keys(hist||{})])].sort().reverse(),ds=$('tb-dia');
 if(ds.dataset.n!==dias.join()){ds.dataset.n=dias.join();ds.innerHTML=dias.map(d=>`<option value="${d}">${d===hoy?'Hoy · ':''}${d}</option>`).join('');}
 if(!selDay||!dias.includes(selDay))selDay=hoy;ds.value=selDay;const esHoy=selDay===hoy;$('tb-hl').textContent=selHr+':00';
 const shelves=P?P.anaqueles.map(a=>a.name):[];const cams=st?st.camaras:[];
 // datos por cámara del día elegido
 const D={};if(esHoy)cams.forEach(c=>{D[num(c.id)]={h:c.por_hora,hi:c.por_hora_int||{},ni:c.interacciones};});else Object.entries(hist?.[selDay]||{}).forEach(([id,d])=>{D[num(id)]={h:d.por_hora||{},hi:d.por_hora_int||{},ni:d.interacciones||0,o:d.origen};});
 const org=Object.values(D).map(d=>d.o).find(Boolean);$('tb-org').textContent=org==='estimado_replicado'?'Día estimado: repite el patrón semanal del equipo (no medido por cámaras).':org==='patron_equipo'?'Día del patrón registrado por el equipo.':'';
 const zonas=(shelves.length?shelves:Object.keys(D).map(k=>'Cám. '+k)).map(nm=>({nm,k:zn(nm)||0}));
 const Hh=(k,h)=>D[k]?.h?.[h]||0,tot=k=>sum(HS.map(h=>Hh(k,h)));
 const serie=HS.map(h=>sum(Object.keys(D).map(k=>Hh(k,h)))),mx=Math.max(0,...serie);
 $('tb-k1').textContent=st?serie[selHr-9]:'—';$('tb-k2').textContent=st?sum(Object.values(D).map(d=>d.hi[selHr]||0)):'—';
 const SV=(P?.sales||[]).filter(x=>x.date===selDay);$('tb-k3').textContent=SV.length?sum(SV.map(x=>x.quantity)):(P?.sales?.length?'0':'—');$('tb-k4').textContent=SV.length?sum(SV.map(x=>x.quantity*(x.price-x.cost))).toLocaleString('es-PE',{maximumFractionDigits:2}):'—';
 // zonas (interacciones; si aún no hay candidatas, acercamientos)
 const zi=zonas.map(z=>({...z,v:D[z.k]?(D[z.k].ni||tot(z.k)):0,cam:!!D[z.k]})),zs=[...zi].sort((a,b)=>b.v-a.v),top=zs[0];
 const hot=new Set(zs.filter(z=>z.v>0).slice(0,2).map(z=>z.nm));
 bars($('tb-zonas'),zs.map(z=>[z.nm.replace('Cám. ','Cámara ').replace(' · ',': '),z.v,hot.has(z.nm)?'#146651':'#d99a3c',z.cam?null:'sin cámara']),top?top.v:1);
 // recomendaciones reales
 const alto=HS.filter((h,i)=>mx>0&&serie[i]>=.75*mx),pico=serie.indexOf(mx)+9,rc=[];
 if(!st)rc.push(['al','No hay datos de cámaras: enciende el servidor de visión (iniciar_servidor.bat).']);
 else if(!mx)rc.push(['','Aún no hay acercamientos registrados ese día. Deja el servidor encendido en horario de atención.']);
 else{rc.push([alto.includes(selHr)?'al':'ok',alto.includes(selHr)?`Estás en hora de mayor afluencia (${alto[0]}:00 a ${alto[alto.length-1]+1}:00): ubica al personal en ${[...hot].slice(0,2).map(s=>s.split(' · ')[0]).join(' y ')||'las zonas con más movimiento'}.`:`Fuera de la hora de mayor afluencia (${alto[0]}:00 a ${alto[alto.length-1]+1}:00): buen momento para reponer.`]);
  rc.push(['',`El pico del día fue a las ${pico}:00 con ${mx} acercamientos.`]);if(top&&top.v)rc.push(['',`La zona con más interacciones es ${top.nm.replace(' · ',': ')} (${top.v}).`]);}
 if(R&&P)rc.push(['ok','Hay una distribución calculada en Optimización: revisa abajo los productos que cambian de anaquel.']);else rc.push(['','Calcula una distribución en Optimización (con tus datos reales) para ver aquí qué conviene mover.']);
 const pr=P?P.productos.filter(p=>p.stock>0&&p.demand>0).map(p=>({n:p.name,c:p.stock/(p.demand/7)})).sort((a,b)=>a.c-b.c):[];if(pr.length&&pr[0].c<7)rc.push(['al',`Reponer ${pr[0].n}: alcanza para unos ${Math.floor(pr[0].c)} días con la demanda registrada.`]);
 $('tb-recs').innerHTML=rc.map(r=>`<div class="tb-rec ${r[0]}">${esc(r[1])}</div>`).join('');
 // personas por hora
 const otros=Object.keys(hist||{}).filter(d=>d!==selDay),prom=otros.length?HS.map(h=>{const v=otros.map(d=>sum(Object.values(hist[d]).map(c=>c.por_hora?.[h]||0)));return sum(v)/v.length;}):null;
 const M=Math.max(1,mx,...(prom||[0]))*1.1,X=i=>40+i*(640/13),Y=v=>210-v/M*190,L=a=>a.map((v,i)=>(i?'L':'M')+X(i)+' '+Y(v)).join(' ');
 const a0=alto.length?alto[0]-9:-1,a1=alto.length?alto[alto.length-1]-9:-1;
 $('tb-af').innerHTML=(a0>=0?`<rect x="${X(a0)-14}" y="10" width="${X(a1)-X(a0)+28}" height="200" fill="#fff3d9"/>`:'')+[0,.5,1].map(t=>`<line x1="40" x2="680" y1="${Y(M*t)}" y2="${Y(M*t)}" stroke="#e0e7df"/><text x="34" y="${Y(M*t)+4}" font-size="10" text-anchor="end" fill="#6a7b76">${Math.round(M*t)}</text>`).join('')+HS.map((x,i)=>`<text x="${X(i)}" y="228" font-size="10" text-anchor="middle" fill="#6a7b76">${x}</text>`).join('')+(prom?`<path d="${L(prom)}" fill="none" stroke="#146651" stroke-width="2" stroke-dasharray="5 4"/>`:'')+`<path d="${L(serie)}" fill="none" stroke="#d99a3c" stroke-width="3"/><circle cx="${X(selHr-9)}" cy="${Y(serie[selHr-9])}" r="6" fill="#c8553d"/><text x="46" y="20" font-size="11" fill="#b9791f">— día elegido</text>`+(prom?`<text x="140" y="20" font-size="11" fill="#146651">- - promedio de los otros días</text>`:'');
 // ventas por día
 const por={};(P?.sales||[]).forEach(s=>{por[s.date]=(por[s.date]||0)+s.quantity;});const vd=Object.keys(por).sort().slice(-7),mv=Math.max(1,...vd.map(d=>por[d]));
 $('tb-vd').innerHTML=vd.length?vd.map((d,i)=>{const x=12+i*41,hh=por[d]/mv*180;return `<rect x="${x}" y="${200-hh}" width="30" height="${hh}" rx="3" fill="${d===selDay?'#c8553d':'#146651'}"/><text x="${x+15}" y="${195-hh}" font-size="10" text-anchor="middle">${por[d]}</text><text x="${x+15}" y="218" font-size="9" text-anchor="middle" fill="#6a7b76">${d.slice(5)}</text>`}).join(''):'<text x="150" y="110" font-size="12" text-anchor="middle" fill="#6a7b76">Aún no registras ventas</text>';
 // mapa de calor
 const cm=Math.max(1,...zonas.flatMap(z=>HS.map(h=>Hh(z.k,h))));let t='<table><tr><th>Cámara</th>'+HS.map(x=>`<th>${x}</th>`).join('')+'</tr>';
 zonas.forEach(z=>{t+=`<tr><td>${z.k||esc(z.nm)}</td>`+HS.map(h=>{if(!D[z.k])return `<td style="text-align:center;color:#b4bfba;${h===selHr?'outline:2px solid #c8553d':''}">–</td>`;const v=Hh(z.k,h),a=v/cm;return `<td style="background:rgba(20,102,81,${a});color:${a>.5?'#fff':'#19332f'};text-align:center;${h===selHr?'outline:2px solid #c8553d':''}">${v}</td>`}).join('')+'</tr>'});$('tb-calor').innerHTML=t+'</table>';
 // productos
 const ses={},ven={};(P?.sessions||[]).forEach(x=>{ses[x.sku]=(ses[x.sku]||0)+x.confirmed+x.missed;});SV.forEach(x=>{ven[x.sku]=(ven[x.sku]||0)+x.quantity;});
 const PH=prodCache[selDay]||{};const L2=(P?.productos||[]).map(p=>[p.name,ses[p.sku]||PH[p.sku]?.interacciones||0,ven[p.sku]||PH[p.sku]?.ventas||0]).sort((a,b)=>b[1]-a[1]||b[2]-a[2]);
 $('tb-top').innerHTML='<tr><th>Producto</th><th>Vistos</th><th>Vendidos</th></tr>'+L2.map(r=>`<tr><td>${esc(r[0])}</td><td>${r[1]||'—'}</td><td>${r[2]||'—'}</td></tr>`).join('')+(L2.some(r=>r[1]||r[2])?'':'<tr><td colspan="3" class="tb-note">Se llena con las sesiones revisadas y las ventas que registres.</td></tr>');
 // plano
 const lay=(el,items)=>{const g={};items.forEach(([nm,s])=>(g[s]=g[s]||[]).push(nm));el.innerHTML=shelves.map(s=>`<div class="tb-z ${hot.has(s)?'hot':''}"><b>${esc(s)}</b>${(g[s]||[]).map(x=>'• '+esc(x)).join('<br>')}</div>`).join('');};
 if(P){lay($('tb-la'),P.productos.filter(p=>p.current_faces>0&&p.current_shelf).map(p=>[p.name,p.current_shelf]));
  if(R){lay($('tb-lc'),R.filas.map(x=>[x.producto+' ×'+x.frentes,x.anaquel]));const mv2=R.filas.map(x=>{const p=P.productos.find(q=>q.name===x.producto);return p&&p.current_shelf!==x.anaquel?`<span class="tb-mv">${esc(x.producto)}: ${esc((p.current_shelf||'—').split(' · ')[0])} → ${esc(x.anaquel.split(' · ')[0])}</span>`:''}).filter(Boolean);$('tb-lnote').innerHTML=mv2.length?'Cambios: '+mv2.join(' · '):'La propuesta coincide con la distribución actual.';}
  else{$('tb-lc').innerHTML='<p class="tb-note">Aún no hay propuesta: completa tus datos y pulsa «Calcular distribución» en Optimización.</p>';$('tb-lnote').textContent='';}}
}
async function tick(){if(busy)return;busy=true;try{const st=await api('/api/estado');live=!!st;if(st&&selDay&&!prodCache[selDay]){const r=await api('/api/historial_producto?dia='+selDay);if(r)prodCache[selDay]=r;}if(n++%8===0&&live)hist=await api('/api/historial?dias=45');
 const b=$('tb-badge');b.className='tb-badge '+(st?'on':'off');b.textContent=st?'● Servidor de visión conectado · YOLO + OpenCV · '+st.hora_local:'● Servidor de visión apagado';$('tb-off').hidden=!!st;
 if(st){Object.assign(ajustes,st.ajustes);tiles(st.camaras);}else $('tb-cams').innerHTML='';
 draw(st);}finally{busy=false;}}
async function setAj(c){Object.assign(ajustes,c);if(live)await api('/api/ajustes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(c)});}
function build(){const s=$('centro');if(s.dataset.ready)return;s.dataset.ready='1';
 s.innerHTML=`<div class="pagehead"><div><p class="eyebrow">TU TIENDA DE COSMÉTICOS, DE UN VISTAZO</p><h1>Tablero de la tienda<span class="title-dot">.</span></h1><p class="muted">Personas, interacciones, zonas calientes y qué hacer ahora, por día y por hora. Datos reales: lo que miden las cámaras con YOLO y OpenCV y lo que tú registras. <span id="tb-badge" class="tb-badge off">…</span></p></div></div>
<div class="tb-card" id="tb-off" hidden style="border-color:#e2b25a;background:#fff8ea;margin-bottom:14px"><h2>El servidor de visión está apagado</h2><p class="tb-note" style="font-size:.9rem;margin:0">Abre la carpeta <b>servidor_vision</b>, haz doble clic en <b>iniciar_servidor.bat</b> y pon en <b>config.json</b> la dirección de tus cámaras (RTSP del DVR, o «pantalla:…» si las ves en Hik-Connect). Mientras tanto no se muestran cifras de cámaras: no hay datos inventados.</p></div>
<p class="tb-note" id="tb-org" style="margin:0 0 8px;font-weight:600;color:#a86125"></p><div class="tb-controls"><label>Día <select id="tb-dia"></select></label><label>Hora <input type="range" id="tb-hora" min="9" max="22" value="${selHr}"> <b id="tb-hl">${selHr}:00</b></label></div>
<div class="tb-grid">
<div class="tb-card tb-k"><strong id="tb-k1">—</strong><span>acercamientos a esta hora</span></div><div class="tb-card tb-k"><strong id="tb-k2">—</strong><span>interacciones a esta hora</span></div><div class="tb-card tb-k"><strong id="tb-k3">—</strong><span>ventas del día (unidades)</span></div><div class="tb-card tb-k"><strong id="tb-k4">—</strong><span>margen del día (S/)</span></div>
<div class="tb-card tb-6"><h2>Qué hacer ahora</h2><div id="tb-recs"></div></div><div class="tb-card tb-6"><h2>¿Dónde pasa el tiempo? Interacciones por zona</h2><div id="tb-zonas"></div></div>
<div class="tb-card tb-8"><h2>Personas por hora: día elegido y promedio</h2><svg id="tb-af" viewBox="0 0 700 235" width="100%"></svg></div><div class="tb-card tb-4"><h2>Ventas por día</h2><svg id="tb-vd" viewBox="0 0 300 225" width="100%"></svg></div>
<div class="tb-card tb-8"><h2>Mapa de calor: acercamientos por cámara y hora</h2><div style="overflow:auto"><div id="tb-calor"></div></div></div><div class="tb-card tb-4"><h2>Productos más vistos (interacciones)</h2><table id="tb-top"></table></div>
<div class="tb-card tb-12"><h2>Plano: distribución actual y propuesta del modelo</h2><div class="tb-two"><div><b>Actual</b><div class="tb-lay" id="tb-la"></div></div><div><b>Propuesta (de Optimización)</b><div class="tb-lay" id="tb-lc"></div></div></div><p class="tb-note" id="tb-lnote"></p></div>
<div class="tb-card tb-12"><h2>Cámaras en vivo con YOLO + OpenCV</h2><div class="tb-ctl">${[['detector','Detector de personas (YOLO)'],['mapa_calor','Mapa de calor'],['trayectorias','Trayectorias'],['roi','Zonas de interés']].map(([k,t])=>`<label><input type="checkbox" data-aj="${k}" ${ajustes[k]?'checked':''}> ${t}</label>`).join('')}<label>Intensidad <input type="range" id="tb-int" min="10" max="100" value="70"></label><label>Transparencia <input type="range" id="tb-tra" min="0" max="100" value="60"></label></div></div>
</div><div class="tb-grid" id="tb-cams" style="margin-top:16px"></div>
<p class="tb-note">Acercamiento = persona que entra a la zona del anaquel; interacción candidata = se queda más del tiempo mínimo. La visión artificial la propone y una persona la revisa; una detección no es una compra. Sin identificación facial. Detección con YOLO (Ultralytics) + ByteTrack, lectura y mapa de calor con OpenCV, registro en base de datos local.</p>`;
 s.querySelectorAll('[data-aj]').forEach(i=>i.onchange=()=>setAj({[i.dataset.aj]:i.checked}));$('tb-int').oninput=e=>setAj({intensidad:e.target.value/100});$('tb-tra').oninput=e=>setAj({transparencia:e.target.value/100});
 $('tb-dia').onchange=e=>{selDay=e.target.value;tick();};$('tb-hora').oninput=e=>{selHr=+e.target.value;tick();};}
window.AnaquelCentro={start(){build();tick();clearInterval(timer);timer=setInterval(tick,1500);},stop(){clearInterval(timer);timer=null;}};
