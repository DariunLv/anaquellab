// Monitoreo en vivo. Dos fuentes reales: (1) la vista de Hik-Connect compartida en el navegador (detector COCO-SSD) y (2) el servidor YOLO + OpenCV (opcional).
import {icono as I} from './iconos.js';
import {Datos} from './datos.js';
import {loadDetector} from './detector.js';
import {ZoneTracker} from './research.js';
const $=id=>document.getElementById(id),sum=a=>a.reduce((x,y)=>x+y,0),esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const HS=[...Array(14).keys()].map(i=>i+9),BASES=['','http://localhost:8000','http://127.0.0.1:8000'],ZK='anaquellab.zonas.v1',L=()=>window.AnaquelLab?.live,P=()=>window.AnaquelLab?.getProject?.();
let zonas={},timer=null,srv=false,base='',busy=false,model=null,estado='',rr=0,det=false,contar=true,verCalor=true,verCajas=true,st=null,sh={};
try{zonas=JSON.parse(localStorage.getItem(ZK)||'{}')||{};}catch{}
const trackers=new Map(),stats={};
const zonaDe=i=>zonas[i]||Math.min(7,i+1);
const num=s=>parseInt(String(s).replace(/\D/g,''))||0,zn=name=>{const m=/Cám\.\s*(\d+)/.exec(name||'');return m?+m[1]:0;};
async function api(path,opt){for(const b of (srv?[base]:BASES)){try{const r=await fetch(b+path,{...opt,signal:AbortSignal.timeout(2500)});if(r.ok&&(r.headers.get('content-type')||'').includes('json')){base=b;return r.json();}}catch{}}return null;}
// ---------- conteo con la vista de Hik-Connect (navegador) ----------
async function procesar(){
 const l=L();if(!l||!l.connected()||!contar||det)return;
 const cams=l.cameras().filter(c=>c.enabled);if(!cams.length)return;
 if(!model){if(estado!=='cargando'){estado='cargando';loadDetector().then(m=>{model=m;estado='listo';}).catch(e=>{estado='error: '+e.message;});}return;}
 const c=cams[rr++%cams.length],can=l.canvas(c.i);if(!can||!can.width)return;
 det=true;
 try{const pred=await model.detect(can,20,.4);let t=trackers.get(c.i);if(!t){t=new ZoneTracker({dwell:3,confidence:.5});trackers.set(c.i,t);}
  const antes=t.nextId,fresh=t.sample(pred,performance.now()/1000,can.width,can.height,{x:.02,y:.04,w:.96,h:.94}),z=zonaDe(c.i),s=stats[c.i]??={ahora:0,ac:0,it:0};
  const nuevos=t.nextId-antes;for(let k=0;k<nuevos;k++){Datos.registrar(z,'a');s.ac++;}for(const e of fresh){Datos.registrar(z,'i');s.it++;}s.ahora=t.inside;
 }catch{}finally{det=false;}
}
// ---------- vista ----------
function paso(n,icono,titulo,texto,estadoTxt,ok,accion=''){return `<div class="mv-paso ${ok?'ok':''}"><div class="mv-n">${ok?I('check',18):n}</div><div class="mv-t"><b>${I(icono,16)} ${titulo}</b><p>${texto}</p><span class="mv-st">${estadoTxt}</span>${accion}</div></div>`;}
function build(){const s=$('monitoreo');if(s.dataset.ready)return;s.dataset.ready='1';
 s.innerHTML=`<div class="pagehead"><div><p class="eyebrow">VISIÓN ARTIFICIAL EN LA TIENDA</p><h1>Monitoreo en vivo<span class="title-dot">.</span></h1><p class="muted">Cuenta las personas que pasan frente a tus anaqueles, ahora mismo, con la vista de Hik-Connect o con el servidor YOLO.</p></div><span class="status" id="mv-estado">Sin conexión</span></div>
<div class="mv-pasos" id="mv-pasos"></div>
<div class="tb-grid" id="mv-kpis"></div>
<div class="tb-card tb-12 mv-live"><div class="mv-head"><h2>${I('camera',18)} Cámaras en vivo (Hik-Connect)</h2><div class="mv-opts"><label><input type="checkbox" id="mv-contar" checked> Contar personas</label><label><input type="checkbox" id="mv-calor" checked> Mapa de calor</label><label><input type="checkbox" id="mv-cajas" checked> Recuadros</label></div></div><p class="tb-note" id="mv-det"></p><div class="mv-tiles" id="mv-tiles"></div></div>
<div class="tb-grid" style="margin-top:16px">
<div class="tb-card tb-8"><h2>Personas por hora (hoy)</h2><svg id="mv-line" viewBox="0 0 700 235" width="100%"></svg></div>
<div class="tb-card tb-4"><h2>Por zona de la tienda (hoy)</h2><div id="mv-zonas"></div></div>
<div class="tb-card tb-8"><h2>Mapa de calor: acercamientos por zona y hora (hoy)</h2><div style="overflow:auto"><div id="mv-calorT"></div></div></div>
<div class="tb-card tb-4"><h2>Qué hacer ahora</h2><div id="mv-recs"></div></div>
<div class="tb-card tb-6"><h2 id="mv-pa-t">Productos de la zona 1</h2><div id="mv-pa"></div></div><div class="tb-card tb-6"><h2 id="mv-pb-t">Productos de la zona 3</h2><div id="mv-pb"></div></div>
</div>
<details class="tb-card mv-adv" id="mv-adv"><summary>${I('server',18)} Opción avanzada: servidor YOLO + OpenCV <span class="mv-chip" id="mv-srvchip">apagado</span></summary>
 <p class="tb-note" style="margin:8px 0">Más preciso que el navegador y guarda todo en una base de datos aunque cierres la página. Corre en la computadora de la tienda.</p>
 <div class="mv-sem"><div id="mv-s1" class="mv-s"><i></i><b>Servidor</b><span>Apagado: doble clic en iniciar_servidor.bat</span></div><div id="mv-s2" class="mv-s"><i></i><b>Cámaras</b><span>Sin cámaras</span></div><div id="mv-s3" class="mv-s"><i></i><b>Contando</b><span>Sin datos</span></div></div>
 <div class="mv-ways"><div class="mv-way"><h3>Desde el grabador (DVR) Hikvision</h3><div class="mv-form"><label>IP del DVR<input id="mv-ip" placeholder="192.168.1.64"></label><label>Puerto<input id="mv-pt" value="554"></label><label>Usuario<input id="mv-us" placeholder="admin" autocomplete="off"></label><label>Clave<input id="mv-pw" type="password" autocomplete="new-password"></label><label>Cámaras (canales)<input id="mv-ch" value="1,3"></label></div><button class="primary" id="mv-save" type="button">Guardar y reiniciar el servidor</button><p class="tb-note" id="mv-msg">La clave solo se guarda en config.json de esa computadora.</p></div>
 <div class="mv-way"><h3>Desde la pantalla de Hik-Connect</h3><ol><li>Abre Hik-Connect con tus cámaras a la vista.</li><li>Doble clic en <b>elegir_region.bat</b>.</li><li>Marca cada cámara con el mouse y pulsa Enter. Se guarda solo.</li><li>Reinicia el servidor.</li></ol></div></div>
 <div class="mv-tiles" id="mv-srvtiles" style="margin-top:12px"></div></details>
<p class="tb-note">Visita = persona que entra a la zona del anaquel. Interacción candidata = se queda más de 3 segundos. Una detección no es una compra. No se reconocen rostros; las imágenes no salen de tu equipo.</p>`;
 $('mv-contar').onchange=e=>contar=e.target.checked;$('mv-calor').onchange=e=>{verCalor=e.target.checked;api('/api/ajustes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mapa_calor:verCalor})});};$('mv-cajas').onchange=e=>verCajas=e.target.checked;
 $('mv-save').onclick=guardar;
}
async function guardar(){const m=$('mv-msg'),ip=$('mv-ip').value.trim(),us=$('mv-us').value.trim(),pw=$('mv-pw').value,pt=$('mv-pt').value.trim()||'554',ch=$('mv-ch').value.split(',').map(x=>parseInt(x)).filter(x=>x>0&&x<65);
 if(!srv){m.textContent='Primero enciende el servidor (doble clic en iniciar_servidor.bat).';return;}
 if(!ip||!us||!pw||!ch.length){m.textContent='Completa IP, usuario, clave y los números de cámara (ejemplo: 1,3).';return;}
 m.textContent='Guardando…';const r=await api('/api/configurar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ip,puerto:pt,usuario:us,clave:pw,canales:ch})});$('mv-pw').value='';
 m.textContent=r?.ok?'Listo. El servidor se reinicia (10–20 segundos) y esta pantalla se reconecta sola.':'No se pudo guardar. '+(r?.error||'Revisa que el servidor esté encendido.');}
function luz(id,ok,txt){const e=$(id);if(!e)return;e.className='mv-s '+(ok?'ok':'');e.querySelector('span').textContent=txt;}
function pasos(){const l=L(),con=!!l?.connected(),cams=con?l.cameras().filter(c=>c.enabled):[];
 const a=con?`<button class="secondary" id="mv-go" type="button">Cambiar pestaña o ajustar el mosaico</button>`:`<button class="primary" id="mv-con" type="button">${I('plug',16)} Conectar Hik-Connect</button><a class="secondary btn" href="https://www.hik-connect.com/views/login/index.html#/portal" target="_blank" rel="noopener noreferrer">Abrir Hik-Connect</a>`;
 $('mv-pasos').innerHTML=paso(1,'plug','Conectar Hik-Connect','Se hace una sola vez. Después funciona en todas las pestañas.',con?`Conectado · ${cams.length} cámaras`:'Pendiente',con,a)
  +paso(2,'target','Elegir la zona de cada cámara','Dile al programa qué parte de la tienda ve cada cámara.',con?'Elige abajo en cada cámara':'Después del paso 1',con&&cams.every(c=>zonas[c.i]),'')
  +paso(3,'users','Contar personas','El detector cuenta solo; deja esta ventana abierta.',model?`Detector listo · ${sum(Object.values(stats).map(s=>s.ac))} visitas contadas`:(estado==='cargando'?'Cargando el detector…':(estado.startsWith('error')?estado:'Se activa al conectar')),!!model&&con,'');
 $('mv-con')&&($('mv-con').onclick=()=>l?.connect());$('mv-go')&&($('mv-go').onclick=()=>document.querySelector('[data-page=camaras]')?.click());}
function tiles(){const l=L(),box=$('mv-tiles');if(!l?.connected()){box.innerHTML=`<div class="mv-vacio">${I('camera',28)}<b>Aún no hay cámaras conectadas</b><p>Pulsa «Conectar Hik-Connect» en el paso 1 y comparte la pestaña de Hik-Connect.</p></div>`;box.dataset.k='';return;}
 const cams=l.cameras().filter(c=>c.enabled),key=cams.map(c=>c.i+':'+c.label).join();
 if(box.dataset.k!==key){box.dataset.k=key;const Z=P()?.anaqueles||[];box.innerHTML=cams.map(c=>`<article class="mv-tile"><div class="mv-cv"><canvas id="mv-c${c.i}" width="480" height="270" aria-label="Cámara ${esc(c.label)}"></canvas></div><div class="mv-tb"><b>Cámara ${esc(c.label)}</b><label>Zona <select data-z="${c.i}">${Z.map((s,j)=>`<option value="${j+1}" ${zonaDe(c.i)===j+1?'selected':''}>${esc(s.name)}</option>`).join('')}</select></label></div><div class="mv-num"><span>Ahora<b id="mv-a${c.i}">0</b></span><span>Visitas hoy<b id="mv-v${c.i}">0</b></span><span>Interacciones<b id="mv-i${c.i}">0</b></span></div></article>`).join('');
  box.querySelectorAll('[data-z]').forEach(s=>s.onchange=()=>{zonas[s.dataset.z]=+s.value;try{localStorage.setItem(ZK,JSON.stringify(zonas));}catch{}});}
 cams.forEach(c=>{const src=l.canvas(c.i),dst=$('mv-c'+c.i);if(!src||!dst||!src.width)return;const x=dst.getContext('2d');x.drawImage(src,0,0,dst.width,dst.height);const t=trackers.get(c.i),s=stats[c.i]||{ahora:0,ac:0,it:0};
  if(t&&verCalor){const mx=Math.max(...t.heat);if(mx>0){const cw=dst.width/12,ch=dst.height/7;t.heat.forEach((v,k)=>{if(!v)return;const a=.15+.5*Math.sqrt(v/mx),cx=(k%12+.5)*cw,cy=(Math.floor(k/12)+.5)*ch,r=Math.max(cw,ch)*1.1,g=x.createRadialGradient(cx,cy,0,cx,cy,r);g.addColorStop(0,`rgba(240,120,40,${a})`);g.addColorStop(1,'rgba(240,120,40,0)');x.fillStyle=g;x.fillRect(cx-r,cy-r,r*2,r*2);});}}
  if(t&&verCajas&&contar){x.lineWidth=2;x.font='12px sans-serif';for(const b of t.boxes){x.strokeStyle=b.inside?'#8fd14f':'#7ecad7';x.strokeRect(b.x*dst.width,b.y*dst.height,b.w*dst.width,b.h*dst.height);}}
  $('mv-a'+c.i).textContent=s.ahora;$('mv-v'+c.i).textContent=s.ac;$('mv-i'+c.i).textContent=s.it;});
 $('mv-det').textContent=!contar?'El conteo está en pausa.':model?'Detector activo: cuenta personas en cada cámara sin salir de tu equipo.':(estado==='cargando'?'Cargando el detector de personas… (la primera vez tarda unos segundos)':estado.startsWith('error')?estado:'');}
function hoyData(){ // zona -> {h:{}, hi:{}, ni}
 const out={},hoy=Datos.hoy();
 for(const [id,v] of Object.entries(Datos.liveHist()[hoy]||{}))out[num(id)]={h:v.por_hora,hi:v.por_hora_int,ni:v.interacciones,ac:v.acercamientos};
 for(const c of st?.camaras||[])out[num(c.id)]={h:c.por_hora,hi:c.por_hora_int||{},ni:c.interacciones,ac:c.acercamientos};
 return out;}
function charts(){const D=hoyData(),P1=P(),zs=(P1?.anaqueles||[]).map((a,j)=>({nm:a.name,k:zn(a.name)||j+1}));
 const serie=HS.map(h=>sum(Object.values(D).map(d=>+(d.h?.[h]||0)))),mx=Math.max(0,...serie),tot=sum(serie);
 const M=Math.max(1,mx)*1.15,X=i=>40+i*(640/13),Y=v=>210-v/M*190,d=serie.map((v,i)=>(i?'L':'M')+X(i)+' '+Y(v)).join(' ');
 $('mv-line').innerHTML=[0,.5,1].map(t=>`<line x1="40" x2="680" y1="${Y(M*t)}" y2="${Y(M*t)}" stroke="#e0e7df"/><text x="34" y="${Y(M*t)+4}" font-size="10" text-anchor="end" fill="#6a7b76">${Math.round(M*t)}</text>`).join('')+HS.map((h,i)=>`<text x="${X(i)}" y="228" font-size="10" text-anchor="middle" fill="#6a7b76">${h}</text>`).join('')+`<path d="${d}" fill="none" stroke="#146651" stroke-width="3"/>`+serie.map((v,i)=>`<circle cx="${X(i)}" cy="${Y(v)}" r="3.5" fill="#146651"/>`).join('')+(tot?'':'<text x="360" y="110" font-size="13" text-anchor="middle" fill="#6a7b76">Todavía no hay conteos hoy</text>');
 const zi=zs.map(z=>({...z,v:D[z.k]?(D[z.k].ac||sum(Object.values(D[z.k].h||{}))):0,cam:!!D[z.k]})).sort((a,b)=>b.v-a.v),zm=Math.max(1,...zi.map(z=>z.v));
 $('mv-zonas').innerHTML=zi.length?zi.map(z=>`<div class="tb-bar"><span class="n">${esc(z.nm.replace('Cám. ','Cámara ').split(' · ')[0])}${z.nm.includes('·')?': '+esc(z.nm.split(' · ')[1]):''}</span><i style="width:${Math.max(2,z.v/zm*45)}%;background:${z.v===zm&&z.v?'#146651':'#d99a3c'}"></i><span class="v">${z.cam?z.v:'—'}</span></div>`).join(''):'<p class="tb-note">Sin zonas.</p>';
 const cm=Math.max(1,...zs.flatMap(z=>HS.map(h=>+(D[z.k]?.h?.[h]||0)))),hh=new Date().getHours();let t='<table><tr><th>Zona</th>'+HS.map(h=>`<th>${h}</th>`).join('')+'</tr>';
 zs.forEach(z=>{t+=`<tr><td>${z.k}</td>`+HS.map(h=>{if(!D[z.k])return `<td style="text-align:center;color:#b4bfba">–</td>`;const v=+(D[z.k].h?.[h]||0),a=v/cm;return `<td style="background:rgba(20,102,81,${a});color:${a>.5?'#fff':'#19332f'};text-align:center;${h===hh?'outline:2px solid #c8553d':''}">${v}</td>`}).join('')+'</tr>'});$('mv-calorT').innerHTML=t+'</table>';
 const alto=HS.filter((h,i)=>mx>0&&serie[i]>=.75*mx),top=zi[0],rc=[];
 if(!tot)rc.push('Aún no hay conteos hoy. Conecta tus cámaras y deja esta ventana abierta en horario de atención.');else{rc.push(`El pico de hoy va a las ${serie.indexOf(mx)+9}:00 con ${mx} visitas.`);if(top?.v)rc.push(`La zona con más visitas es ${top.nm.replace(' · ',': ')} (${top.v}).`);if(alto.length)rc.push(`La mayor afluencia fue de ${alto[0]}:00 a ${alto[alto.length-1]+1}:00: refuerza la atención en ese horario.`);}
 $('mv-recs').innerHTML=rc.map(r=>`<div class="tb-rec">${esc(r)}</div>`).join('');
 const act=sum(Object.values(stats).map(s=>s.ahora))+sum((st?.camaras||[]).map(c=>c.personas_ahora||0)),itot=sum(Object.values(D).map(d=>d.ni||0));
 $('mv-kpis').innerHTML=[['users','Personas ahora',act],['target','Visitas hoy',tot],['hand','Interacciones candidatas hoy',itot],['clock','Hora de mayor afluencia',tot?serie.indexOf(mx)+9+':00':'—']].map(([ic,tx,v])=>`<div class="tb-card tb-k"><div class="mv-kic">${I(ic,20)}</div><strong>${v}</strong><span>${tx}</span></div>`).join('');
 // productos por zona
 [['mv-pa',zs[0]],['mv-pb',zs[2]||zs[1]]].forEach(([id,z])=>{if(!z||!P1)return;$(id+'-t').textContent='Productos · '+z.nm;const Lp=P1.productos.filter(p=>p.current_shelf===z.nm&&p.current_faces>0),m=Math.max(0,...Lp.map(p=>p.demand));$(id).innerHTML=Lp.map(p=>{const t=p.demand<=0?['m','Sin demanda registrada']:p.demand/m>.5?['h','Alta demanda']:p.demand/m>.2?['m','Demanda media']:['l','Baja demanda'];return `<div class="mv-prod"><span>${esc(p.name)}<small>${p.stock>0?'Stock: '+p.stock+' und.':'Stock sin registrar'}</small></span><span class="mv-tag ${t[0]}">${t[1]}</span></div>`}).join('')||'<p class="tb-note">Sin productos asignados a esta zona.</p>';});
}
function servidor(){const box=$('mv-srvtiles'),cams=st?.camaras||[];$('mv-srvchip').textContent=st?'conectado':'apagado';$('mv-srvchip').className='mv-chip'+(st?' ok':'');
 if(!st){luz('mv-s1',false,'Apagado: doble clic en iniciar_servidor.bat');luz('mv-s2',false,'Sin cámaras');luz('mv-s3',false,'Sin datos');box.innerHTML='';return;}
 const con=cams.filter(c=>c.conectado).length,n=sum(cams.map(c=>c.acercamientos));luz('mv-s1',true,'Encendido');luz('mv-s2',con>0,con?`${con} de ${cams.length} con imagen`:'Sin imagen: revisa IP, usuario o clave');luz('mv-s3',n>0,n?`${n} visitas hoy`:'Sin datos todavía');
 cams.forEach(c=>{if(!$('mv-st-'+c.id))box.insertAdjacentHTML('beforeend',`<article class="mv-tile"><div class="mv-cv" id="mv-sv-${c.id}"></div><div class="mv-tb"><b>${esc(c.nombre)} · YOLO</b><span class="tb-note">${esc(c.zona||'')}</span></div><div class="mv-num" id="mv-st-${c.id}"></div></article>`);
  const v=$('mv-sv-'+c.id);if(c.conectado&&!v.querySelector('img'))v.innerHTML=`<img alt="Imagen procesada con YOLO de ${esc(c.nombre)}" src="${base}/api/camara/${c.id}/stream">`;if(!c.conectado)v.innerHTML=`<p class="tb-note" style="padding:16px;text-align:center">${esc(c.error||'Sin señal.')}</p>`;
  $('mv-st-'+c.id).innerHTML=`<span>Ahora<b>${c.personas_ahora||0}</b></span><span>Visitas hoy<b>${c.acercamientos}</b></span><span>Interacciones<b>${c.interacciones}</b></span>`;});}
async function tick(){if(busy)return;busy=true;try{st=await api('/api/estado');srv=!!st;
 const l=L(),con=!!l?.connected();$('mv-estado').textContent=con?'Hik-Connect conectado':(srv?'Servidor YOLO conectado':'Sin conexión');$('mv-estado').className='status'+(con||srv?' live':'');
 pasos();tiles();charts();servidor();}finally{busy=false;}}
window.AnaquelMonitor={start(){build();Datos.cargarHistorico();tick();clearInterval(timer);timer=setInterval(tick,1000);},stop(){clearInterval(timer);timer=null;}};
// conteo en segundo plano: sigue aunque cambies de pestaña, mientras la vista esté conectada
setInterval(procesar,700);
