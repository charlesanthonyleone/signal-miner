const pick=a=>a[Math.floor(Math.random()*a.length)],rnd=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const J=async u=>{const r=await fetch(u);if(!r.ok)throw new Error(r.status+' '+u);return r.json()};
const shuffle=a=>a.map(x=>[Math.random(),x]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);
const WORDS=["river","street","kitchen","party","dog","car","beach","snow","garden","school","church","train","birthday","night","city","farm","lake","road","bridge","market","house","window","forest","boat","horse","concert","rain","mountain","family","factory"];
const RAWV=["IMG_*","MVI_*","DSC*","VID_*","MOV*","GOPR*","video*","untitled","clip*","DSCF*"];
const yr=(o)=>(o.kw||o.loose)?`publicdate:[${o.y1}-01-01T00:00:00Z TO ${o.y2}-12-31T23:59:59Z]`:(y=>`publicdate:[${y}-01-01T00:00:00Z TO ${y}-12-31T23:59:59Z]`)(rnd(Math.max(o.y1,2002),o.y2));
const inYears=(d,o)=>{const y=parseInt(d);return !y||(y>=o.y1&&y<=o.y2)};

/* ---------- Internet Archive (generic) ---------- */
function iaSrc({mt,extra,rawPats,rawMax=25,source,module,esot}){return async o=>{
  const p=[`mediatype:${mt}`];if(extra)p.push(extra);
  if(o.kw)p.push(`(${o.kw})`);else if(o.raw&&rawPats)p.push(`title:(${pick(rawPats)})`);else if(esot)p.push(`("${pick(ESOT)}")`);else if(!extra)p.push(`(${pick(WORDS)})`);
  if(o.raw)p.push(`downloads:[0 TO ${rawMax}]`);p.push(yr(o));
  const q=p.join(' AND '),u=new URLSearchParams({q,rows:40,page:1,output:'json'});
  ["identifier","title","publicdate","downloads","creator","date"].forEach(f=>u.append('fl[]',f));
  const docs=(await J('https://archive.org/advancedsearch.php?'+u)).response.docs;
  return shuffle(docs).slice(0,24).map(d=>({module,source,title:d.title||d.identifier,date:(d.publicdate||'').slice(0,10),dateLabel:'uploaded',
    count:d.downloads,countLabel:'downloads',thumb:`https://archive.org/services/img/${d.identifier}`,kind:'iframe',src:`https://archive.org/embed/${d.identifier}`,
    url:`https://archive.org/details/${d.identifier}`,query:q,extra:d.creator?`creator: ${[].concat(d.creator).join(', ')}`:''}))}}

/* ---------- Wikimedia Commons ---------- */
function commonsSrc(ft,module){return async o=>{
  let s=`filetype:${ft} `+(o.kw||(o.raw?pick(['intitle:IMG','intitle:DSC','intitle:MVI','intitle:VID','intitle:P10']):''));
  const off=(o.kw||o.raw)?rnd(0,o.raw?150:0):rnd(0,ft==='video'?9000:5000);
  const u=new URLSearchParams({action:'query',format:'json',origin:'*',generator:'search',gsrsearch:s.trim(),gsrnamespace:6,gsrlimit:30,gsroffset:off,prop:'imageinfo',iiprop:'url|timestamp|mime|user',iiurlwidth:480});
  const r=await J('https://commons.wikimedia.org/w/api.php?'+u);
  return Object.values(r.query?.pages||{}).filter(p=>p.imageinfo).map(p=>{const i=p.imageinfo[0];return{module,source:'Wikimedia Commons',title:p.title.replace(/^File:/,''),
    date:i.timestamp.slice(0,10),dateLabel:'uploaded',count:null,thumb:i.thumburl,kind:ft==='video'?'video':(ft==='audio'?'audio':'img'),src:ft==='bitmap'?(i.thumburl?.replace(/\/\d+px-/,'/1280px-')||i.url):i.url,
    url:i.descriptionurl,query:`${s.trim()} (offset ${off})`,extra:`uploader: ${i.user||'?'}`}}).filter(x=>inYears(x.date,o))}}

