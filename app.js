const pick=a=>a[Math.floor(Math.random()*a.length)],rnd=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const J=async u=>{const r=await fetch(u);if(!r.ok)throw new Error(r.status+' '+u);return r.json()};
const shuffle=a=>a.map(x=>[Math.random(),x]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);
const WORDS=["river","street","kitchen","party","dog","car","beach","snow","garden","school","church","train","birthday","night","city","farm","lake","road","bridge","market","house","window","forest","boat","horse","concert","rain","mountain","family","factory"];
const RAWV=["IMG_*","MVI_*","DSC*","VID_*","MOV*","GOPR*","video*","untitled","clip*","DSCF*"];
const yr=(o)=>(o.kw||o.loose)?`publicdate:[${o.y1}-01-01T00:00:00Z TO ${o.y2}-12-31T23:59:59Z]`:(y=>`publicdate:[${y}-01-01T00:00:00Z TO ${y}-12-31T23:59:59Z]`)(rnd(Math.max(o.y1,2002),o.y2));
const inYears=(d,o)=>{const y=parseInt(d);return !y||(y>=o.y1&&y<=o.y2)};
const CC='https://index.commoncrawl.org/CC-MAIN-2026-39-index';
const TLDS=['.museum','.edu','.is','.li','.fm','.io','.nu','.ws','.ge','.md','.kg','.by'];
const DEPTHS=['200 m · epipelagic','800 m · mesopelagic','1.5 km · bathypelagic','3 km · abyssal','6 km · hadal','10.9 km · Mariana'],depth=()=>pick(DEPTHS);
const NSFW=/porn|xxx|\bsex\b|nude|camgirl|onlyfans|hentai|\bjav\b|adultvideo|escort|casino|bet\d|viagra|pharmacy|pharma|replica.?watch|crack.?key|warez|05av|xnxx|xvideos|pornhub|xhamster|redtube/i;
const isNsfw=u=>NSFW.test(String(u||''));
function sanitizeText(t){return String(t||'').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,'').slice(0,800)}

/* ---------- LIVE sources ---------- */
function iaSrc({mt,extra,rawPats,rawMax=25,source,module}){return async o=>{
  const p=[`mediatype:${mt}`];if(extra)p.push(extra);
  if(o.kw)p.push(`(${o.kw})`);else if(o.raw&&rawPats)p.push(`title:(${pick(rawPats)})`);else if(!extra)p.push(`(${pick(WORDS)})`);
  if(o.raw)p.push(`downloads:[0 TO ${rawMax}]`);p.push(yr(o));
  const q=p.join(' AND '),u=new URLSearchParams({q,rows:40,page:1,output:'json'});
  ["identifier","title","publicdate","downloads","creator"].forEach(f=>u.append('fl[]',f));
  const docs=(await J('https://archive.org/advancedsearch.php?'+u)).response.docs;
  return shuffle(docs).slice(0,24).map(d=>({module,source,title:d.title||d.identifier,date:(d.publicdate||'').slice(0,10),dateLabel:'uploaded',
    count:d.downloads,countLabel:'downloads',thumb:`https://archive.org/services/img/${d.identifier}`,kind:'iframe',src:`https://archive.org/embed/${d.identifier}`,
    url:`https://archive.org/details/${d.identifier}`,query:q,extra:d.creator?`creator: ${[].concat(d.creator).join(', ')}`:''}))}}

function commonsSrc(ft,module){return async o=>{
  let s=`filetype:${ft} `+(o.kw||(o.raw?pick(['intitle:IMG','intitle:DSC','intitle:MVI','intitle:VID','intitle:P10']):''));
  const off=(o.kw||o.raw)?rnd(0,o.raw?150:0):rnd(0,ft==='video'?9000:5000);
  const u=new URLSearchParams({action:'query',format:'json',origin:'*',generator:'search',gsrsearch:s.trim(),gsrnamespace:6,gsrlimit:30,gsroffset:off,prop:'imageinfo',iiprop:'url|timestamp|mime|user',iiurlwidth:480});
  const r=await J('https://commons.wikimedia.org/w/api.php?'+u);
  return Object.values(r.query?.pages||{}).filter(p=>p.imageinfo).map(p=>{const i=p.imageinfo[0];return{module,source:'Wikimedia Commons',title:p.title.replace(/^File:/,''),
    date:i.timestamp.slice(0,10),dateLabel:'uploaded',count:null,thumb:i.thumburl,kind:ft==='video'?'video':(ft==='audio'?'audio':'img'),src:ft==='bitmap'?(i.thumburl?.replace(/\/\d+px-/,'/1280px-')||i.url):i.url,
    url:i.descriptionurl,query:`${s.trim()} (offset ${off})`,extra:`uploader: ${i.user||'?'}`}}).filter(x=>inYears(x.date,o))}}

async function dailymotion(o){const term=o.kw||(o.raw?pick(["IMG_","MVI_","DSC","VID_","MOV","GOPR"])+String(rnd(0,999)).padStart(4,'0'):pick(WORDS));
  const u=new URLSearchParams({search:term,limit:50,page:(o.kw||o.raw)?1:rnd(1,3),fields:'id,title,created_time,views_total,thumbnail_360_url,duration,owner.username',
    created_after:Math.floor(Date.UTC(o.y1,0,1)/1000),created_before:Math.floor(Date.UTC(o.y2,11,31)/1000)});
  const r=await J('https://api.dailymotion.com/videos?'+u);
  return r.list.filter(v=>!o.raw||v.views_total<=100).map(v=>({module:'video',source:'Dailymotion',title:v.title,date:new Date(v.created_time*1000).toISOString().slice(0,10),dateLabel:'uploaded',
    count:v.views_total,countLabel:'views',thumb:v.thumbnail_360_url,kind:'iframe',src:`https://geo.dailymotion.com/player.html?video=${v.id}`,url:`https://www.dailymotion.com/video/${v.id}`,query:`search="${term}"${o.raw?' views<=100':''}`,extra:`${v.duration}s · ${v['owner.username']||''}`}))}

