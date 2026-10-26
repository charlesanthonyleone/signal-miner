/* Network robustness layer: every fetch gets a timeout (no module can hang forever),
   slow/rate-limited JSON APIs get a short sessionStorage cache, and rate-limit errors are readable. */
(()=>{const raw=window.fetch.bind(window);
 const SLOW=/api\.openverse\.org|gutendex\.com|api\.github\.com|loc\.gov|query\.wikidata\.org/;
 const TMO=u=>/gutendex|openverse|loc\.gov/.test(u)?20000:/web\.archive\.org\/cdx|index\.commoncrawl/.test(u)?30000:18000;
 const TTL=15*60*1000;
 window.NET={hits:0,timeouts:0};
 window.fetch=async(input,init={})=>{
  const u=typeof input==='string'?input:input.url;const get=!init.method||init.method==='GET';
  const key='nc:'+u, cacheable=get&&SLOW.test(u)&&!init.signal;
  if(cacheable){try{const c=JSON.parse(sessionStorage.getItem(key)||'null');
    if(c&&Date.now()-c.t<TTL){NET.hits++;return new Response(c.b,{status:200,headers:{'content-type':'application/json'}})}}catch(e){}}
  const ac=new AbortController();const ms=TMO(u);const tm=setTimeout(()=>ac.abort(),ms);
  if(init.signal)init.signal.addEventListener('abort',()=>ac.abort());
  let r;try{r=await raw(input,{...init,signal:ac.signal})}
  catch(e){clearTimeout(tm);if(ac.signal.aborted){NET.timeouts++;throw new Error(`timed out after ${ms/1000}s — ${new URL(u,location).host} is slow right now; try again or another source`)}
   if(/api\.github\.com/.test(u))throw new Error('GitHub API unreachable or rate-limited (60 req/h per IP) — showing cached harvest instead where available');
   throw new Error(`network error reaching ${new URL(u,location).host} (offline, blocked, or CORS)`)}
  clearTimeout(tm);
  if((r.status===403||r.status===429)&&/api\.github\.com/.test(u))throw new Error('GitHub API rate limit hit (60 req/h per IP) — try later');
  if(cacheable&&r.ok&&/json/.test(r.headers.get('content-type')||'')){try{const b=await r.clone().text();if(b.length<400000)sessionStorage.setItem(key,JSON.stringify({t:Date.now(),b}))}catch(e){}}
  return r}})();
/* Gists: live API first; on rate-limit/timeout fall back to the Action-harvested pile (finds/gists.json). */
window.gistList=async(page,per)=>{try{const r=await fetch(`https://api.github.com/gists/public?per_page=${per}&page=${page}`);
  if(!r.ok)throw new Error('GitHub API '+r.status);return await r.json()}
 catch(e){const r=await fetch('finds/gists.json?'+Math.floor(Date.now()/6e5)).catch(()=>null);
  const L=r&&r.ok?await r.json():[];if(!L.length)throw e;
  NET.gistFallback=true;return L.map(x=>[Math.random(),x]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]).slice(0,per)}};