/* ---------- Dailymotion ---------- */
async function dailymotion(o){const term=o.kw||(o.raw?pick(["IMG_","MVI_","DSC","VID_","MOV","GOPR"])+String(rnd(0,999)).padStart(4,'0'):pick(WORDS));
  const u=new URLSearchParams({search:term,limit:50,page:(o.kw||o.raw)?1:rnd(1,3),fields:'id,title,created_time,views_total,thumbnail_360_url,duration,owner.username',
    created_after:Math.floor(Date.UTC(o.y1,0,1)/1000),created_before:Math.floor(Date.UTC(o.y2,11,31)/1000)});
  const r=await J('https://api.dailymotion.com/videos?'+u);
  return r.list.filter(v=>!o.raw||v.views_total<=100).map(v=>({module:'video',source:'Dailymotion',title:v.title,date:new Date(v.created_time*1000).toISOString().slice(0,10),dateLabel:'uploaded',
    count:v.views_total,countLabel:'views',thumb:v.thumbnail_360_url,kind:'iframe',src:`https://geo.dailymotion.com/player.html?video=${v.id}`,url:`https://www.dailymotion.com/video/${v.id}`,query:`search="${term}"${o.raw?' views<=100':''}`,extra:`${v.duration}s · ${v['owner.username']||''}`}))}

/* ---------- Openverse ---------- */
function openverse(kind){return async o=>{const term=o.kw||(o.raw?pick(['IMG','DSC','untitled','snapshot','photo']):pick(WORDS));
  const pg=o.kw?1:rnd(1,10);const r=await J(`https://api.openverse.org/v1/${kind}/?`+new URLSearchParams({q:term,page_size:20,page:pg}));
  return r.results.map(x=>({module:kind==='images'?'image':'audio',source:'Openverse',title:x.title||'(untitled)',date:'',dateLabel:'',count:null,thumb:x.thumbnail,
    kind:kind==='images'?'img':'audio',src:x.url,url:x.foreign_landing_url,query:`q="${term}" page ${pg}`,extra:`${x.creator?'by '+x.creator+' · ':''}${x.license?'CC '+x.license.toUpperCase()+' · ':''}via ${x.provider||x.source}`}))}}

/* ---------- Met Museum ---------- */
async function met(o){const term=o.kw||pick(WORDS);const r=await J('https://collectionapi.metmuseum.org/public/collection/v1.1/search?'+new URLSearchParams({q:term,hasImages:true,limit:60,offset:0}));
  const ids=shuffle(r.objectIDs||[]).slice(0,16);
  const objs=await Promise.all(ids.map(i=>J('https://collectionapi.metmuseum.org/public/collection/v1/objects/'+i).catch(()=>null)));
  return objs.filter(x=>x&&x.primaryImageSmall).filter(x=>!x.objectBeginDate||!o.kw||true).map(x=>({module:'image',source:'Met Museum',title:x.title||x.objectName,date:x.objectDate,dateLabel:'object date',count:null,
    thumb:x.primaryImageSmall,kind:'img',src:x.primaryImage||x.primaryImageSmall,url:x.objectURL,query:`v1.1/search q="${term}" hasImages`,extra:[x.artistDisplayName,x.department,x.isPublicDomain?'public domain':''].filter(Boolean).join(' · ')}))}

/* ---------- Books ---------- */
async function openlib(o){const term=o.kw||pick(WORDS);const q=`${term} first_publish_year:[${o.y1} TO ${o.y2}]`+(o.raw?' edition_count:1':'');
  const r=await J('https://openlibrary.org/search.json?'+new URLSearchParams({q,limit:30,page:o.kw?1:rnd(1,5),fields:'key,title,author_name,first_publish_year,cover_i,edition_count,ia,ebook_access'}));
  return r.docs.map(d=>({module:'book',source:'Open Library',title:d.title,date:d.first_publish_year?String(d.first_publish_year):'',dateLabel:'first published',count:d.edition_count,countLabel:'editions',
    thumb:d.cover_i?`https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg`:'',kind:(d.ebook_access==='public'&&d.ia)?'iframe':'link',src:d.ia?`https://archive.org/embed/${d.ia[0]}`:'',
    url:'https://openlibrary.org'+d.key,query:q,extra:(d.author_name||[]).slice(0,2).join(', ')+(d.ebook_access?` · ebook: ${d.ebook_access}`:'')}))}
