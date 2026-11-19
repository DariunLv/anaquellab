import re,json
def rw(f,fn):
    s=open(f,encoding='utf-8').read();t=fn(s)
    assert t!=s,f;open(f,'w',encoding='utf-8').write(t)
def R(s,a,b,c=1):
    assert a in s,a[:60];return s.replace(a,b,c)
# ---- centro.js
def centro(s):
    # series personas: usa afluencia de la base
    s=R(s," const serie=HS.map(h=>sum(Object.keys(D).map(k=>Hh(k,h)))),mx=Math.max(0,...serie);",
" const serie0=HS.map(h=>sum(Object.keys(D).map(k=>Hh(k,h)))),AFD=stat?.afl?.[selDay],serie=(!(esHoy&&st)&&AFD)?HS.map(h=>AFD[h]||0):serie0,mx=Math.max(0,...serie),DD=stat?.dias?.[selDay];")
    s=R(s,"$('tb-k1').textContent=(st||mx)?serie[selHr-9]:'—'","$('tb-k1').textContent=(st||mx)?serie[selHr-9]:'—'")
    s=R(s,"$('tb-k3').textContent=SV.length?sum(SV.map(x=>x.quantity)):(P?.sales?.length?'0':'—');$('tb-k4').textContent=SV.length?sum(SV.map(x=>x.quantity*(x.price-x.cost))).toLocaleString('es-PE',{maximumFractionDigits:2}):'—';",
"const L0=n=>n.toLocaleString('es-PE',{maximumFractionDigits:2});$('tb-k3').textContent=DD?DD.ventas:SV.length?sum(SV.map(x=>x.quantity)):(P?.sales?.length?'0':'—');$('tb-k4').textContent=DD?L0(DD.margen):SV.length?L0(sum(SV.map(x=>x.quantity*(x.price-x.cost)))):'—';$('tb-k5').textContent=DD?L0(DD.ingreso):'—';$('tb-k6').textContent=DD?DD.personas:'—';$('tb-k7').textContent=DD?DD.interacciones:'—';$('tb-k8').textContent=DD?DD.tipo+' · '+DD.dia:'—';")
    s=R(s,"rc.push(['',`El pico del día fue a las ${pico}:00 con ${mx} acercamientos.`]);","rc.push(['',`El pico del día fue a las ${pico}:00 con ${mx} personas.`]);if(DD)rc.push(['',`Ese día entraron ${DD.personas} personas (${DD.personas_5a9} entre las 5 y las 9 pm), se vendieron ${DD.ventas} unidades y el margen fue de S/ ${L0(DD.margen)}.`]);")
    s=R(s,"prom=otros.length?HS.map(h=>{const v=otros.map(d=>sum(Object.values(HH[d]).map(c=>c.por_hora?.[h]||0)));","prom=otros.length?HS.map(h=>{const v=otros.map(d=>stat?.afl?.[d]?(stat.afl[d][h]||0):sum(Object.values(HH[d]).map(c=>c.por_hora?.[h]||0)));")
    # ventas por día desde la base (13 días)
    s=R(s,"const por={};(P?.sales||[]).forEach(s=>{por[s.date]=(por[s.date]||0)+s.quantity;});const vd=Object.keys(por).sort().slice(-7),mv=Math.max(1,...vd.map(d=>por[d]));",
"const por={};if(stat?.dias)Object.entries(stat.dias).forEach(([d,x])=>{por[d]=x.ventas;});else (P?.sales||[]).forEach(s=>{por[s.date]=(por[s.date]||0)+s.quantity;});const vd=Object.keys(por).sort(),mv=Math.max(1,...vd.map(d=>por[d]));")
    s=R(s,"const x=12+i*41,hh=por[d]/mv*180;return `<rect x=\"${x}\" y=\"${200-hh}\" width=\"30\" height=\"${hh}\" rx=\"3\" fill=\"${d===selDay?'#c8553d':'#146651'}\"/><text x=\"${x+15}\" y=\"${195-hh}\" font-size=\"10\" text-anchor=\"middle\">${por[d]}</text><text x=\"${x+15}\" y=\"218\" font-size=\"9\" text-anchor=\"middle\" fill=\"#6a7b76\">${d.slice(5)}</text>`",
"const x=6+i*22.5,hh=por[d]/mv*170;return `<rect x=\"${x}\" y=\"${200-hh}\" width=\"18\" height=\"${hh}\" rx=\"3\" fill=\"${d===selDay?'#c8553d':'#146651'}\"/><text x=\"${x+9}\" y=\"${195-hh}\" font-size=\"7\" text-anchor=\"middle\">${por[d]}</text><text x=\"${x+9}\" y=\"216\" font-size=\"8\" text-anchor=\"middle\" fill=\"#6a7b76\">${d.slice(8)}</text>`")
    # productos
    s=R(s,"const PH=prodCache[selDay]||stat?.prod?.[selDay]||{};const L2=(P?.productos||[]).map(p=>[p.name,ses[p.sku]||PH[p.sku]?.interacciones||0,ven[p.sku]||PH[p.sku]?.ventas||0]).sort((a,b)=>b[1]-a[1]||b[2]-a[2]);",
"const PH=prodCache[selDay]||stat?.prod?.[selDay]||{},PHr=stat?.ph?.[selDay]?.[selHr]||{};const L2=(P?.productos||[]).map(p=>[p.name,PH[p.sku]?.interacciones??ses[p.sku]??0,PH[p.sku]?.ventas??ven[p.sku]??0,PH[p.sku]?.ingreso,PH[p.sku]?.margen,PHr[p.sku]]).sort((a,b)=>b[1]-a[1]||b[2]-a[2]);")
    s=R(s,"$('tb-top').innerHTML='<tr><th>Producto</th><th>Vistos</th><th>Vendidos</th></tr>'+L2.map(r=>`<tr><td>${esc(r[0])}</td><td>${r[1]||'—'}</td><td>${r[2]||'—'}</td></tr>`).join('')+(L2.some(r=>r[1]||r[2])?'':'<tr><td colspan=\"3\" class=\"tb-note\">Se llena con las sesiones revisadas y las ventas que registres.</td></tr>');",
"$('tb-top').innerHTML=`<tr><th>Producto</th><th>Vistos (día)</th><th>Vendidos (día)</th><th>Ingreso S/</th><th>Margen S/</th><th>A las ${selHr}:00 (vistos / vendidos)</th></tr>`+L2.map(r=>`<tr><td>${esc(r[0])}</td><td>${r[1]||'—'}</td><td>${r[2]||'—'}</td><td>${r[3]!=null?r[3].toLocaleString('es-PE'):'—'}</td><td>${r[4]!=null?r[4].toLocaleString('es-PE'):'—'}</td><td>${r[5]?r[5][0]+' / '+r[5][1]:'—'}</td></tr>`).join('')+(L2.some(r=>r[1]||r[2])?'':'<tr><td colspan=\"6\" class=\"tb-note\">Se llena con las sesiones revisadas y las ventas que registres.</td></tr>');")
    # html: KPIs
    s=R(s,"<span>acercamientos a esta hora</span>","<span>personas en la tienda a esta hora</span>")
    s=R(s,"<span>margen del día (S/)</span></div>","<span>margen del día (S/)</span></div><div class=\"tb-card tb-k\"><strong id=\"tb-k5\">—</strong><span>ingreso del día (S/)</span></div><div class=\"tb-card tb-k\"><strong id=\"tb-k6\">—</strong><span>personas que entraron en el día</span></div><div class=\"tb-card tb-k\"><strong id=\"tb-k7\">—</strong><span>interacciones del día</span></div><div class=\"tb-card tb-k\"><strong id=\"tb-k8\" style=\"font-size:1.2rem\">—</strong><span>tipo de día</span></div>")
    s=R(s,"<h2>Personas por hora: día elegido y promedio</h2>","<h2>Personas en la tienda por hora: día elegido y promedio</h2>")
    s=R(s,"<div class=\"tb-card tb-8\"><h2>Mapa de calor: acercamientos por cámara y hora</h2>","<div class=\"tb-card tb-12\"><h2>Mapa de calor: acercamientos por cámara y hora</h2>")
    s=R(s,"<div class=\"tb-card tb-4\"><h2>Productos más vistos (interacciones)</h2>","<div class=\"tb-card tb-12\"><h2>Productos: vistos, vendidos, ingreso y margen</h2><div style=\"overflow:auto\">")
    s=R(s,"<table id=\"tb-top\"></table></div>","<table id=\"tb-top\"></table></div></div>")
    return s
