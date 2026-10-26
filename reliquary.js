// THE RELIQUARY — lead hunter: buried maps, deathbed confessions, unsolved ciphers, shipwreck manifests, forgotten time capsules.
// Sources: IA deep mine (≤5 downloads), LoC Chronicling America newspaper pages (random deep page, OCR snippet around the phrase), gray-space text (bucket=lost).
(function(G){
const H=G.THEO_H,pk=a=>a[Math.floor(Math.random()*a.length)];
const R={
 maps:{name:'BURIED MAP HUNTER',icon:'🗺',blurb:'Treasure maps, buried caches, lost mines, hidden-hoard rumours in old papers and zero-view scans.',
  ia:[['"treasure map"','"buried treasure"','"lost mine"','"lost mines"','"treasure trove"','"hidden treasure"','"treasure-trove"','"buried gold"']],
  re:/treasure|buried|lost mine|hoard|cache|gold/i,news:['buried treasure','treasure map','lost mine','buried gold','hidden treasure','map of the treasure']},
 confess:{name:'DEATHBED CONFESSIONS',icon:'🕯',blurb:'Last-words confessions in forgotten newspapers — murders, hidden money, false convictions. Leads never followed up.',
  ia:[['"deathbed confession"','"dying declaration"','"last confession"','"dying confession"','"deathbed confessions"','"dying declarations"']],
  re:/deathbed|dying (declaration|confession)|last confession|confession of a dying/i,news:['deathbed confession','dying confession','confessed on his deathbed','confessed on her deathbed','dying declaration','before he died confessed']},
 cipher:{name:'UNSOLVED CIPHER VAULT',icon:'🔐',blurb:'Cryptograms, cipher letters, coded diaries, personal-column ciphers — mostly never cracked.',
  ia:[['cryptography','ciphers','cryptograms','"cipher and telegraph codes"','"secret writing"','"code letters"']],
  re:/cipher|cypher|cryptogra|code|secret writing|steganograph/i,news:['cipher letter','cryptogram','written in cipher','mysterious cipher','code message','secret cipher']},
 wrecks:{name:'SHIPWRECK MANIFESTS',icon:'⚓',blurb:'Lost-with-all-hands notices, cargo manifests, specie aboard, salvage claims, wrecks never located.',
  ia:[['shipwrecks','"ship manifests"','"passenger lists"','"marine casualties"','"lost at sea"','wrecks']],
  re:/shipwreck|wreck of|wrecks|lost at sea|foundered|ship.?s? manifest|passenger list|marine casualt/i,news:['lost with all hands','schooner was wrecked','steamer foundered','wreck of the schooner','wreck of the steamer','specie on board','cargo of gold','treasure ship'],nf:/schooner|steamer|steamship|vessel|\bbark\b|\bbrig\b|crew|cargo|captain|reef|coast|sank|foundered|salvage|lifeboat/i,nx:/went down with the wreck|political wreck|wreck of (his|her|the) (party|career|hopes|fortune)/i},
 capsule:{name:'FORGOTTEN TIME CAPSULES',icon:'⏳',blurb:'Cornerstone boxes and "to be opened in" capsules sealed generations ago — many due, many lost.',
  ia:[['"time capsule"','"time capsules"','cornerstone','"corner stone"','"corner-stone"']],
  re:/time capsule|corner.?stone|sealed|to be opened/i,nf:/corner.?stone|capsule|sealed|box|casket|vault|opened in (19|20)|year (19|20)\d\d/i,nx:/bids? (will|to) be opened|proposals|sealed bids|tenders/i,news:['not to be opened until','sealed in the corner stone','placed in the corner stone','deposited in the corner stone','to be opened in the year','copper box corner stone','time capsule']}};
function snip(t,ph){t=String(t||'').replace(/\s+/g,' ');const w=ph.split(' ')[0].toLowerCase();const i=t.toLowerCase().indexOf(w);return i<0?t.slice(0,420):'…'+t.slice(Math.max(0,i-200),i+320)+'…'}
function loc(t,module){const T0=t;const one=async(o,ph)=>{
  const y=1840+Math.floor(Math.random()*80);
  const u=`https://www.loc.gov/collections/chronicling-america/?q=${encodeURIComponent('"'+ph+'"')}&dates=${y}/${y+12}&fo=json&c=25&sp=${1+Math.floor(Math.random()*4)}`;
  let r=await fetch(u).then(r=>r.ok?r.json():null).catch(()=>null);
  if(!r||!(r.results||[]).length)r=await fetch(u.replace(/&dates=[^&]+/,'').replace(/&sp=\d+/,'&sp=1')).then(r=>r.json());
  const res=r.results||[];const sn=await Promise.all(res.map((x,i)=>i>=10?'':x.word_coordinates_url?fetch(x.word_coordinates_url).then(r=>r.json()).then(j=>String((Object.values(j)[0]||{}).relevant_snippet||'').replace(/\[\[\/?tag\]\]/g,'')).catch(()=>''):''));
  return res.map((x,i)=>[x,i]).filter(([x,i])=>{const t=sn[i]||'';return (!t)||(!o.kw?((!T0.nf||T0.nf.test(t))&&!(T0.nx&&T0.nx.test(t))):true)}).map(([x,i])=>{const d=[].concat(x.description||[]).join(' ');const img=[].concat(x.image_url||[])[0]||'';
   return {module,source:'Chronicling America (LoC)',title:String(x.title||'').replace(/^Image \d+ of /,''),date:x.date||'',dateLabel:'printed',count:null,countLabel:'',
    thumb:img,kind:'link',src:'',url:x.url||x.id,preview:sn[i]||snip(d,ph),query:`"${ph}" · ${y}–${y+12} · random page`,
    lazy:x.word_coordinates_url?async()=>{const j=await fetch(x.word_coordinates_url).then(r=>r.json());const v=Object.values(j)[0]||{};return 'OCR SNIPPET AROUND THE HIT:\n'+String(v.relevant_snippet||'(no snippet)').replace(/\[\[\/?tag\]\]/g,'**')}:null,
    extra:`lead type: ${t.name} · ${[].concat(x.location_city||[]).join(',')} ${[].concat(x.location_state||[]).join(',')} · OCR raw — verify against scan`}})};
  const key=module.replace('rel_','');
  const cached=async(o,why)=>{const L=await fetch('finds/rel_news.json?'+Math.floor(Date.now()/6e5)).then(r=>r.ok?r.json():[]).catch(()=>[]);
    const kw=(o.kw||'').toLowerCase();const m=L.filter(x=>x.theme===key&&(!kw||(x.title+' '+x.preview).toLowerCase().includes(kw)));
    return m.map(x=>[Math.random(),x]).sort((a,b)=>a[0]-b[0]).slice(0,24).map(([_,x])=>({module,source:x.source+' · cached',title:x.title,date:x.date,dateLabel:'printed',count:null,countLabel:'',
      thumb:x.thumb,kind:'link',src:'',url:x.url,preview:x.preview||'(open the page scan for the OCR text)',query:x.query+' — '+why,extra:`lead type: ${t.name} · ${x.place||''} · OCR raw — verify against scan`}))};
  return async o=>{let err='';for(let k=0;k<2;k++){try{const r=await one(o,o.kw||pk(t.news));if(r.length)return r;if(o.kw)break}catch(e){err=e.message;break}}
    const c=await cached(o,err?'live loc.gov failed: '+err:'live search empty');if(c.length)return c;if(err)throw new Error('Old newspapers: '+err);return []}}
async function wikiWrecks(o){const off=Math.floor(Math.random()*2500);
  const q=`SELECT ?w ?wLabel ?date ?coord ?desc WHERE { ?w wdt:P31 wd:Q852190 . OPTIONAL{?w wdt:P585 ?date} OPTIONAL{?w wdt:P625 ?coord} OPTIONAL{?w schema:description ?desc FILTER(lang(?desc)='en')} ?w wikibase:sitelinks ?sl FILTER(?sl=0) SERVICE wikibase:label{bd:serviceParam wikibase:language "en,de,fr,nl,sv,fi,no,da,es,it"} } LIMIT 40 OFFSET ${off}`;
  const r=await fetch('https://query.wikidata.org/sparql?format=json&query='+encodeURIComponent(q),{headers:{Accept:'application/sparql-results+json'}}).then(r=>r.json());
  return r.results.bindings.filter(b=>!o.kw||JSON.stringify(b).toLowerCase().includes(o.kw.toLowerCase())).map(b=>({module:'rel_wrecks',source:'Wikidata (0 Wikipedia articles)',title:b.wLabel.value,date:b.date?b.date.value.slice(0,10):'',dateLabel:'date',
   count:0,countLabel:'Wikipedia articles',kind:'link',thumb:'',src:'',url:b.w.value,preview:[b.desc&&b.desc.value,b.coord&&('position: '+b.coord.value)].filter(Boolean).join(' · ')||'(no description — un-curated record)',
   query:'Wikidata shipwreck items with zero sitelinks, random offset '+off,extra:'lead type: shipwreck · record exists but no encyclopedia article — under-explored',
   links:b.coord?[['map ↗',`https://www.openstreetmap.org/?mlat=${b.coord.value.match(/\(([-\d.]+) ([-\d.]+)\)/)?.[2]}&mlon=${b.coord.value.match(/\(([-\d.]+) ([-\d.]+)\)/)?.[1]}&zoom=8`]]:[]}))}
const out={};
for(const [k,t] of Object.entries(R)){out['rel_'+k]={half:'reliquary',name:t.name,icon:t.icon,blurb:t.blurb,sources:{
  news:{name:'Old newspapers',f:loc(t,'rel_'+k),note:'Library of Congress Chronicling America: random 12-year window 1840–1932, random result page. Page-level leads, OCR snippet around the phrase.'},
  ia:{name:'Deep mine',f:H.theoIA(t,'rel_'+k),note:'Internet Archive texts with ≤5 downloads, random upload window, undescribed first.'},
  gray:{name:'Gray-space text',f:async o=>(await H.theoGray('lost')(o)).map(x=>({...x,module:'rel_'+k})),note:'Pre-mined every 3h from gopherspace / crawl / open dirs, bucket "lost" first.'}}}}
out.rel_wrecks.sources={wd:{name:'Unwritten wrecks',f:wikiWrecks,note:'Wikidata shipwrecks that no Wikipedia in any language covers — records with coordinates/dates and no write-up.'},...out.rel_wrecks.sources};
G.RELIQUARY_MODULES=out;
})(typeof window!=='undefined'?window:globalThis);