async function gutendex(o){const u=new URLSearchParams();if(o.kw)u.set('search',o.kw);else u.set('page',o.raw?rnd(2350,2480):rnd(1,200));
  const r=await J('https://gutendex.com/books/?'+u);
  return r.results.filter(b=>b).map(b=>({module:'book',source:'Project Gutenberg',title:b.title,date:'',dateLabel:'',count:b.download_count,countLabel:'downloads (30d)',
    thumb:b.formats['image/jpeg']||'',kind:'link',src:'',url:`https://www.gutenberg.org/ebooks/${b.id}`,query:'gutendex '+u,extra:b.authors.map(a=>a.name).join('; ')+(b.languages?' · '+b.languages.join(','):'')}))}

/* ---------- scheduled logs (GitHub Actions) ---------- */
const cache={};function logSrc(file,module){return async o=>{cache[file]??=await J(`finds/${file}.json?`+Date.now()).catch(()=>[]);
  let L=cache[file].filter(x=>(!o.kw||(x.title+' '+x.query).toLowerCase().includes(o.kw.toLowerCase()))&&(!o.raw||x.count==null||x.count<=100)&&inYears(x.date,o));
  L=o.kw?L.slice().reverse():shuffle(L);return L.slice(0,48).map(x=>({...x,module}))}}

const MODULES={
 video:{name:'VIDEO',icon:'▶',sub:'Raw camera clips, old films, TV and forgotten uploads.',sources:{
  youtube:{name:'YouTube',f:logSrc('youtube','video'),note:'From the scheduled miner log (yt-dlp on GitHub Actions, every 3h). Keyword filters the log.'},
  ia_raw:{name:'Archive · raw clips',f:iaSrc({mt:'movies',rawPats:RAWV,source:'Internet Archive',module:'video'}),note:'archive.org movies, live search.'},
  ia_films:{name:'Archive · films & TV',f:iaSrc({mt:'movies',extra:'collection:(prelinger OR classic_tv OR feature_films OR ephemera OR classic_cartoons OR television OR moviesandfilms)',rawMax:100,source:'Internet Archive',module:'video'}),note:'Prelinger, classic TV, feature films, ephemeral films, cartoons.'},
  commons:{name:'Wikimedia Commons',f:commonsSrc('video','video'),note:'Commons video files, live search.'},
  dailymotion:{name:'Dailymotion',f:dailymotion,note:'Dailymotion public API, live search.'},
  wayback:{name:'Wayback Machine',f:logSrc('wayback_video','video'),note:'Video files captured on old websites, from the scheduled miner (the CDX API has no browser CORS). Old formats may only download, not play.'}}},
 image:{name:'IMAGE',icon:'◩',sub:'Photos, scans, artworks and old web graphics.',sources:{
  commons:{name:'Wikimedia Commons',f:commonsSrc('bitmap','image'),note:'Commons images, live search.'},
  ia:{name:'Internet Archive',f:iaSrc({mt:'image',rawPats:["IMG_*","DSC*","DSCF*","P10*","scan*","photo*","untitled"],source:'Internet Archive',module:'image'}),note:'archive.org image items, live search.'},
  openverse:{name:'Openverse',f:openverse('images'),note:'Openly licensed images (Flickr and others) via Openverse.'},
  met:{name:'Met Museum',f:met,note:'The Met collection API. Year filter not applied.'},
  wayback:{name:'Wayback Machine',f:logSrc('wayback_image','image'),note:'GIF/JPEG files from GeoCities/Angelfire/Tripod-era sites, from the scheduled miner.'}}},
 book:{name:'BOOK',icon:'❏',sub:'Books, scans and public-domain texts.',sources:{
  openlibrary:{name:'Open Library',f:openlib,note:'Raw = single-edition titles. Readable inline when the scan is public.'},
  ia:{name:'Archive texts',f:iaSrc({mt:'texts',rawPats:["scan*","untitled","document*","IMG_*","notes*","Scan*"],source:'Internet Archive',module:'book'}),note:'archive.org texts, readable inline.'},
  gutenberg:{name:'Project Gutenberg',f:gutendex,note:'Via Gutendex. Raw = pages from the least-downloaded end of the catalog. Year filter not applied. Gutendex can be slow.'}}},
 audio:{name:'AUDIO',icon:'◉',sub:'Field recordings, voice memos, old radio.',sources:{
  ia_raw:{name:'Archive · raw recordings',f:iaSrc({mt:'audio',rawPats:["New Recording*","Voice*","untitled","Track*","audio*","REC*","Memo*"],source:'Internet Archive',module:'audio'}),note:'archive.org audio, live search.'},
  ia_radio:{name:'Archive · old radio',f:iaSrc({mt:'audio',extra:'collection:(oldtimeradio OR 78rpm)',rawMax:50,source:'Internet Archive',module:'audio'}),note:'Old Time Radio and 78rpm collections.'},
  openverse:{name:'Openverse',f:openverse('audio'),note:'Openly licensed audio (Freesound, Jamendo, etc.) via Openverse.'},
  commons:{name:'Wikimedia Commons',f:commonsSrc('audio','audio'),note:'Commons audio files.'}}}};