function openverse(kind){return async o=>{const term=o.kw||(o.raw?pick(['IMG','DSC','untitled','snapshot','photo']):pick(WORDS));
  const pg=o.kw?1:rnd(1,10);const r=await J(`https://api.openverse.org/v1/${kind}/?`+new URLSearchParams({q:term,page_size:20,page:pg}));
  return r.results.map(x=>({module:kind==='images'?'image':'audio',source:'Openverse',title:x.title||'(untitled)',date:'',dateLabel:'',count:null,thumb:x.thumbnail,
    kind:kind==='images'?'img':'audio',src:x.url,url:x.foreign_landing_url,query:`q="${term}" page ${pg}`,extra:`${x.creator?'by '+x.creator+' · ':''}${x.license?'CC '+x.license.toUpperCase()+' · ':''}via ${x.provider||x.source}`}))}}

async function met(o){const term=o.kw||pick(WORDS);const r=await J('https://collectionapi.metmuseum.org/public/collection/v1.1/search?'+new URLSearchParams({q:term,hasImages:true,limit:60,offset:0}));
  const ids=shuffle(r.objectIDs||[]).slice(0,16);
  const objs=await Promise.all(ids.map(i=>J('https://collectionapi.metmuseum.org/public/collection/v1/objects/'+i).catch(()=>null)));
  return objs.filter(x=>x&&x.primaryImageSmall).map(x=>({module:'image',source:'Met Museum',title:x.title||x.objectName,date:x.objectDate,dateLabel:'object date',count:null,
    thumb:x.primaryImageSmall,kind:'img',src:x.primaryImage||x.primaryImageSmall,url:x.objectURL,query:`v1.1/search q="${term}" hasImages`,extra:[x.artistDisplayName,x.department,x.isPublicDomain?'public domain':''].filter(Boolean).join(' · ')}))}

async function openlib(o){const term=o.kw||pick(WORDS);const q=`${term} first_publish_year:[${o.y1} TO ${o.y2}]`+(o.raw?' edition_count:1':'');
  const r=await J('https://openlibrary.org/search.json?'+new URLSearchParams({q,limit:30,page:o.kw?1:rnd(1,5),fields:'key,title,author_name,first_publish_year,cover_i,edition_count,ia,ebook_access'}));
  return r.docs.map(d=>({module:'book',source:'Open Library',title:d.title,date:d.first_publish_year?String(d.first_publish_year):'',dateLabel:'first published',count:d.edition_count,countLabel:'editions',
    thumb:d.cover_i?`https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg`:'',kind:(d.ebook_access==='public'&&d.ia)?'iframe':'link',src:d.ia?`https://archive.org/embed/${d.ia[0]}`:'',
    url:'https://openlibrary.org'+d.key,query:q,extra:(d.author_name||[]).slice(0,2).join(', ')+(d.ebook_access?` · ebook: ${d.ebook_access}`:'')}))}
async function gutendex(o){const u=new URLSearchParams();if(o.kw)u.set('search',o.kw);else u.set('page',o.raw?rnd(2350,2480):rnd(1,200));
  const r=await J('https://gutendex.com/books/?'+u);
  return r.results.map(b=>({module:'book',source:'Project Gutenberg',title:b.title,date:'',dateLabel:'',count:b.download_count,countLabel:'downloads (30d)',
    thumb:b.formats['image/jpeg']||'',kind:'link',src:'',url:`https://www.gutenberg.org/ebooks/${b.id}`,query:'gutendex '+u,extra:b.authors.map(a=>a.name).join('; ')+(b.languages?' · '+b.languages.join(','):'')}))}

