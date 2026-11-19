// Base de datos de la tienda (6–18 nov.) visible en el programa y reutilizada en todas las pestañas.
import {Datos} from './datos.js';
import {icono} from './iconos.js';
const HS=Array.from({length:14},(_,i)=>i+9);
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const sum=a=>a.reduce((s,x)=>s+x,0);
const fmt=(n,d=0)=>Number(n||0).toLocaleString('es-PE',{maximumFractionDigits:d,minimumFractionDigits:d});
const ORI={patron_equipo:'Patrón del equipo',estimado_replicado:'Estimado (repite el patrón)',camara_navegador:'Medido con cámara',camara_yolo:'Medido con cámara'};
let B=null,selDia='';
const heat=(v,m)=>{const a=m?v/m:0;return `style="text-align:center;background:rgba(20,102,81,${a.toFixed(2)});color:${a>.5?'#fff':'#19332f'}"`;};
const nota=t=>`<p class="tb-note" style="font-size:.88rem;margin:0 0 10px">${t}</p>`;
const card=(ico,tit,body,span='tb-12')=>`<div class="tb-card ${span}"><h2 style="display:flex;gap:8px;align-items:center"><span style="color:#146651;display:flex">${icono(ico,18)}</span>${tit}</h2>${body}</div>`;
const dias=()=>Object.keys(B?.dias||{}).sort();
const tipoDe=d=>B?.dias?.[d]?.tipo;
export async function cargar(){if(!B)B=await Datos.cargarHistorico();window.AnaquelBD=B;return B;}
export const BD=()=>B;

function resumenTotales(){const D=dias().map(d=>B.dias[d]);return [['bag',fmt(sum(D.map(x=>x.ventas))),'unidades vendidas (6–18 nov.)'],['chart','S/ '+fmt(sum(D.map(x=>x.ingreso))),'ingreso total'],['target','S/ '+fmt(sum(D.map(x=>x.margen)),1),'margen de contribución'],['users',fmt(sum(D.map(x=>x.personas))),'personas que entraron'],['hand',fmt(sum(D.map(x=>x.interacciones))),'interacciones con productos']];}
const kpis=()=>`<div class="tb-grid" style="margin-bottom:16px">${resumenTotales().map(([i,v,t])=>`<div class="tb-card tb-k" style="grid-column:span 2;min-width:0"><span style="color:#146651">${icono(i,18)}</span><strong style="font-size:1.4rem">${v}</strong><span>${t}</span></div>`).join('')}</div>`;

function tablaDias(){const D=dias(),m=Math.max(...D.map(d=>B.dias[d].ventas));
 return `<div style="overflow:auto"><table><tr><th>Fecha</th><th>Día</th><th>Tipo de día</th><th>Personas</th><th>Personas 5–9 pm</th><th>Interacciones</th><th>Ventas (unid.)</th><th>Ingreso (S/)</th><th>Margen (S/)</th><th>Origen</th></tr>${D.map(d=>{const x=B.dias[d];return `<tr><td>${d}</td><td>${x.dia}</td><td>${x.tipo}</td><td>${fmt(x.personas)}</td><td>${fmt(x.personas_5a9)}</td><td>${fmt(x.interacciones)}</td><td ${heat(x.ventas,m)}>${fmt(x.ventas)}</td><td>${fmt(x.ingreso,2)}</td><td>${fmt(x.margen,2)}</td><td>${ORI[x.origen]||x.origen}</td></tr>`}).join('')}</table></div>`;}
function tablaAfluencia(){const D=dias(),m=Math.max(...D.flatMap(d=>HS.map(h=>B.afl[d]?.[h]||0)));
 return `<div style="overflow:auto"><table><tr><th>Fecha</th>${HS.map(h=>`<th>${h}</th>`).join('')}<th>Total</th></tr>${D.map(d=>`<tr><td>${d.slice(5)} ${B.dias[d].dia}</td>${HS.map(h=>{const v=B.afl[d]?.[h]||0;return `<td ${heat(v,m)}>${v}</td>`}).join('')}<td><b>${sum(HS.map(h=>B.afl[d]?.[h]||0))}</b></td></tr>`).join('')}</table></div>`;}
