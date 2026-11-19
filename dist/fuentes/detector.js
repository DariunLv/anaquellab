let modelPromise;
function script(src){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>{s.remove();reject(Error('No se pudo cargar el detector. Comprueba la conexión y vuelve a intentar.'));};document.head.append(s);});}
export async function loadDetector(){
 if(!modelPromise)modelPromise=(async()=>{
  // The bundled legacy runtime assigns this global in strict mode. Declaring
  // it first avoids its Function() fallback and keeps the strict CSP intact.
  window.regeneratorRuntime??={};
  if(typeof window.tf?.ready!=='function')await script('/vendor/tf.min.js');
  await window.tf.ready();
  if(!window.cocoSsd)await script('/vendor/coco-ssd.min.js');
  return window.cocoSsd.load({base:'lite_mobilenet_v2',modelUrl:'/models/coco/model.json'});
 })().catch(e=>{modelPromise=null;throw e;});
 return modelPromise;
}
