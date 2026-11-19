// Almacén de mediciones hechas en este navegador (conteo con la vista de Hik-Connect). Se guarda en el equipo; no se envía a ningún sitio.
const LK='anaquellab.live.v1';
let live={},stat=null,t=null;
try{live=JSON.parse(localStorage.getItem(LK)||'{}')||{};}catch{live={};}
const hoy=()=>new Date().toLocaleDateString('sv-SE');
const guardar=()=>{clearTimeout(t);t=setTimeout(()=>{try{localStorage.setItem(LK,JSON.stringify(live));}catch{}},1500);};
export const Datos={
 hoy,
 async cargarHistorico(){if(stat)return stat;try{stat=await(await fetch('./historico.json')).json();}catch{stat={hist:{},prod:{}};}return stat;},
 historico:()=>stat,
 registrar(zona,tipo,hora=new Date().getHours()){
  const d=live[hoy()]??={},id='cam'+String(zona).padStart(2,'0');
  const c=d[id]??={acercamientos:0,interacciones:0,por_hora:{},por_hora_int:{},perm_s:0,origen:'camara_navegador'};
  if(tipo==='a'){c.acercamientos++;c.por_hora[hora]=(c.por_hora[hora]||0)+1;}else{c.interacciones++;c.por_hora_int[hora]=(c.por_hora_int[hora]||0)+1;}
  guardar();
 },
 liveHist:()=>live,
 reiniciarHoy(){delete live[hoy()];guardar();},
 /** Une histórico + servidor + mediciones del navegador (el navegador solo aporta lo que el servidor no tenga). */
 mezclar(base){const out={...base};for(const [dia,cams] of Object.entries(live)){const d=out[dia]={...(out[dia]||{})};for(const [id,v] of Object.entries(cams))if(!d[id])d[id]=v;}return out;}
};
window.AnaquelDatos=Datos;
