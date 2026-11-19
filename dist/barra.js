// Barra superior global: una sola conexión de Hik-Connect para todas las pestañas + exportar a Excel.
import {icono} from './iconos.js';
import './datos.js';
import {exportarExcel} from './exportar.js';
const $=id=>document.getElementById(id);
function montar(){
 const box=document.querySelector('.top-right');if(!box||$('gc-connect'))return;
 box.insertAdjacentHTML('afterbegin',`<button id="gc-connect" class="gc" type="button">${icono('plug',16)}<span id="gc-text">Conectar Hik-Connect</span></button><button id="gc-export" class="gc ghost" type="button">${icono('download',16)}<span>Exportar a Excel</span></button>`);
 $('gc-connect').onclick=()=>{const L=window.AnaquelLab?.live;if(!L)return;if(L.connected())document.querySelector('[data-page=monitoreo]')?.click();else L.connect();};
 $('gc-export').onclick=async()=>{try{await exportarExcel();window.AnaquelLab?.notify?.('Excel descargado: AnaquelLab-Moquegua2-datos.xlsx');}catch(e){window.AnaquelLab?.notify?.(e.message,true);}};
}
export function actualizar(){const L=window.AnaquelLab?.live,b=$('gc-connect');if(!b||!L)return;const n=L.connected()?L.cameras().filter(c=>c.enabled).length:0;b.classList.toggle('on',L.connected());$('gc-text').textContent=L.connected()?`Hik-Connect conectado · ${n} cámaras`:'Conectar Hik-Connect';b.title=L.connected()?'Conectado. Se usa en todas las pestañas sin volver a conectar.':'Comparte la pestaña de Hik-Connect una sola vez; después funciona en todas las pestañas.';}
montar();
const t=setInterval(()=>{if(window.AnaquelLab?.live){clearInterval(t);window.AnaquelLab.live.subscribe(actualizar);actualizar();}},400);
