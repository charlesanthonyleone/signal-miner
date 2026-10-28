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
async function piped(mode,o){const out=[],seen=new Set();const want=12,maxV=o.raw?(mode==='unseen'?50:mode==='old'?5000:2000):Infinity;let tries=0,qs=[];
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
async function api(o){const key=localStorage.ytkey;if(!key)throw new Error('no API key — paste one in the box above (stored only in your browser)');
 const q=genQ('unseen',o.kw),order=R(['date','date','relevance']),after=new Date(Date.now()-N(1,72)*3600e3).toISOString();
 const s=await (await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=50&safeSearch=strict&order=${order}&q=${encodeURIComponent(q)}${o.kw?'':'&publishedAfter='+after}&key=${key}`)).json();
 if(s.error)throw new Error('YouTube API: '+s.error.message);const ids=s.items.map(i=>i.id.videoId).filter(id=>!SEEN.has('yt:'+id));if(!ids.length)return[];
 const d=await (await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails,snippet&id=${ids.join(',')}&key=${key}`)).json();
 return (d.items||[]).map(v=>({v,n:+(v.statistics.viewCount||0)})).filter(x=>!o.raw||x.n<=50).sort((a,b)=>a.n-b.n).map(({v,n})=>card(v.id,v.snippet.title,v.snippet.channelTitle,n,v.snippet.publishedAt.slice(0,10),0,q,'YouTube Data API',v.snippet.description))}
G.YT_MODULES={youtube:{half:'youtube',name:'YOUTUBE · UNSEEN',icon:'📼',blurb:'Scalp YouTube for uploads nobody has watched: random camera-filename/4-char/date queries, random result pages, ≤50 views, never repeats a video you have already been shown.',sources:{
 unseen:{name:'Unseen (0–50 views)',f:o=>piped('unseen',o),note:'Fresh, near-zero-view uploads. Blank keyword = random IMG_/MOV_/DSC_/4-char/date slice. With "raw / low-count only" = ≤50 views. Keyless via public Piped instances.'},
 keyword:{name:'Keyword · low views',f:o=>piped('keyword',o),note:'Your keyword (+ random modifier), random page depth 1–4, sorted lowest views first (≤2000 when raw).'},
 old:{name:'Old & long',f:o=>piped('old',o),note:'Older (sorted oldest first) uploads over 4 minutes with ≤5000 views when raw — lectures, sermons, VHS rips.'},
 api:{name:'Data API (own key)',f:api,note:'Optional: uses your own YouTube Data API v3 key (localStorage only). Newest uploads from the last 1–72 h, ≤50 views when raw. Costs ~101 quota units/dig.'}}}};
})(window);