const ESOT=["occult","ritual","seance","ouija","numbers station","found footage","vhs","strange tape","unexplained","paranormal","ghost","haunted","ufo","esoteric","magick","tarot","witchcraft","analog","anomaly","untitled tape","ritual footage","occult ceremony","cinta extraña","grabación inexplicable","rituel","okkult","オカルト","странная запись"];
MODULES.dvideo={half:'deep',name:'VIDEO',icon:'◬',sub:'DEEPWEB · near-zero-view and user-uploaded clips: raw filenames, found tapes, occult/unexplained subjects. Public sources only.',sources:{
  youtube:{name:'YouTube ≤100 views',f:logSrc('youtube_deep','dvideo'),note:'Scheduled yt-dlp searches (hourly): default camera filenames and esoteric terms in several languages, kept only at ≤100 views.'},
  ia_user:{name:'Archive · user uploads',f:iaSrc({mt:'movies',extra:'collection:(opensource_movies OR opensource_media)',rawPats:[...RAWV,...ESOT.slice(0,20).map(t=>`"${t}"`)],rawMax:50,source:'Internet Archive (user upload)',module:'dvideo',esot:1}),note:'Only community/user upload collections (opensource_movies), no institutional collections. Raw = ≤50 downloads.'},
  wayback:{name:'Wayback · dead sites',f:logSrc('wayback_deep_video','dvideo'),note:'Video files (.avi .mpg .rm .wmv .mov…) captured 1996–2009 on GeoCities/Angelfire/Tripod paths with occult/paranormal words, from the scheduled miner.'}}};
MODULES.dimage={half:'deep',name:'IMAGE',icon:'⛤',sub:'DEEPWEB · user-uploaded scans and photos and old-web graphics from occult/paranormal personal pages.',sources:{
  ia_user:{name:'Archive · user uploads',f:iaSrc({mt:'image',extra:'collection:(opensource_image OR opensource_media OR opensource)',rawPats:["IMG_*","DSC*","scan*","untitled",...ESOT.slice(0,20).map(t=>`"${t}"`)],rawMax:50,source:'Internet Archive (user upload)',module:'dimage',esot:1}),note:'Community upload collections only. Raw = ≤50 downloads.'},
  wayback:{name:'Wayback · dead sites',f:logSrc('wayback_deep_image','dimage'),note:'GIF/JPEG files captured 1996–2009 on GeoCities/Angelfire/Tripod paths with occult/paranormal words, from the scheduled miner.'}}};
/* ---------- retry / loosen ---------- */
async function mineWithRetry(S,o,say=()=>{}){const steps=[{},{},{loose:1},{loose:1,raw:false},{loose:1,raw:false,y1:1900,y2:2026},{loose:1,raw:false,y1:1900,y2:2026}];
 let err='';for(let i=0;i<steps.length;i++){const q={...o,...steps[i]};if(i)say(`no hits, loosening filters (try ${i+1}/${steps.length})…`);
  try{const r=await S.f(q);if(r.length)return{res:r,err:'',note:i>=2?`[filters loosened: ${q.raw?'':'raw off, '}${q.loose?'full year range':''}] `:''}}catch(e){err=e.message;await new Promise(r=>setTimeout(r,600))}}
 return{res:[],err,note:''}}

/* ---------- vault ---------- */
const V=()=>JSON.parse(localStorage.vault||'{}'),saveV=v=>localStorage.vault=JSON.stringify(v);
function toggle(it){const v=V();v[it.url]?delete v[it.url]:v[it.url]={...it,saved_at:new Date().toISOString()};saveV(v);return !!v[it.url]}

