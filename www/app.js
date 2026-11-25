const FUENTES=["matancera","comparativa","academica"];
const ODU=["Okana","Eyioko","Ogunda","Iroso","Oshe","Obara","Odi","Eyeunle","Osa","Ofun","Ojuani","Eyila","Metanla","Merinla","Manunla","Merindilogun"];
const TAM=3000;
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const nrm=s=>s.split("").map(c=>c.normalize("NFD")[0]).join("").toLowerCase();
const optF=v=>FUENTES.map(f=>`<option ${f==v?"selected":""}>${f}</option>`).join("");
let db;
function abrir(){return new Promise((ok,er)=>{
 const r=indexedDB.open("ocha",1);
 r.onupgradeneeded=()=>{["lecciones","odu","cantos"].forEach(s=>r.result.createObjectStore(s,{keyPath:"id",autoIncrement:true}));};
 r.onsuccess=()=>{db=r.result;ok()};r.onerror=()=>er(r.error);});}
function tx(s,m,f){return new Promise((ok,er)=>{const t=db.transaction(s,m);const q=f(t.objectStore(s));t.oncomplete=()=>ok(q&&q.result);t.onerror=()=>er(t.error);});}
const todos=s=>tx(s,"readonly",o=>o.getAll());
const uno=(s,id)=>tx(s,"readonly",o=>o.get(+id));
const guardar=(s,x)=>tx(s,"readwrite",o=>o.put(x));
const borrar=(s,id)=>tx(s,"readwrite",o=>o.delete(+id));
const TABS=[["catedra","📖 Cátedra"],["dilogun","🐚 Dilogún"],["cantos","🎵 Cantos"],["buscar","🔎 Buscar"],["fuentes","🔗 Fuentes"]];
const V={};
function ir(v,x,y){
 const a=v=="leer"?"catedra":v;
 $("#nav").innerHTML=TABS.map(([k,t])=>`<a href="#" class="${k==a?"on":""}" onclick="ir('${k}');return false">${t}</a>`).join("");
 V[v](x,y);window.scrollTo(0,0);}
async function extraer(f){
 const n=f.name.toLowerCase();
 if(n.endsWith(".pdf")){
  pdfjsLib.GlobalWorkerOptions.workerSrc="lib/pdf.worker.min.js";
  const p=await pdfjsLib.getDocument({data:await f.arrayBuffer()}).promise;
  let t="";
  for(let i=1;i<=p.numPages;i++){const c=await(await p.getPage(i)).getTextContent();t+=c.items.map(x=>x.str).join(" ")+"\n\n";}
  return t;}
 if(n.endsWith(".docx")){return (await mammoth.extractRawText({arrayBuffer:await f.arrayBuffer()})).value;}
 return await f.text();}
V.catedra=async()=>{
 const L=await todos("lecciones");
 $("#v").innerHTML=`<h2>Cátedra</h2>`+
 (L.map(l=>`<div class="card"><b>${l.visto?"✅ ":""}${esc(l.titulo)}</b> <small>[${l.fuente}]</small><br>
 <button onclick="ir('leer',${l.id},0)">Leer</button>
 <button class="g" onclick="borrarL(${l.id})">Borrar</button></div>`).join("")||"<p>Aún no hay lecciones. Importa tus archivos abajo.</p>")+
 `<div class="card"><b>Importar archivos (PDF, Word, TXT)</b>
 <select id="fu">${optF()}</select>
 <input type="file" id="arch" multiple accept=".pdf,.docx,.txt,.md">
 <button onclick="importar()">Importar</button><p id="est"></p></div>
 <div class="card"><b>Lección escrita</b>
 <input id="nt" placeholder="Título"><textarea id="nx" rows="5" placeholder="Texto"></textarea>
 <button onclick="nueva()">Guardar</button></div>`;};
async function importar(){
 const fs=[...$("#arch").files],fu=$("#fu").value;
 if(!fs.length)return alert("Elige archivos primero");
 for(const f of fs){
  $("#est").textContent="Importando "+f.name+"...";
  try{await guardar("lecciones",{titulo:f.name.replace(/\.[^.]+$/,""),fuente:fu,texto:await extraer(f),visto:false});}
  catch(e){alert("Error con "+f.name+": "+e.message);}
 }
 ir("catedra");}
async function nueva(){const t=$("#nt").value.trim();if(!t)return;
 await guardar("lecciones",{titulo:t,fuente:"matancera",texto:$("#nx").value,visto:false});ir("catedra");}
async function borrarL(id){if(confirm("¿Borrar esta lección?")){await borrar("lecciones",id);ir("catedra");}}
V.leer=async(id,p)=>{
 const l=await uno("lecciones",id);
 const n=Math.max(1,Math.ceil(l.texto.length/TAM));
 $("#v").innerHTML=`<h3>${esc(l.titulo)}</h3><small>[${l.fuente}] página ${p+1} de ${n}</small>
 <div class="card lee">${esc(l.texto.slice(p*TAM,(p+1)*TAM))}</div>
 <button ${p<=0?"disabled":""} onclick="ir('leer',${id},${p-1})">◀ Anterior</button>
 <button ${p>=n-1?"disabled":""} onclick="ir('leer',${id},${p+1})">Siguiente ▶</button><br>
 <button class="g" onclick="visto(${id},${p})">${l.visto?"Quitar visto":"Marcar vista"}</button>
 <button class="g" onclick="ir('catedra')">Volver</button>`;};