const selDiaHtml=()=>`<label style="display:inline-flex;gap:8px;align-items:center;margin-bottom:10px;font-weight:600">Día <select id="bd-dia" style="padding:7px 10px;border:1px solid var(--line);border-radius:10px">${dias().map(d=>`<option value="${d}" ${d===selDia?'selected':''}>${d} · ${B.dias[d].dia}</option>`).join('')}</select></label>`;
function tablaZonas(){const H=B.hist[selDia]||{},ids=Object.keys(H).sort(),m=Math.max(1,...ids.flatMap(i=>HS.map(h=>H[i].por_hora?.[h]||0)));
 const t=(tit,key)=>`<h3 style="font-size:.95rem;margin:14px 0 6px">${tit}</h3><div style="overflow:auto"><table><tr><th>Cámara</th>${HS.map(h=>`<th>${h}</th>`).join('')}<th>Total</th></tr>${ids.map(i=>{const z=B.dimZona.find(z=>z.cam===+i.replace(/\D/g,''));const mm=key==='por_hora'?m:Math.max(1,...ids.flatMap(j=>HS.map(h=>H[j][key]?.[h]||0)));return `<tr><td>${z?esc(z.zona):i}</td>${HS.map(h=>{const v=H[i][key]?.[h]||0;return `<td ${heat(v,mm)}>${v}</td>`}).join('')}<td><b>${sum(HS.map(h=>H[i][key]?.[h]||0))}</b></td></tr>`}).join('')}</table></div>`;
 return t('Personas que se acercan, por cámara y hora','por_hora')+t('Interacciones (se quedan mirando), por cámara y hora','por_hora_int');}
function tablaProdHora(){const P=B.ph[selDia]||{},nm=Object.fromEntries(B.dimProd.map(p=>[p.sku,p.nombre]));
 const hrs=HS.filter(h=>P[h]);return `<div style="overflow:auto"><table><tr><th>Producto</th>${hrs.map(h=>`<th>${h}</th>`).join('')}<th>Día</th></tr>`+B.dimProd.map(p=>{const tot=hrs.reduce((a,h)=>{const r=P[h][p.sku]||[0,0,0,0];return a.map((x,i)=>x+r[i]);},[0,0,0,0]);return `<tr><td>${esc(p.nombre)}</td>${hrs.map(h=>{const r=P[h][p.sku]||[0,0,0,0];return `<td style="text-align:center;font-size:.76rem" title="${r[0]} vistos · ${r[1]} vendidos · S/ ${r[2]} ingreso · S/ ${r[3]} margen">${r[0]}/${r[1]}</td>`}).join('')}<td><b>${tot[0]}/${tot[1]}</b><br><small>S/ ${fmt(tot[2])} · margen ${fmt(tot[3],1)}</small></td></tr>`}).join('')+`</table></div><p class="tb-note">Cada celda es «interacciones / unidades vendidas» en esa hora. Pasa el mouse para ver ingreso y margen.</p>`;}
const tablaProductos=()=>`<div style="overflow:auto"><table><tr><th>SKU</th><th>Producto</th><th>Categoría</th><th>Precio mín.</th><th>Precio máx.</th><th>Precio promedio</th><th>Costo</th><th>Margen por unidad</th><th>Frentes</th><th>Anaquel actual</th></tr>${B.dimProd.map(p=>{const z=B.dimZona.find(z=>z.cam===B.dist[p.sku]);return `<tr><td>${p.sku}</td><td>${esc(p.nombre)}</td><td>${p.categoria}</td><td>S/ ${fmt(p.pmin,2)}</td><td>S/ ${fmt(p.pmax,2)}</td><td>S/ ${fmt(p.precio,2)}</td><td>S/ ${fmt(p.costo,2)}</td><td>S/ ${fmt(p.margen,2)}</td><td>${p.frentes}</td><td>${z?esc(z.zona):'—'}</td></tr>`}).join('')}</table></div>`;
const tablaZonasDim=()=>`<div style="overflow:auto"><table><tr><th>Cámara</th><th>Zona</th><th>Frentes</th><th>Proporción que visita</th><th>Tasa de detención</th><th>Cuota de atención</th></tr>${B.dimZona.map(z=>`<tr><td>${z.cam}</td><td>${esc(z.zona)}</td><td>${z.frentes}</td><td>${Math.round(z.visita*100)} %</td><td>${Math.round(z.detencion*100)} %</td><td>${z.cuota}</td></tr>`).join('')}</table></div>`;