/* ---------- UI ---------- */
const $=s=>document.querySelector(s);let state={m:'video',s:'youtube'},items=[];
function route(){const [m,s]=(location.hash.slice(1)||'home').split('/');state.m=(MODULES[m]||m==='vault'||m==='home')?m:'home';state.s=MODULES[state.m]?.sources[s]?s:Object.keys(MODULES[state.m]?.sources||{x:1})[0];render()}
window.onhashchange=route;
const half=h=>Object.entries(MODULES).filter(([k,m])=>(m.half||'live')===h);
function nav(){const b=([k,m])=>`<button class="${state.m==k?'on':''}" onclick="location.hash='${k}'">${m.icon} ${m.name}</button>`;$('nav').innerHTML=[`<button class="${state.m=='home'?'on':''}" onclick="location.hash='home'">⌂</button><span class="hl">LIVEWEB</span>`,...half('live').map(b),'<span class="hl deep">DEEPWEB</span>',...half('deep').map(b),
 `<button class="${state.m=='vault'?'on':''}" onclick="location.hash='vault'">★ VAULT (${Object.keys(V()).length})</button>`].join('')}
function home(){$('main').innerHTML=`<div class="split"><a class="halfc live" href="#video"><h2>LIVEWEB</h2><p>Live searches of big public archives: Internet Archive, Wikimedia Commons, Dailymotion, Openverse, The Met, Open Library, Project Gutenberg, plus YouTube and Wayback logs.</p><p>${half('live').map(([k,m])=>m.icon+' '+m.name).join(' · ')}</p></a>
<a class="halfc deep" href="#dvideo"><h2>DEEPWEB</h2><p>The obscure end of the same public web: near-zero-view YouTube uploads, user-uploaded Archive items with raw filenames or occult/unexplained subjects, and media files from dead 1996–2009 personal sites.</p><p>${half('deep').map(([k,m])=>m.icon+' '+m.name).join(' · ')}</p><p class="q">Just a section name: public sources only, no Tor, nothing hidden or hacked.</p></a></div>`}
function render(){document.body.className=state.m+' '+(MODULES[state.m]?.half||'');nav();if(state.m==='home')return home();if(state.m==='vault')return vault();const M=MODULES[state.m],S=M.sources[state.s];
 $('main').innerHTML=`<section class="world"><h2>${M.half==='deep'?'DEEPWEB · ':''}${M.icon} ${M.name} MINE</h2><p class="sub">${M.sub}</p>
 <div class="tabs">${Object.entries(M.sources).map(([k,s])=>`<button class="${k==state.s?'on':''}" onclick="location.hash='${state.m}/${k}'">${s.name}</button>`).join('')}</div>
 <p class="sub">${S.note}</p>
 <div class="ctl"><input type="text" id="kw" placeholder="keyword (blank = random dig)"><label>years <input type="number" id="y1" value="${localStorage.y1||1900}"> – <input type="number" id="y2" value="${localStorage.y2||new Date().getFullYear()}"></label>
 <select id="raw"><option value="1">raw / low-count only</option><option value="">any</option></select>
 <button class="go" onclick="dig()">⛏ ${''}MINE</button></div>${M.half==='deep'?`<div class="chips">${ESOT.map(t=>`<button onclick="$('#kw').value=this.textContent;dig()">${esc(t)}</button>`).join('')}</div>`:''}<div class="scan" id="scan"></div><div class="status" id="st"></div><div class="grid" id="grid"></div></section>`;
 $('#raw').value=localStorage.raw??'1';$('#kw').onkeydown=e=>e.key==='Enter'&&dig();dig()}
async function dig(){const o={kw:$('#kw').value.trim(),y1:+$('#y1').value||1900,y2:+$('#y2').value||2026,raw:!!$('#raw').value};localStorage.y1=o.y1;localStorage.y2=o.y2;localStorage.raw=o.raw?'1':'';
 const S=MODULES[state.m].sources[state.s],tag=state.m+state.s;$('#scan').classList.add('on');$('#st').textContent=`scanning ${S.name}…`;$('#grid').innerHTML='';
 const {res,err,note}=await mineWithRetry(S,o,m=>{$('#st').textContent=m});
 if(tag!==state.m+state.s)return;$('#scan').classList.remove('on');items=res;
 $('#st').textContent=res.length?`${note}${res.length} finds · ${new Date().toLocaleTimeString()} · query: ${res[0].query}`:(err?'source error: '+err:'no signal, try again or loosen filters');grid('#grid',res)}