async function visto(id,p){const l=await uno("lecciones",id);l.visto=!l.visto;await guardar("lecciones",l);ir("leer",id,p);}
V.dilogun=async(id)=>{
 let O=await todos("odu");
 if(!O.length){for(let i=0;i<16;i++)await guardar("odu",{numero:i+1,nombre:ODU[i],texto:"",fuente:"matancera"});O=await todos("odu");}
 if(id){const o=await uno("odu",id);
  $("#v").innerHTML=`<h3>${o.numero} - ${esc(o.nombre)}</h3>
  <select id="of">${optF(o.fuente)}</select>
  <textarea id="ot" rows="14">${esc(o.texto)}</textarea>
  <button onclick="gOdu(${o.id})">Guardar</button>
  <button class="g" onclick="ir('dilogun')">Volver</button>`;return;}
 $("#v").innerHTML=`<h2>Dilogún</h2>`+O.map(o=>`<div class="card" onclick="ir('dilogun',${o.id})"><b>${o.numero} - ${esc(o.nombre)}</b> <small>[${o.fuente}]</small><br><small>${o.texto?esc(o.texto.slice(0,60))+"…":"(pendiente de llenar)"}</small></div>`).join("");};
async function gOdu(id){const o=await uno("odu",id);o.texto=$("#ot").value;o.fuente=$("#of").value;await guardar("odu",o);ir("dilogun");}
V.cantos=async()=>{
 const C=await todos("cantos");
 $("#v").innerHTML=`<h2>Cantos</h2>`+C.map(c=>`<div class="card"><b>${esc(c.titulo)}</b> <small>[${c.fuente}]</small>
 <p class="lee">${esc(c.letra)}</p><p><i>${esc(c.pron)}</i></p>
 ${c.audio?`<audio controls src="${URL.createObjectURL(c.audio)}"></audio>`:""}
 <button class="g" onclick="borrarC(${c.id})">Borrar</button></div>`).join("")+
 `<div class="card"><b>Nuevo canto</b><input id="ct" placeholder="Título">
 <textarea id="cl" rows="4" placeholder="Letra"></textarea>
 <textarea id="cp" rows="3" placeholder="Pronunciación"></textarea>
 <select id="cf">${optF()}</select>
 <input type="file" id="ca" accept="audio/*"><button onclick="nuevoC()">Guardar</button></div>`;};
async function nuevoC(){
 const t=$("#ct").value.trim();if(!t)return;
 const f=$("#ca").files[0];
 const a=f?new Blob([await f.arrayBuffer()],{type:f.type}):null;
 await guardar("cantos",{titulo:t,letra:$("#cl").value,pron:$("#cp").value,fuente:$("#cf").value,audio:a});ir("cantos");}
async function borrarC(id){if(confirm("¿Borrar este canto?")){await borrar("cantos",id);ir("cantos");}}
V.buscar=async()=>{$("#v").innerHTML=`<h2>Buscar</h2><input id="q" placeholder="Buscar en todo..." oninput="bus()"><div id="r"></div>`;};
async function bus(){
 const q=nrm($("#q").value.trim());if(q.length<2){$("#r").innerHTML="";return;}
 const hit=t=>{const i=nrm(t).indexOf(q);return i<0?null:i;};
 const R=[];
 for(const l of await todos("lecciones")){const i=hit(l.texto);
  if(i!==null)R.push(`<div class="card" onclick="ir('leer',${l.id},${Math.floor(i/TAM)})"><b>${esc(l.titulo)}</b> <small>[lección]</small><br>…${esc(l.texto.slice(Math.max(0,i-40),i+80).replace(/\s+/g," "))}…</div>`);}
 for(const o of await todos("odu")){if(hit(o.nombre+" "+o.texto)!==null)R.push(`<div class="card" onclick="ir('dilogun',${o.id})"><b>${esc(o.nombre)}</b> <small>[odu]</small></div>`);}
 for(const c of await todos("cantos")){if(hit(c.titulo+" "+c.letra+" "+c.pron)!==null)R.push(`<div class="card" onclick="ir('cantos')"><b>${esc(c.titulo)}</b> <small>[canto]</small></div>`);}
 $("#r").innerHTML=R.join("")||"<p>Sin resultados.</p>";}
abrir().then(()=>ir("catedra"));
V.fuentes=()=>{
 const L=[
  ["Los negros brujos (F. Ortiz, 1906)","comparativa","https://beta-omk.manioc.org/files/original/11372/IHE14012.pdf"],
  ["El estudio del arte negro en F. Ortiz","academica","https://biblioteca.org.ar/libros/89120.pdf"],
  ["Menstruación en la Regla Ocha-Ifá","academica","https://dialnet.unirioja.es/descarga/articulo/7920219.pdf"],
  ["Los espacios de los orishas y Ifá","academica","https://dialnet.unirioja.es/descarga/articulo/5149858.pdf"],
  ["Prácticas religiosas habaneras","academica","https://www.redalyc.org/pdf/139/13901706.pdf"],
  ["Santería o Regla de Ocha: sincretismo","academica","https://revistas.ucm.es/index.php/ILUR/en/article/view/ILUR0000120079A"]
 ];
 $("#v").innerHTML=`<h2>Fuentes</h2><p><small>Descarga el archivo y luego impórtalo en Cátedra.</small></p>`+
 L.map(([t,f,u])=>`<div class="card"><b>${esc(t)}</b> <small>[${f}]</small><br><a href="${u}" target="_blank" rel="noopener"><button>Abrir / descargar</button></a></div>`).join("");};
