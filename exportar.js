// Exportar a Excel (.xlsx) sin librerías: escribe el ZIP/XML a mano. Todo ocurre en el navegador.
const enc=new TextEncoder();
const CRC=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
const crc32=b=>{let c=0xFFFFFFFF;for(let i=0;i<b.length;i++)c=CRC[(c^b[i])&255]^(c>>>8);return (c^0xFFFFFFFF)>>>0;};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'');
const col=i=>{let s='';for(i++;i>0;i=Math.floor((i-1)/26))s=String.fromCharCode(65+(i-1)%26)+s;return s;};
function zip(files){
 const parts=[],central=[];let off=0;
 const u16=n=>[n&255,(n>>8)&255],u32=n=>[n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255];
 for(const [name,data] of files){
  const nb=enc.encode(name),crc=crc32(data),hdr=[0x50,0x4b,3,4,...u16(20),...u16(0x0800),...u16(0),...u16(0),...u16(0x21),...u32(crc),...u32(data.length),...u32(data.length),...u16(nb.length),...u16(0)];
  parts.push(new Uint8Array(hdr),nb,data);
  central.push(new Uint8Array([0x50,0x4b,1,2,...u16(20),...u16(20),...u16(0x0800),...u16(0),...u16(0),...u16(0x21),...u32(crc),...u32(data.length),...u32(data.length),...u16(nb.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(off)]),nb);
  off+=hdr.length+nb.length+data.length;
 }
 const csz=central.reduce((s,x)=>s+x.length,0);
 const end=new Uint8Array([0x50,0x4b,5,6,0,0,0,0,...u16(files.length),...u16(files.length),...u32(csz),...u32(off),0,0]);
 const all=[...parts,...central,end],out=new Uint8Array(all.reduce((s,x)=>s+x.length,0));let p=0;for(const x of all){out.set(x,p);p+=x.length;}return out;
}
/** sheets: [{name, rows:[[...],...]}]; la primera fila es el encabezado. */
export function buildXlsx(sheets){
 const safe=n=>String(n).replace(/[\[\]:*?\/\\]/g,' ').slice(0,31)||'Hoja';
 const names=sheets.map((s,i)=>safe(s.name)||'Hoja'+(i+1));
 const sheetXml=s=>{
  const rows=s.rows,w=[];rows.forEach(r=>r.forEach((v,j)=>{w[j]=Math.max(w[j]||8,Math.min(60,String(v??'').length+2));}));
  let x='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0">'+(s.wrap?'':'<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>')+'</sheetView></sheetViews><cols>'+w.map((n,j)=>`<col min="${j+1}" max="${j+1}" width="${s.wrap?120:n}" customWidth="1"/>`).join('')+'</cols><sheetData>';
  rows.forEach((r,i)=>{x+=`<row r="${i+1}">`+r.map((v,j)=>{const ref=col(j)+(i+1);if(v===null||v===undefined||v==='')return '';if(typeof v==='number'&&Number.isFinite(v))return `<c r="${ref}"><v>${v}</v></c>`;return `<c r="${ref}" t="inlineStr"${i===0&&!s.wrap?' s="1"':s.wrap&&j===0&&i===0?' s="1"':''}><is><t xml:space="preserve">${esc(v)}</t></is></c>`;}).join('')+'</row>';});
  return x+'</sheetData></worksheet>';
 };
 const files=[['[Content_Types].xml',enc.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'+sheets.map((_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')+'</Types>')],
 ['_rels/.rels',enc.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>')],
 ['xl/workbook.xml',enc.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'+names.map((n,i)=>`<sheet name="${esc(n)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')+'</sheets></workbook>')],
 ['xl/_rels/workbook.xml.rels',enc.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+sheets.map((_,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')+`<Relationship Id="rId${sheets.length+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`)],
 ['xl/styles.xml',enc.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="10"/><name val="Arial"/></font><font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Arial"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF146651"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>')],
 ...sheets.map((s,i)=>[`xl/worksheets/sheet${i+1}.xml`,enc.encode(sheetXml(s))])];
 return zip(files);
}
const MIME='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
function descargar(nombre,bytes){const a=document.createElement('a'),u=URL.createObjectURL(new Blob([bytes],{type:MIME}));a.href=u;a.download=nombre;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000);}
/** Reúne TODO lo que muestra el programa y lo baja en un Excel. */
export async function exportarExcel(){
 const A=window.AnaquelLab,P=A?.getProject?.(),R=A?.getSelected?.(),D=window.AnaquelDatos;
 if(!P)throw Error('Aún no hay datos para exportar.');
 const st=await D.cargarHistorico(),hist=D.mezclar(st.hist||{}),prod=st.prod||{};
 const nm=Object.fromEntries(P.productos.map(p=>[p.sku,p.name]));
 const dias=Object.keys(hist).sort();
 const origenTxt={patron_equipo:'Patrón del equipo (6–12 nov)',estimado_replicado:'Estimado: repite el patrón (13–18 nov)',camara_navegador:'Medido con cámara (navegador)',camara_yolo:'Medido con cámara (YOLO)'};
 const hojas=[
  {name:'LEEME',wrap:true,rows:[['AnaquelLab · Tienda Moquegua 2 (cosméticos y peluches, Juliaca) · exportado '+new Date().toLocaleString('es-PE')],
   ['Origen de los datos: «Patrón del equipo» = días 6–12 nov construidos con el patrón dado por el equipo. «Estimado» = días 13–18 nov que repiten ese patrón (±5 %). «Medido con cámara» = conteos reales hechos por el programa desde el 19 nov.'],
   ['Una detección de persona es una visita candidata, no una compra. Sin identificación facial.'],
   ['Hojas: Productos, Anaqueles, Ventas, Sesiones, Resumen por día, Zona y hora, Producto por día, Propuesta del modelo.']]},
  {name:'Productos',rows:[['SKU','Producto','Ancho (cm)','Precio (S/)','Costo (S/)','Stock','Demanda/periodo','Ventas por frente','Atractivo','Frentes mín.','Frentes máx.','Anaquel actual','Frentes actuales'],...P.productos.map(p=>[p.sku,p.name,p.width,p.price,p.cost,p.stock,p.demand,p.units_per_facing,p.appeal,p.min_faces,p.max_faces,p.current_shelf,p.current_faces])]},
  {name:'Anaqueles',rows:[['Anaquel','Capacidad (cm)','Visibilidad','Actividad'],...P.anaqueles.map(s=>[s.name,s.capacity,s.visibility,s.activity])]},
  {name:'Ventas',rows:[['Fecha','SKU','Producto','Etapa','Cantidad','Precio (S/)','Costo (S/)','Ingreso (S/)','Margen (S/)'],...(P.sales||[]).map(s=>[s.date,s.sku,nm[s.sku]||'',s.phase,s.quantity,s.price,s.cost,+(s.quantity*s.price).toFixed(2),+(s.quantity*(s.price-s.cost)).toFixed(2)])]},
  {name:'Sesiones',rows:[['SKU','Producto','Anaquel','Etapa','Segundos','Frentes','Visibilidad','Confirmadas','Descartadas','No detectadas','Método','Notas'],...(P.sessions||[]).map(s=>[s.sku,nm[s.sku]||s.producto||'',s.anaquel,s.phase,s.seconds,s.fronts,s.visibility,s.confirmed,s.rejected,s.missed,s.method||'',s.notes||''])]},
  {name:'Resumen por día',rows:[['Fecha','Acercamientos','Interacciones candidatas','Ventas (unid.)','Ingreso (S/)','Margen (S/)','Origen'],...dias.map(d=>{const cams=Object.values(hist[d]),pr=Object.values(prod[d]||{});return [d,cams.reduce((s,c)=>s+c.acercamientos,0),cams.reduce((s,c)=>s+c.interacciones,0),pr.reduce((s,c)=>s+c.ventas,0)||(P.sales||[]).filter(x=>x.date===d).reduce((s,x)=>s+x.quantity,0),+pr.reduce((s,c)=>s+c.ingreso,0).toFixed(2),+pr.reduce((s,c)=>s+c.margen,0).toFixed(2),origenTxt[cams[0]?.origen]||cams[0]?.origen||''];})]},
  {name:'Zona y hora',rows:[['Fecha','Hora','Cámara / zona','Acercamientos','Interacciones candidatas','Origen'],...dias.flatMap(d=>Object.entries(hist[d]).flatMap(([id,c])=>Array.from({length:14},(_,i)=>i+9).filter(h=>(c.por_hora?.[h]??c.por_hora?.[String(h)]??null)!==null||c.por_hora_int?.[h]!==undefined).map(h=>[d,h,id,c.por_hora?.[h]||0,c.por_hora_int?.[h]||0,origenTxt[c.origen]||c.origen||''])))]},
  {name:'Producto por día',rows:[['Fecha','SKU','Producto','Interacciones','Ventas (unid.)','Ingreso (S/)','Margen (S/)','Origen'],...Object.keys(prod).sort().flatMap(d=>Object.entries(prod[d]).map(([sku,v])=>[d,sku,nm[sku]||'',v.interacciones,v.ventas,v.ingreso,v.margen,origenTxt[v.origen]||v.origen]))]},
  ...(st.dias?[{name:'BD ventas por día',rows:[['Fecha','Día','Tipo de día','Personas','Personas 5-9 pm','Interacciones','Ventas (unid.)','Ingreso (S/)','Margen (S/)','Origen'],...Object.entries(st.dias).sort().map(([d,x])=>[d,x.dia,x.tipo,x.personas,x.personas_5a9,x.interacciones,x.ventas,x.ingreso,x.margen,origenTxt[x.origen]||x.origen])]},
  {name:'BD personas por hora',rows:[['Fecha','Hora','Personas'],...Object.entries(st.afl||{}).sort().flatMap(([d,h])=>Object.entries(h).map(([hr,n])=>[d,+hr,n]))]},
  {name:'BD producto por hora',rows:[['Fecha','Hora','SKU','Producto','Interacciones','Ventas (unid.)','Ingreso (S/)','Margen (S/)'],...Object.entries(st.ph||{}).sort().flatMap(([d,H])=>Object.entries(H).flatMap(([hr,P2])=>Object.entries(P2).map(([sku,r])=>[d,+hr,sku,nm[sku]||'',...r])))]},
  {name:'BD productos',rows:[['SKU','Producto','Categoría','Precio mín.','Precio máx.','Precio prom.','Costo','Margen unitario','Frentes','Cámara actual'],...(st.dimProd||[]).map(p=>[p.sku,p.nombre,p.categoria,p.pmin,p.pmax,p.precio,p.costo,p.margen,p.frentes,(st.dist||{})[p.sku]])]},
  {name:'BD zonas',rows:[['Cámara','Zona','Frentes','Proporción que visita','Tasa de detención','Cuota de atención'],...(st.dimZona||[]).map(z=>[z.cam,z.zona,z.frentes,z.visita,z.detencion,z.cuota])]}]:[]),
  {name:'Propuesta del modelo',rows:R?[['SKU','Producto','Anaquel','Frentes','Ancho (cm)','Capital (S/)','Ventas estimadas','Margen estimado (S/)','Índice de actividad'],...R.filas.map(x=>[x.sku,x.producto,x.anaquel,x.frentes,x.ancho_cm,x.capital,x.ventas_estimadas,x.margen_estimado,x.actividad_indice])]:[['Sin propuesta todavía. Entra a «Optimización» y pulsa «Calcular distribución».']]}
 ];
 descargar('AnaquelLab-Moquegua2-datos.xlsx',buildXlsx(hojas));
}
window.AnaquelExportar=exportarExcel;
