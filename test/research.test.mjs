import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import GLPK from 'glpk.js/node';
import {ZoneTracker,interactionRates,summarize,validateSession,validateSale} from '../research.js';
import {Optimizer} from '../model.js';
const roi={x:0,y:0,w:1,h:1},person={class:'person',score:.9,bbox:[20,10,20,50]};
const session={sku:'P1',anaquel:'A',phase:'antes',seconds:3600,fronts:4,visibility:1,confirmed:8,rejected:3,missed:2};
test('Person dwell produces one candidate per continuous visit and ignores confidence noise',()=>{
 const t=new ZoneTracker({dwell:3});for(let i=0;i<=6;i++)t.sample([person,{...person,score:.2}],i,100,100,roi);
 assert.equal(t.events.length,1);assert.equal(t.inside,1);assert.equal(t.events[0].time,3);assert.equal(t.seconds,6);
 t.sample([],7,100,100,roi);for(let i=8;i<=11;i++)t.sample([person],i,100,100,roi);assert.equal(t.events.length,2);
});
test('Missing frames and out-of-zone people do not create visits',()=>{
 const t=new ZoneTracker();t.sample([person],0,100,100,roi);t.sample([person],20,100,100,roi);assert.equal(t.seconds,0);assert.equal(t.events.length,0);
 for(let i=21;i<=26;i++)t.sample([person],i,100,100,{x:.8,y:.8,w:.2,h:.2});assert.equal(t.events.length,0);assert.equal(t.inside,0);
});
test('Calibration uses reviewed events, omissions, exposure, fronts and visibility',()=>{
 const rates=interactionRates({sessions:[session,{...session,seconds:1800,confirmed:0,missed:0}]});assert.equal(rates.get('P1').rate,10/3);
 assert.throws(()=>validateSession({...session,seconds:9}));assert.throws(()=>validateSession({...session,confirmed:1.5}));
});
test('Observed contribution uses historical sale values and independent operating hours',()=>{
 const s={sku:'P1',date:'2026-11-11',phase:'antes',quantity:3,price:10,cost:4};const p={sales:[s],sessions:[session],salesHours:{antes:2}};
 const summary=summarize(p);assert.equal(summary.antes.margin,18);assert.equal(summary.antes.marginPerHour,9);assert.equal(summary.antes.interactionsPerHour,10);assert.equal(summary.despues.marginPerHour,null);
 assert.throws(()=>validateSale({...s,quantity:-1}));
 assert.equal(summarize({salesHours:{antes:8}}).antes.marginPerHour,null);
});
test('Calibrated integer optimization refuses missing evidence and uses measured rates',async()=>{
 const p=JSON.parse(await readFile(new URL('./fixture-prueba.json',import.meta.url),'utf8'));p.interactionMode='calibrated';const g=await GLPK();assert.throws(()=>new Optimizer(p,g),/Faltan sesiones/);
 p.sessions=p.productos.map(x=>({...session,sku:x.sku,confirmed:8,missed:2}));const m=new Optimizer(p,g);
 for(const c of m.configs)assert.ok(Math.abs(c.activity-5*Math.sqrt(c.k)*p.anaqueles[c.j].visibility)<1e-8);
 const r=await m.run(.5);assert.equal(r.interactionMode,'calibrated');assert.ok(r.elegido.actividad>0);
});