function grid(sel,list){$(sel).innerHTML=list.map((x,i)=>`<div class="card" style="animation-delay:${i*40}ms" onclick="openF('${sel}',${i})">
 <button class="star" onclick="event.stopPropagation();this.textContent=toggle(LISTS['${sel}'][${i}])?'★':'☆';nav()">${V()[x.url]?'★':'☆'}</button>
 <div class="thumb" style="${x.thumb?`background-image:url('${esc(x.thumb)}')`:''}">${x.thumb?'':MODULES[x.module]?.icon||'?'}</div>
 <div class="meta"><div><span class="badge">${esc(x.source)}</span></div><div class="t">${esc(x.title)}</div>
 <div>${x.date?esc(x.dateLabel+' '+x.date):'date n/a'}${x.count!=null?' · '+esc(x.count)+' '+esc(x.countLabel):''}</div></div></div>`).join('');LISTS[sel]=list}
const LISTS={};
function openF(sel,i){const x=LISTS[sel][i],s=esc(x.src);const m={iframe:`<iframe src="${s}" allowfullscreen allow="autoplay; fullscreen"></iframe>`,video:`<video controls autoplay src="${s}"></video>`,
 img:`<img src="${s}">`,audio:`${x.thumb?`<img src="${esc(x.thumb)}" style="max-height:200px">`:''}<audio controls autoplay src="${s}"></audio>`,link:x.thumb?`<img src="${esc(x.thumb)}" style="max-height:300px">`:''}[x.kind]||'';
 $('#mb').innerHTML=`${m}<h3>${esc(x.title)}</h3><div><span class="badge">${esc(x.module?.toUpperCase())}</span><span class="badge">${esc(x.source)}</span> ${x.date?esc(x.dateLabel+': '+x.date):''}${x.count!=null?' · '+esc(x.count)+' '+esc(x.countLabel):''}</div>
 <div>${esc(x.extra||'')}</div>${x.mined_at?`<div class="q">logged by scheduled miner: ${esc(x.mined_at)}</div>`:''}<div class="q">query: ${esc(x.query)}</div>
 <div class="row"><a class="go" href="${esc(x.url)}" target="_blank" rel="noopener">open at source ↗</a><button class="go" id="sv">${V()[x.url]?'★ saved':'☆ save to vault'}</button><button class="go" onclick="closeM()">close</button></div>`;
 $('#sv').onclick=()=>{$('#sv').textContent=toggle(x)?'★ saved':'☆ save to vault';nav();if(state.m==='vault')vault();else grid(sel,LISTS[sel])};$('#modal').classList.add('on')}
function closeM(){$('#modal').classList.remove('on');$('#mb').innerHTML=''}
function vault(){const v=Object.values(V()).sort((a,b)=>b.saved_at.localeCompare(a.saved_at));const g={};v.forEach(x=>{(g[x.module+' · '+x.source]??=[]).push(x)});
 $('main').innerHTML=`<section class="world"><h2>★ VAULT</h2><p class="sub">Your saved finds. Stored only in this browser (localStorage). Export to keep or move them.</p>
 <div class="ctl"><button class="go" onclick="exp()">export JSON</button><label class="go">import JSON<input type="file" accept=".json" hidden onchange="imp(this.files[0])"></label><button class="go" onclick="confirm('Clear vault?')&&(saveV({}),render())">clear</button></div>
 ${v.length?'':'<p class="sub">Nothing saved yet. Star a find in any module.</p>'}${Object.entries(g).map(([k,l],j)=>`<h3>${esc(k.toUpperCase())} (${l.length})</h3><div class="grid" id="v${j}"></div>`).join('')}</section>`;
 Object.values(g).forEach((l,j)=>grid('#v'+j,l))}
function exp(){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(Object.values(V()),null,1)],{type:'application/json'}));a.download='signal-miner-vault.json';a.click()}
async function imp(f){try{const l=JSON.parse(await f.text()),v=V();[].concat(l).forEach(x=>x.url&&(v[x.url]={saved_at:new Date().toISOString(),...x}));saveV(v);render()}catch(e){alert('bad file: '+e)}}
document.addEventListener("keydown",e=>e.key==="Escape"&&closeM());if(!location.pathname.endsWith("test.html"))route();
