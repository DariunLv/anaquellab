import {interactionRates,validateSession,validateSale} from './research.js';
export function validate(p) {
  if(!p||!Array.isArray(p.productos)||!Array.isArray(p.anaqueles)||!p.productos.length||!p.anaqueles.length) throw Error('Agrega productos y anaqueles.');
  if(p.productos.length>40||p.anaqueles.length>8) throw Error('Esta versión admite hasta 40 productos y 8 anaqueles.');
  if(!Number.isFinite(p.presupuesto)||p.presupuesto<0||p.presupuesto>1e8) throw Error('Revisa el presupuesto.');
  const unique=(xs,key)=>new Set(xs.map(x=>x[key])).size===xs.length;
  if(!unique(p.productos,'sku')||!unique(p.anaqueles,'name')) throw Error('Los SKU y los nombres de anaquel deben ser únicos.');
  for(const s of p.anaqueles) {
    if(typeof s.name!=='string'||!s.name.trim()||s.name.length>100||![s.capacity,s.visibility,s.activity].every(Number.isFinite)||s.capacity<=0||s.capacity>1e5||s.visibility<=0||s.visibility>100||s.activity<0||s.activity>1) throw Error('Anaqueles: ancho y visibilidad positivos; actividad entre 0 y 1.');
  }
  for(const x of p.productos) {
    if(!['sku','name'].every(k=>typeof x[k]==='string'&&x[k].trim()&&x[k].length<=100)) throw Error('Cada producto necesita SKU y nombre.');
    for(const k of ['width','price','cost','stock','demand','units_per_facing','appeal','min_faces','max_faces','current_faces']) if(!Number.isFinite(x[k])||x[k]<0||x[k]>1e6) throw Error(`${x.sku}: revisa ${k}; se requiere un número no negativo.`);
    if(x.width<=0||x.min_faces>x.max_faces||x.max_faces>20||!['stock','min_faces','max_faces','current_faces'].every(k=>Number.isInteger(x[k]))) throw Error(`${x.sku}: ancho positivo; stock y frentes enteros, mínimo ≤ máximo ≤ 20.`);
  }
  if(p.interactionMode&&!['proxy','calibrated'].includes(p.interactionMode))throw Error('Selecciona un modo de interacción válido.');
  if(p.sessions&&!Array.isArray(p.sessions)||p.sales&&!Array.isArray(p.sales))throw Error('Los registros de investigación no son válidos.');
  (p.sessions||[]).forEach(validateSession);(p.sales||[]).forEach(validateSale);
  for(const v of Object.values(p.salesHours||{}))if(!Number.isFinite(v)||v<0||v>1e6)throw Error('Las horas de comparación deben ser no negativas.');
  return p;
}
export function coefficients(p,s,k) {
  const sales=Math.min(p.stock,p.demand,p.units_per_facing*k*s.visibility);
  return {margin:sales*(p.price-p.cost),activity:p.appeal*Math.sqrt(k)*s.activity,sales};
}
export class Optimizer {
  constructor(project,glpk) {
    validate(project); this.p=structuredClone(project);this.g=glpk;this.configs=[];
    const rates=interactionRates(project),calibrated=project.interactionMode==='calibrated';
    if(calibrated){const missing=project.productos.filter(p=>p.stock>0&&p.max_faces>0&&!rates.has(p.sku));if(missing.length)throw Error('Faltan sesiones revisadas para: '+missing.map(p=>p.name).join(', ')+'. Registra observaciones o selecciona el modo exploratorio.');}
    project.productos.forEach((p,i)=>project.anaqueles.forEach((s,j)=>{
      for(let k=Math.max(1,p.min_faces);k<=Math.min(p.max_faces,p.stock);k++) if(p.width*k<=s.capacity+1e-8) {const c=coefficients(p,s,k);if(calibrated)c.activity=(rates.get(p.sku)?.rate||0)*Math.sqrt(k)*s.visibility;this.configs.push({i,j,k,name:`x${this.configs.length}`,...c});}
    }));
    this.rows=[];
    const row=(name,coef,lo,hi)=>this.rows.push({name,vars:this.configs.map(c=>({name:c.name,coef:coef(c)})).filter(x=>x.coef!==0),lo,hi});
    project.productos.forEach((p,i)=>row(`producto${i}`,c=>+(c.i===i),p.min_faces?1:0,1));
    project.anaqueles.forEach((s,j)=>row(`ancho${j}`,c=>c.j===j?project.productos[c.i].width*c.k:0,0,s.capacity));
    row('capital',c=>project.productos[c.i].cost*c.k,0,project.presupuesto);
  }
  total(x,key){return this.configs.reduce((s,c,n)=>s+x[n]*c[key],0);}
  async solve(objective,minActivity,minMargin) {
    const g=this.g;
    const rows=this.rows.map(r=>({...r}));
    for(const [key,value] of [['activity',minActivity],['margin',minMargin]]) if(value!==undefined) rows.push({name:key,vars:this.configs.map(c=>({name:c.name,coef:c[key]})),lo:value,hi:Infinity});
    if(!this.configs.length) {if(rows.some(r=>r.lo>1e-6)) throw Error('No hay solución: revisa los mínimos, el stock y el espacio.'); return [];}
    const subjectTo=rows.map(r=>({name:r.name,vars:r.vars,bnds:{type:r.hi===Infinity?g.GLP_LO:r.lo===r.hi?g.GLP_FX:g.GLP_DB,lb:r.lo,ub:r.hi===Infinity?0:r.hi}}));
    const res=await g.solve({name:'Anaqueles',objective:{direction:g.GLP_MAX,name:'objetivo',vars:this.configs.map((c,i)=>({name:c.name,coef:objective[i]}))},subjectTo,binaries:this.configs.map(c=>c.name)}, {msglev:g.GLP_MSG_OFF,presol:true,tmlim:8,mipgap:0});
    if(res.result.status!==g.GLP_OPT) throw Error(res.result.status===g.GLP_NOFEAS?'No hay solución factible. Revisa mínimos, presupuesto y espacio.':'No se certificó el óptimo en el tiempo disponible. Reduce el número de frentes o productos.');
    const raw=this.configs.map(c=>res.result.vars[c.name]??0),x=raw.map(Math.round),byName=Object.fromEntries(this.configs.map((c,i)=>[c.name,x[i]]));
    if(raw.some((v,i)=>!Number.isFinite(v)||Math.abs(v-x[i])>1e-5||x[i]<0||x[i]>1)||rows.some(r=>{const t=r.vars.reduce((s,v)=>s+v.coef*byName[v.name],0);return t<r.lo-1e-4||t>r.hi+1e-4;})) throw Error('El resultado no superó la comprobación de restricciones.');
    return x;
  }
  describe(x,name) {
    return {nombre:name,margen:this.total(x,'margin'),actividad:this.total(x,'activity'),filas:this.configs.filter((c,i)=>x[i]>.5).map(c=>{
      const p=this.p.productos[c.i],s=this.p.anaqueles[c.j];return {sku:p.sku,producto:p.name,anaquel:s.name,frentes:c.k,ancho_cm:p.width*c.k,capital:p.cost*c.k,ventas_estimadas:c.sales,margen_estimado:c.margin,actividad_indice:c.activity};
    }),estado:'Óptimo del modelo entero'};
  }
  baseline(){
    const x=this.configs.map(()=>0);
    for(let i=0;i<this.p.productos.length;i++){const p=this.p.productos[i];if(!p.current_faces)continue;const n=this.configs.findIndex(c=>c.i===i&&this.p.anaqueles[c.j].name===p.current_shelf&&c.k===p.current_faces);if(n<0)return null;x[n]=1;}
    const values=Object.fromEntries(this.configs.map((c,i)=>[c.name,x[i]]));
    if(this.rows.some(r=>{const n=r.vars.reduce((s,v)=>s+v.coef*values[v.name],0);return n<r.lo-1e-6||n>r.hi+1e-6;}))return null;
    return {...this.describe(x,'Distribución actual'),estado:'Base factible'};
  }
  async run(weight=.5,progress=()=>{}) {
    if(!Number.isFinite(weight)||weight<0||weight>1)throw Error('El peso debe estar entre 0 y 1.');
    const m=this.configs.map(c=>c.margin),a=this.configs.map(c=>c.activity);
    progress('Calculando el máximo margen…');let xm=await this.solve(m);
    progress('Calculando la máxima actividad…');let xa=await this.solve(a);
    const mmax=this.total(xm,'margin'),amax=this.total(xa,'activity'),eps=1e-6;
    xm=await this.solve(a,undefined,mmax-eps);xa=await this.solve(m,amax-eps);
    const amin=this.total(xm,'activity'),mmin=this.total(xa,'margin'),dm=mmax-mmin,da=amax-amin;
    let obj=m.map((v,i)=>(dm>1e-6?weight*v/dm:0)+(da>1e-6?(1-weight)*a[i]/da:0));
    if(obj.every(v=>Math.abs(v)<1e-12))obj=m.map((v,i)=>v+a[i]);
    const chosen=weight===1?xm:weight===0?xa:await this.solve(obj),frontier=[],seen=new Set();
    for(let i=0;i<5;i++) {
      progress(`Comparando alternativas ${i+1}/5…`); const floor=amin+(amax-amin)*i/4-eps;
      let x=await this.solve(m,floor);x=await this.solve(a,floor,this.total(x,'margin')-eps);
      const key=x.join('');if(!seen.has(key)){seen.add(key);frontier.push(this.describe(x,`Alternativa ${frontier.length+1}`));}
    }
    return {elegido:this.describe(chosen,'Balance elegido'),frontera:frontier,base:this.baseline(),peso:weight,fecha:new Date().toISOString(),procedencia:this.p.procedencia,periodo:this.p.periodo,interactionMode:this.p.interactionMode||'proxy',interactionUnit:this.p.interactionMode==='calibrated'?'Interacciones estimadas / hora':'Índice exploratorio de actividad'};
  }
}