function pintar(){const s=$('basedatos');if(!s||!B)return;
 if(!selDia)selDia=dias().slice(-1)[0];
 const keep=s.querySelector('.pagehead');
 if(!keep)s.innerHTML=`<div class="pagehead"><div><p class="eyebrow">TODOS LOS DATOS DEL ESTUDIO</p><h1>Base de datos<span class="title-dot">.</span></h1><p class="muted">Aquí está completo lo que registramos del 6 al 18 de noviembre en Moquegua 2: ventas, personas por hora, cámaras, productos y zonas. Es la misma información que usan las demás pestañas.</p></div></div><div id="bd-cuerpo"></div>`;
 $('bd-cuerpo').innerHTML=kpis()+`<div class="tb-grid">`+
  card('download','Descargar todo','<p class="tb-note" style="font-size:.9rem;margin:0 0 10px">Baja en un solo Excel todas estas tablas (también está el botón «Exportar a Excel» arriba).</p><button class="btn secondary" id="bd-xls">Exportar a Excel</button>')+
  card('chart','1. Resumen por día',nota('Cada fila es un día: cuántas personas entraron, cuánto se vendió y cuánto margen dejó. Los días 6–12 son el patrón del equipo; los 13–18 son estimados.')+tablaDias())+
  card('users','2. Personas que entran por hora',nota('Cuántas personas hay en la tienda en cada hora de atención (9 am a 10 pm). Más oscuro = más gente.')+tablaAfluencia())+
  card('camera','3. Cámaras y zonas por hora',nota('Elige un día para ver cuánta gente se acerca a cada zona y cuánta se queda mirando.')+selDiaHtml()+`<div id="bd-zonas">${tablaZonas()}</div>`)+
  card('box','4. Productos por hora',nota('Qué producto se miró y se vendió en cada hora del día elegido.')+`<div id="bd-ph">${tablaProdHora()}</div>`)+
  card('bag','5. Productos',nota('Precios, costos y margen de cada producto, y en qué cámara/anaquel está hoy.')+tablaProductos())+
  card('target','6. Zonas de la tienda',nota('Cómo se comporta cada zona: qué parte de los visitantes pasa, cuántos se detienen y los frentes disponibles.')+tablaZonasDim())+`</div>`;
 $('bd-dia').onchange=e=>{selDia=e.target.value;$('bd-zonas').innerHTML=tablaZonas();$('bd-ph').innerHTML=tablaProdHora();};
 $('bd-xls').onclick=()=>window.AnaquelExportar?.();}

