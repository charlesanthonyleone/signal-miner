// TRENCH grayspace media + OPEN DIRECTORIES flagship. No archive.org items here (archive.org = LIVE section).
// Wayback CDX is used only to reach files on dead hosts (GeoCities/Angelfire/Tripod/etc.) that no longer exist on the live web.
// Every media item is gated: no thumbnail or player loads until the user clicks through.
(function(G){
const NOIA=x=>!/(^|\/\/|\.)archive\.org\/(details|embed|services|download)/.test(x.url||'')&&!/Internet Archive/.test(x.source||'');
const cache={};
async function L(file){if(!cache[file])cache[file]=fetch(`finds/${file}.json?`+Math.floor(Date.now()/6e5)).then(r=>r.ok?r.json():[]).catch(()=>[]);return cache[file]}
const EXT=n=>{const e=(n.match(/\.([a-z0-9]{1,5})$/i)||[])[1]||'';e.toLowerCase();return /^(avi|mpe?g|mov|wmv|asf|rm|mp4|m4v|webm|flv|ogv|mkv)$/i.test(e)?'video':/^(jpe?g|gif|png|bmp|tiff?|webp|pcx)$/i.test(e)?'image':/^(txt|nfo|asc|doc|pdf|me|faq|ufo|her|aug|1st|diz|html?)$/i.test(e)?'text':/^(mp3|wav|mid|mod|ogg|au|ra)$/i.test(e)?'audio':'other'};
// compact open-dir index rows [url,size,date] -> card
const xp=r=>{const [u,size,date]=r,i=u.lastIndexOf('/'),parent=u.slice(0,i+1),name=(s=>{try{return decodeURIComponent(s)}catch(e){return unescape(s)}})(u.slice(i+1)),host=u.split('/')[2],k=EXT(name),g=k==='image'||k==='video';
  return {source:'Open Directory',title:name,url:u,size,date,dateLabel:'listed',ftype:k,host,gated:g,kind:k==='image'?'img':k==='video'?'video':'link',thumb:k==='image'?u:'',src:g?u:'',
   query:'open-dir crawl of '+host,preview:`${k} · ${size||'? size'} · ${date||'no date'} · in ${parent}`,extra:'dir: '+parent,links:[['parent dir ↗',parent]]}};
async function LX(file){if(file!=='odbig')return L(file);if(!cache.odbigx)cache.odbigx=L('odbig').then(a=>(a||[]).map(xp));return cache.odbigx}
// keyword synonyms so short searches (vhs, ufo…) also catch period spellings
const SYN={vhs:['vhs','vcr','videotape','video tape','betamax','camcorder','video'],ufo:['ufo','saucer','mufon','alien','abduct','roswell','extraterr'],occult:['occult','magick','thelema','hermetic','grimoire','tarot'],
 ghost:['ghost','haunt','poltergeist','spirit'],cia:['cia','mkultra','declass'],tv:['tv','television','tv+film'],conspiracy:['conspir','illuminati','coverup','cover-up'],paranormal:['paranorm','psychic','poltergeist','haunt','ufo'],cryptid:['cryptid','bigfoot','sasquatch','yeti','nessie','chupacabra'],
 bbs:['bbs','sysop','fidonet','ansi','textfile'],zine:['zine','ezine','fanzine','newsletter'],radio:['radio','shortwave','ham radio','swl','numbers station'],cult:['cult','sect','manson','waco','heavensgate'],film:['film','movie','cinema','8mm','16mm','super8'],magic:['magic','magick','spell','grimoire','sigil']};
const words=kw=>kw.toLowerCase().split(/\s+/).filter(Boolean).map(w=>SYN[w]||[w]);
const norm=t=>{t=String(t||'');try{t=decodeURIComponent(t)}catch(e){}return t.toLowerCase().replace(/[_+.\-]+/g,' ')};
const hay=x=>norm([x.title,x.url,x.query,x.extra,x.host,x.kw,x.preview].join(' '));
// relevance: filename hits outrank path hits; exact word beats synonym
const score=(x,kw)=>{const t=norm(x.title),p=norm(x.url);let s=0;words(kw).forEach(alts=>alts.forEach((w,i)=>{const wt=i?1:2;if(t.includes(w))s+=3*wt;else if(p.includes(w))s+=wt}));return s+Math.random()};
const match=(x,kw)=>{if(!kw)return true;const h=hay(x);return words(kw).every(alts=>alts.some(w=>h.includes(norm(w))))};
const show=(x,module)=>{const media=/^(image|video)/.test(x.ftype||x.mime||'')||x.kind==='img'||x.kind==='video';
  return {...x,module,gated:media||!!x.gated,count:x.count??null,
   extra:[x.ftype&&('type: '+x.ftype),x.size&&('size: '+x.size),x.date&&((x.dateLabel||'date')+': '+x.date),x.host&&('host: '+x.host),x.extra].filter(Boolean).join(' · ')}};
function from(files,module,test){return async o=>{let A=[];for(const f of files)A=A.concat(await LX(f));
  const seen=new Set();A=A.filter(x=>NOIA(x)&&(!test||test(x))&&match(x,o.kw)&&!seen.has(x.url)&&seen.add(x.url));
  if(o.kw){const S=new Map(A.map(x=>[x.url,score(x,o.kw)]));A.sort((a,b)=>S.get(b.url)-S.get(a.url))}else A.sort(()=>Math.random()-.5);
  if(!o.kw&&A.length>60){const t=A.filter(x=>THEME.test(x.url)),r=A.filter(x=>!THEME.test(x.url));A=t.slice(0,30).concat(r.slice(0,10)).sort(()=>Math.random()-.5)}
  return A.slice(0,o.kw?80:40).map(x=>show(x,module))}}
const THEME=/occult|ufo|relig|conspir|magick|thelema|tarot|ghost|myth|folk|bible|gnos|alien|paranorm|anarch|phreak|hack|ezine|magazine|bbs|ascii|tv\+film|origami|kites|pics|sci\/|apan|fringe|weird|mystic|pagan|wicca|eris/i;
const isV=x=>/video/.test(x.ftype||x.mime||'')||/\.(avi|mpe?g|mov|wmv|asf|rm|ram|mp4|m4v|webm|flv|3gp|ogv|mkv|vob)(\?|$)/i.test(x.url||'');
const isI=x=>/image/.test(x.ftype||x.mime||'')||/\.(jpe?g|gif|png|bmp|tiff?|webp|pcx)(\?|$)/i.test(x.url||'');
G.DEEPMEDIA_MODULES={
 opendirx:{half:'trench',name:'OPEN DIRECTORIES',icon:'📂',flagship:true,blurb:'FLAGSHIP grayspace miner. Type a keyword (occult, ufo, vhs…) to search ~40k files from harvested "Index of /" listings: a breadth crawl of old public mirrors (funet, lip6, aarnet, uoc.gr, gnu old-gnu), the Common Crawl index of textfiles.com dirs, search-engine dorks (intitle:"index of" <kw>) and urlscan sightings. Short keywords expand to period synonyms (vhs→vcr/videotape/video, ufo→saucer/mufon…). Blank = random mine. Name · type · size · date · host · parent dir. Media gated.',sources:{
  all:{name:'All files',f:from(['deep_odindex','odbig'],'opendirx'),note:'Pre-harvested every 3h by the Action (browser CORS blocks most dir hosts). Keyword filters name, path, host and the search that found it.'},
  text:{name:'Text / docs',f:from(['deep_odindex','odbig'],'opendirx',x=>/text|other/.test(x.ftype||'')),note:'txt/nfo/asc/doc/pdf and extensionless files.'},
  media:{name:'Images & video',f:from(['deep_odindex','odbig'],'opendirx',x=>isV(x)||isI(x)),note:'Media in open dirs — gated behind the click-through.'},
  dirs:{name:'Directories found',f:async o=>{const A=(await L('deep_odindex')).concat(await LX('odbig')).filter(x=>match(x,o.kw));const m=new Map();A.forEach(x=>{const p=(x.links&&x.links[0]&&x.links[0][1])||x.url;const e=m.get(p)||{n:0,host:x.host,q:x.query,t:new Set()};e.n++;e.t.add(x.ftype);m.set(p,e)});
   return [...m].sort(()=>Math.random()-.5).slice(0,40).map(([p,e])=>({module:'opendirx',source:'Open Directory',title:p.replace(/^https?:\/\//,''),url:p,kind:'link',thumb:'',count:e.n,countLabel:'files indexed',date:'',query:(o.kw?`directories containing “${o.kw}”`:'random directories')+' from the open-dir index',preview:`types: ${[...e.t].filter(Boolean).join(', ')||'mixed'} · found via ${e.q||'open-dir index crawl'}`,extra:'host: '+(e.host||p.split('/')[2])}))},note:'Unique Index-of directories behind the hits.'}}},
 gemini:{half:'trench',name:'GEMINI',icon:'♊',blurb:'Geminispace: the small-web protocol (port 1965) that search engines never index. Text capsules found via Gemini-native search, read raw.',sources:{
  cap:{name:'Capsules',f:from(['deep_gemini'],'gemini'),note:'Pre-harvested every 3h by the Action over the Gemini protocol; links open through a public Gemini→HTTP proxy.'}}},
 deepvideo:{half:'trench',name:'DEEP VIDEO',icon:'🎞',blurb:'⚠ Honest status: the dead-host pile is Angelfire-heavy for now — Wayback CDX times out on most other hosts live, so a resumable harvest in the 3-hourly Action works shard-by-shard through GeoCities/OoCities/Tripod/Xoom/50megs/FortuneCity/AOL and the mix grows every run. Grayspace video only: video files archived from dead personal hosts (GeoCities/Angelfire/Tripod/AOL…) via Wayback CDX, plus video files sitting in open directories and gopher/crawl finds. No archive.org items, no YouTube. Everything gated.',sources:{
  dead:{name:'Dead-host video files',f:from(['deep_video'],'deepvideo',x=>/Wayback CDX/.test(x.source||'')),note:'CDX mimetype video/* under dead member-site path shards; resumable chunked harvest every 3h (finds/vidstate.json tracks progress).'},
  opendir:{name:'Open-dir video',f:from(['deep_video','deep_odindex','odbig'],'deepvideo',x=>isV(x)&&/Open Directory|Gopher|Crawl/i.test(x.source||'')),note:'Video files in Index-of listings / gopher / crawl finds.'}}},
 deepimage:{half:'trench',name:'DEEP IMAGE',icon:'🖼',blurb:'Grayspace images only: jpg/gif/png from dead personal hosts via Wayback CDX, image files in open directories and gopher/crawl finds. No archive.org items. SAFETY: URL/title blocklist + a server-side pixel skin-tone pre-screen (images over 38% skin-tone are dropped before publishing; scored ones show their %), then a click gate, then the image loads BLURRED until you click again. This is a heuristic, not a classifier: it misses some things and drops harmless ones (birds, cars, sepia). Report anything abusive.',sources:{
  dead:{name:'Dead-host images',f:from(['deep_image'],'deepimage',x=>/Wayback CDX/.test(x.source||'')),note:'CDX image/* (>6 KB) under random dead member-site paths.'},
  opendir:{name:'Open-dir images',f:from(['deep_image','deep_odindex','odbig'],'deepimage',x=>isI(x)&&/Open Directory|Gopher|Crawl/i.test(x.source||'')),note:'Image files in Index-of listings / gopher / crawl finds.'}}}};
})(window);
