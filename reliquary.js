// THE RELIQUARY — lead hunter: buried maps, deathbed confessions, unsolved ciphers, shipwreck manifests, forgotten time capsules.
// Sources: IA deep mine (≤5 downloads), LoC Chronicling America newspaper pages (random deep page, OCR snippet around the phrase), gray-space text (bucket=lost).
(function(G){
const H=G.THEO_H,pk=a=>a[Math.floor(Math.random()*a.length)];
const R={
 maps:{name:'BURIED MAP HUNTER',icon:'🗺',blurb:'Treasure maps, buried caches, lost mines, hidden-hoard rumours in old papers and zero-view scans.',
  ia:[['"treasure map"','"buried treasure"','"lost mine"','"lost mines"','"treasure trove"','"hidden treasure"','"treasure-trove"','"buried gold"']],
  re:/treasure|buried|lost mine|hoard|cache|gold/i,news:['buried treasure','treasure map','lost mine','buried gold','hidden treasure','map of the treasure']},
 confess:{name:'DEATHBED CONFESSIONS',icon:'🕯',blurb:'Last-words confessions in forgotten newspapers — murders, hidden money, false convictions. Leads never followed up.',
  ia:[['"deathbed confession"','"dying declaration"','"last confession"','confessions','"dying confession"']],
  re:/confess|dying declaration|deathbed|last words/i,news:['deathbed confession','dying confession','confessed on his deathbed','confessed on her deathbed','dying declaration','before he died confessed']},
 cipher:{name:'UNSOLVED CIPHER VAULT',icon:'🔐',blurb:'Cryptograms, cipher letters, coded diaries, personal-column ciphers — mostly never cracked.',
  ia:[['cryptography','ciphers','cryptograms','"cipher and telegraph codes"','"secret writing"','"code letters"']],
  re:/cipher|cypher|cryptogra|code|secret writing|steganograph/i,news:['cipher letter','cryptogram','written in cipher','mysterious cipher','code message','secret cipher']},
 wrecks:{name:'SHIPWRECK MANIFESTS',icon:'⚓',blurb:'Lost-with-all-hands notices, cargo manifests, specie aboard, salvage claims, wrecks never located.',
  ia:[['shipwrecks','"ship manifests"','"passenger lists"','"marine casualties"','salvage','"lost at sea"','wrecks']],
  re:/wreck|manifest|salvage|lost at sea|foundered|passenger list|marine casualt|cargo/i,news:['lost with all hands','went down with','specie aboard','gold aboard','never been found wreck','cargo of gold','foundered']},
 capsule:{name:'FORGOTTEN TIME CAPSULES',icon:'⏳',blurb:'Cornerstone boxes and "to be opened in" capsules sealed generations ago — many due, many lost.',
  ia:[['"time capsule"','"time capsules"','cornerstone','"corner stone"','"corner-stone"']],
  re:/time capsule|corner.?stone|sealed|to be opened/i,news:['to be opened in','sealed in the corner stone','placed in the cornerstone','time capsule','to be opened in the year','box in the corner stone']}};
function snip(t,ph){t=String(t||'').replace(/\s+/g,' ');const w=ph.split(' ')[0].toLowerCase();const i=t.toLowerCase().indexOf(w);return i<0?t.slice(0,420):'…'+t.slice(Math.max(0,i-200),i+320)+'…'}
function loc(t,module){return async o=>{const ph=o.kw||pk(t.news);
  const y=1840+Math.floor(Math.random()*80);
  const u=`https://www.loc.gov/collections/chronicling-america/?q=${encodeURIComponent('"'+ph+'"')}&dates=${y}/${y+12}&fo=json&c=25&sp=${1+Math.floor(Math.random()*4)}`;
  let r=await fetch(u).then(r=>r.ok?r.json():null).catch(()=>null);
  if(!r||!(r.results||[]).length)r=await fetch(u.replace(/&dates=[^&]+/,'').replace(/&sp=\d+/,'&sp=1')).then(r=>r.json());
  return (r.results||[]).map(x=>{const d=[].concat(x.description||[]).join(' ');const img=[].concat(x.image_url||[])[0]||'';
   return {module,source:'Chronicling America (LoC)',title:String(x.title||'').replace(/^Image \d+ of /,''),date:x.date||'',dateLabel:'printed',count:null,countLabel:'',
    thumb:img,kind:'link',src:'',url:x.url||x.id,preview:snip(d,ph),query:`"${ph}" · ${y}–${y+12} · random page`,
    extra:`lead type: ${t.name} · ${[].concat(x.location_city||[]).join(',')} ${[].concat(x.location_state||[]).join(',')} · OCR raw — verify against scan`}})}}
const out={};
for(const [k,t] of Object.entries(R)){out['rel_'+k]={half:'reliquary',name:t.name,icon:t.icon,blurb:t.blurb,sources:{
  news:{name:'Old newspapers',f:loc(t,'rel_'+k),note:'Library of Congress Chronicling America: random 12-year window 1840–1932, random result page. Page-level leads, OCR snippet around the phrase.'},
  ia:{name:'Deep mine',f:H.theoIA(t,'rel_'+k),note:'Internet Archive texts with ≤5 downloads, random upload window, undescribed first.'},
  gray:{name:'Gray-space text',f:async o=>(await H.theoGray('lost')(o)).map(x=>({...x,module:'rel_'+k})),note:'Pre-mined every 3h from gopherspace / crawl / open dirs, bucket "lost" first.'}}}}
G.RELIQUARY_MODULES=out;
})(typeof window!=='undefined'?window:globalThis);
