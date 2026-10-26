// TRENCH grayspace media + OPEN DIRECTORIES flagship. No archive.org items here (archive.org = LIVE section).
// Wayback CDX is used only to reach files on dead hosts (GeoCities/Angelfire/Tripod/etc.) that no longer exist on the live web.
// Every media item is gated: no thumbnail or player loads until the user clicks through.
(function(G){
const NOIA=x=>!/(^|\/\/|\.)archive\.org\/(details|embed|services|download)/.test(x.url||'')&&!/Internet Archive/.test(x.source||'');
const cache={};
async function L(file){if(!cache[file])cache[file]=fetch(`finds/${file}.json?`+Math.floor(Date.now()/6e5)).then(r=>r.ok?r.json():[]).catch(()=>[]);return cache[file]}
const hay=x=>[x.title,x.url,x.query,x.extra,x.host,x.kw,x.preview].join(' ').toLowerCase();
const match=(x,kw)=>!kw||kw.toLowerCase().split(/\s+/).filter(Boolean).every(w=>hay(x).includes(w));
const show=(x,module)=>{const media=/^(image|video)/.test(x.ftype||x.mime||'')||x.kind==='img'||x.kind==='video';
  return {...x,module,gated:media||!!x.gated,count:x.count??null,
   extra:[x.ftype&&('type: '+x.ftype),x.size&&('size: '+x.size),x.date&&((x.dateLabel||'date')+': '+x.date),x.host&&('host: '+x.host),x.extra].filter(Boolean).join(' · ')}};
function from(files,module,test){return async o=>{let A=[];for(const f of files)A=A.concat(await L(f));
  const seen=new Set();A=A.filter(x=>NOIA(x)&&(!test||test(x))&&match(x,o.kw)&&!seen.has(x.url)&&seen.add(x.url));
  return A.sort(()=>Math.random()-.5).slice(0,o.kw?80:40).map(x=>show(x,module))}}
const isV=x=>/video/.test(x.ftype||x.mime||'')||/\.(avi|mpe?g|mov|wmv|asf|rm|ram|mp4|m4v|webm|flv|3gp|ogv|mkv|vob)(\?|$)/i.test(x.url||'');
const isI=x=>/image/.test(x.ftype||x.mime||'')||/\.(jpe?g|gif|png|bmp|tiff?|webp|pcx)(\?|$)/i.test(x.url||'');
G.DEEPMEDIA_MODULES={
 opendirx:{half:'trench',name:'OPEN DIRECTORIES',icon:'📂',flagship:true,blurb:'FLAGSHIP grayspace miner. Type a keyword (occult, ufo, vhs…) to search every harvested "Index of /" listing — files found via search-engine dorks (intitle:"index of" <kw>), urlscan sightings, and random descent through old public mirrors. Blank = random mine. Name · type · size · date · host · parent dir. Media gated.',sources:{
  all:{name:'All files',f:from(['deep_odindex'],'opendirx'),note:'Pre-harvested every 3h by the Action (browser CORS blocks most dir hosts). Keyword filters name, path, host and the search that found it.'},
  text:{name:'Text / docs',f:from(['deep_odindex'],'opendirx',x=>/text|other/.test(x.ftype||'')),note:'txt/nfo/asc/doc/pdf and extensionless files.'},
  media:{name:'Images & video',f:from(['deep_odindex'],'opendirx',x=>isV(x)||isI(x)),note:'Media in open dirs — gated behind the click-through.'},
  dirs:{name:'Directories found',f:async o=>{const A=(await L('deep_odindex')).filter(x=>match(x,o.kw));const m=new Map();A.forEach(x=>{const p=(x.links&&x.links[0]&&x.links[0][1])||x.url;const e=m.get(p)||{n:0,host:x.host,q:x.query,t:new Set()};e.n++;e.t.add(x.ftype);m.set(p,e)});
   return [...m].sort(()=>Math.random()-.5).slice(0,40).map(([p,e])=>({module:'opendirx',source:'Open Directory',title:p.replace(/^https?:\/\//,''),url:p,kind:'link',thumb:'',count:e.n,countLabel:'files indexed',date:'',preview:`types: ${[...e.t].join(', ')} · found via ${e.q}`,extra:'host: '+e.host}))},note:'Unique Index-of directories behind the hits.'}}},
 deepvideo:{half:'trench',name:'DEEP VIDEO',icon:'🎞',blurb:'Grayspace video only: video files archived from dead personal hosts (GeoCities/Angelfire/Tripod/AOL…) via Wayback CDX, plus video files sitting in open directories and gopher/crawl finds. No archive.org items, no YouTube. Everything gated.',sources:{
  dead:{name:'Dead-host video files',f:from(['deep_video'],'deepvideo',x=>/Wayback CDX/.test(x.source||'')),note:'CDX mimetype video/* under random dead member-site paths; pre-harvested every 3h.'},
  opendir:{name:'Open-dir video',f:from(['deep_video','deep_odindex'],'deepvideo',x=>isV(x)&&/Open Directory|Gopher|Crawl/i.test(x.source||'')),note:'Video files in Index-of listings / gopher / crawl finds.'}}},
 deepimage:{half:'trench',name:'DEEP IMAGE',icon:'🖼',blurb:'Grayspace images only: jpg/gif/png from dead personal hosts via Wayback CDX, image files in open directories and gopher/crawl finds. No archive.org items. Thumbnails gated.',sources:{
  dead:{name:'Dead-host images',f:from(['deep_image'],'deepimage',x=>/Wayback CDX/.test(x.source||'')),note:'CDX image/* (>6 KB) under random dead member-site paths.'},
  opendir:{name:'Open-dir images',f:from(['deep_image','deep_odindex'],'deepimage',x=>isI(x)&&/Open Directory|Gopher|Crawl/i.test(x.source||'')),note:'Image files in Index-of listings / gopher / crawl finds.'}}}};
})(window);
