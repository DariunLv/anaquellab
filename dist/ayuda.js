// Ayuda en lenguaje simple al inicio de cada pestaña: qué ves aquí y qué hacer.
import {icono} from './iconos.js';
const T={
 inicio:['Aquí ves un resumen de tu tienda y por dónde empezar.',['Conecta Hik-Connect con el botón de arriba (solo una vez).','Mira el «Tablero de la tienda» para ver cómo van las visitas y las ventas.','Entra a «Optimización» para ver qué productos conviene mover.']],
 centro:['Es el panel principal: cuántas personas pasan, dónde se detienen y cuánto se vende, por día y por hora.',['Elige un día y una hora arriba.','Lee «Qué hacer ahora»: son los consejos del programa.','Si quieres medir en vivo, abre «Monitoreo en vivo».']],
 monitoreo:['Aquí se cuentan las personas en tus cámaras en este momento.',['Paso 1: pulsa «Conectar Hik-Connect» y elige la pestaña de Hik-Connect.','Paso 2: elige a qué zona de la tienda corresponde cada cámara.','Paso 3: deja esta ventana abierta; los números se actualizan solos.']],
 camaras:['Aquí conectas la vista de Hik-Connect. Se hace una sola vez y sirve en todas las pestañas.',['Pulsa «1. Abrir Hik-Connect» e inicia sesión con tus cámaras a la vista.','Pulsa «2. Conectar vista en vivo» y comparte esa pestaña.','Desmarca las cámaras que no tengan imagen.']],
 actividad:['Aquí se mide cuánto movimiento y cuántas visitas hay frente a un anaquel.',['Elige la cámara (o un video) y marca con el mouse la zona del anaquel.','Pulsa iniciar y espera al menos 10 segundos.','Confirma o descarta cada visita que detecte el programa.']],
 evidencia:['Aquí queda guardado lo que observaste y lo que vendiste, para que el programa aprenda de tu tienda.',['Revisa las sesiones: qué producto, cuánto tiempo y cuántas visitas.','Anota tus ventas por día en la tabla de ventas.','Con más datos reales, las propuestas son más confiables.']],
 catalogo:['Aquí están tus productos y tus anaqueles con sus precios, costos, stock y tamaños.',['Corrige cualquier valor que no sea real: se guarda solo en este navegador.','Revisa que el ancho de cada producto y el espacio del anaquel estén en centímetros.','Luego ve a «Optimización».']],
 optimizar:['Aquí el programa propone cuántos frentes de cada producto poner y en qué anaquel, para ganar más sin pasarte del presupuesto.',['Mueve el control entre «más margen» y «más interacción».','Pulsa «Calcular distribución».','Compara con la distribución actual y descarga el resultado.']],
 informe:['Aquí se resume el estudio: qué se observó, qué se estimó y qué falta validar.',['Lee los resultados antes y después.','Descarga el informe cuando lo necesites.','Usa «Exportar a Excel» (arriba) para llevarte todos los datos.']],
 metodo:['Aquí se explica cómo se calculan los números, paso a paso.',['Es una guía de lectura: no necesitas cambiar nada.','Úsala para responder preguntas sobre el método.']]
};
const html=id=>{const [q,l]=T[id];return `<div class="ayuda" data-ayuda="${id}"><span class="ayuda-ico">${icono('info',20)}</span><div><b>En esta pantalla</b><p>${q}</p><ol>${l.map(x=>`<li>${x}</li>`).join('')}</ol></div></div>`;};
function poner(sec){const id=sec.id;if(!T[id]||sec.querySelector('[data-ayuda]'))return;const head=id==='inicio'?sec.querySelector('.welcome-hero'):sec.querySelector('.pagehead');if(head)head.insertAdjacentHTML('afterend',html(id));else if(sec.children.length)sec.insertAdjacentHTML('afterbegin',html(id));}
function init(){document.querySelectorAll('main section.page').forEach(s=>{poner(s);if(!s.children.length||!s.querySelector('.pagehead'))new MutationObserver(()=>poner(s)).observe(s,{childList:true});});}
init();
