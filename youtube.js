/* YOUTUBE · UNSEEN — keyless YouTube digger via public Piped API instances (CORS *), fallback across instances,
   optional YouTube Data API v3 key (localStorage.ytkey). Every dig generates a new query slice, walks random pages,
   and skips any video ID already in the persistent seen-set (SEEN, shared with all modules). */
(function(G){
const PIPED=['https://api.piped.private.coffee','https://pipedapi.kavin.rocks','https://pipedapi.adminforge.de','https://pipedapi.leptons.xyz','https://pipedapi.reallyaweso.me','https://api.piped.yt'];
const R=a=>a[Math.floor(Math.random()*a.length)],N=(a,b)=>a+Math.floor(Math.random()*(b-a+1)),P=(n,w)=>String(n).padStart(w,'0');
const AZ='abcdefghijklmnopqrstuvwxyz0123456789';
const THEMES=['history','theology','patent','mystery','archive','sermon','lecture','manuscript','folklore','ufo','cipher','shipwreck','monastery','apocrypha','inventor','declassified','ghost town','abandoned','oral history','old footage','home movie','genealogy','relic','codex','hymn','prophecy','expedition','lost city','museum','library'];
const CAM=()=>R([`IMG_${P(N(0,9999),4)}`,`MOV_${P(N(0,9999),4)}`,`DSC_${P(N(0,9999),4)}`,`DSCN${P(N(0,9999),4)}`,`MVI_${P(N(0,9999),4)}`,`VID_${N(2015,2026)}${P(N(1,12),2)}${P(N(1,28),2)}`,`GOPR${P(N(0,9999),4)}`,`PXL_${N(2019,2026)}${P(N(1,12),2)}${P(N(1,28),2)}`,`IMG ${P(N(0,9999),4)}`,`100_${P(N(0,9999),4)}`]);
const RND4=()=>Array.from({length:4},()=>R(AZ)).join('');
const DATE=()=>R([`${N(2006,2026)} ${R(['January','March','May','July','September','November'])}`,`${P(N(1,12),2)} ${P(N(1,28),2)} ${N(2008,2026)}`]);
function genQ(mode,kw){
 if(mode==='unseen')return kw?`${kw} ${R([CAM(),RND4(),DATE(),''])}`.trim():R([CAM,CAM,RND4,()=>CAM()+' '+R(THEMES)])();
 if(mode==='old')return kw?`${kw} ${R(['','1950s','1970s','vhs','archive','old','rare','forgotten',DATE()])}`.trim():`${R(THEMES)} ${R(['vhs','16mm','1980s','rare','forgotten','lecture','documentary'])}`;
 return kw?`${kw}${Math.random()<.5?' '+R(['rare','forgotten','obscure','history','',RND4()]):''}`.trim():`${R(THEMES)} ${R(THEMES)}`}
async function pj(path){let last;for(const h of [PIPED[0],...PIPED.slice(1).sort(()=>Math.random()-.5)]){try{const r=await fetch(h+path);if(!r.ok)throw new Error(h+' '+r.status);const j=await r.json();if(j&&j.items)return j;throw new Error('bad json')}catch(e){last=e}}throw new Error('all Piped instances failed: '+(last&&last.message))}
const ago=t=>t?new Date(t).toISOString().slice(0,10):'';
const card=(id,title,ch,views,date,dur,q,src,desc)=>({source:'YouTube',module:'youtube',title,url:'https://www.youtube.com/watch?v='+id,ytid:id,kind:'iframe',src:`https://www.youtube-nocookie.com/embed/${id}?autoplay=1`,
 thumb:`https://i.ytimg.com/vi/${id}/hqdefault.jpg`,thumb2:`https://i.ytimg.com/vi/${id}/mqdefault.jpg`,date,dateLabel:'uploaded',count:views,countLabel:'views',
 extra:`channel: ${ch||'?'}${dur?` · length ${Math.floor(dur/60)}:${P(dur%60,2)}`:''} · via ${src}`,preview:desc||'',query:q,links:[['watch on youtube.com ↗','https://www.youtube.com/watch?v='+id]]});
async function piped(mode,o){const out=[],seen=new Set();const want=12,maxV=mode==='unseen'?50:o.raw?(mode==='old'?5000:2000):Infinity;let tries=0,qs=[];
 while(out.length<want&&tries<5){tries++;const q=genQ(mode,o.kw);qs.push(q);
  let j=await pj(`/search?q=${encodeURIComponent(q)}&filter=videos`);const pages=N(0,mode==='keyword'?3:1);
  for(let p=0;p<=pages;p++){
   for(const v of j.items||[]){if(v.type!=='stream'||v.isShort)continue;const id=(v.url||'').split('v=')[1];if(!id||seen.has(id)||SEEN.has('yt:'+id))continue;
    if(v.views>maxV||v.views<0&&mode!=='unseen')continue;const y=v.uploaded>0?new Date(v.uploaded).getFullYear():null;
    if(y&&(y<o.y1||y>o.y2)&&!o.loose)continue;if(mode==='old'&&v.duration<240&&o.raw)continue;
    seen.add(id);out.push(card(id,v.title,v.uploaderName,v.views,ago(v.uploaded)||v.uploadedDate||'',v.duration,q,'Piped',v.shortDescription))}
   if(p<pages&&j.nextpage){try{j=await pj(`/nextpage/search?nextpage=${encodeURIComponent(j.nextpage)}&q=${encodeURIComponent(q)}&filter=videos`)}catch(e){break}}else break}}
 const s={unseen:(a,b)=>(a.count-b.count)||(b.date>a.date?1:-1),old:(a,b)=>a.date<b.date?-1:1,keyword:(a,b)=>a.count-b.count}[mode];
 return out.sort(s).map(x=>({...x,query:qs.join(' | ')}))}
const JUNK=/nursery|for kids|cartoon|children|ceo|webinar|revenue|marketing|website|seo|tutorial|how to|trailer|asmr|prank|reaction|fortnite|roblox|minecraft|gta|free fire|tiktok|giveaway|subscribe|crypto|bitcoin|forex|earn money|casino|betting|#shorts|podcast|unboxing|review|means nothing|rename/i;
const RAWT=/^\s*(img|mvi|dsc|dscn|dscf|mov|vid|gopr|pxl|win|cimg|pict|p\d{3}|\d{3}_)[\s_]*\d|^[\d\s_\-:.]+(pro|mov|avi|mp4)?$/i;
const score=x=>(x.score||0)/2+(x.fresh?1.5:0)+(RAWT.test(x.title)?0:3)+(/sermon|chapel|monaster|shortwave|numbers station|vhs|8mm|16mm|cemetery|ruin|abandon|ghost|church|manuscript|relic|shrine|folk|hymn|seance|ufo|light|meteor|radio|history|oral|map|pilgrim|procession|rosary|icon|catacomb|mine|lighthouse|wreck|siren|ham |grave|ritual|archive|old /i.test(x.title)?3:0)+(x.title.length>25?1:0)-x.count/50;
let POOL=null;
async function pool(o,n){if(!POOL)try{POOL=await (await fetch('finds/yt_pool.json?'+Date.now().toString().slice(0,-5))).json()}catch(e){POOL=[]}
 const k=(o.kw||'').toLowerCase();let L=POOL.filter(x=>!SEEN.has('yt:'+x.ytid)&&x.count<=50&&(!k||(x.title+' '+x.query).toLowerCase().includes(k)));
 const now=Date.now(),age=x=>Math.max(0,(now-Date.parse((x.harvested||'').replace('Z',':00Z')))/36e5)||999;
 L=L.map(x=>[x,(x.score||0)-age(x)/48+Math.random()*2.5]).sort((a,b)=>b[1]-a[1]).slice(0,n).map(a=>a[0]);
 const ago=h=>h<1?'just now':h<48?Math.round(h)+' h ago':Math.round(h/24)+' d ago';
 return L.map(x=>({...x,extra:x.extra+' · harvested '+ago(age(x)),fresh:age(x)<24}))}
async function unseen(o,rawOnly){let live=[];try{live=(await piped('unseen',o)).filter(x=>!JUNK.test(x.title+' '+x.extra))}catch(e){}const ids=new Set(live.map(x=>x.ytid));
 const p=(await pool(o,rawOnly?16:60)).filter(x=>!ids.has(x.ytid));let r=[...p,...live].filter(x=>rawOnly?RAWT.test(x.title):!RAWT.test(x.title)||Math.random()<.2);r=r.sort((a,b)=>score(b)-score(a)).slice(0,24);if(!r.length)throw new Error('no unseen uploads left that you have not already been shown — the 3-hourly harvest adds hundreds more');return r}
async function api(o){const key=localStorage.ytkey;if(!key)throw new Error('no API key — paste one in the box above (stored only in your browser)');
 const q=genQ('unseen',o.kw),order=R(['date','date','relevance']),after=new Date(Date.now()-N(1,72)*3600e3).toISOString();
 const s=await (await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=50&safeSearch=strict&order=${order}&q=${encodeURIComponent(q)}${o.kw?'':'&publishedAfter='+after}&key=${key}`)).json();
 if(s.error)throw new Error('YouTube API: '+s.error.message);const ids=s.items.map(i=>i.id.videoId).filter(id=>!SEEN.has('yt:'+id));if(!ids.length)return[];
 const d=await (await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails,snippet&id=${ids.join(',')}&key=${key}`)).json();
 return (d.items||[]).map(v=>({v,n:+(v.statistics.viewCount||0)})).filter(x=>!o.raw||x.n<=50).sort((a,b)=>a.n-b.n).map(({v,n})=>card(v.id,v.snippet.title,v.snippet.channelTitle,n,v.snippet.publishedAt.slice(0,10),0,q,'YouTube Data API',v.snippet.description))}
G.YT_MODULES={youtube:{half:'youtube',name:'YOUTUBE · UNSEEN',icon:'📼',blurb:'Scalp YouTube for uploads nobody has watched: random camera-filename/4-char/date queries, random result pages, ≤50 views, never repeats a video you have already been shown.',sources:{
 unseen:{name:'Unseen (0–50 views)',f:o=>unseen(o,false),note:'Always ≤50 views, never repeated. Live Piped dig + a pool of uploads harvested newest-first from YouTube every 3 h. Fresh, near-zero-view uploads. Blank keyword = random IMG_/MOV_/DSC_/4-char/date slice. With "raw / low-count only" = ≤50 views. Keyless via public Piped instances.'},
 rawcam:{name:'Raw camera files',f:o=>unseen(o,true),note:'Only raw IMG_/MVI_/DSC_/WIN_ camera-filename uploads, ≤50 views, never repeated.'},
 keyword:{name:'Keyword · low views',f:o=>piped('keyword',o),note:'Your keyword (+ random modifier), random page depth 1–4, sorted lowest views first (≤2000 when raw).'},
 old:{name:'Old & long',f:o=>piped('old',o),note:'Older (sorted oldest first) uploads over 4 minutes with ≤5000 views when raw — lectures, sermons, VHS rips.'},
 api:{name:'Data API (own key)',f:api,note:'Optional: uses your own YouTube Data API v3 key (localStorage only). Newest uploads from the last 1–72 h, ≤50 views when raw. Costs ~101 quota units/dig.'}}}};
})(window);