// Bloques con datos de la base dentro de otras pestañas
function bloque(id,clave,html){const s=$(id);if(!s||!B)return;let b=s.querySelector(`[data-bd="${clave}"]`);if(!b){b=document.createElement('div');b.dataset.bd=clave;b.className='tb-grid';b.style.marginTop='16px';s.append(b);}b.innerHTML=html;}
function inyectar(){if(!B)return;
 bloque('inicio','ini',card('chart','Resumen de la base de datos (6–18 nov.)',nota('Totales reales del estudio. El detalle está en la pestaña «Base de datos».')+kpis().replace('margin-bottom:16px','margin-bottom:0')+'<div style="overflow:auto;margin-top:12px">'+tablaDias()+'</div>'));
 bloque('catalogo','cat',card('box','Datos de la base: productos y zonas',nota('Precios mínimo y máximo, margen por unidad, y cómo se comporta cada zona. Vienen de la base de datos del equipo.')+tablaProductos()+'<div style="height:12px"></div>'+tablaZonasDim()));
 const D=dias();
 bloque('evidencia','evi',card('bag','Ventas diarias de la base',nota('Unidades, ingreso y margen por día, con las personas que entraron.')+tablaDias()));
 bloque('informe','inf',card('chart','Resultados de la base 6–18 nov.',nota('Entre semana vs fin de semana: promedio por día.')+(()=>{const g=t=>D.filter(d=>tipoDe(d)===t).map(d=>B.dias[d]);const f=(a,k)=>fmt(sum(a.map(x=>x[k]))/Math.max(1,a.length),k==='margen'||k==='ingreso'?1:0);return `<table><tr><th>Tipo de día</th><th>Días</th><th>Personas/día</th><th>Interacciones/día</th><th>Ventas/día</th><th>Ingreso/día (S/)</th><th>Margen/día (S/)</th></tr>${['Entre semana','Fin de semana'].map(t=>{const a=g(t);return `<tr><td>${t}</td><td>${a.length}</td><td>${f(a,'personas')}</td><td>${f(a,'interacciones')}</td><td>${f(a,'ventas')}</td><td>${f(a,'ingreso')}</td><td>${f(a,'margen')}</td></tr>`}).join('')}</table>`;})()+'<div style="height:12px"></div>'+tablaDias()));
 bloque('optimizar','opt',card('target','Distribución actual de la base',nota('Dónde está hoy cada producto, de la base de datos. El modelo la usa como punto de partida.')+tablaProductos()));
 bloque('actividad','act',card('users','Personas por hora de la base',nota('Referencia para comparar lo que midas con la cámara.')+tablaAfluencia()));
}
function monitoreoRef(){if(!B||$('monitoreo')?.hidden)return;const hoy=new Date().toLocaleDateString('sv-SE'),h=new Date().getHours();
 const dow=new Date().getDay(),tipo=(dow===0||dow===6||dow===5)?'Fin de semana':'Entre semana';
 const D=dias().filter(d=>tipoDe(d)===tipo),prom=hh=>D.length?sum(D.map(d=>B.afl[d]?.[hh]||0))/D.length:0;
 const L=Datos.liveHist()[hoy]||{},medidoH=hh=>Math.max(0,...Object.values(L).map(c=>c.por_hora?.[hh]||0)),tot=sum(Object.values(L).map(c=>c.acercamientos||0));
 const m=Math.max(1,...HS.map(prom));
 bloque('monitoreo','mon',card('chart','Lo que esperas hoy según la base de datos',nota(`Promedio de personas por hora en días de tipo «${tipo}» (${D.length} días de la base) comparado con lo que mide tu cámara hoy. Ahora son las ${h}:00.`)+`<div class="tb-grid" style="margin-bottom:12px"><div class="tb-card tb-k" style="grid-column:span 4"><strong>${Math.round(prom(h))}</strong><span>personas esperadas esta hora</span></div><div class="tb-card tb-k" style="grid-column:span 4"><strong>${medidoH(h)}</strong><span>medidas por tu cámara esta hora</span></div><div class="tb-card tb-k" style="grid-column:span 4"><strong>${tot}</strong><span>acercamientos medidos hoy</span></div></div><div style="overflow:auto"><table><tr><th></th>${HS.map(x=>`<th>${x}</th>`).join('')}</tr><tr><td>Esperado (base)</td>${HS.map(x=>`<td ${heat(prom(x),m)}>${Math.round(prom(x))}</td>`).join('')}</tr><tr><td>Medido hoy</td>${HS.map(x=>`<td style="text-align:center;${x===h?'outline:2px solid #c8553d':''}">${medidoH(x)||'–'}</td>`).join('')}</tr></table></div>`));}
async function init(){await cargar();inyectar();pintar();monitoreoRef();}
document.addEventListener('click',e=>{if(e.target.closest('[data-page]'))setTimeout(()=>{inyectar();pintar();monitoreoRef();},80);});
window.addEventListener('hashchange',()=>setTimeout(()=>{inyectar();pintar();monitoreoRef();},80));
setInterval(monitoreoRef,5000);
window.addEventListener('load',()=>setTimeout(init,300));
