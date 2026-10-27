/* INVENTO — random low-visibility patent mining from the USPTO file-wrapper dump on archive.org (409k applications,
   incl. 130k abandoned). Sorted fewest-downloads first, random deep page. CPC codes seed each module (shown + linked). */
(function(G){
const pk=a=>a[Math.floor(Math.random()*a.length)],sh=a=>a.map(x=>[Math.random(),x]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);
const JJ=async u=>{const r=await fetch(u);if(!r.ok)throw new Error(r.status);return r.json()};
const CODES={CTNF:'non-final rejection',CTFR:'FINAL REJECTION',ABN:'ABANDONED',NOA:'notice of allowance',ISSUE:'issued',CTRS:'restriction',
  'SRNT':'search notes',PETDEC:'petition decision',APPEAL:'appeal'};
const MODERN=[[/sensor|detect|monitor/i,'IoT sensing / wearables'],[/vehicle|wheel|motor|engine/i,'EV & micromobility'],[/water|purif|filter/i,'off-grid water tech'],
 [/brain|neural|nerve|eeg/i,'consumer BCI / neurotech'],[/light|lamp|led|optic/i,'smart lighting / photonics'],[/battery|energy|solar|power/i,'home energy storage'],
 [/food|beverage|composition|flavor/i,'functional foods / DTC brands'],[/game|toy|amuse/i,'indie hardware / board games'],[/medic|therap|treat/i,'telehealth device'],
 [/data|computer|signal|network/i,'edge computing / privacy tools'],[/shelter|emergency|survival/i,'prepper / disaster-relief kit'],[/.*/,'open niche — no obvious modern analog']];
const modern=t=>MODERN.find(m=>m[0].test(t))[1];
const M={
 expired:{name:'EXPIRED VAULT',icon:'⌛',blurb:'Applications filed 1997–2004 — 20-year term long over. Public domain ideas, fewest-viewed first.',cpc:['A47G','B65D','A63H','F24C'],
  w:['apparatus','device','method','system','improved','novelty','portable','combination','toy','kitchen','garden','pet']},
 abandoned:{name:'REJECTED / ABANDONED',icon:'🗑',blurb:'File wrappers with an abandonment (ABN) in the history — ideas that never issued.',cpc:['A63B','A45F','B62K','G09B'],abn:1,
  w:['apparatus','device','method','game','toy','vehicle','garment','novelty','amusement','improved','tool','container']},
 secret:{name:'SUPPRESSED / SECRET',icon:'🕶',blurb:'Crypto, covert, stealth & surveillance filings (secrecy-order-adjacent subject matter).',cpc:['H04K','H04L9','F41H3','G01S7/38'],
  w:['cryptographic', 'encryption', 'covert', 'stealth', 'surveillance', 'jamming', 'countermeasure', 'concealment', 'classified', 'eavesdropping', 'steganography'],tre:/crypt|covert|stealth|surveillance|jamm|countermeasure|conceal|classified|eavesdrop|steganograph|secret|intercept/i},
 wartech:{name:'LOST WAR TECH',icon:'💣',blurb:'Munitions, armor, decoys, ordnance — the odd defense filings nobody reads.',cpc:['F41','F42B','F42C','B64D1','F41H'],
  w:['munition', 'projectile', 'torpedo', 'warhead', 'missile', 'armor', 'decoy', 'ordnance', 'grenade', 'firearm', 'ballistic', 'mortar'],tre:/munition|projectile|torpedo|warhead|missile|armou?r|decoy|ordnance|grenade|firearm|ballistic|mortar|weapon|military|gun\b/i},
 modernuse:{name:'MODERN-USE MATCHER',icon:'🔁',blurb:'Old mechanical/analog filings, each matched to a modern market it could serve.',cpc:['G04B','G11B3','H01J','F16H'],
  w:['mechanical','pneumatic','analog','vacuum','phonograph','typewriter','telegraph','spring','clockwork','lever','gear','manual']},
 weird:{name:'WEIRD GENERATOR',icon:'🎲',blurb:'Two random abandoned filings fused into one impossible invention. Links to both sources.',gen:1,cpc:[],w:[]},
 formulas:{name:'LOST FORMULAS & RECIPES',icon:'⚗',blurb:'Compositions, beverages, confections, cosmetics — formulas sitting in file wrappers.',cpc:['A23L','A23G','A61K8','C12G','A23F'],
  w:['composition','formulation','beverage','confection','flavor','recipe','cosmetic','fragrance','ointment','dough','liqueur','candy']},
 survival:{name:'DOOMSDAY / SURVIVAL',icon:'☢',blurb:'Shelters, purification, emergency gear, radiation protection.',cpc:['E04H9','C02F1','A62B','G21F'],
  w:['shelter', 'survival', 'fallout', 'radiation', 'disaster', 'rescue', 'respirator', 'bunker', 'decontamination', 'purification'],tre:/shelter|survival|fallout|radiation (shield|protect)|disaster|rescue|respirator|bunker|decontaminat|water purif|gas mask|emergency/i,nx:/image|phosphor|detector panel|conversion panel/i},
 dead:{name:'CONTACTING THE DEAD',icon:'👻',blurb:'Spirit, paranormal, EVP-adjacent & memorial-communication filings.',cpc:['G01V','A61B5','G10L'],
  w:['paranormal', 'ghost', 'afterlife', 'seance', 'psychic', 'spiritualism', 'deceased', 'cremated', 'memorial', 'haunted', 'spiritualist'],tre:/paranormal|ghost|afterlife|s[eé]ance|psychic|spiritualis|deceased|cremat|memorial|tombstone|departed|haunt|ouija|spirit (board|communicat)|evp\b|dead person/i,nx:/ghost (image|imaging|signal|reflection|line|cancel)|ghosting|x-ray|projection screen|display|detector panel/i},
 immortal:{name:'IMMORTALITY / RESURRECTION',icon:'♾',blurb:'Cryopreservation, longevity, rejuvenation, resuscitation.',cpc:['A01N1/02','A61K35','A61P39'],
  w:['cryopreservation', 'cryogenic', 'longevity', 'rejuvenation', 'resuscitation', 'embalming', 'revival', 'lifespan', 'immortality', 'suspended'],tre:/cryopreserv|cryonic|longevity|rejuvenat|resuscitat|embalm|reviv|life ?span|immortal|anti-?aging|suspended animation|organ preserv|tissue preserv/i,nx:/asphalt|pavement|brake|temper|gauge|fluid|fuel cell|battery/i},
 mindctl:{name:'MIND CONTROL',icon:'🌀',blurb:'Hypnosis, subliminal, neural stimulation & behavior-modification filings.',cpc:['A61M21','A61N1/36','A61N2'],
  w:['hypnosis', 'hypnotic', 'subliminal', 'brainwave', 'entrainment', 'trance', 'biofeedback', 'mesmerism', 'neurofeedback', 'hypnotizing'],tre:/hypno|sublimin|brain ?wave|entrain|\btrance\b|mesmer|mind control|neurofeedback|biofeedback|behavior modif|thought/i,nx:/chondrocyte|protein|gene|receptor|ligand|polypeptide|antibod/i},
 weather:{name:'WEAPONIZED WEATHER',icon:'⛈',blurb:'Cloud seeding, hurricane steering, lightning, fog & precipitation control.',cpc:['A01G15','E01H13','H05F7'],
  w:['hurricane', 'tornado', 'hail', 'lightning', 'rainmaking', 'fog', 'precipitation', 'seeding', 'weather', 'cyclone', 'storm'],tre:/weather|cloud seed|seeding|hurricane|tornado|cyclone|hail (suppress|prevent|cannon)|lightning|rain ?making|fog (dispers|dissipat|clear|remov|suppress)|\bstorm (modif|control|suppress|steer)/i,nx:/graphic|render|coating|crawl|anti-?fog|dust|vacuum|cleaner|separator|copolymer|drug|particle|impact protection|substrate|semiconductor|wafer|ion beam|deposition|plasma etch/i},
 aliens:{name:'ALIENS / APOCALYPSE',icon:'🛸',blurb:'Extraterrestrial, asteroid defense, planetary, UFO-shaped craft.',cpc:['B64G','B64C39/06','F41H13'],
  w:['extraterrestrial', 'asteroid', 'meteor', 'saucer', 'ufo', 'antigravity', 'interplanetary', 'comet', 'alien', 'meteorite'],tre:/extraterrest|asteroid|meteor|saucer|\bufo\b|anti-?gravity|interplanet|comet|\balien|planetary defen/i},
 deterrent:{name:'DOOMSDAY DETERRENTS',icon:'🧨',blurb:'Nuclear, EMP, blast, deterrence & retaliation-system filings.',cpc:['G21J','F41H11','H05K9'],
  w:['nuclear', 'emp', 'blast', 'detonation', 'explosion', 'deterrent', 'retaliation', 'interceptor', 'electromagnetic'],tre:/nuclear|\bemp\b|electromagnetic pulse|blast|detonat|explos|deterr|retaliat|intercept|missile/i},
};
function mapDoc(d,module,T,q){const desc=[].concat(d.description||[]);const title=desc[0]||d.title;const files=desc.slice(1).join(' ');
  const app=d.identifier.split('.').pop();const stems=[...files.matchAll(/(\d{8}-(\d{4}-\d{2}-\d{2})-\d{5}-([A-Z0-9.]+)) pdf/g)];
  const filed=stems[0]?stems[0][2]:'';const codes=[...new Set(stems.map(s=>s[3]))];const abst=stems.find(s=>s[3]==='ABST'),drw=stems.find(s=>s[3]==='DRW');
  const hist=codes.filter(c=>CODES[c]).map(c=>CODES[c]);const status=codes.includes('ABN')?'ABANDONED':codes.includes('ISSUE')||codes.includes('NOA')?'allowed/issued':'pending→lapsed';
  const base=`https://archive.org/download/${d.identifier}/`;const mu=modern(title);const year=filed.slice(0,4);
  return {module,source:'USPTO file wrapper (IA)',title,date:filed,dateLabel:'filed',count:d.downloads||0,countLabel:'downloads',kind:'link',
   thumb:drw?base+drw[1]+'.gif':`https://archive.org/services/img/${d.identifier}`,src:'',url:`https://archive.org/details/${d.identifier}`,patent:app,
   preview:`Application ${app} · filed ${filed} · status: ${status}\nfile history: ${hist.join(', ')||codes.slice(0,12).join(', ')}\nmodern-use: ${mu}`,
   extra:`patent/app # ${app} · year ${year} · inventor: see OATH/ADS in file wrapper · ${status} · modern-use: ${mu} · CPC seed: ${T.cpc.join(', ')||'—'}`,
   query:q,lazy:abst?async()=>{const r=await fetch(base+abst[1]+'_djvu.txt');return r.ok?(await r.text()).trim().slice(0,2500):'no OCR text'}:null,
   links:[['Google Patents ↗',`https://patents.google.com/?q=${encodeURIComponent('"'+title+'"')}`],...T.cpc.slice(0,2).map(c=>[`CPC ${c} oldest ↗`,`https://patents.google.com/?cpc=${encodeURIComponent(c)}&sort=old`]),
     ...(drw?[['drawing sheet ↗',base+drw[1]+'.pdf']]:[]),...(abst?[['abstract pdf ↗',base+abst[1]+'.pdf']]:[])]}}
async function uspto(T,module,o,extra=''){const ws=o.kw?[o.kw]:sh(T.w).slice(0,6);
  const q=`collection:uspto AND description:(${ws.join(' OR ')})${T.abn||extra?' AND description:ABN':''}`;
  const u=new URLSearchParams({q,rows:60,page:o.kw?1:1+Math.floor(Math.random()*6),output:'json'});['identifier','title','description','downloads'].forEach(f=>u.append('fl[]',f));u.append('sort[]','downloads asc');
  let docs=(await JJ('https://archive.org/advancedsearch.php?'+u)).response.docs;
  if(!docs.length){u.set('page',1);docs=(await JJ('https://archive.org/advancedsearch.php?'+u)).response.docs}
  if(!docs.length&&/ABN/.test(q)){u.set('q',q.replace(' AND description:ABN',''));docs=(await JJ('https://archive.org/advancedsearch.php?'+u)).response.docs} // Pass 11: widen when the abandoned-flag filter is empty
  const re=o.kw?null:(T.tre||new RegExp('\\b('+T.w.join('|')+')','i'));
  return sh(docs.filter(d=>{const t=[].concat(d.description||[])[0]||'';return (!re||re.test(t))&&!(T.nx&&T.nx.test(t))})).slice(0,24).map(d=>mapDoc(d,module,T,q+' · sort downloads asc'))}
async function tmGrave(o,module){const q=`mediatype:texts AND title:(${o.kw?o.kw+' AND ':''}(trademark OR trademarks OR "trade-marks" OR "trade marks")) AND downloads:[0 TO 15]`;
  const u=new URLSearchParams({q,rows:60,page:1+Math.floor(Math.random()*4),output:'json'});['identifier','title','date','downloads','uploader','description'].forEach(f=>u.append('fl[]',f));u.append('sort[]',pk(['downloads asc','addeddate desc']));
  let docs=(await JJ('https://archive.org/advancedsearch.php?'+u)).response.docs;if(!docs.length){u.set('page',1);docs=(await JJ('https://archive.org/advancedsearch.php?'+u)).response.docs}
  return sh(docs).slice(0,24).map(d=>({module,source:'IA trademark scans',title:[].concat(d.title)[0],date:String(d.date||'').slice(0,10),dateLabel:'date',count:d.downloads||0,countLabel:'downloads',kind:'link',
   thumb:`https://archive.org/services/img/${d.identifier}`,url:`https://archive.org/details/${d.identifier}`,preview:String([].concat(d.description||['(no description)'])[0]).replace(/<[^>]+>/g,' ').slice(0,500),
   extra:`uploader: ${d.uploader||'?'} · dead-mark status needs USPTO TSDR (key-gated) — scans only`,query:q,
   lazy:async()=>{const r=await fetch(`https://archive.org/download/${d.identifier}/${d.identifier}_djvu.txt`);return r.ok?(await r.text()).slice(0,2500):'no OCR text'},
   links:[['full text ↗',`https://archive.org/stream/${d.identifier}/${d.identifier}_djvu.txt`]]}))}
async function weird(o,module){const T=M.abandoned;const a=await uspto(T,module,{}),b=await uspto(T,module,{});const out=[];
  for(let i=0;i<Math.min(a.length,b.length,12);i++){const x=a[i],y=b[b.length-1-i];out.push({...x,title:`${x.title}  ⨯  ${y.title}`,source:'Weird generator (2 abandoned filings)',
   preview:`A: ${x.title} (${x.patent}, ${x.count} dl)\nB: ${y.title} (${y.patent}, ${y.count} dl)\n\nPitch: a single device that is both of these at once.`,lazy:null,
   links:[['source A ↗',x.url],['source B ↗',y.url],...x.links.slice(0,1)],count:(x.count||0)+(y.count||0),countLabel:'combined downloads'})}return out}
function gpLog(k,T,module){return async o=>{const L=await fetch(`finds/invento_${k}.json?`+Date.now()).then(r=>r.ok?r.json():[]).catch(()=>[]);
  const re=o.kw?new RegExp(o.kw.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'i'):(T.tre||null);
  return sh(L.filter(x=>x.source==='Google Patents'&&(!re||re.test((x.title||'')+' '+(x.preview||'')))&&!(T.nx&&T.nx.test((x.title||'')+' '+(x.preview||''))))).slice(0,30).map(x=>{const n=x.patent_number||'';
   return {...x,module,title:String(x.title||n).replace(/<[^>]+>/g,'').trim(),preview:(`Patent ${n} · ${x.dateLabel||'published'} ${x.date||''} · inventor: ${x.inventor||'not listed'}\n`+String(x.preview||'').replace(/<[^>]+>/g,'')).trim(),
    extra:`patent # ${n} · inventor: ${x.inventor||'not listed'} · ${x.query||''}`,links:[['Google Patents ↗',x.url],['PDF / drawings ↗',x.url]]}})}}
const out={};for(const [k,T] of Object.entries(M)){const f=T.tm?o=>tmGrave(o,'inv_'+k):T.gen?o=>weird(o,'inv_'+k):o=>uspto(T,'inv_'+k,o);
  out['inv_'+k]={half:'invento',name:T.name,icon:T.icon,blurb:T.blurb+(T.cpc.length?` · CPC seeds: ${T.cpc.join(', ')}`:''),sources:{...(T.gen?{}:{gp:{name:'Google Patents (CPC-seeded)',f:gpLog(k,T,'inv_'+k),note:'Mined every 3h by the Action from Google Patents with this module\'s CPC codes + theme terms, filtered to on-theme titles/abstracts. Inventor + patent # included.'}}),uspto:{name:'USPTO file wrappers',f,note:'archive.org USPTO collection, fewest downloads first, random deep page. Text-first; drawing sheets are document scans.'}}};
  if(!T.tm&&!T.gen)out['inv_'+k].sources.gray={name:'Gray-space patent text',f:async o=>{const L=await fetch('finds/deep_text.json?'+Date.now()).then(r=>r.json()).catch(()=>[]);const od=await fetch('finds/odbig.json?'+Math.floor(Date.now()/6e5)).then(r=>r.json()).catch(()=>[]);
    const nm=u=>{try{return decodeURIComponent(u.split('/').slice(-2).join(' / '))}catch(e){return u}};
    const P=/patent|invent|perpetual|free.?energy|tesla|antigrav|over.?unity|zero.?point|orgone|cold.?fusion|keely|schauberger|moray|rexresearch/i,N=/aspell|dictionar|wordlist|\/games?\/|\/roms?\/|fonts?\/|drivers?\/|\/src\/|license|readme|changelog|install|\/man\d?\//i;
    const ods=od.filter(r=>/\.(txt|pdf|html?|doc|rtf)$/i.test(r[0])&&!N.test(r[0])&&P.test(nm(r[0]))).sort(()=>Math.random()-.5).filter((r,i,a)=>{const d=r[0].replace(/[^/]*$/,'');a.s??={};a.u??=new Set();if(a.u.has(r[0]))return false;a.u.add(r[0]);a.s[d]=(a.s[d]||0)+1;return a.s[d]<=3}).slice(0,20).map(([u,size,date])=>({module:'inv_'+k,source:'Open Directory (index)',title:nm(u),date:(date||'').slice(0,10),dateLabel:'listed',count:null,countLabel:'',thumb:'',kind:'link',src:'',url:u,preview:`${size||'?'} · in ${u.replace(/[^/]*$/,'')}`,query:'open-dir filename index · invention terms',extra:'host: '+u.split('/')[2]}));
    return [...ods,...L.filter(x=>x.bucket==='patent').map(x=>({...x,module:'inv_'+k}))]},note:'Gopherspace / crawl text bucketed as patents, plus open-directory files named for inventions (patent, free energy, Tesla, antigravity…). Same set for every INVENTO module.'}}
G.INVENTO_MODULES=out;
})(typeof window!=='undefined'?window:globalThis);
