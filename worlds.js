// Pass 6 — three new worlds: THE BLACK VAULT (released government files), XENO (UFO/UAP public data), VATICAN (manuscripts, papal docs, inquisition, exorcism).
// Plus two Trench grayspace modules (BBS textfiles, dead forums — both via Wayback captures, never archive.org items).
// Every module MINES: random page / random offset / random shelfmark, low-download or zero-curation first, tagged by theme.
(function(G){
const H=G.THEO_H,LOC=G.REL_LOC,pk=a=>a[Math.floor(Math.random()*a.length)],sh=a=>a.map(x=>[Math.random(),x]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);
const esc=s=>String(s).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const kwRe=o=>o.kw?new RegExp(esc(o.kw),'i'):null;
const C={};const cache=f=>C[f]??=fetch('finds/'+f+'?'+Math.floor(Date.now()/6e5)).then(r=>r.ok?r.json():[]).catch(()=>[]);
const flat=v=>[].concat(v||[]).join(' ');
// LoC is slow: give the live query 20s, then fall back to the Action-harvested pile for this theme
const NEWS=(t,m)=>{const live=LOC(t,m);return async o=>{try{return await Promise.race([live(o),new Promise((_,j)=>setTimeout(()=>j(new Error('loc.gov slow')),20000))])}
  catch(e){const kw=(o.kw||'').toLowerCase();const L=(await cache('world_news.json')).filter(x=>x.theme===t.key&&(!kw||(x.title+' '+x.preview).toLowerCase().includes(kw)));
   return sh(L).slice(0,24).map(x=>({module:m,source:'Chronicling America (LoC) · cached',title:x.title,date:x.date,dateLabel:'printed',count:null,countLabel:'',thumb:x.thumb||'',kind:'link',src:'',url:x.url,
    preview:x.preview||'(open the page scan for the OCR text)',query:(x.query||'')+' — live loc.gov slow, served from harvest',extra:`lead type: ${t.name} · OCR raw — verify against scan`}))}}};

/* ---- IA query miner (CREST / FOIA / Blue Book) ---- */
function iaQ(base,module,source,tag,re){return async o=>{
  const q0=o.kw?`${base} AND (${o.kw})`:base;let docs=[],q='';
  for(const [cap,pg] of [[5,4],[15,3],[60,2],[1e6,1]]){q=`${q0} AND downloads:[0 TO ${cap}]`;
    docs=(await H.iaDeep(q,pg)).filter(d=>!re||o.kw||re.test(flat(d.title)+' '+flat(d.subject)+' '+flat(d.description).slice(0,400)));if(docs.length>=6)break}
  return sh(docs).slice(0,24).map(d=>{const x=H.mapIA(d,module,q);return {...x,source,extra:`theme: ${tag} · ${x.extra}`,
    lazy:async()=>{const r=await fetch(`https://archive.org/download/${d.identifier}/${d.identifier}_djvu.txt`);return r.ok?'OCR (raw, first 2500 chars):\n'+(await r.text()).slice(0,2500):'no OCR text'},
    links:[['full text ↗',`https://archive.org/stream/${d.identifier}/${d.identifier}_djvu.txt`]]}})}}
const crestTitle=w=>`identifier:cia-rdp* AND title:(${w.join(' OR ')})`;

/* ---- cached-harvest miner (Action pre-harvests CORS-blocked APIs) ---- */
function cached(file,module,map,filt=()=>true,n=24){return async o=>{const re=kwRe(o);const L=(await cache(file)).filter(filt).filter(x=>!re||re.test(JSON.stringify(x)));return sh(L).slice(0,n).map(x=>({module,count:null,countLabel:'',thumb:'',kind:'link',src:'',dateLabel:'date',...map(x)}))}}
const TNOISE=/^ship\b|ship name|official number|gross tonnage|stick force|\bmk \d|aircraft type|\.pdf\b|holy ghost|ghost (chapel|church)|primary school|criminal record/i;
const tnaMap=tag=>x=>({source:x.source,title:`${x.title} — ${x.ref}`,date:x.date,dateLabel:'covering',preview:x.preview||'(catalogue entry)',url:x.url,query:x.query+' · harvested by the Action',
  extra:`theme: ${tag} · reference ${x.ref} · ${x.closed==='O'?'open record':'closed/retained — catalogue only'} · UK National Archives Discovery`});

/* ---- THE BLACK VAULT ---- */
const GV={
 uap:{name:'UAP FILES',icon:'🛸',tna:'uap',news:'g_uap',w:['"unidentified flying"','UFO','saucer','"aerial phenomena"','"unidentified objects"'],re:/ufo|saucer|unidentified|aerial phenomen|flying object/i,
  blurb:'Released UAP / UFO government records: CIA CREST scans, UK MoD files, period press.'},
 mk:{name:'MKULTRA / MIND CONTROL',icon:'🧠',tna:'mkultra',news:'g_mk',w:['MKULTRA','"behavior control"','"behavioral"','LSD','hypnosis','"brain washing"','brainwashing','ARTICHOKE','BLUEBIRD','interrogation'],re:/mk.?ultra|behavio|lsd|hypno|brain.?wash|artichoke|bluebird|interrogat|drug/i,
  blurb:'Behaviour-control, hypnosis and drug-testing programmes in declassified files.'},
 psy:{name:'PSYCHIC RESEARCH / STARGATE',icon:'👁',tna:'psychic',news:'g_psy',crest:'identifier:(cia-rdp96-00788* OR cia-rdp96-00789* OR cia-rdp96-00791* OR cia-rdp96-00792*)',tre:/psychic|telepath|clairvoy|parapsych|extra.?sensory|dowsing|spiritualis|\bmediums?\b|psychical/i,w:['psychic','parapsycholog','"remote viewing"','psychoenergetic','telepathy','"extrasensory"','SRI','GRILL'],re:/psych|remote view|parapsych|telepath|extrasensory|clairvoy|dowsing|spiritualis|stargate|sun streak/i,
  blurb:'Remote viewing session transcripts and psi research from the Stargate-era CREST series.'},
 cold:{name:'COLD WAR OBSCURA',icon:'☢',tna:'coldwar',news:'g_cold',w:['"civil defense"','fallout','"nuclear test"','bunker','defector','"radio free"','sputnik','"soviet bloc"'],re:/civil defen|fallout|nuclear|bunker|defector|radio|sputnik|soviet|bloc/i,
  blurb:'Civil-defence plans, defectors, propaganda radio, odd Soviet-watch memos.'},
 deaths:{name:'UNEXPLAINED DEATHS',icon:'⚰',tna:'deaths',news:'g_deaths',w:['death','assassination','"died under"','inquest','suicide','"cause of death"','poisoning'],re:/death|died|assassin|inquest|suicide|poison|murder/i,
  blurb:'Inquests, mysterious deaths and suspicious cases mentioned in released files.'},
 weather:{name:'WEATHER / GEO EXPERIMENTS',icon:'🌩',tna:'weather',news:'g_weather',tre:/cloud seed|rain.?mak|artificial rain|weather (modif|control)|fog (dispers|investig)|cumulus|lynmouth|ionospher|seismic/i,w:['"weather modification"','"cloud seeding"','"rain making"','"rainmaking"','seismic','ionosphere','"climate modification"','"geophysical warfare"'],re:/weather|cloud seed|rain.?mak|seismic|ionospher|climat|geophysic/i,
  blurb:'Cloud seeding, rainmaking, ionospheric and geophysical-warfare studies.'},
 odd:{name:'REDACTED ODDITIES',icon:'⬛',tna:'odd',news:'g_odd',tre:/poltergeist|sea serpent|haunt|ghost|unexplain|myster|anomal|monster|strange (light|object|creature)/i,w:['"mystery"','unusual','strange','anomalous','"poltergeist"','"sea serpent"','ghost','"unexplained"'],re:/myster|unusual|strange|anomal|poltergeist|serpent|ghost|unexplain|odd/i,
  blurb:'The weird residue: strange memos, anomaly reports, ghost-adjacent paperwork.'}};
const out={};
for(const [k,t] of Object.entries(GV)){const m='g_'+k;out[m]={half:'redacted',name:t.name,icon:t.icon,blurb:t.blurb,sources:{
  crest:{name:'CIA CREST (random)',f:iaQ(t.crest||crestTitle(t.w),m,'CIA CREST · via Internet Archive',t.name,t.crest?null:t.re),note:'Random deep pages of the 275k-document CIA CREST release mirrored on the Internet Archive (identifier cia-rdp*), lowest-download first. OCR text on click.'},
  tna:{name:'UK National Archives',f:cached('tna.json',m,tnaMap(t.name),x=>x.theme===t.tna&&(t.tre||t.re).test(x.title+' '+x.preview)&&!TNOISE.test(x.title+' '+x.preview)),note:'Discovery catalogue (MoD, Home Office, Cabinet…) harvested every 3h by the Action (no CORS) across random result pages.'},
  foia:{name:'FOIA deep mine',f:iaQ(`mediatype:texts AND (subject:(FOIA OR "freedom of information" OR declassified OR "government documents") OR title:(declassified OR FOIA)) AND title:(${t.w.filter(w=>!/^(SRI|GRILL|LSD)$/.test(w)).join(' OR ')}) AND NOT subject:("right to information" OR RTI OR kerala OR panchayat) AND NOT title:(panchayat OR kerala OR RTI)`,m,'FOIA releases · Internet Archive',t.name,t.re),note:'FOIA / declassified uploads on the Internet Archive with ≤5 downloads first.'},
  news:{name:'Period press',f:NEWS({name:t.name,news:t.w.map(w=>w.replace(/"/g,'')),key:t.news,cache:'finds/world_news.json'},m),note:'Library of Congress Chronicling America, random window and page; falls back to the Action-harvested pile.'}}}}

/* ---- XENO ---- */
const UFO=/\bufos?\b|u\.f\.o|saucer|flying disc|alien|extraterrest|abduct|close encounter|roswell|area.?51|majestic|mj.?12|blue.?book|grudge|sign|aerial phenomen|uap\b|airship|foo.?fighter|ufolog/i;
async function nuforc(o){const re=kwRe(o);const L=(await cache('nuforc.json')).filter(x=>!re||re.test(x.preview+' '+x.title+' '+x.shape));
  return sh(L).slice(0,24).map(x=>({module:'x_nuforc',source:'NUFORC public dataset',title:`${x.shape||'unknown'} · ${x.title.split('·').slice(1).join('·').trim()}`,date:x.date,dateLabel:'sighted',count:null,countLabel:'',thumb:'',kind:'link',src:'',
   url:x.url,preview:`${x.preview}\n\nduration: ${x.duration||'?'} · posted ${x.posted||'?'}`,query:'random draw from 4000 pre-sampled NUFORC rows (of ~80k)',extra:'witness report — unverified · map link shows the reported town',
   links:[['NUFORC ↗','https://nuforc.org/databank/']]}))}
async function grayUFO(o){const [T,OD]=await Promise.all([cache('deep_text.json'),cache('odbig.json')]);const re=kwRe(o)||UFO;
  const nm=u=>{try{return decodeURIComponent(u.split('/').slice(-2).join(' / '))}catch(e){return u}};
  const a=T.filter(x=>re.test(x.title+' '+x.preview+' '+(x.extra||''))).map(x=>({...x,module:'x_gray'}));
  const N=/aspell|dictionar|\/games?\/|\/roms?\/|fonts?\//i,seen={};
  const b=sh(OD.filter(r=>/\.(txt|pdf|html?|doc|rtf)$/i.test(r[0])&&!N.test(r[0])&&re.test(nm(r[0]).replace(/[_+.\-]+/g,' ')))).filter(r=>{const d=r[0].replace(/[^/]*$/,'');seen[d]=(seen[d]||0)+1;return seen[d]<=3}).slice(0,20)
   .map(([u,size,date])=>({module:'x_gray',source:'Open Directory (index)',title:nm(u),date:(date||'').slice(0,10),dateLabel:'listed',count:null,countLabel:'',thumb:'',kind:'link',src:'',url:u,preview:`file on a public open directory · ${size||'?'}`,query:'open-dir filename index, UFO terms',extra:'grayspace · unvetted text'}));
  return sh([...a,...b]).slice(0,30)}
out.x_nuforc={half:'xeno',name:'SIGHTING LOGS',icon:'📍',blurb:'Raw civilian sighting reports (NUFORC) — random, unverified, map-linked.',sources:{nuforc:{name:'NUFORC reports',f:nuforc,note:'Public NUFORC dataset (planetsig/ufo-reports CSV), 4000 random rows re-sampled every 3h.'}}};
out.x_uk={half:'xeno',name:'FOREIGN GOV FILES',icon:'🇬🇧',blurb:'UK MoD UFO desk files and other foreign-government UAP catalogue entries.',sources:{
  tna:{name:'UK MoD UFO files',f:cached('tna.json','x_uk',tnaMap('UK UFO'),x=>x.theme==='uap'&&UFO.test(x.title+' '+x.preview)),note:'UK National Archives Discovery (DEFE, AIR…). Harvested by the Action.'},
  ia:{name:'Foreign releases',f:iaQ('mediatype:texts AND title:(UFO OR UFOs OR OVNI OR "unidentified flying" OR "aerial phenomena" OR UAP) AND (GEIPAN OR CEFAA OR "Ministry of Defence" OR "MoD" OR Canada OR Brazil OR Chile OR Australia OR "New Zealand" OR Denmark OR Sweden OR Uruguay OR Peru)','x_uk','Foreign UFO releases · Internet Archive','foreign gov',UFO),note:'Uploaded foreign-government UFO file sets (GEIPAN, CEFAA, NZDF, Brazil…). GEIPAN direct is Cloudflare-blocked.'}}};
out.x_bluebook={half:'xeno',name:'BLUE BOOK / CREST',icon:'📘',blurb:'Project Blue Book, Sign, Grudge case files and CIA UFO memos.',sources:{
  bb:{name:'Blue Book scans',f:iaQ('mediatype:texts AND ("project blue book" OR "project bluebook" OR "project sign" OR "project grudge" OR title:(UFO OR UFOs OR "unidentified flying")) AND ("air force" OR USAF OR NARA OR "case file" OR "blue book")','x_bluebook','Blue Book / NARA scans · Internet Archive','Blue Book',UFO),note:'NARA Blue Book microfilm uploads + USAF UFO reports, lowest-download first. (NARA catalog API needs a key.)'},
  crest:{name:'CIA UFO memos',f:iaQ(crestTitle(['UFO','"flying saucers"','"unidentified flying"','saucer','"aerial phenomena"']),'x_bluebook','CIA CREST · via Internet Archive','CIA UFO',null),note:'CREST documents with UFO terms in the title.'}}};
out.x_clips={half:'xeno',name:'SAUCER CLIPPINGS',icon:'📰',blurb:'1896 phantom airships to 1950s flying saucers in forgotten small-town papers.',sources:{
  news:{name:'LoC clippings',f:NEWS({name:'UFO clipping',news:['flying saucer','mysterious airship','airship seen','flying disc','strange light in the sky','meteor or airship'],key:'x_clip',cache:'finds/world_news.json'},'x_clips'),note:'Chronicling America random window + page, OCR snippet; cached fallback.'}}};
if(G.INVENTO_MODULES?.inv_aliens?.sources?.gp)out.x_patents={half:'xeno',name:'SAUCER PATENTS',icon:'⚙',blurb:'Flying-disc, antigravity and alien-contact patent oddities.',sources:{gp:{name:'Google Patents',f:async o=>(await G.INVENTO_MODULES.inv_aliens.sources.gp.f(o)).map(x=>({...x,module:'x_patents'})),note:'Re-uses the INVENTO alien-tech harvest (CPC-seeded Google Patents).'}}};
out.x_gray={half:'xeno',name:'GRAYSPACE UFO TEXT',icon:'≋',blurb:'UFO text files from gopherspace, crawls and open directories — the 90s ufology underground.',sources:{gray:{name:'Gray UFO text',f:grayUFO,note:'deep_text + open-dir filename index filtered by UFO terms. No archive.org.'}}};

/* ---- VATICAN ---- */
const FONDS=[['Vat.lat',15000],['Vat.gr',2600],['Vat.ebr',600],['Vat.ar',1000],['Vat.sir',600],['Barb.lat',9000],['Pal.lat',1900],['Reg.lat',2100],['Borg.lat',900],['Urb.lat',1700],['Ott.lat',3000],['Barb.gr',590],['Vat.copt',100],['Vat.pers',100],['Vat.turc',100],['Vat.eth',300]];
async function digi(o){const V=await cache('vatlib.json');const kw=(o.kw||'').toLowerCase();
  const pool=V.filter(x=>!kw||x.shelf.toLowerCase().startsWith(kw)||(x.preview||'').toLowerCase().includes(kw));
  const pickd=sh(pool).slice(0,8).map(x=>x.shelf);
  const got=await Promise.all(pickd.map(s=>fetch(`https://digi.vatlib.it/iiif/MSS_${s}/manifest.json`).then(r=>r.ok?r.json():null).catch(()=>null)));
  const r=got.filter(Boolean).map(digiMap);if(r.length>=4)return r;return [...r,...await digiRand(o)]}
async function digiRand(o){const tries=Array.from({length:10},()=>{const [f,n]=o.kw&&FONDS.find(x=>x[0].toLowerCase()===o.kw.toLowerCase())||pk(FONDS);return `${f}.${1+Math.floor(Math.random()*n)}`});
  const got=await Promise.all(tries.map(s=>fetch(`https://digi.vatlib.it/iiif/MSS_${s}/manifest.json`).then(r=>r.ok?r.json():null).catch(()=>null)));
  return got.filter(Boolean).map(digiMap)}
function digiMap(j){{const c=j.sequences[0].canvases,cv=pk(c.slice(Math.min(4,c.length-1))),svc=cv.images[0].resource.service['@id'],shelf=String(j.label);
   const md=(j.metadata||[]).map(m=>`${flat(m.label)}: ${flat(m.value)}`.replace(/<[^>]+>/g,'')).join(' · ');
   return {module:'v_mss',source:'DigiVatLib (Vatican Library IIIF)',title:`${shelf} · folio ${cv.label}`,date:'',dateLabel:'',count:c.length,countLabel:'images',thumb:svc+'/full/300,/0/default.jpg',kind:'img',src:svc+'/full/1000,/0/default.jpg',
    url:`https://digi.vatlib.it/view/MSS_${shelf}`,preview:(md||String(j.description||'')).slice(0,500)||'(shelfmark only — uncatalogued in the manifest)',query:`random shelfmark draw from ${shelf.split('.').slice(0,2).join('.')} · random folio`,
    extra:`fonds: ${shelf.split('.').slice(0,2).join('.')} · ${c.length} images · random folio ${cv.label}`,links:[['IIIF manifest ↗',j['@id']]]}}}
out.v_mss={half:'vatican',name:'SECRET STACKS',icon:'📜',blurb:'Random shelfmarks from the Vatican Library — Latin, Greek, Hebrew, Syriac, Coptic, Ethiopic codices — opened to a random folio.',sources:{digi:{name:'DigiVatLib random codex',f:digi,note:'Draws from a verified shelfmark list (probed by the Action, growing every 3h) across 25 fonds, then random probes, opens a random folio via IIIF. Keyword = fonds name (e.g. Vat.ebr).'}}};
out.v_papal={half:'vatican',name:'BURIED BULLS',icon:'⛪',blurb:'Forgotten encyclicals, bulls, briefs, letters and audiences from Leo XIII onward.',sources:{va:{name:'vatican.va archive',f:cached('vatva.json','v_papal',x=>({source:'vatican.va',title:x.title,date:x.date,dateLabel:'issued',url:x.url,preview:`${x.kind} of ${x.pope}`,query:'random pope × document type × year index · harvested by the Action',extra:`type: ${x.kind} · pope: ${x.pope}`})),note:'The Action walks random pope / type / year sub-indexes on vatican.va.'}}};
const VT={exorc:{name:'EXORCISM',icon:'✝',w:['exorcism','exorcisms','"demoniac"','"possession"','"rituale romanum"','demonology'],re:/exorc|demoniac|demonic possession|possessed by|demonolog|rituale romanum|energumen/i,news:['exorcism','possessed by a devil','exorcised','driving out the devil'],key:'v_exorc'},
 appar:{name:'APPARITIONS',icon:'✨',w:['apparitions','"marian apparitions"','"Mary, Blessed Virgin, Saint -- Apparitions and miracles"','"weeping statue"','stigmata','"miraculous"'],re:/apparition|marian|stigmat|miraculous (cure|medal|image)|miracles of our lady|weeping (statue|madonna|virgin)|our lady of/i,news:['apparition of the virgin','weeping statue','stigmata','miraculous cure','vision of the virgin'],key:'v_appar'},
 inq:{name:'INQUISITION',icon:'🔥',w:['inquisition','"holy office"','"auto de fe"','heresy','"santo oficio"'],re:/inquisi|holy office|auto.?de.?f|heres|santo oficio/i,news:['the inquisition','holy office','auto da fe','burned for heresy'],key:'v_inq'},
 index:{name:'INDEX OF FORBIDDEN BOOKS',icon:'🚫',w:['"index librorum"','"index librorum prohibitorum"','"forbidden books"','"prohibited books"','"index expurgatorius"','"Catholic Church -- Index librorum prohibitorum"','"Prohibited books"','"Censorship -- Religious aspects"','"Catholic Church. Congregatio Indicis"'],re:/index librorum|prohibitorum|indicis|indice dei libri|index des livres|libri proibiti|livres (interdits|prohibés)|index of (prohibited|forbidden)|forbidden books|prohibited books|expurgat|congregation of the index|censur/i,news:['index of forbidden books','placed on the index','forbidden by the church','index expurgatorius'],key:'v_index'},
 council:{name:'LOST COUNCILS',icon:'🏛',w:['"councils and synods"','synods','"church councils"','"canon law"','decretals','"provincial council"'],re:/synod|canon law|decretal|concili|ecumenical|council of (trent|nic[ae]+a|constance|basel|florence|lateran|vienne|lyons?|ephesus|chalcedon|constantinople|the church)|church councils?|vatican council|plenary council|provincial council of (baltimore|westminster|quebec|cincinnati|st\.? louis|new orleans|dublin|armagh)/i,news:['vatican council','provincial council','synod of bishops','ecumenical council'],key:'v_council'}};
for(const [k,t] of Object.entries(VT)){const m='v_'+k;out[m]={half:'vatican',name:t.name,icon:t.icon,blurb:`${t.name.toLowerCase()} — near-zero-view scans and forgotten press.`,sources:{
  ia:{name:'Deep mine',f:H.theoIA({ia:[t.w],re:t.re},m),note:'Internet Archive texts with ≤5 downloads, random upload window.'},
  news:{name:'Old newspapers',f:NEWS({name:t.name,news:t.news,key:t.key,cache:'finds/world_news.json'},m),note:'LoC Chronicling America random window/page; cached fallback.'}}}}

/* ---- TRENCH grayspace additions (Wayback captures only) ---- */
const FJUNK=/signup|sign-?in|registration|rules|sign-up|logout|login|faq|register|adfree|password|profile|\?q=|kot=|terms|privacy|help\.|\.cgi\?page|advert/i;
const wb=(module,src,label)=>x=>({source:src,title:x.title,date:x.date,dateLabel:'captured',url:x.url,preview:x.preview||'(open the capture)',query:x.query||label,extra:`${label} · grayspace · unvetted text`});
out.tr_bbs={half:'trench',name:'BBS TEXTFILES',icon:'☎',blurb:'80s/90s BBS text files (textfiles.com mirror captures): hacking lore, ufo, conspiracy, phreaking, humor.',sources:{wb:{name:'Wayback captures',f:cached('bbs.json','tr_bbs',wb('tr_bbs','BBS textfile (Wayback)','textfiles.com capture'),()=>true,30),note:'Wayback CDX of textfiles.com directories, adult/drug dirs excluded, harvested by the Action.'}}};
out.tr_forums={half:'trench',name:'DEAD FORUMS',icon:'🪦',blurb:'Threads from extinct forum hosts (ezboard, network54, voy, delphi…) preserved only as captures.',sources:{wb:{name:'Wayback captures',f:cached('forums.json','tr_forums',wb('tr_forums','Dead forum (Wayback)','dead-forum capture'),x=>!FJUNK.test(x.url),30),note:'Wayback CDX over dead forum hosts, harvested by the Action.'}}};
/* ---- cheap extras in existing sections ---- */
const EX={rel_missing:{half:'reliquary',name:'VANISHED PEOPLE',icon:'❔',blurb:'Disappearances never resolved — "no trace has been found" notices in old papers and zero-view scans.',w:['"missing persons"','disappearances','"disappeared"','"never found"'],re:/missing|disappear|vanish|never found/i,news:['no trace has been found','mysteriously disappeared','has not been seen since','vanished without a trace'],key:'rel_missing'},
 rel_ghost:{half:'reliquary',name:'GHOST TOWNS',icon:'🏚',blurb:'Abandoned towns, flooded villages, forgotten camps — places that dropped off the map.',w:['"ghost towns"','"extinct towns"','"abandoned towns"','"deserted villages"','"lost towns"'],re:/ghost town|extinct town|abandon|deserted|lost town/i,news:['deserted village','ghost town','town abandoned','abandoned mining camp'],key:'rel_ghost'}};
for(const [m,t] of Object.entries(EX))out[m]={half:t.half,name:t.name,icon:t.icon,blurb:t.blurb,sources:{
  news:{name:'Old newspapers',f:NEWS({name:t.name,news:t.news,key:t.key,cache:'finds/world_news.json'},m),note:'LoC Chronicling America random window/page; cached fallback.'},
  ia:{name:'Deep mine',f:H.theoIA({ia:[t.w],re:t.re},m),note:'Internet Archive texts with ≤5 downloads, random upload window.'}}};
/* ---- Pass 7: legal stand-ins for blocked sites — Wayback copies of their public pages ---- */
const un=s=>{const d=document.createElement('textarea');d.innerHTML=String(s||'');return d.value};
const wbMap=(tag,clean=t=>t)=>x=>({source:x.source,title:clean(un(x.title)),date:x.date,dateLabel:'captured',url:x.url,preview:un(x.preview||'(open the archived copy)'),query:x.query,extra:`${tag} · archived public page · original: ${x.orig||''}`,links:x.orig?[['live original ↗',x.orig]]:[]});
const dedupeT=f=>async o=>{const r=await f(o),s=new Set();return r.filter(x=>!s.has(x.title)&&s.add(x.title))};
out.g_fbivault={half:'redacted',name:'FBI VAULT (MIRROR)',icon:'🗄',blurb:'The FBI\'s own FOIA reading room, mined through Wayback copies (vault.fbi.gov blocks automated fetches). Random file-set pages, never the famous ones first.',sources:{
  wb:{name:'Vault pages (Wayback)',f:cached('wb_fbivault.json','g_fbivault',wbMap('FBI Vault',t=>t.replace(/^foia \/ /i,'').replace(/\b\w/g,c=>c.toUpperCase()))),note:'Wayback CDX of vault.fbi.gov 2011–2016, random draw. Opens the archived file-set page; PDFs link from there.'}}};
out.g_muckrock={half:'redacted',name:'FOIA REQUEST TRAILS',icon:'📨',blurb:'Individual public-records requests and their released responses (MuckRock), via Wayback copies — oddly specific asks most people never read.',sources:{
  wb:{name:'MuckRock requests (Wayback)',f:cached('wb_muckrock.json','g_muckrock',wbMap('MuckRock request',t=>t.replace(/\s*•\s*MuckRock\s*$/,''))),note:'Wayback CDX of muckrock.com/foi request pages, titles read from the archived page.'}}};
out.x_geipan={half:'xeno',name:'GEIPAN (FRANCE)',icon:'🇫🇷',blurb:'France\'s official UAP bureau (CNES) — news items, case notes and docs from archived copies of geipan.fr / cnes-geipan.fr.',sources:{
  wb:{name:'GEIPAN pages (Wayback)',f:dedupeT(cached('wb_geipan.json','x_geipan',wbMap('GEIPAN',t=>t.replace(/^GEIPAN:\s*/,'')),x=>!/glossaire/i.test(x.title),40)),note:'geipan.fr is Cloudflare-blocked; archived copies 2008–2016 are read instead.'}}};
out.tr_area51={half:'trench',name:'GEOCITIES AREA51',icon:'👽',blurb:'The GeoCities "Area51" neighbourhood (sci-fi, UFO, fandom homepages, 1996–2009) — dead personal sites as Wayback captures.',sources:{
  wb:{name:'Area51 homepages',f:cached('wb_area51.json','tr_area51',wbMap('GeoCities Area51'),()=>true,30),note:'Wayback CDX of geocities.com/Area51, adult/zip/exe paths excluded, titles + first text read from the capture.'}}};
out.x_gray.sources.area51={name:'GeoCities Area51 (UFO)',f:cached('wb_area51.json','x_gray',wbMap('GeoCities Area51'),x=>UFO.test(x.title+' '+(x.preview||'')),30),note:'Area51 homepages whose title/text mention UFOs, aliens, abductions.'};

/* ---- Pass 8: LIVE / THEO / INVENTO / RELIQUARY additions ---- */
const COMMON_WX=/^(Flood Watch|Flood Warning|Flood Advisory|Wind Advisory|Winter Weather Advisory|Small Craft Advisory|Special Weather Statement|Frost Advisory|Freeze Warning|Heat Advisory|Red Flag Warning|Beach Hazards Statement|Rip Current Statement|Dense Fog Advisory|Winter Storm Watch|Winter Storm Warning|Gale Warning|High Wind Warning|Hydrologic Outlook|Coastal Flood Advisory|Freeze Watch|Fire Weather Watch|Lake Wind Advisory)$/;
out.l_spacewx={half:'live',name:'SOLAR WIRE',icon:'☀',blurb:'Live space-weather bulletins and the rarest US weather alerts active right now: the odd ones nobody reads.',sources:{
  swpc:{name:'NOAA SWPC alerts',f:async o=>{const j=await (await fetch('https://services.swpc.noaa.gov/products/alerts.json')).json();const re=kwRe(o);
    return sh(j.filter(x=>!re||re.test(x.message))).slice(0,24).map(x=>{const m=x.message.replace(/\r/g,'');const head=(m.match(/^(ALERT|WARNING|WATCH|SUMMARY|CONTINUED ALERT|EXTENDED WARNING|CANCEL[^:]*):\s*(.+)$/m)||[,'',x.product_id])[2];
      return {module:'l_spacewx',kind:'link',thumb:'',src:'',count:null,countLabel:'',source:'NOAA Space Weather Prediction Center',title:head,date:x.issue_datetime.slice(0,16)+' UTC',dateLabel:'issued',url:'https://www.swpc.noaa.gov/products/alerts-watches-and-warnings',preview:m.split('\n').slice(3,9).join(' · ').slice(0,400),query:'services.swpc.noaa.gov/products/alerts.json',extra:`product ${x.product_id} · live feed`}})},note:'Live JSON from NOAA SWPC: geomagnetic storms, radio blackouts, proton events, last ~7 days.'},
  nws:{name:'Rare NWS alerts',f:async o=>{const j=await (await fetch('https://api.weather.gov/alerts/active',{headers:{Accept:'application/geo+json'}})).json();const re=kwRe(o);
    const f=j.features.map(x=>x.properties).filter(p=>!COMMON_WX.test(p.event)&&(!re||re.test(p.event+' '+p.headline+' '+p.areaDesc)));
    return sh(f).slice(0,24).map(p=>({module:'l_spacewx',kind:'link',thumb:'',src:'',count:null,countLabel:'',source:'US National Weather Service',title:`${p.event} · ${p.areaDesc.slice(0,80)}`,date:(p.sent||'').slice(0,16),dateLabel:'sent',url:p['@id']||'https://alerts.weather.gov',preview:(p.description||p.headline||'').slice(0,400),query:'api.weather.gov/alerts/active minus the 24 most common event types',extra:`${p.severity} · ${p.senderName}`}))},note:'Live active alerts with the everyday types (flood watches, wind advisories…) removed, so only odd events show: tsunami, dust storm, avalanche, ashfall, 911 outage, blue alert.'}}};
// Pass 10: forms, spoilers, error and host-chrome pages
const GJUNK=/search form|have your say|spoilers?|soaps? weekly|sign ?(up|in)|log ?in\b|guest ?book|web ?ring|404|not found|page cannot|error|this page has moved|under construction|hit counter|free web hosting|tripod\.lycos|angelfire\.lycos|lycos network/i;
const HCHROME=/check out the new hotbot|tell me when this page is updated|search:? ?(tripod|angelfire|lycos)[^.]*|build your (own )?(free )?(web ?site|home ?page)|get your free home ?page|lycos (search|network)|click here to (visit|enter)|you are visitor (number|#)?\s*\d*/gi;
const gwb=(file,mod,label,half,name,icon,blurb)=>{out[mod]={half,name,icon,blurb,sources:{wb:{name:label,f:cached(file,mod,x=>{const r=wbMap(label)(x);if(/^(untitled|new page|home ?page|index|welcome|my page|document)|\s\/\s|\.html?$/i.test(r.title)&&x.preview&&/\p{L}{3}/u.test(x.preview))r.title=(un(x.preview).replace(HCHROME,' ').replace(/-->|<!--|&\w+;|[^\p{L}\p{N} .,'!?:-]/gu,' ').replace(/\s+/g,' ').trim().slice(0,80)||r.title)+'…';return r},x=>!/geobook|guestbook|webring|awards?\.html|form|poll|vote|chat|spoiler/i.test(x.url)&&!GJUNK.test((x.title||'')+' '+(x.preview||'').slice(0,160)),30),note:`Wayback CDX of the GeoCities neighbourhood, adult/zip/exe paths excluded, titles and first text read from each capture. Grayspace: unvetted personal pages.`}}}};
gwb('wb_athens.json','th_athens','GeoCities Athens (Wayback)','theo','ATHENS HOMEPAGES','🏛','Dead GeoCities "Athens" neighbourhood (philosophy, religion, theology, classics, 1996–2009): amateur theology and hand-typed scripture studies.');
gwb('wb_cape.json','in_cape','GeoCities CapeCanaveral (Wayback)','invento','CAPE CANAVERAL HOMEPAGES','🚀','Dead GeoCities "CapeCanaveral" neighbourhood (science and tech, 1996–2009): garage inventions, home rocketry, amateur physics.');
gwb('wb_heartland.json','rel_heartland','GeoCities Heartland (Wayback)','reliquary','HEARTLAND HOMEPAGES','🏡','Dead GeoCities "Heartland" neighbourhood (family, hometowns, genealogy, 1996–2009): family trees and small-town pages nobody remembers.');
gwb('wb_pentagon.json','rel_pentagon','GeoCities Pentagon (Wayback)','reliquary','PENTAGON HOMEPAGES','🎖','Dead GeoCities "Pentagon" neighbourhood (military, veterans, 1996–2009): unit histories, veterans\' memoirs, lost reunion pages.');
gwb('wb_silicon.json','in_silicon','GeoCities SiliconValley (Wayback)','invento','SILICON VALLEY HOMEPAGES','💾','Dead GeoCities "SiliconValley" neighbourhood (computing, 1996–2009): homebrew software, hardware hacks, BBS-era how-tos.');
gwb('wb_soho.json','rel_soho','GeoCities SoHo (Wayback)','reliquary','SOHO HOMEPAGES','🖋','Dead GeoCities "SoHo" neighbourhood (writers and artists, 1996–2009): lost poetry, zines and unpublished stories.');
gwb('wb_tokyo.json','rel_tokyo','GeoCities Tokyo (Wayback)','reliquary','TOKYO HOMEPAGES','🗼','Dead GeoCities "Tokyo" neighbourhood (Asia and anime, 1996–2009): fan galleries, BBS pages and personal sites in Japanese, Chinese, Vietnamese and English.');
gwb('wb_paris.json','rel_paris','GeoCities Paris (Wayback)','reliquary','PARIS HOMEPAGES','🥐','Dead GeoCities "Paris" neighbourhood (romance, French culture and poetry, 1996–2009): love letters, travel diaries and francophone homepages.');
gwb('wb_rainforest.json','l_rainforest','GeoCities RainForest (Wayback)','live','RAINFOREST HOMEPAGES','🌿','Dead GeoCities "RainForest" neighbourhood (ecology and the outdoors, 1996–2009): amateur field notes, garden logs and conservation pages.');
gwb('wb_tripod.json','tr_tripod','Tripod (Wayback)','trench','TRIPOD MEMBERS','🗿','members.tripod.com personal pages (1997–2004) as Wayback captures: grayspace, unvetted.');
gwb('wb_angelfire.json','tr_angelfire','Angelfire (Wayback)','trench','ANGELFIRE','🔥','Angelfire personal pages (1997–2004) as Wayback captures: grayspace, unvetted.');
gwb('wb_religtext.json','th_religtext','Dead religion text archive (Wayback)','theo','DEAD TEXT SHELVES','📚','The religion shelves of two dead text archives, the Wiretap gopher library and Penn CCAT\'s gopher, as Wayback captures: plain-text scriptures, apocrypha and FAQs.');
G.RELTEXT=async()=>{const p=await Promise.all(['wb_religtext.json','wb_ccatbib.json','wb_religtext2.json'].map(f=>cache(f).catch(()=>[])));return p.flat()};
G.WORLD_MODULES=out;
})(typeof window!=='undefined'?window:globalThis);