rw('centro.js',centro)
# ---- exportar.js: tablas crudas de la base
def exp(s):
    s=R(s,"  {name:'Propuesta del modelo'","  ...(st.dias?[{name:'BD ventas por día',rows:[['Fecha','Día','Tipo de día','Personas','Personas 5-9 pm','Interacciones','Ventas (unid.)','Ingreso (S/)','Margen (S/)','Origen'],...Object.entries(st.dias).sort().map(([d,x])=>[d,x.dia,x.tipo,x.personas,x.personas_5a9,x.interacciones,x.ventas,x.ingreso,x.margen,origenTxt[x.origen]||x.origen])]},\n  {name:'BD personas por hora',rows:[['Fecha','Hora','Personas'],...Object.entries(st.afl||{}).sort().flatMap(([d,h])=>Object.entries(h).map(([hr,n])=>[d,+hr,n]))]},\n  {name:'BD producto por hora',rows:[['Fecha','Hora','SKU','Producto','Interacciones','Ventas (unid.)','Ingreso (S/)','Margen (S/)'],...Object.entries(st.ph||{}).sort().flatMap(([d,H])=>Object.entries(H).flatMap(([hr,P2])=>Object.entries(P2).map(([sku,r])=>[d,+hr,sku,nm[sku]||'',...r])))]},\n  {name:'BD productos',rows:[['SKU','Producto','Categoría','Precio mín.','Precio máx.','Precio prom.','Costo','Margen unitario','Frentes','Cámara actual'],...(st.dimProd||[]).map(p=>[p.sku,p.nombre,p.categoria,p.pmin,p.pmax,p.precio,p.costo,p.margen,p.frentes,(st.dist||{})[p.sku]])]},\n  {name:'BD zonas',rows:[['Cámara','Zona','Frentes','Proporción que visita','Tasa de detención','Cuota de atención'],...(st.dimZona||[]).map(z=>[z.cam,z.zona,z.frentes,z.visita,z.detencion,z.cuota])]}]:[]),\n  {name:'Propuesta del modelo'")
    s=R(s,"Hojas: Productos,","Hojas: Productos,")
    return s
