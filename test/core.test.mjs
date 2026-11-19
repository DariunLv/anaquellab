import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import GLPK from 'glpk.js/node';
import {Optimizer,validate,coefficients} from '../model.js';
import {MotionMeter,cropCell,cropPixels} from '../vision.js';
const g=await GLPK();
const demo=JSON.parse(await readFile(new URL('./fixture-prueba.json',import.meta.url),'utf8'));
test('MILP matches exhaustive enumeration for small instance',async()=>{
 const p=structuredClone(demo);p.productos=p.productos.slice(0,3).map(x=>({...x,max_faces:2}));p.anaqueles=p.anaqueles.slice(0,2).map(x=>({...x,capacity:35}));p.presupuesto=65;
 const model=new Optimizer(p,g),m=model.configs.map(c=>c.margin),x=await model.solve(m);let best=-Infinity;
 const groups=p.productos.map((_,i)=>[null,...model.configs.filter(c=>c.i===i)]);
 for(const a of groups[0])for(const b of groups[1])for(const c of groups[2]){const cs=[a,b,c].filter(Boolean);if(cs.reduce((s,x)=>s+p.productos[x.i].cost*x.k,0)>p.presupuesto)continue;if(p.anaqueles.some((s,j)=>cs.filter(x=>x.j===j).reduce((z,x)=>z+p.productos[x.i].width*x.k,0)>s.capacity))continue;best=Math.max(best,cs.reduce((s,x)=>s+x.margin,0));}
 assert.ok(Math.abs(model.total(x,'margin')-best)<1e-5);
});
test('Demo multiobjective solutions respect all business constraints',async()=>{
 const model=new Optimizer(demo,g),r=await model.run(.5);
 assert.ok(r.elegido.margen>0);assert.ok(r.frontera.length>0);assert.ok(r.base);
 for(const s of [r.elegido,...r.frontera]){assert.equal(new Set(s.filas.map(x=>x.sku)).size,s.filas.length);assert.ok(s.filas.reduce((a,x)=>a+x.capital,0)<=demo.presupuesto+1e-4);for(const sh of demo.anaqueles)assert.ok(s.filas.filter(x=>x.anaquel===sh.name).reduce((a,x)=>a+x.ancho_cm,0)<=sh.capacity+1e-4);for(const row of s.filas){const p=demo.productos.find(p=>p.sku===row.sku);assert.ok(Number.isInteger(row.frentes)&&row.frentes<=p.stock&&row.frentes<=p.max_faces&&row.frentes>=p.min_faces);}}
 console.log('Demo:',JSON.stringify({margen:r.elegido.margen,actividad:r.elegido.actividad,alternativas:r.frontera.length}));
});
test('Impossible minimums produce no recommendation',async()=>{const p=structuredClone(demo);p.presupuesto=0;p.productos[0].min_faces=1;const m=new Optimizer(p,g);await assert.rejects(m.solve(m.configs.map(x=>x.margin)),/factible/);});
test('Zero budget and zero stock handled without inventing units',async()=>{const p=structuredClone(demo);p.presupuesto=0;const m=new Optimizer(p,g),r=await m.run();assert.equal(r.elegido.filas.length,0);p.productos.forEach(p=>p.stock=0);const n=new Optimizer(p,g);assert.equal((await n.run()).elegido.margen,0);});
test('Invalid values rejected before entering native solver',()=>{for(const mutate of [p=>p.presupuesto=-1,p=>p.productos[0].stock=.5,p=>p.productos[0].width=NaN,p=>p.productos[0].max_faces=21,p=>p.productos[1].sku=p.productos[0].sku,p=>p.anaqueles[0].activity=1.1]){const p=structuredClone(demo);mutate(p);assert.throws(()=>validate(p));}});
test('Margin reflects variable costs and sales saturation',()=>{assert.ok(Math.abs(coefficients({...demo.productos[0],demand:1},demo.anaqueles[0],4).margin-3.6)<1e-9);});
test('Motion detector distinguishes still footage and changing frames, ignores gaps',()=>{
 const solid=n=>{const a=new Uint8ClampedArray(400);for(let i=0;i<a.length;i+=4){a[i]=a[i+1]=a[i+2]=n;a[i+3]=255;}return a;};
 const still=new MotionMeter(),motion=new MotionMeter();for(let i=0;i<100;i++){still.sample(solid(90),i*.2);motion.sample(solid(i%2?200:20),i*.2);}assert.equal(still.result().activity,0);assert.ok(motion.result().activity>.95);assert.equal(motion.result().episodes,1);const before=motion.result().duration;motion.sample(solid(100),1000);assert.equal(motion.result().duration,before);
});
test('Normalized grid crops remain inside calibrated mosaic',()=>{const r=cropCell({x:.1,y:.2,w:.6,h:.6},8,3,3);const px=cropPixels(r,1000,500);assert.ok(Math.abs(px[0]-500)<1e-8);assert.ok(Math.abs(px[1]-300)<1e-8);assert.ok(Math.abs(px[2]-200)<1e-8);assert.ok(Math.abs(px[3]-100)<1e-8);});
