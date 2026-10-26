// TRENCH deep VIDEO / IMAGE miners. Every item is gated: no thumbnail or media loads until the user clicks through.
(function(G){
const pk=a=>a[Math.floor(Math.random()*a.length)];
const JJ=async u=>{const r=await fetch(u);if(!r.ok)throw new Error(r.status);return r.json()};
function win(){const y=2008+Math.floor(Math.random()*(new Date().getFullYear()-2007)),m=1+Math.floor(Math.random()*12),s=`${y}-${String(m).padStart(2,'0')}-01`;const e=new Date(Date.UTC(y,m,0)).toISOString().slice(0,10);return [s,e]}
const RAWV=['"VID_*"','"MOV_*"','"IMG_*"','"MVI_*"','"DSC*"','"video*"','"untitled*"','"New video*"','"GOPR*"','"20*"','"clip*"','"REC*"'];
const RAWI=['"IMG_*"','"DSC*"','"scan*"','"image*"','"untitled*"','"photo*"','"P10*"','"CIMG*"'];
function ia(mt,raw,module){return async o=>{let docs=[],q='';
  for(const [cap,useWin,useRaw] of [[5,1,1],[5,1,0],[5,0,1],[5,0,0]]){if(docs.length>=6)break;const [a,b]=win();
   q=`mediatype:${mt} AND downloads:[0 TO ${cap}]`+(o.kw?` AND (${o.kw})`:useRaw?` AND title:(${raw.slice().sort(()=>Math.random()-.5).slice(0,5).join(' OR ')})`:'')+(useWin?` AND addeddate:[${a} TO ${b}]`:'');
   const u=new URLSearchParams({q,rows:100,page:1+Math.floor(Math.random()*(useWin?2:8)),output:'json'});
   ['identifier','title','addeddate','downloads','description','uploader','format'].forEach(f=>u.append('fl[]',f));u.append('sort[]',pk(['downloads asc','addeddate desc','addeddate asc']));
   docs=(await JJ('https://archive.org/advancedsearch.php?'+u)).response.docs.filter(d=>(d.downloads||0)<=cap)}
  docs.sort((x,y)=>(x.downloads||0)-(y.downloads||0));
  return docs.slice(0,30).map(d=>({module,source:'Internet Archive '+mt,title:[].concat(d.title||d.identifier).join(' '),date:String(d.addeddate||'').slice(0,10),dateLabel:'uploaded',
   count:d.downloads||0,countLabel:'downloads',thumb:`https://archive.org/services/img/${d.identifier}`,gated:true,kind:mt==='movies'?'iframe':'img',mime:mt==='movies'?'video/*':'image/*',
   src:mt==='movies'?`https://archive.org/embed/${d.identifier}`:`https://archive.org/services/img/${d.identifier}`,embed:mt==='movies',
   url:`https://archive.org/details/${d.identifier}`,preview:String([].concat(d.description||'').join(' ')).replace(/<[^>]+>/g,' ').slice(0,300)||'(no description — never curated)',
   query:q+' · fewest downloads first',extra:`uploader: ${d.uploader||'?'} · formats: ${[].concat(d.format||[]).slice(0,4).join(', ')}`}))}}
function log(file,module){return async o=>{const L=await fetch(`finds/${file}.json?`+Date.now()).then(r=>r.json()).catch(()=>[]);
  const f=L.filter(x=>!o.kw||JSON.stringify(x).toLowerCase().includes(o.kw.toLowerCase())).sort(()=>Math.random()-.5);
  return f.slice(0,40).map(x=>({...x,module,gated:true}))}}
const sub=(L,src)=>async o=>(await log(L,'')(o)).filter(x=>src.test(x.source||''));
const wrap=(f,module)=>async o=>(await f(o)).map(x=>({...x,module}));
G.DEEPMEDIA_MODULES={
 deepvideo:{half:'trench',name:'DEEP VIDEO',icon:'🎞',blurb:'Near-zero-view video: raw IA uploads (≤5 downloads), Wayback-archived video files from dead hosts, 0–100-view YouTube. Everything behind click-through.',sources:{
  ia:{name:'IA raw uploads',f:ia('movies',RAWV,'deepvideo'),note:'Random month, downloads ≤5, raw camera filenames first. Thumbnail + player gated.'},
  wayback:{name:'Wayback video files',f:wrap(sub('deep_video',/Wayback/),'deepvideo'),note:'Mined every 3h: CDX mimetype video/* under old GeoCities/Tripod/Angelfire/AOL member paths.'},
  yt:{name:'Zero-view YouTube',f:wrap(sub('deep_video',/YouTube/),'deepvideo'),note:'Mined every 3h with yt-dlp: default camera filenames (IMG_1234, MVI_…) and obscure terms, views ≤100.'}}},
 deepimage:{half:'trench',name:'DEEP IMAGE',icon:'🖼',blurb:'Near-zero-view images: IA image items (≤5 downloads), Wayback images from dead domains, image files inside open directories. Thumbnails gated.',sources:{
  ia:{name:'IA raw images',f:ia('image',RAWI,'deepimage'),note:'Random month, downloads ≤5, raw scan/camera names first. Thumbnail gated.'},
  wayback:{name:'Wayback images',f:wrap(sub('deep_image',/Wayback/),'deepimage'),note:'Mined every 3h: old jpg/gif under dead member-site paths, >8 KB only.'},
  opendir:{name:'Open-dir images',f:wrap(sub('deep_image',/Open Directory/),'deepimage'),note:'Image files found while random-walking public Index-of trees.'}}}};
})(window);