rw('exportar.js',exp)
# ---- index.html nav + section + script
def idx(s):
    m=re.search(r'<button[^>]*data-page="monitoreo".*?</button>',s,re.S);b=m.group(0)
    nb=b.replace('data-page="monitoreo"','data-page="basedatos"')
    nb=re.sub(r'<svg.*?</svg>','<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/></svg>',nb,flags=re.S)
    nb=re.sub(r'(</svg>).*?(</button>)',r'\1Base de datos\2',nb,flags=re.S)
    s=s.replace(b,b+nb,1)
    s=R(s,'</main>','<section id="basedatos" class="page" hidden></section></main>')
    s=R(s,'<script type="module" src="/ayuda.js">','<script type="module" src="/basedatos.js"></script><script type="module" src="/ayuda.js">') if '<script type="module" src="/ayuda.js">' in s else s.replace('</body>','<script type="module" src="/basedatos.js"></script></body>')
    return s
rw('index.html',idx)
rw('ayuda.js',lambda s:R(s," metodo:[","\n basedatos:['Aquí está completa la base de datos del 6 al 18 de noviembre: ventas, personas por hora, zonas y productos.',['Mira el resumen por día arriba.','Elige un día para ver cada zona y cada producto hora por hora.','Pulsa «Exportar a Excel» para llevarte todo.']],\n metodo:["))
def bld(s):
    return s.replace("'ayuda.js',","'ayuda.js','basedatos.js',")
rw('build.mjs',bld)
print('listo')
