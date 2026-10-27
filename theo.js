/* THEO relevance engine — curated query variants, relevance/downloads sort, topic filter. */
(function(G){
const pk=a=>a[Math.floor(Math.random()*a.length)];
const sh=a=>a.map(x=>[Math.random(),x]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);
const JJ=async u=>{const r=await fetch(u);if(!r.ok)throw new Error(r.status+' '+u);return r.json()};
const flat=v=>[].concat(v||[]).join('; ');
const q2=s=>/\s/.test(s)?`"${s}"`:s;
const OFF=/\b(sermon[s]? on|sunday school|hymnal|church bulletin|newsletter|yearbook|catalog of|annual report|minutes of|worship service|podcast|episode)\b/i;

// --- DEEP MINE: random low-visibility enumeration, then bucket by theme (label only)
const MAXDL=5;
function winDate(){const y=2008+Math.floor(Math.random()*(new Date().getFullYear()-2007));const m=1+Math.floor(Math.random()*12);const s=`${y}-${String(m).padStart(2,'0')}-01`;const e=new Date(y,m+2,1).toISOString().slice(0,10);return [s,e]}
function bucket(d){const txt=flat(d.title)+' '+flat(d.subject)+' '+flat(d.description).slice(0,600);for(const [k,t] of Object.entries(T))if(t.re.test(txt))return k;return null}
function mapIA(d,module,q){const desc=String(flat(d.description)).replace(/<[^>]+>/g,' ').trim();const b=bucket(d);
  return {module,source:'IA deep mine',title:flat(d.title)||d.identifier,date:String(d.addeddate||d.publicdate||'').slice(0,10),dateLabel:'uploaded',
    count:d.downloads||0,countLabel:'downloads',thumb:`https://archive.org/services/img/${d.identifier}`,kind:'iframe',src:`https://archive.org/embed/${d.identifier}`,
    url:`https://archive.org/details/${d.identifier}`,preview:desc?desc.slice(0,400):'(no description — never curated)',query:q,
    extra:[`bucket: ${b?T[b].name:'unsorted'}`,`uploader: ${d.uploader||'?'}`,d.subject?'subject: '+flat(d.subject).slice(0,120):''].filter(Boolean).join(' · ')}}
async function iaDeep(q,pages=3){
  const u=new URLSearchParams({q,rows:100,page:1+Math.floor(Math.random()*pages),output:'json'});
  ['identifier','title','subject','creator','date','addeddate','publicdate','downloads','description','uploader'].forEach(f=>u.append('fl[]',f));
  u.append('sort[]',pk(['downloads asc','addeddate desc','addeddate asc']));
  return (await JJ('https://archive.org/advancedsearch.php?'+u)).response.docs}
// theme module: loose theme words, but only near-zero downloads, random upload window; prefer undescribed
// Pass 8: drop self-help, podcast-track, listicle and marketing uploads that carry religious subject tags
const TNZ=/^\S{1,14}$|podcast|episode|\bep\.? ?\d|^\d+\s*[.\-]\s|\btrack \d|law of attraction|manifesting|self.?help|motivat|coaching|\b\d+ (ways|tips|reasons|secrets|miraculous)\b|consciousness|lineages|webinar|mp3|audiobook sample|\bvlog\b/i;
// Pass 9: grayspace plain-text from dead religion archives, themed
// Pass 10: CCAT/Wiretap path codes -> words the theme regexes know
const DSA=s=>s+(/pseudep/i.test(s)?' pseudepigrapha apocrypha lost books of the bible':'')+(/lxx/i.test(s)?' septuagint koine greek':'')+(/mbhs/i.test(s)?' hebrew manuscript biblia hebraica':'')+(/ApostolicFathers|churchwriters/i.test(s)?' apostolic fathers early church apocryph':'')+(/Bible\/(Swahili|Swedish|German)/.test(s)?' vernacular bible':'');
function deadShelf(t,k){return async o=>{const L=window.RELTEXT?await window.RELTEXT():[];const re=o.kw?new RegExp(o.kw.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'i'):t.re;
  const hit=sh(L.filter(x=>re.test(DSA((x.title||'')+' '+(x.orig||'')+' '+(x.url||''))+' '+(x.preview||'').slice(0,300))));
  if(!hit.length)throw new Error('No dead-shelf text on this theme yet (the Action grows the pile each run).');
  return hit.slice(0,24).map(x=>({module:k,source:'Dead text archive (Wayback)',title:(x.title||'').replace(/\s*\/\s*/g,' / '),date:x.date,dateLabel:'captured',count:null,countLabel:'',thumb:'',kind:'link',src:'',url:x.url,preview:x.preview||'',query:'Wiretap + CCAT gopher religion shelves',extra:'grayspace · unvetted plain text · original: '+(x.orig||'')}))}}
function theoIA(T0,module){return async o=>{
  const words=o.kw?[o.kw]:[...new Set(T0.ia.flat())];const grp=sh(words).slice(0,14).join(' OR ');
  const phr=words.filter(w=>w.startsWith('"'));const tq=phr.length?` OR title:(${sh(phr).slice(0,10).join(' OR ')})`:'';
  const tiers=[[MAXDL,1,2],[MAXDL,1,2],[MAXDL,0,3],[MAXDL,0,1],[25,0,1]];let docs=[],q='';
  for(const [cap,win,pg] of tiers){if(docs.length>=6)break;const [a,b]=winDate();
    q=`mediatype:texts AND (subject:(${grp})${tq}) AND downloads:[0 TO ${cap}]`+(win?` AND addeddate:[${a} TO ${b}]`:'');
    docs=(await iaDeep(q,pg)).filter(d=>(d.downloads||0)<=cap&&(o.kw||((T0.re.test(flat(d.title))||T0.re.test(flat(d.subject)))&&!TNZ.test(flat(d.title)))))}
  docs.sort((x,y)=>(!!flat(x.description)-!!flat(y.description))||((x.downloads||0)-(y.downloads||0)));
  return docs.slice(0,24).map(d=>mapIA(d,module,q+' · sorted fewest downloads, undescribed first'))}}
// raw pile: zero-download texts in a random window, any topic, bucket-labelled
function theoPile(module){return async o=>{const [a,b]=winDate();const q=`mediatype:texts AND downloads:[0 TO 1] AND addeddate:[${a} TO ${b}]`;
  const docs=await iaDeep(q,20);const tagged=docs.map(d=>[bucket(d),d]);
  const mine=tagged.filter(x=>x[0]===module),other=tagged.filter(x=>x[0]&&x[0]!==module);
  if(mine.length)return mine.slice(0,24).map(x=>mapIA(x[1],module,q));
  // Pass 5: random window had nothing on-theme -> low-download texts whose title hits the theme's own keywords
  const kws=themeWords(module);if(!kws.length)return [];
  const q2=`mediatype:texts AND downloads:[0 TO 20] AND title:(${kws.map(w=>w+'*').join(' OR ')})`;
  const d2=await iaDeep(q2,1);const r2=d2.filter(d=>T[module].re.test(d.title||'')).slice(0,24).map(d=>mapIA(d,module,q2));
  if(!r2.length)throw new Error('Zero-download pile: nothing on this theme in this random window or in the low-download keyword search. DIG again — it re-rolls the window.');return r2}}
function themeWords(m){return T[m]?String(T[m].re.source).split('|').map(w=>w.replace(/\\b/g,'').replace(/[^a-z]/gi,'')).filter(w=>w.length>=4).slice(0,10):[]} // on-theme only (Pass 3): empty → retry picks a new random window

// raw uncurated: random page of public gists (text), bucket-labelled
const GP={};function theoGist(module){return async o=>{let r=await gistList(1+Math.floor(Math.random()*30),100);
  // Pass 5: also scan the Action-harvested gist pile so on-theme gists are not lost to one random page
  GP.h??=await fetch('finds/gists.json?'+Math.floor(Date.now()/6e5)).then(x=>x.json()).catch(()=>[]);const seen=new Set(r.map(g=>g.id));r=r.concat((GP.h||[]).filter(g=>!seen.has(g.id)));
  const rows=r.map(g=>{const f=Object.values(g.files||{});const d={title:(g.description||f.map(x=>x.filename).join(', ')||g.id),subject:f.map(x=>x.filename+' '+(x.language||'')).join(' ')};return [bucket(d),d,g,f]});
  const pref=rows.filter(x=>x[0]===module&&T[module]&&T[module].re.test(x[1].title+' '+x[1].subject)),rest=rows.filter(x=>x[0]&&x[0]!==module);
  if(!pref.length)throw new Error(`No on-theme gists in this sample (${rows.length} public gists scanned, live page + Action pile; gists are rarely about ${T[module]?T[module].name.toLowerCase():module}). Press DIG again or use the other tabs.`);
  return pref.slice(0,24).map(([b,d,g,f])=>({module,source:'GitHub public gists',title:String(d.title).slice(0,140),date:String(g.created_at||'').slice(0,10),dateLabel:'posted',count:g.comments,countLabel:'comments',
    thumb:'',kind:'link',src:'',url:g.html_url,preview:'files: '+f.map(x=>`${x.filename} (${x.type}, ${x.size}B)`).join(', '),query:'api.github.com/gists/public random page',extra:`bucket: ${b?T[b].name:'unsorted'} · uploader: ${g.owner?g.owner.login:'anonymous'}`}))}}

// gray-space text pre-mined by Action: gopherspace (Veronica-2), Common Crawl text/plain, open-dir .txt
const GRAY={};function theoGray(module){return async o=>{GRAY.d??=await fetch('finds/deep_text.json?'+Date.now()).then(r=>r.json()).catch(()=>[]);
  let L=GRAY.d.filter(x=>!o.kw||JSON.stringify(x).toLowerCase().includes(o.kw.toLowerCase()));
  const mine=L.filter(x=>x.bucket===module),rest=L.filter(x=>x.bucket&&x.bucket!==module);
  // Pass 4: also mine the open-directory filename index for on-theme documents (grayspace, not archive.org)
  GRAY.od??=await fetch('finds/odbig.json?'+Math.floor(Date.now()/6e5)).then(r=>r.json()).catch(()=>[]);
  const re=o.kw?new RegExp(o.kw.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'i'):(T[module]&&T[module].re);
  const nm=u=>{try{return decodeURIComponent(u.split('/').slice(-2).join(' / '))}catch(e){return u.split('/').slice(-2).join(' / ')}};
  const od=re?GRAY.od.filter(r=>/\.(txt|pdf|html?|doc|rtf|epub|djvu)$/i.test(r[0])&&!ODNOISE.test(r[0])&&re.test(nm(r[0]).replace(/[_+.\-]+/g,' '))).map(([u,size,date])=>({module,source:'Open Directory (index)',title:nm(u),date:(date||'').slice(0,10),dateLabel:'listed',count:null,countLabel:'',
    thumb:'',kind:'link',src:'',url:u,preview:`${size||'?'} · in ${u.replace(/[^/]*$/,'')}`,query:'open-dir filename index · theme regex',extra:'bucket: '+(T[module]?T[module].name:module)+' · host: '+u.split('/')[2]})):[];
  const out=[...sh(o.kw?[...mine,...rest]:mine).slice(0,20).map(x=>({...x,module})),...sh(od).slice(0,16)].slice(0,30);
  if(!out.length)throw new Error(`No grayspace text on this theme yet (checked ${GRAY.d.length} gopher/Common Crawl/open-dir texts and ${GRAY.od.length} open-directory filenames). The 3-hourly Action keeps adding; the other tabs have results.`);
  return out}}
const ODNOISE=/aspell|ispell|hunspell|myspell|dictionar|wordlist|words?\.txt|\/games?\/|\/roms?\/|\/mods?\/|fonts?\/|drivers?\/|patch|\/src\/|source|license|readme|changelog|install|manual|\/doc\/|00index|index\.html?$|\/man\d?\//i;

// --- Open Library: subject queries
function theoOL(T,module){return async o=>{
  const s=o.kw||pk(T.ol);const q=o.kw?o.kw:`subject:"${s}"`;
  const r=await JJ('https://openlibrary.org/search.json?'+new URLSearchParams({q,limit:40,fields:'key,title,author_name,first_publish_year,cover_i,edition_count,ia,ebook_access,subject'}));
  const re=o.kw?/./:T.re;
  return sh(r.docs.filter(d=>re.test(d.title+' '+flat(d.subject).slice(0,2000)))).slice(0,24).map(d=>({module,source:'Open Library',title:d.title,date:d.first_publish_year?String(d.first_publish_year):'',dateLabel:'first published',
    count:d.edition_count,countLabel:'editions',thumb:d.cover_i?`https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg`:(d.ia?`https://archive.org/services/img/${d.ia[0]}`:''),
    kind:(d.ebook_access==='public'&&d.ia)?'iframe':'link',src:d.ia?`https://archive.org/embed/${d.ia[0]}`:'',url:'https://openlibrary.org'+d.key,
    preview:'subjects: '+flat(d.subject).slice(0,300),query:`openlibrary ${q}`,extra:(d.author_name||[]).slice(0,2).join(', ')+(d.ebook_access?` · ebook: ${d.ebook_access}`:'')}))}}

// --- Gutenberg via Gutendex topic (subjects+bookshelves)
function theoGut(T,module){return async o=>{
  const t=o.kw||pk(T.gut);const u=new URLSearchParams(o.kw?{search:t}:{topic:t});
  const r=await (window.PRE?PRE('https://gutendex.com/books/?'+u,'pre_gutendex_theo.json','results',o.kw?{kw:o.kw}:{kw:t}):JJ('https://gutendex.com/books/?'+u));const re=o.kw?/./:T.re;
  return r.results.filter(b=>re.test(b.title+' '+flat(b.subjects)+' '+flat(b.bookshelves))).map(b=>({module,source:'Project Gutenberg',title:b.title,date:'',dateLabel:'',count:b.download_count,countLabel:'downloads (30d)',
    thumb:b.formats['image/jpeg']||'',kind:'link',src:'',url:`https://www.gutenberg.org/ebooks/${b.id}`,preview:'subjects: '+flat(b.subjects).slice(0,300),
    query:'gutendex '+u,extra:b.authors.map(a=>a.name).join('; ')}))}}

// --- Sacred-texts.com mirror on IA (collection sacredtexts / uploader)
const SACRED='(collection:(sacred-texts OR sacredtexts OR internetsacredtextarchive) OR creator:("Internet Sacred Text Archive") OR source:(sacred-texts))';

const T={
 manuscript:{name:'MANUSCRIPT DIVER',icon:'📜',blurb:'Medieval & religious manuscript scans — codices, psalters, books of hours.',
  ia:[['manuscript','manuscripts','codex'],['"book of hours"','psalter','breviary'],['"illuminated manuscripts"','"manuscripts, latin"','"manuscripts, medieval"'],['"manuscripts, arabic"','"manuscripts, hebrew"','"manuscripts, syriac"','"manuscripts, ethiopic"']],
  re:/manuscript|codex|codices|psalter|book of hours|breviary|missal|antiphon|horae|folio/i,ol:['Illumination of books and manuscripts','Manuscripts, Medieval','Books of hours','Manuscripts, Latin (Medieval and modern)'],gut:[]},
 scrolls:{name:'SCROLLS & NAG HAMMADI',icon:'🧻',blurb:'Dead Sea Scrolls, Qumran & Nag Hammadi codices.',
  ia:[['"dead sea scrolls"','qumran'],['"nag hammadi"','"gospel of thomas"','"gospel of philip"','"apocryphon of john"'],['"gospel of mary"','"pistis sophia"','"gospel of truth"']],
  re:/dead sea|qumran|nag hammadi|gospel of (thomas|philip|mary|truth)|apocryphon|pistis sophia|essene/i,ol:['Dead Sea scrolls','Nag Hammadi codices','Qumran community','Essenes'],gut:['Gnosticism','Dead Sea']},
 apocrypha:{name:'APOCRYPHA',icon:'📕',blurb:'Enoch, Jubilees, lost gospels, banned books.',
  ia:[['"book of enoch"','enoch','jubilees'],['apocrypha','pseudepigrapha'],['"lost books of the bible"','"apocryphal gospels"','"apocryphal new testament"'],['"testaments of the twelve patriarchs"','"ascension of isaiah"','"apocalypse of"']],
  re:/\benoch\b|jubilees|apocryph|pseudepigrap|lost books of the bible|testaments of the twelve|apocalypse of (peter|paul|abraham|baruch|adam|elijah)|ascension of isaiah|gospel of (thomas|judas|peter|nicodemus|mary|philip)/i,ol:['Apocryphal books','Apocrypha','Apocryphal Gospels','Pseudepigrapha','Ethiopic book of Enoch'],gut:['Apocrypha','Apocryphal books']},
 geniza:{name:'CAIRO GENIZA',icon:'🧩',blurb:'Geniza fragments & Hebrew/Judeo-Arabic manuscript studies.',
  ia:[['geniza','genizah','"cairo genizah"'],['"Taylor-Schechter"','"hebrew fragments"','"fragments from the cairo"'],['"jewish manuscripts"','"hebrew manuscripts"','"judeo-arabic"']],
  re:/geniza|genizah|taylor.?schechter|hebrew (fragment|manuscript)|judeo.?arabic|jewish manuscript/i,ol:['Cairo Genizah','Manuscripts, Hebrew','Genizah'],gut:[]},
 grimoire:{name:'GRIMOIRE VAULT',icon:'⛧',blurb:'Grimoires & occult works — Solomon, Picatrix, Lemegeton, Agrippa, Raziel, Grand Grimoire.',
  ia:[['"key of solomon"','"clavicula salomonis"','lemegeton','"lesser key of solomon"','goetia'],['picatrix','"ghayat al-hakim"','"sepher raziel"','"sefer raziel"'],['agrippa','"occult philosophy"','"three books of occult philosophy"','"fourth book of occult philosophy"'],['"grand grimoire"','"grimorium verum"','"red dragon"','"black pullet"','"book of abramelin"','abramelin'],['grimoire','grimoires','"ceremonial magic"','"sworn book of honorius"','"heptameron"','"arbatel"'],['"magic, medieval"','occultism','"magic"','"demonology"']],
  re:/solomon|clavicul|lemegeton|goetia|picatrix|raziel|agrippa|occult|grimoire|grimorium|abramelin|honorius|heptameron|arbatel|magick|demonolog|\\bmagic(al)?\\b(?! (world|baton|fire|flute|lantern|kingdom|school|tree|carpet|mountain))|sorcery|necroman|kabbal|cabal|alchem|enochian|dee\b|black pullet|red dragon|ars notoria/i,
  ol:['Magic','Occultism','Grimoires','Demonology','Ceremonial magic','Magic, Medieval'],gut:['Occultism','Magic','Demonology']},
 marginalia:{name:'MARGINALIA',icon:'✍',blurb:'Annotated & hand-noted religious books.',
  ia:[['marginalia','"manuscript annotations"','annotated'],['"marginal notes"','"manuscript notes"','"annotations"']],
  re:/marginal|annotat|manuscript note|handwrit|commonplace/i,ol:['Marginalia','Manuscript annotations','Commonplace books'],gut:[]},
 deadlang:{name:'DEAD LANGUAGES',icon:'𓁟',blurb:'Coptic, Ge\'ez, Syriac, Avestan, Pali, Akkadian scripture.',
  ia:[['coptic','"coptic language"','"coptic manuscripts"'],['syriac','"syriac literature"','peshitta'],['ethiopic','geez','"ethiopic literature"'],['pali','"pali text"','tipitaka','"pali canon"'],['avestan','avesta','"zend avesta"'],['"old church slavonic"','"church slavic"','gothic bible','"ulfilas"']],
  re:/septuagint|koine|coptic|syriac|peshitta|ethiopic|ge.?ez|pali|tipitaka|avest|zend|slavonic|church slavic|ulfila|akkad|sumerian|aramaic|sahidic|bohairic/i,ol:['Coptic language','Syriac literature','Ethiopic literature','Pali literature','Avesta','Church Slavic language'],gut:['Coptic','Pali','Avesta']},
 heresies:{name:'VANISHED SECTS',icon:'⚡',blurb:'Cathars, Manichaeans, Bogomils, Gnostics & other heresies.',
  ia:[['cathars','cathar','albigenses','albigensian'],['manichaeism','manichaean','manichean','mani'],['bogomils','bogomil','paulicians','messalians'],['gnosticism','gnostic','gnostics','valentinian','marcion'],['"history of heresies"','"christian heresies"','heretics','lollards','hussites','waldenses','anabaptists']],
  re:/cathar|albigen|manich|bogomil|paulician|messalian|gnostic|valentinian|marcion|heres(y|ies)\b|heretic|montanis|\barian(ism|s)?\b|donatis|nestorian|lollard|hussite|waldens|anabapt/i,ol:['Cathari','Albigenses','Manichaeism','Bogomils','Gnosticism','Heresies, Christian'],gut:['Heresies','Gnosticism']},
 tablets:{name:'CLAY TABLETS',icon:'🧱',blurb:'Cuneiform prayers, hymns & incantations.',
  ia:[['cuneiform','"cuneiform inscriptions"','"cuneiform texts"'],['"babylonian magic"','"assyrian incantations"','"babylonian hymns"','"sumerian hymns"'],['akkadian','sumerian','"babylonian religion"','"assyro-babylonian"'],['"clay tablets"','"seven tablets of creation"','gilgamesh','"enuma elish"']],
  re:/cuneiform|tablet|akkad|sumer|babylon|assyri|gilgamesh|enuma|chaldea|mesopotam|incantation/i,ol:['Cuneiform inscriptions','Assyro-Babylonian religion','Sumerian literature','Akkadian literature','Incantations, Assyro-Babylonian'],gut:['Babylonia','Assyria']},
 compare:{name:'COMPARATIVE REVELATION',icon:'🔀',blurb:'Same idea across traditions — flood, creation, afterlife, saviour.',
  ia:[['"flood myths"','"deluge"','"flood legends"'],['"creation myths"','cosmogony','"creation stories"'],['"comparative religion"','"religions, comparative"','"history of religions"'],['"dying god"','"golden bough"','"saviour gods"','"sixteen crucified saviors"']],
  re:/flood|deluge|creation|cosmogon|comparative|religions|dying god|golden bough|savio|myth/i,ol:['Religions','Comparative religion','Deluge','Creation','Cosmogony'],gut:['Religion','Mythology']},
 lostciv:{name:'LOST CIVILIZATIONS',icon:'🏛',blurb:'Beliefs of Hittite, Etruscan, Minoan, Indus & kin.',
  ia:[['hittite','hittites','"hittite religion"'],['etruscan','etruscans','"etruscan religion"'],['minoan','"minoan religion"','crete','knossos'],['"indus valley"','harappan','"mohenjo-daro"','"indus civilization"'],['phoenician','carthaginian','canaanite','ugarit','ugaritic'],['scythian','thracian','dacian','"celtic religion"','druids']],
  re:/hittit|etrusc|minoan|crete|cretan|knossos|\bindus\b|harappa|mohenjo|phoenic|carthag|canaan|ugarit|scyth|thrac|dacia|druid|celtic|olmec|maya|aztec|inca/i,ol:['Hittites','Etruscans','Minoans','Indus civilization','Phoenicians','Druids and druidism'],gut:['Druids','Etruscan']},
 oral:{name:'ORAL TRADITIONS',icon:'🗣',blurb:'Tribal myths & folk tales recorded from oral tradition.',
  ia:[['"oral tradition"','"oral traditions"'],['"folk tales"','"folk-tales"','folklore','"folk-lore"'],['"indian legends"','"myths and legends"','"tribal myths"'],['"bureau of american ethnology"','ethnology','"mythology of the"']],
  re:/\boral (tradition|history|lore)|folklor|folk ?tale|legend(s|ary)?\b|\bmyth|\btales?\b|ethnolog|\blore\b|\bsagas?\b/i,ol:['Oral tradition','Folklore','Tales','Indians of North America Folklore','Mythology, African'],gut:['Folklore','Mythology','Legends']},
 deadgods:{name:'DEAD GODS INDEX',icon:'🗿',blurb:'Forgotten deities & collapsed pantheons.',
  ia:[['"gods of the"','pantheon','deities'],['"slavic mythology"','"baltic mythology"','"prussian gods"','"finnish mythology"'],['"egyptian gods"','"gods of the egyptians"','"egyptian religion"'],['"celtic gods"','"teutonic mythology"','"norse gods"','"germanic mythology"'],['"semitic religion"','baal','astarte','moloch','"dagon"']],
  re:/\bgods\b|goddess|deit(y|ies)|pantheon|mytholog|\bbaal|astart|moloch|\bdagon\b|idolat|religion of/i,ol:['Gods','Goddesses','Mythology','Gods, Egyptian','Mythology, Slavic','Mythology, Norse'],gut:['Mythology','Gods']},
 endangered:{name:'ENDANGERED BELIEFS',icon:'🕊',blurb:'Mandaean, Yazidi, Zoroastrian, Samaritan & kin.',
  ia:[['mandaean','mandaeans','mandaeism','sabians','"ginza rba"'],['yazidi','yezidi','yezidis','"devil worshippers"'],['zoroastrian','zoroastrianism','parsi','parsees','avesta'],['samaritan','samaritans','"samaritan pentateuch"'],['druze','alawite','shabak','"ahl-e haqq"','yarsan']],
  re:/mandae|sabian|ginza|yazid|yezid|devil.?worship|zoroast|parsi|parsee|avest|samarit|druze|alawi|yarsan|ahl.?e.?haqq/i,ol:['Mandaeans','Yezidis','Zoroastrianism','Samaritans','Parsees','Druzes'],gut:['Zoroastrianism','Parsees']},
 burial:{name:'BURIAL & AFTERLIFE',icon:'⚰',blurb:'Funerary customs, tombs & afterlife maps across cultures.',
  ia:[['"book of the dead"','"egyptian book of the dead"','"tibetan book of the dead"'],['"burial customs"','"funeral rites"','"mortuary customs"','"funeral customs"'],['afterlife','"future life"','"the underworld"','hades','"land of the dead"'],['"ancestor worship"','"cult of the dead"','"barrows"','"burial mounds"']],
  re:/book of the dead|burial|funer|mortuar|afterlife|future life|underworld|\bhades\b|\btombs?\b|\bbarrows?\b|ancestor (worship|cult)|cult of the dead|sepulch/i,ol:['Burial','Funeral rites and ceremonies','Future life','Ancestor worship','Book of the dead'],gut:['Funeral rites','Future life']},
 folkmagic:{name:'FOLK MAGIC',icon:'🌿',blurb:'Village religion, charms, cunning-folk, hex & folk magic.',
  ia:[['"folk magic"','charms','"charms and spells"','"cunning folk"'],['witchcraft','witches','"witch trials"'],['superstition','superstitions','"popular superstitions"'],['hoodoo','powwow','"pow-wows"','hexerei','"brauche"','conjure'],['"folk medicine"','"magic and medicine"','amulets','talismans']],
  re:/folk|charm|spell|cunning|witch|superstit|hoodoo|pow.?wow|\bhex(es|ing)?\b|conjur|amulet|talisman|magic|fairy|fairies/i,ol:['Witchcraft','Charms','Superstition','Folk medicine','Amulets','Magic'],gut:['Witchcraft','Superstition','Charms']},
 mystery:{name:'MYSTERY CULTS',icon:'🔮',blurb:'Eleusis, Mithras, Orphism, Dionysus, Isis, Cybele — mystery religions.',
  ia:[['eleusis','eleusinian','"eleusinian mysteries"'],['mithras','mithraism','mithraic','"mysteries of mithra"'],['orphism','orphic','"orphic hymns"','"orphic mysteries"'],['dionysian','"dionysian mysteries"','"cult of dionysus"','bacchae','"bacchic mysteries"'],['"mystery religions"','"mystery cults"','"isis and osiris"','"cult of isis"','cybele','attis','"magna mater"','samothrace']],
  re:/eleusi|mithra|\borph(ic|ism|ica)\b|dionysia|cult of dionysus|bacchae|bacchic myster|mystery relig|mystery cult|isis and osiris|cult of isis|cybele|attis|magna mater|samothrac|demeter|persephone|sabazi/i,ol:['Mysteries, Religious','Mithraism','Eleusinian mysteries','Orphism','Dionysia'],gut:['Mysteries, Religious','Mithraism','Orphism']},
 astrorel:{name:'ASTRONOMICAL RELIGIONS',icon:'✦',blurb:'Sky cults, sun & star worship, archaeoastronomy.',
  ia:[['"sun worship"','"solar worship"','"sun-worship"','"worship of the sun"'],['"star worship"','"astral religion"','"astral mythology"','"star-lore"'],['archaeoastronomy','"stonehenge"','"astronomy of the ancients"','"ancient astronomy"'],['"star names"','"myths of the stars"','"sky gods"','"zodiac"']],
  re:/\bsun (god|worship|cult)|solar (myth|cult|deit)|\bstar (lore|myth|worship)|astral|archaeoastronom|stonehenge|zodiac|sky.?god|moon (god|goddess|worship|myth)|lunar (myth|cult)|celestial/i,ol:['Sun worship','Stars Folklore','Astronomy, Ancient','Archaeoastronomy','Astrology'],gut:['Astrology','Sun worship']},
 prophets:{name:'FORGOTTEN PROPHETS',icon:'🔔',blurb:'Lesser messiahs, prophets & sect founders.',
  ia:[['"false messiahs"','"sabbatai zevi"','"shabbethai zebi"','"jacob frank"'],['mahdi','mahdism','"the mahdi"'],['"ghost dance"','wovoka','"prophet dance"','handsome lake','tenskwatawa'],['"messianic movements"','millenarian','millennialism','"cargo cult"'],['"joanna southcott"','"anne lee"','"jemima wilkinson"','"john of leiden"','"hong xiuquan"','taiping']],
  re:/messiah|messian|sabbatai|shabbeth|frankis|mahdi|ghost dance|wovoka|prophet|handsome lake|tenskwat|millenar|millenn|cargo cult|southcott|anne lee|wilkinson|leiden|taiping|hong xiu/i,ol:['Messianism','Ghost dance','Mahdism','Millennialism','False Messiahs','Cargo cults'],gut:['Ghost dance','Messiah']},
 suppressed:{name:'SUPPRESSED FAITHS',icon:'⛓',blurb:'Colonized, banned & forcibly converted traditions.',
  ia:[['"religious persecution"','inquisition','"spanish inquisition"','huguenots','"persecution of the christians"'],['"forced conversion"','conversos','moriscos','marranos','"crypto-jews"'],['"native american religion"','"potlatch ban"','"sun dance"','"peyote"','"native religions"'],['syncretism','santeria','vodou','voodoo','candomble','"vodun"'],['"old believers"','"religion in the soviet"','"suppression of"','"pagan survivals"']],
  re:/religious persecution|persecution of (the )?(christians|jews|witches|heretics|quakers|huguenots|catholics|protestants|mormons)|inquisition|forced conver|converso|morisco|marrano|crypto.?jew|native (american )?religion|indian religion|potlatch|sun dance|peyote|santer|vodou|voodoo|vodun|candombl|old believer|pagan surviv|suppression of the (monasteries|jesuits|religious)/i,ol:['Persecution','Inquisition','Marranos','Moriscos','Indians of North America Religion','Santeria','Voodooism'],gut:['Inquisition','Persecution']},
};

const out={};
for(const [k,t] of Object.entries(T)){
  const s={dead:{name:'Dead text shelves',f:deadShelf(t,k),note:'Wiretap gopher library and Penn CCAT gopher religion shelves (Wayback captures), filtered to this theme.'},ia:{name:'Deep mine',f:theoIA(t,k),note:'Random upload window, downloads ≤5, undescribed first; theme is only a loose label filter.'},pile:{name:'Zero-download pile',f:theoPile(k),note:'Random 0–1 download texts from a random month, bucket-labelled (this theme first, other theo buckets after).'},gray:{name:'Gray-space text',f:theoGray(k),note:'Pre-mined every 3h: Veronica-2 gopherspace search, Common Crawl text/plain on obscure TLDs, .txt inside open Index-of dirs. This bucket first.'}};
  if(t.ol.length)s.openlib={name:'Open Library',f:theoOL(t,k),note:'Open Library subject queries.'};
  if(t.gut.length)s.gutenberg={name:'Gutenberg',f:theoGut(t,k),note:'Gutendex topic (subjects/bookshelves) search.'};
  out[k]={half:'theo',name:t.name,icon:t.icon,blurb:t.blurb,sources:s};
}
G.THEO_MODULES=out;G.THEO_T=T;G.THEO_H={theoIA,theoGray,iaDeep,mapIA};
})(typeof window!=='undefined'?window:globalThis);
