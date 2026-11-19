export const THESIS='Optimización multiobjetivo de la interacción comercial y el margen de contribución mediante visión artificial y programación entera en anaqueles de una microempresa minorista';
export function validateSession(s){
 if(!s||typeof s.sku!=='string'||!s.sku||typeof s.anaquel!=='string'||!s.anaquel||!['antes','despues'].includes(s.phase))throw Error('La sesión necesita producto, anaquel y etapa.');
 for(const key of ['seconds','fronts','visibility','confirmed','rejected','missed'])if(!Number.isFinite(s[key])||s[key]<0)throw Error('La sesión contiene valores inválidos.');
 if(s.seconds<10||s.fronts<1||!Number.isInteger(s.fronts)||s.visibility<=0||!['confirmed','rejected','missed'].every(k=>Number.isInteger(s[k])))throw Error('Se requieren 10 segundos válidos, frentes enteros positivos y conteos enteros.');
 return s;
}
export function interactionRates(project){
 const acc=new Map();
 for(const session of project.sessions||[]){validateSession(session);const a=acc.get(session.sku)||{events:0,exposure:0,sessions:0};a.events+=session.confirmed+session.missed;a.exposure+=session.seconds/3600*Math.sqrt(session.fronts)*session.visibility;a.sessions++;acc.set(session.sku,a);}
 return new Map([...acc].map(([sku,a])=>[sku,{rate:a.events/a.exposure,...a}]));
}
export function validateSale(s){
 if(!s||typeof s.sku!=='string'||!s.sku||!['antes','despues'].includes(s.phase)||!/^\d{4}-\d{2}-\d{2}$/.test(s.date))throw Error('Indica producto, etapa y fecha de la venta.');
 if(!Number.isInteger(s.quantity)||s.quantity<=0||![s.price,s.cost].every(n=>Number.isFinite(n)&&n>=0&&n<=1e7))throw Error('La cantidad debe ser un entero positivo; precio y costo, números no negativos.');
 return s;
}
export function summarize(project){
 const stages={antes:{revenue:0,cost:0,margin:0,units:0,events:0,seconds:0,sessions:0},despues:{revenue:0,cost:0,margin:0,units:0,events:0,seconds:0,sessions:0}};
 for(const s of project.sales||[]){validateSale(s);const v=stages[s.phase];v.revenue+=s.quantity*s.price;v.cost+=s.quantity*s.cost;v.margin+=s.quantity*(s.price-s.cost);v.units+=s.quantity;}
 for(const s of project.sessions||[]){validateSession(s);const v=stages[s.phase];v.events+=s.confirmed+s.missed;v.seconds+=s.seconds;v.sessions++;}
 for(const [key,v] of Object.entries(stages)){v.interactionsPerHour=v.seconds?v.events*3600/v.seconds:null;const hours=project.salesHours?.[key];v.marginPerHour=Number.isFinite(hours)&&hours>0&&(project.sales||[]).some(s=>s.phase===key)?v.margin/hours:null;}
 return stages;
}
export class ZoneTracker{
 constructor({dwell=3,maxGap=3,confidence=.55}={}){this.dwell=dwell;this.maxGap=maxGap;this.confidence=confidence;this.reset();}
 reset(){this.tracks=[];this.nextId=1;this.last=null;this.seconds=0;this.events=[];this.boxes=[];this.heat=Array(84).fill(0);this.inside=0;}
 sample(predictions,time,width,height,roi){
  if(!Number.isFinite(time)||width<=0||height<=0)return [];
  let dt=this.last===null?0:time-this.last;this.last=time;if(dt<0||dt>this.maxGap){this.tracks=[];dt=0;}
  this.seconds+=dt;
  const boxes=predictions.filter(p=>p.class==='person'&&p.score>=this.confidence&&p.bbox.every(Number.isFinite)).map(p=>({x:p.bbox[0]/width,y:p.bbox[1]/height,w:p.bbox[2]/width,h:p.bbox[3]/height,score:p.score}));
  const pairs=[];for(let i=0;i<boxes.length;i++)for(let j=0;j<this.tracks.length;j++){const a=boxes[i],b=this.tracks[j];const d=Math.hypot(a.x+a.w/2-b.cx,a.y+a.h-b.cy);if(time-b.last<=1.5&&d<.16)pairs.push({i,j,d});}pairs.sort((a,b)=>a.d-b.d);
  const used=new Set(),matched=new Map();for(const p of pairs)if(!matched.has(p.i)&&!used.has(p.j)){matched.set(p.i,this.tracks[p.j]);used.add(p.j);}
  const next=[],fresh=[];this.inside=0;
  for(let i=0;i<boxes.length;i++){
   const b=boxes[i],t=matched.get(i)||{id:this.nextId++,dwell:0,counted:false,last:time};const cx=b.x+b.w/2,cy=b.y+b.h;
   const inside=cx>=roi.x&&cx<=roi.x+roi.w&&cy>=roi.y&&cy<=roi.y+roi.h;
   if(inside){this.inside++;t.dwell+=Math.min(dt,Math.max(0,time-t.last));const gx=Math.max(0,Math.min(11,Math.floor(cx*12))),gy=Math.max(0,Math.min(6,Math.floor(cy*7)));this.heat[gy*12+gx]+=dt;
    if(t.dwell>=this.dwell&&!t.counted){const e={id:`e${this.events.length+1}`,track:t.id,time,seconds:t.dwell,status:'pending'};this.events.push(e);fresh.push(e);t.counted=true;}
   }else{t.dwell=0;t.counted=false;}
   Object.assign(t,{cx,cy,last:time});next.push(t);Object.assign(b,{id:t.id,inside,dwell:t.dwell});
  }
  this.tracks=next;this.boxes=boxes;return fresh;
 }
}
