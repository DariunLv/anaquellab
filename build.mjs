import {mkdir,copyFile,cp,readFile,writeFile} from 'node:fs/promises';
await mkdir('dist/vendor',{recursive:true});
for(const name of ['index.html','app.js','model.js','vision.js','research.js','studio.js','detector.js','style.css','studio.css','experience.css','experience.js','centro.js','centro.css','monitor.js','barra.js','ayuda.js','basedatos.js','datos.js','exportar.js','iconos.js','monitoreo.css','ejemplo.json','historico.json','LEEME.md']) await copyFile(name,`dist/${name}`);
await cp('assets/ui','dist/assets/ui',{recursive:true});
await copyFile('node_modules/lottie-web/build/player/lottie_light.min.js','dist/vendor/lottie_light.min.js');
await copyFile('node_modules/lottie-web/LICENSE.md','dist/vendor/LICENSE-LOTTIE.md');
await copyFile('node_modules/@tensorflow/tfjs/dist/tf.min.js','dist/vendor/tf.min.js');
await copyFile('node_modules/@tensorflow-models/coco-ssd/dist/coco-ssd.min.js','dist/vendor/coco-ssd.min.js');
await cp('assets/models/coco','dist/models/coco',{recursive:true});
await copyFile('assets/licenses/LICENSE-TENSORFLOW.txt','dist/vendor/LICENSE-TENSORFLOW.txt');
await copyFile('assets/licenses/LICENSE-COCO-SSD.txt','dist/vendor/LICENSE-COCO-SSD.txt');
await copyFile('node_modules/glpk.js/dist/index.js','dist/vendor/glpk.js');
await copyFile('node_modules/glpk.js/LICENSE','dist/vendor/LICENSE-GLPK.txt');
await mkdir('dist/fuentes',{recursive:true});
for(const name of ['app.js','model.js','vision.js','research.js','studio.js','detector.js','studio.css','experience.css','experience.js','centro.js','centro.css','monitor.js','barra.js','ayuda.js','basedatos.js','datos.js','exportar.js','iconos.js','monitoreo.css','build.mjs','serve.mjs','package.json','package-lock.json','index.html','style.css','vercel.json','LEEME.md']) await copyFile(name,`dist/fuentes/${name}`);
await writeFile('dist/fuentes/DEPENDENCIAS.txt','GLPK.js 5.0.0: https://github.com/jvail/glpk.js\nCódigo original y submódulos: git clone --recursive https://github.com/jvail/glpk.js\nMotor GNU GLPK: https://www.gnu.org/software/glpk/\nLicencia GPLv3 en /vendor/LICENSE-GLPK.txt.\n');
console.log('Aplicación preparada en dist/');