/* ---------- TRENCH sources ---------- */
async function ccObscureLive(o){
  const tld=o.kw?null:pick(TLDS), page=rnd(0,o.raw?2:5);
  const urlQ=o.kw?`*${o.kw}*`:`*${tld}/*`;
  const q=`${CC}?url=${encodeURIComponent(urlQ)}&output=json&page=${page}&limit=40&filter=mime:text/html&filter=status:200`;
  const res=await fetch(q); const txt=await res.text();
  if(!res.ok||txt.includes('502')||txt.includes('504')||txt.includes('No Captures')||!txt.trim())throw new Error('cc empty '+res.status);
  const rows=txt.trim().split('\n').filter(Boolean).map(l=>{try{return JSON.parse(l)}catch{return null}}).filter(Boolean);
  const out=[]; let previews=0;
  for(const r of shuffle(rows).slice(0,24)){
    if(isNsfw(r.url))continue;
    const ts=r.timestamp||'', date=ts?`${ts.slice(0,4)}-${ts.slice(4,6)}-${ts.slice(6,8)}`:'';
    if(!inYears(date,o))continue;
    let preview='';
    if(previews<2){previews++;try{const live=await fetch(r.url,{signal:AbortSignal.timeout(700)});const ct=live.headers.get('content-type')||'';
      if(live.ok&&ct.includes('text'))preview=sanitizeText((await live.text()).replace(/<script[\s\S]*?<\/script>/gi,'').replace(/<style[\s\S]*?<\/style>/gi,'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' '))}catch{}}
    out.push({module:'crawl',source:'Common Crawl',title:r.url.replace(/^https?:\/\//,'').slice(0,80),date,dateLabel:'captured',count:r.length?+r.length:null,countLabel:'bytes (warc)',
      kind:'meta',depth:depth(),mime:r.mime||'text/html',preview:preview||'(no live text preview — open source link)',
      url:r.url,query:`CC-MAIN-2026-39 url=${urlQ} page=${page}`,extra:`mime ${r.mime} · lang ${(r.languages||'?')} · status ${r.status}`});if(out.length>=16)break}
  return out}
async function gists(o){
  const page=o.kw?1:rnd(1,8);const list=await J(`https://api.github.com/gists/public?per_page=30&page=${page}`);
  const out=[];
  for(const g of shuffle(list).slice(0,16)){
    const files=Object.values(g.files||{});const f=files[0];if(!f)continue;
    const title=g.description||f.filename||g.id;if(isNsfw(title)||isNsfw(f.filename)||isNsfw(g.html_url))continue;
    if(o.kw&&!(title+' '+f.filename).toLowerCase().includes(o.kw.toLowerCase())&&!files.some(x=>x.filename.toLowerCase().includes(o.kw.toLowerCase())))continue;
    let preview='';
    if(f.raw_url&&(f.language||f.type||'').match(/text|markdown|json|yaml|xml|html|python|js|plain/i)&&(!f.size||f.size<20000)){
      try{preview=sanitizeText(await (await fetch(f.raw_url)).text())}catch{}}
    out.push({module:'gists',source:'GitHub Gists',title:title.slice(0,100),date:(g.created_at||'').slice(0,10),dateLabel:'created',count:f.size,countLabel:'bytes',
      kind:'meta',depth:depth(),mime:f.type||f.language||'text',preview:preview||`(file: ${f.filename}, ${f.size||'?'} bytes — open gist for content)`,
      url:g.html_url,query:`api.github.com/gists/public page=${page}`,extra:`${files.length} file(s) · ${f.filename}`})}
  return out}

async function nasaSpace(o){
  const term=o.kw||pick(['radio telescope','Breakthrough Listen','Green Bank','Arecibo','Very Large Array','pulsar','SETI','deep space network']);
  const page=o.kw?1:rnd(1,8);
  const r=await J('https://images-api.nasa.gov/search?'+new URLSearchParams({q:term,media_type:'image',page_size:'20',page:String(page)}));
  return (r.collection?.items||[]).map(it=>{const d=(it.data||[{}])[0];const thumb=(it.links||[]).find(l=>l.rel==='preview')?.href||'';
    return{module:'space',source:'NASA Images',title:(d.title||term).slice(0,120),date:(d.date_created||'').slice(0,10),dateLabel:'created',count:null,
      kind:'img',depth:depth(),mime:'image/jpeg',thumb,src:thumb,preview:sanitizeText(d.description||''),
      url:`https://images.nasa.gov/details/${d.nasa_id||''}`,query:`images-api.nasa.gov q="${term}" page ${page}`,
      extra:`center ${d.center||'?'} · ${(d.keywords||[]).slice(0,5).join(', ')}`}})}

async function ripeLive(o){
  const ases=[3333,15169,8075,13335,20940,16509,2914,1299,174,3356,7018,1239,714,6939];
  const asn=o.kw&&/^\d+$/.test(o.kw)?+o.kw:pick(ases);
  const r=await J(`https://stat.ripe.net/data/announced-prefixes/data.json?resource=AS${asn}`);
  const prefs=shuffle(r.data?.prefixes||[]).slice(0,16);
  const out=prefs.map(p=>{const pref=p.prefix||p;return{module:'tectonics',source:'RIPEstat BGP',title:`AS${asn} announces ${pref}`,date:new Date().toISOString().slice(0,10),dateLabel:'sampled',
    count:asn,countLabel:'ASN',kind:'meta',depth:depth(),mime:'bgp/announce',preview:`prefix ${pref}\nAS${asn}`,url:`https://stat.ripe.net/app/launchpad/AS${asn}`,
    query:`RIPEstat announced-prefixes AS${asn}`,extra:'public RIS-derived view'}});
  if(prefs[0]){try{const pref=prefs[0].prefix||prefs[0];const s=await J(`https://stat.ripe.net/data/routing-status/data.json?resource=${encodeURIComponent(pref)}`);
    out.unshift({module:'tectonics',source:'RIPEstat BGP',title:`routing status ${pref}`,date:new Date().toISOString().slice(0,10),dateLabel:'sampled',
      count:s.data?.visibility?.v4?.ris_peers_seeing,countLabel:'RIS peers seeing',kind:'meta',depth:depth(),mime:'bgp/status',
      preview:sanitizeText(JSON.stringify({first_seen:s.data?.first_seen,last_seen:s.data?.last_seen,origins:s.data?.origins},null,1)),
      url:`https://stat.ripe.net/${pref}`,query:`RIPEstat routing-status ${pref}`,extra:'origins list may show multi-origin / hijack-like anomalies'})}catch{}}
  return out}

async function chainLive(o){
  // Prefer pre-mined log (full OP_RETURN decode); fall back to coinbase of latest block in-browser
  try{const L=await logSrc('blockchain','chain')(o);if(L.length)return L}catch{}
  const lb=await J('https://blockchain.info/latestblock');
  const h=lb.height-rnd(1,20);
  const b=await J(`https://blockchain.info/block-height/${h}?format=json`);
  const block=b.blocks[0];const out=[];
  try{const script=block.tx[0].inputs[0].script;const raw=script.match(/.{1,2}/g).map(x=>String.fromCharCode(parseInt(x,16))).join('');
    const m=raw.match(/[A-Za-z][A-Za-z0-9 #\/_\-\.]{3,}/);if(m)out.push({module:'chain',source:'Bitcoin chain',title:`coinbase · block ${block.height}: ${m[0].slice(0,60)}`,
      date:new Date(block.time*1000).toISOString().slice(0,10),dateLabel:'block time',count:block.height,countLabel:'height',kind:'meta',depth:depth(),
      mime:'bitcoin/coinbase',preview:m[0],url:`https://www.blockchain.com/explorer/blocks/btc/${block.hash}`,query:`blockchain.info/block-height/${h}`,extra:'coinbase ASCII'})}catch{}
  return out}

const cache={};
function logSrc(file,module){return async o=>{cache[file]??=await J(`finds/${file}.json?`+Date.now()).catch(()=>[]);
  let L=cache[file].filter(x=>(!o.kw||(x.title+' '+(x.query||'')+' '+(x.preview||'')).toLowerCase().includes(o.kw.toLowerCase()))&&(!o.raw||x.count==null||x.count<=100)&&inYears(x.date,o));
  L=L.filter(x=>!isNsfw(x.url)&&!isNsfw(x.title));L=o.kw?L.slice().reverse():shuffle(L);return L.slice(0,48).map(x=>({...x,module:x.module||module}))}}


function sacredIA(extra,module){return iaSrc({mt:'texts',extra:extra+' OR collection:sacred_texts OR creator:("Internet Sacred Text Archive")',source:'Sacred Texts / Archive',module})}
async function openlibTheo(o,module,fallbackKw){const oo={...o,kw:o.kw||pick(fallbackKw)};const r=await openlib(oo);return r.map(x=>({...x,module}))}

const MODULES={
 video:{half:'live',name:'VIDEO',icon:'▶',blurb:'Raw clips, old films, TV and forgotten uploads.',sources:{
  youtube:{name:'YouTube',f:logSrc('youtube','video'),note:'From the scheduled miner log (yt-dlp on GitHub Actions).'},
  ia_raw:{name:'Archive · raw',f:iaSrc({mt:'movies',rawPats:RAWV,source:'Internet Archive',module:'video'}),note:'archive.org movies, live search.'},
  ia_films:{name:'Archive · films & TV',f:iaSrc({mt:'movies',extra:'collection:(prelinger OR classic_tv OR feature_films OR ephemera OR classic_cartoons OR television OR moviesandfilms)',rawMax:100,source:'Internet Archive',module:'video'}),note:'Prelinger, classic TV, feature films.'},
  commons:{name:'Wikimedia Commons',f:commonsSrc('video','video'),note:'Commons video files.'},
  dailymotion:{name:'Dailymotion',f:dailymotion,note:'Dailymotion public API.'}}},
 image:{half:'live',name:'IMAGE',icon:'◩',blurb:'Photos, scans, artworks and old web graphics.',sources:{
  commons:{name:'Wikimedia Commons',f:commonsSrc('bitmap','image'),note:'Commons images.'},
  ia:{name:'Internet Archive',f:iaSrc({mt:'image',rawPats:["IMG_*","DSC*","DSCF*","P10*","scan*","photo*","untitled"],source:'Internet Archive',module:'image'}),note:'archive.org image items.'},
  openverse:{name:'Openverse',f:openverse('images'),note:'Openly licensed images via Openverse.'},
  met:{name:'Met Museum',f:met,note:'The Met collection API.'},
  wayback:{name:'Wayback Machine',f:logSrc('wayback_image','image'),note:'GIF/JPEG from GeoCities-era sites (scheduled).'}}},
 book:{half:'live',name:'BOOK',icon:'❏',blurb:'Books, scans and public-domain texts.',sources:{
  openlibrary:{name:'Open Library',f:openlib,note:'Raw = single-edition titles.'},
  ia:{name:'Archive texts',f:iaSrc({mt:'texts',rawPats:["scan*","untitled","document*","IMG_*","notes*","Scan*"],source:'Internet Archive',module:'book'}),note:'archive.org texts.'},
  gutenberg:{name:'Project Gutenberg',f:gutendex,note:'Via Gutendex.'}}},
 audio:{half:'live',name:'AUDIO',icon:'◉',blurb:'Field recordings, voice memos, old radio.',sources:{
  ia_raw:{name:'Archive · raw',f:iaSrc({mt:'audio',rawPats:["New Recording*","Voice*","untitled","Track*","audio*","REC*","Memo*"],source:'Internet Archive',module:'audio'}),note:'archive.org audio.'},
  ia_radio:{name:'Archive · old radio',f:iaSrc({mt:'audio',extra:'collection:(oldtimeradio OR 78rpm)',rawMax:50,source:'Internet Archive',module:'audio'}),note:'Old Time Radio and 78rpm.'},
  openverse:{name:'Openverse',f:openverse('audio'),note:'Openly licensed audio via Openverse.'},
  commons:{name:'Wikimedia Commons',f:commonsSrc('audio','audio'),note:'Commons audio files.'}}},

 crawl:{half:'trench',name:'COMMON CRAWL',icon:'≋',blurb:'Obscure-TLD page captures. Text/metadata only.',sources:{
  crawl:{name:'Obscure pages',f:async o=>{try{const r=await ccObscureLive(o);if(r.length)return r}catch(e){console.warn(e)}return logSrc('deep_crawl','crawl')(o)},note:'Random obscure TLD captures from Common Crawl (public index). NSFW filtered. Hardline random — not a curated list.'}}},
 gopher:{half:'trench',name:'GOPHER',icon:'🕳️',blurb:'Gopher holes via Floodgap HTTP gateway.',sources:{
  gopher:{name:'Gopher holes',f:logSrc('deep_gopher','gopher'),note:'Pre-mined via public Floodgap gateway. No Tor.'}}},
 gists:{half:'trench',name:'GISTS',icon:'📋',blurb:'Recent public GitHub gists (paste dumps).',sources:{
  gists:{name:'Public gists',f:gists,note:'Live via GitHub public API — random pages, not starred lists.'}}},
 cameras:{half:'trench',name:'OPEN CAMERAS',icon:'📷',blurb:'Already-public unauthenticated camera streams from public indexes. No scanning. No passwords.',sources:{
  cameras:{name:'IoT / open cams',f:logSrc('cameras','cameras'),note:'Pulled from public indexes (urlscan etc.), then verified unauthenticated. We do not port-scan or use credentials. Streams already broadcasting publicly.'}}},
 satnogs:{half:'trench',name:'SATNOGS',icon:'🛰️',blurb:'Amateur satellite downlinks — observations & waterfalls.',sources:{
  satnogs:{name:'Observations',f:logSrc('satnogs','satnogs'),note:'SatNOGS Network public API (scheduled; no browser CORS).'}}},
 space:{half:'trench',name:'DEEP SPACE',icon:'🔭',blurb:'Public radio/telescope imagery & SETI-adjacent archives.',sources:{
  nasa:{name:'NASA / radio',f:async o=>{try{const r=await nasaSpace(o);if(r.length)return r}catch(e){console.warn(e)}return logSrc('space','space')(o)},note:'NASA Images API live (radio telescope / Breakthrough Listen / SETI queries). Random pages — not a hand-picked gallery.'}}},
 chain:{half:'trench',name:'CHAIN GRAFFITI',icon:'⛓',blurb:'Human-readable Bitcoin OP_RETURN + coinbase text.',sources:{
  chain:{name:'OP_RETURN / coinbase',f:chainLive,note:'Decoded from public blockchain.info blocks (scheduled + live coinbase fallback).'}}},
 hidden:{half:'trench',name:'HIDDEN DATA',icon:'🔎',blurb:'EXIF / strings / odd metadata in already-mined files.',sources:{
  hidden:{name:'Forensics',f:logSrc('hidden','hidden'),note:'Scheduled analysis of mined images (EXIF, strings, GPS tags, impossible dates).'}}},
 tectonics:{half:'trench',name:'TECTONICS',icon:'🌐',blurb:'Live-ish BGP prefix announcements via RIPEstat.',sources:{
  ripe:{name:'BGP / RIPEstat',f:async o=>{try{const r=await ripeLive(o);if(r.length)return r}catch(e){console.warn(e)}return logSrc('tectonics','tectonics')(o)},note:'RIPEstat announced-prefixes + routing-status. Keyword = ASN number. Not a packet tap.'}}},
 radiation:{half:'trench',name:'BOTNET / MALWARE FEED',icon:'📡',blurb:'BOTNET / MALWARE INFRASTRUCTURE FEED — known malware command-and-control IPs (abuse.ch Feodo Tracker). Reference only: do not visit these addresses.',sources:{
  feodo:{name:'Feodo / scan noise',f:logSrc('radiation','radiation'),note:'abuse.ch Feodo Tracker public JSON (scheduled). Indicators only — do not connect.'}}},
 timeskew:{half:'trench',name:'TIME SKEW',icon:'⏱',blurb:'Impossible timestamps across mined finds.',sources:{
  skew:{name:'Anomalies',f:logSrc('timeskew','timeskew'),note:'Flags pre-1970, unix-epoch defaults, and far-future dates in find metadata.'}}},

 /* ---- THEO: deep-mine engine in theo.js ---- */
 ...THEO_MODULES,
 ...INVENTO_MODULES,
 ...RELIQUARY_MODULES,
 ...DEEPMEDIA_MODULES,
};


/* ---------- blocklist / hide ---------- */
let BLOCK=new Set();
fetch('blocklist.json?'+Date.now()).then(r=>r.json()).then(a=>(BLOCK=new Set(a))).catch(()=>{});
const HIDE=()=>JSON.parse(localStorage.hide||'[]'),hideLocal=u=>{const h=new Set(HIDE());h.add(u);localStorage.hide=JSON.stringify([...h])};
const hostOf=u=>{try{return new URL(u).hostname.replace(/^www\./,'')}catch{return ''}};
const blocked=u=>BLOCK.has(u)||HIDE().includes(u)||[...BLOCK].some(b=>{const h=hostOf(b);return h&&(hostOf(u)===h||hostOf(u).endsWith('.'+h))});

async function mineWithRetry(S,o,say=()=>{}){const steps=[{},{},{loose:1},{loose:1,raw:false},{loose:1,raw:false,y1:1900,y2:2026},{loose:1,raw:false,y1:1900,y2:2026}];
 let err='';for(let i=0;i<steps.length;i++){const q={...o,...steps[i]};if(i)say(`no hits, loosening filters (try ${i+1}/${steps.length})…`);
  try{const r=SAFE.filter((await S.f(q)).filter(x=>!blocked(x.url)));if(r.length)return{res:r,err:'',note:i>=2?`[filters loosened] `:''}}catch(e){err=e.message;await new Promise(r=>setTimeout(r,600))}}
 return{res:[],err,note:''}}

const V=()=>JSON.parse(localStorage.vault||'{}'),saveV=v=>localStorage.vault=JSON.stringify(v);
function toggle(it){const v=V();v[it.url]?delete v[it.url]:v[it.url]={...it,saved_at:new Date().toISOString()};saveV(v);return !!v[it.url]}

const $=s=>document.querySelector(s);let state={half:'',m:'home',s:''},items=[];
function route(){const parts=(location.hash.slice(1)||'').split('/');
  if(['live','trench','theo','invento','reliquary'].includes(parts[0])){state.half=parts[0];state.m=parts[1]||'hub';state.s=parts[2]||''}
  else if(parts[0]==='vault'||parts[0]==='report'){state.half=state.half||'';state.m=parts[0];state.s=''}
  else if(MODULES[parts[0]]){state.half=MODULES[parts[0]].half;state.m=parts[0];state.s=parts[1]||''}
  else{state.half='';state.m='home';state.s=''}
  if(MODULES[state.m]&&!MODULES[state.m].sources[state.s])state.s=Object.keys(MODULES[state.m].sources)[0];
  render()}
window.onhashchange=route;

const REPORT_SITE={'YouTube':['YouTube report help','https://support.google.com/youtube/answer/2802027'],
 'Internet Archive':['Internet Archive: info@archive.org','mailto:info@archive.org?subject=Report%20item'],
 'Wikimedia Commons':['Commons noticeboard','https://commons.wikimedia.org/wiki/Commons:Administrators%27_noticeboard'],
 'Dailymotion':['Dailymotion report','https://faq.dailymotion.com/hc/en-us/requests/new'],
 'Openverse':['Openverse docs','https://docs.openverse.org/'],
 'Wayback Machine':['Archive.org email','mailto:info@archive.org?subject=Report%20Wayback%20capture'],
 'Common Crawl':['Common Crawl contact','https://commoncrawl.org/'],
 'GitHub Gists':['GitHub report content','https://docs.github.com/en/communities/maintaining-your-safety-on-github/reporting-abuse-or-spam'],
 'Gopher':['Floodgap contact','https://www.floodgap.com/'],
 'Open Directory':['Report via GitHub issue','https://github.com/charlesanthonyleone/signal-miner/issues/new'],
 'Open Cameras (public index)':['Report via GitHub issue + NCMEC if illegal','https://github.com/charlesanthonyleone/signal-miner/issues/new'],
 'SatNOGS':['SatNOGS','https://network.satnogs.org/'],
 'Bitcoin chain':['Bitcoin is immutable — report abuse contextually','https://github.com/charlesanthonyleone/signal-miner/issues/new'],
 'RIPEstat BGP':['RIPEstat','https://stat.ripe.net/'],
 'Feodo Tracker':['abuse.ch','https://feodotracker.abuse.ch/'],
 'NASA Images':['NASA','https://www.nasa.gov/'],
 'File forensics':['Report via GitHub issue','https://github.com/charlesanthonyleone/signal-miner/issues/new'],
 'Time-skew':['Report via GitHub issue','https://github.com/charlesanthonyleone/signal-miner/issues/new']};
let REP=null;
function report(x){REP=x;navigator.clipboard?.writeText(x.url).catch(()=>{});closeM();location.hash='report'}
function reportHide(x){hideLocal(x.url);const body=encodeURIComponent(`Please add this URL to blocklist.json so the site filters it out.\n\nURL: ${x.url}\nTitle: ${x.title}\nSource: ${x.source}\nModule: ${x.module}\n\nReason: `);
  window.open(`https://github.com/charlesanthonyleone/signal-miner/issues/new?title=${encodeURIComponent('Blocklist: '+x.title.slice(0,60))}&body=${body}`,'_blank');report(x)}
function reportPage(){const x=REP,site=x&&(REPORT_SITE[x.source]||[`${x.source}: use the report option on the source page`,x.url]);
 $('main').innerHTML=`<section class="world"><h2>⚑ REPORT A FIND</h2>${x?`<p>Item: <b>${esc(x.title)}</b> (${esc(x.source)})<br><a href="${esc(x.url)}" target=_blank rel=noopener>${esc(x.url)}</a></p>
 <div class="row"><button class="go" onclick="navigator.clipboard.writeText(REP.url)">copy URL</button>
 <button class="go" onclick="reportHide(REP)">⚑ Report & hide + GitHub issue</button></div>
 <h3>Report to the hosting platform</h3><p><a href="${esc(site[1])}" target=_blank rel=noopener>${esc(site[0])}</a></p>`:'<p class="sub">Use ⚑ on any find.</p>'}
 <h3>Authorities</h3><ul><li><a href="https://report.cybertip.org/" target=_blank rel=noopener>NCMEC CyberTipline</a></li><li><a href="https://tips.fbi.gov/" target=_blank rel=noopener>FBI tips</a></li><li><a href="https://www.ic3.gov/" target=_blank rel=noopener>FBI IC3</a></li></ul>
 <p class="sub">blocklist.json filters the static site; Report & hide also hides locally.</p></section>`}

function halfMods(h){return Object.entries(MODULES).filter(([,m])=>m.half===h)}
function topnav(){$('#topnav').innerHTML=`
 <button class="halfbtn live ${state.half==='live'?'on':''}" onclick="location.hash='live'">LIVE</button>
 <button class="halfbtn trench ${state.half==='trench'?'on':''}" onclick="location.hash='trench'">TRENCH</button>
 <button class="halfbtn theo ${state.half==='theo'?'on':''}" onclick="location.hash='theo'">THEO</button>
 <button class="halfbtn invento ${state.half==='invento'?'on':''}" onclick="location.hash='invento'">INVENTO</button>
 <button class="halfbtn reliquary ${state.half==='reliquary'?'on':''}" onclick="location.hash='reliquary'">RELIQUARY</button>
 <div class="util">
  <button class="${state.m==='vault'?'on':''}" onclick="location.hash='vault'">★ VAULT (${Object.keys(V()).length})</button>
  <button class="${state.m==='report'?'on':''}" onclick="REP=null;location.hash='report'">⚑ REPORT</button>
  <button onclick="location.hash=''">⌂</button>
 </div>`}
function subnav(){const h=state.half;if(!h||state.m==='vault'||state.m==='report'||state.m==='home'){$('#subnav').innerHTML='';return}
  $('#subnav').innerHTML=halfMods(h).map(([k,m])=>`<button class="${state.m===k?'on':''}" onclick="location.hash='${h}/${k}'">${m.icon} ${m.name}</button>`).join('')}

function home(){$('main').innerHTML=`<div class="depth-gauge"><span>LIVE</span><i></i><span>TRENCH</span><i></i><span>THEO</span><i></i><span>INVENTO</span><i></i><span>RELIQUARY</span></div>
 <div class="hub">
  <a class="hubcard" href="#live" style="border-color:#1f5"><div class="ico">📡</div><h3>LIVE</h3><p>Surface web media — Archive, Commons, Dailymotion, Openverse, Met, Open Library, Gutenberg, YouTube &amp; Wayback. Open a module, then mine.</p></a>
  <a class="hubcard" href="#trench" style="border-color:#2cf"><div class="ico sonar">≋</div><h3>TRENCH</h3><p>Deep public layers — open cameras, SatNOGS, chain graffiti, BGP, crawl, gopher. Hardline non-curated. No Tor.</p></a>
  <a class="hubcard" href="#theo" style="border-color:#d4a"><div class="ico">🕯</div><h3>THEO</h3><p>Forgotten theology &amp; cultures — manuscripts, apocrypha, Geniza, grimoires, dead languages, clay tablets, lost civs, dead gods, mystery cults. Public archives only.</p></a>
  <a class="hubcard" href="#invento" style="border-color:#fa3"><div class="ico">⚙</div><h3>INVENTO</h3><p>Low-visibility USPTO filings — abandoned, expired, secret, war tech, weird & wild frontier patents seeded by real CPC codes.</p></a>
  <a class="hubcard" href="#reliquary" style="border-color:#c9a36b"><div class="ico">🗝</div><h3>THE RELIQUARY</h3><p>Leads no one has followed — buried maps, deathbed confessions, unsolved ciphers, shipwreck manifests, forgotten time capsules.</p></a>
 </div>`}

const HUBMETA={live:{title:'LIVE · module hub',a:'SURFACE',b:'BROADCAST',sub:'Pick a module, then generate finds inside it.'},
 trench:{title:'TRENCH · Mariana modules',a:'0 m',b:'10 994 m',sub:'Hardline random / unfiltered enumeration from public indexes. Safety filter (NSFW/blocklist) only. No scanning, no credentials, no Tor.'},
 theo:{title:'THEO · forgotten theology & cultures',a:'CANON',b:'CULTURES',sub:'Manuscripts, apocrypha, Geniza, grimoires, dead languages, clay tablets — plus Forgotten Cultures (lost civs, dead gods, mystery cults, suppressed faiths). Public archives only.'},
 invento:{title:'INVENTO · patent vault',a:'FILED',b:'ABANDONED',sub:'USPTO application file wrappers (IA uspto collection), seeded with real CPC codes, fewest downloads first. Click a card for the drawing + OCR abstract.'},
 reliquary:{title:'THE RELIQUARY · unfound leads',a:'SEALED',b:'LOST',sub:'Forgotten newspaper pages, zero-view scans and gray-space text that point at things still out there. OCR is raw — verify every lead.'}};
function hub(h){const mods=halfMods(h),meta=HUBMETA[h]||HUBMETA.live;
 $('main').innerHTML=`<div class="depth-gauge"><span>${meta.a}</span><i></i><span>${meta.b}</span></div>
 <h2>${meta.title}</h2>
 <p class="sub">${meta.sub}</p>
 <div class="hub">${mods.map(([k,m])=>`<a href="#${h}/${k}"><div class="ico">${m.icon}</div><h3>${m.name}</h3><p>${m.blurb||m.sub||''}</p></a>`).join('')}</div>`}

function render(){document.body.className=(state.half||state.m||'home');topnav();subnav();
 if(state.m==='home'||(!state.half&&state.m!=='vault'&&state.m!=='report'))return home();
 if(state.m==='report')return reportPage();if(state.m==='vault')return vault();
 if(state.m==='hub')return hub(state.half);
 const M=MODULES[state.m];if(!M)return home();
 const S=M.sources[state.s],trench=M.half==='trench',theo=M.half==='theo',inv=M.half==='invento';
 $('main').innerHTML=`<section class="world">${trench?`<div class="depth-gauge"><span>0 m</span><i></i><span>10 994 m</span></div>`:theo?`<div class="depth-gauge"><span>CANON</span><i></i><span>APOCRYPHA</span></div>`:inv?`<div class="depth-gauge"><span>FILED</span><i></i><span>EXPIRED</span></div>`:''}
 <h2>${M.icon} ${M.name}</h2><p class="sub">${M.blurb||''}</p>
 <div class="tabs">${Object.entries(M.sources).map(([k,s])=>`<button class="${k==state.s?'on':''}" onclick="location.hash='${state.half}/${state.m}/${k}'">${s.name}</button>`).join('')}</div>
 <p class="sub">${S.note}</p>
 <div class="ctl"><input type="text" id="kw" placeholder="${trench?'keyword / ASN (blank = random descent)':theo?'tradition / text (blank = random dig)':inv?'patent keyword (blank = random dig)':'keyword (blank = random dig)'}"><label>years <input type="number" id="y1" value="${localStorage.y1||1900}"> – <input type="number" id="y2" value="${localStorage.y2||new Date().getFullYear()}"></label>
 <select id="raw"><option value="1">${trench?'smaller / rarer first':'raw / low-count only'}</option><option value="">any</option></select>
 <button class="go" onclick="dig()">⛏ MINE</button>
 <button class="go" onclick="location.hash='${state.half}'">← hub</button></div>
 <div class="scan" id="scan"></div><div class="status" id="st"></div><div class="grid" id="grid"></div></section>`;
 $('#raw').value=localStorage.raw??'1';$('#kw').onkeydown=e=>e.key==='Enter'&&dig();dig()}

async function dig(){const o={kw:$('#kw').value.trim(),y1:+$('#y1').value||1900,y2:+$('#y2').value||2026,raw:!!$('#raw').value};localStorage.y1=o.y1;localStorage.y2=o.y2;localStorage.raw=o.raw?'1':'';
 const S=MODULES[state.m].sources[state.s],tag=state.m+state.s;$('#scan').classList.add('on');$('#st').textContent=`scanning ${S.name}…`;$('#grid').innerHTML='';
 const {res,err,note}=await mineWithRetry(S,o,m=>{$('#st').textContent=m});
 if(tag!==state.m+state.s)return;$('#scan').classList.remove('on');items=res;
 $('#st').textContent=res.length?`${note}${res.length} finds · ${new Date().toLocaleTimeString()} · query: ${res[0].query}`:(err?'source error: '+err:'no signal — try again');grid('#grid',res)}

function grid(sel,list){
 list=SAFE.filter(list);$(sel).innerHTML=list.map((x,i)=>`<div class="card ${x.kind==='meta'?'meta':''}" style="animation-delay:${i*40}ms" onclick="openF('${sel}',${i})">
 <button class="star rep" title="report" onclick="event.stopPropagation();report(LISTS['${sel}'][${i}])">⚑</button>
 <button class="star" onclick="event.stopPropagation();this.textContent=toggle(LISTS['${sel}'][${i}])?'★':'☆';topnav()">${V()[x.url]?'★':'☆'}</button>
 ${x.kind==='meta'?`<div class="thumb meta-thumb"><div class="depth">${esc(x.depth||'—')}</div><div class="fname">${esc(x.title)}</div><div class="ftype">${esc(x.mime||'file')}${x.count!=null?' · '+esc(x.count)+' '+(x.countLabel||''):''}</div></div>`
  :`<div class="thumb" style="${x.thumb&&SAFE.thumbOK(x.thumb,x)?`background-image:url('${esc(x.thumb)}')`:''}">${x.thumb&&SAFE.thumbOK(x.thumb,x)?'':(x.gated?'⚠':(x.kind==='cam'?'📷':MODULES[x.module]?.icon||'?'))}</div>`}
 <div class="meta"><div><span class="badge">${esc(x.source)}</span>${x.depth?`<span class="badge">${esc(x.depth)}</span>`:''}</div>
 <div class="t">${esc(x.title)}</div>
 <div>${x.date?esc(x.dateLabel+' '+x.date):'date n/a'}${x.count!=null&&x.kind!=='meta'?' · '+esc(x.count)+' '+esc(x.countLabel):''}</div>
 ${x.preview?`<div class="prev">${esc(x.preview.slice(0,140))}</div>`:''}</div></div>`).join('');LISTS[sel]=list}
const LISTS={};

function openF(sel,i){const x=LISTS[sel][i];
 if(x.kind==='cam'){
  const still=x.mime&&x.mime.startsWith('image/');
  $('#mb').innerHTML=`<h3>${esc(x.title)}</h3><div><span class="badge">${esc((state.half||'trench').toUpperCase())}</span><span class="badge">OPEN CAMERA</span><span class="badge">${esc(x.depth||'')}</span></div>
  <p class="warn">Public unauthenticated stream from a public index. We did not scan or log in. Viewing may show private spaces — use ⚑ if inappropriate.</p>
  ${SAFE.gate(`<img class="cam" src="${esc(x.src||x.thumb)}" alt="camera">`,x)}
  <div class="meta-panel"><div>${esc(x.extra||'')}</div><div>type: ${esc(x.mime||'?')}</div></div>
  <pre class="prevbox">${esc(x.preview||'')}</pre>
  <div class="row"><a class="go" href="${esc(x.url)}" target="_blank" rel="noopener">open stream ↗</a>
  <button class="go" id="sv">${V()[x.url]?'★ saved':'☆ save'}</button>
  <button class="go" id="rp">⚑ report & hide</button><button class="go" onclick="closeM()">close</button></div>`;
  $('#rp').onclick=()=>reportHide(x);$('#sv').onclick=()=>{$('#sv').textContent=toggle(x)?'★ saved':'☆ save';topnav()};$('#modal').classList.add('on');return}
 if(x.kind==='meta'){const warn=x.mime&&/image|video|audio|octet/i.test(x.mime);
  $('#mb').innerHTML=`<h3>${esc(x.title)}</h3><div><span class="badge">${esc((MODULES[x.module]?.half||state.half||'').toUpperCase())}</span><span class="badge">${esc(x.source)}</span>${x.depth?`<span class="badge">${esc(x.depth)}</span>`:''}${x.extra&&x.extra.includes('modern-use')?`<span class="badge">modern-use</span>`:''}</div>
  <div class="meta-panel"><div>type: ${esc(x.mime||'?')}</div><div>size: ${x.count!=null?esc(x.count)+' '+esc(x.countLabel||''):'n/a'}</div><div>${x.date?esc(x.dateLabel+': '+x.date):''}</div><div>${esc(x.extra||'')}</div></div>
  <h4>text preview</h4><pre class="prevbox">${esc(x.preview||'(none)')}</pre>
  ${warn?`<p class="warn">Looks like media — not played here. Open source only if you accept the risk.</p>`:''}
  <div class="q">query: ${esc(x.query)}</div>
  <div class="row"><a class="go" href="${esc(x.url)}" target="_blank" rel="noopener">open at source ↗</a>
  <button class="go" id="sv">${V()[x.url]?'★ saved':'☆ save'}</button>
  <button class="go" id="rp">⚑ report & hide</button><button class="go" onclick="closeM()">close</button></div>`;
  $('#rp').onclick=()=>reportHide(x);$('#sv').onclick=()=>{$('#sv').textContent=toggle(x)?'★ saved':'☆ save';topnav()};$('#modal').classList.add('on');return}
 const s=esc(x.src);const m={iframe:`<iframe src="${s}" allowfullscreen allow="fullscreen"></iframe>`,video:`<video controls src="${s}"></video>`,
  img:`<img src="${s}">`,audio:`${x.thumb?`<img src="${esc(x.thumb)}" style="max-height:200px">`:''}<audio controls src="${s}"></audio>`,link:x.thumb?`<img src="${esc(x.thumb)}" style="max-height:300px">`:''}[x.kind]||'';const mm=SAFE.isMedia(x)?SAFE.gate(m,x):m;
 $('#mb').innerHTML=`${mm}<h3>${esc(x.title)}</h3><div><span class="badge">${esc((x.module||'').toUpperCase())}</span><span class="badge">${esc(x.source)}</span> ${x.date?esc(x.dateLabel+': '+x.date):''}${x.count!=null?' · '+esc(x.count)+' '+esc(x.countLabel):''}</div>
 <div>${esc(x.extra||'')}</div>${x.lazy?'<h4>abstract / text</h4><pre class="prevbox" id="lazy">loading…</pre>':(x.preview?`<pre class="prevbox">${esc(x.preview)}</pre>`:'')}${x.links?`<div class="row">${x.links.map(l=>`<a class="go" href="${esc(l[1])}" target="_blank" rel="noopener">${esc(l[0])}</a>`).join('')}</div>`:''}${x.mined_at?`<div class="q">logged: ${esc(x.mined_at)}</div>`:''}<div class="q">query: ${esc(x.query)}</div>
 <div class="row"><a class="go" href="${esc(x.url)}" target="_blank" rel="noopener">open at source ↗</a><button class="go" id="sv">${V()[x.url]?'★ saved':'☆ save'}</button><button class="go" id="rp">⚑ report</button><button class="go" onclick="closeM()">close</button></div>`;
 if(x.lazy)x.lazy().then(t=>{const e=$('#lazy');if(e)e.textContent=SAFE.screen({title:'',preview:t})?'(text hidden by safety screen)':t}).catch(e=>{const el=$('#lazy');if(el)el.textContent='could not load: '+e.message});$('#rp').onclick=()=>report(x);$('#sv').onclick=()=>{$('#sv').textContent=toggle(x)?'★ saved':'☆ save';topnav();if(state.m==='vault')vault();else grid(sel,LISTS[sel])};$('#modal').classList.add('on')}
function closeM(){$('#modal').classList.remove('on');$('#mb').innerHTML=''}
function vault(){const v=Object.values(V()).filter(x=>!blocked(x.url)).sort((a,b)=>b.saved_at.localeCompare(a.saved_at));const g={};v.forEach(x=>{(g[(x.module||'?')+' · '+x.source]??=[]).push(x)});
 $('main').innerHTML=`<section class="world"><h2>★ VAULT</h2><p class="sub">Saved finds across LIVE / TRENCH / THEO / INVENTO. Browser-local only.</p>
 <div class="ctl"><button class="go" onclick="exp()">export JSON</button><label class="go">import JSON<input type="file" accept=".json" hidden onchange="imp(this.files[0])"></label><button class="go" onclick="confirm('Clear vault?')&&(saveV({}),render())">clear</button></div>
 ${v.length?'':'<p class="sub">Nothing saved yet.</p>'}${Object.entries(g).map(([k,l],j)=>`<h3>${esc(k.toUpperCase())} (${l.length})</h3><div class="grid" id="v${j}"></div>`).join('')}</section>`;
 Object.values(g).forEach((l,j)=>grid('#v'+j,l))}
function exp(){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(Object.values(V()),null,1)],{type:'application/json'}));a.download='signal-miner-vault.json';a.click()}
async function imp(f){try{const l=JSON.parse(await f.text()),v=V();[].concat(l).forEach(x=>x.url&&(v[x.url]={saved_at:new Date().toISOString(),...x}));saveV(v);render()}catch(e){alert('bad file: '+e)}}
document.addEventListener("keydown",e=>e.key==="Escape"&&closeM());
if(!location.pathname.endsWith("test.html")){route();if(!localStorage.ack){$('#mb').innerHTML=`<h3>Before you dig</h3><p>Everything shown here is public third-party media and text pulled automatically from other sites. Nothing is hosted, reviewed, or endorsed by this site. Finds can be unexpected or upsetting. TRENCH prefers text/metadata; open-camera cards only show streams already broadcasting with <b>no authentication</b>. We do not scan the internet or use passwords. No Tor. Use ⚑ to report anything harmful.</p><div class="row"><button class="go" onclick="localStorage.ack=1;closeM()">I understand, continue</button></div>`;$('#modal').classList.add('on')}}
