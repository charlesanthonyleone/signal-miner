/* Safety layer: pre-display blocklist screen + text-first media gate. */
(function(G){
let BL={domains:[],keywords:[],sha256:[],urls:[]};
const BUILTIN=/\b(porn\w*|xxx|nsfw|nudes?|naked|hentai|erotic\w*|sex ?tape|camgirl|onlyfans|fetish|bdsm|lolita|jailbait|pre-?teen|pthc|under-?age|child abuse|gore|beheading|snuff|upskirt|voyeur)\b/i;
let re=BUILTIN;
G.SAFE_READY=fetch('blocklist.json',{cache:'no-store'}).then(r=>r.json()).then(j=>{BL=j;
  const kw=(j.keywords||[]).map(k=>k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|');if(kw)re=new RegExp(BUILTIN.source+'|\\b('+kw+')\\b','i')}).catch(()=>{});
const host=u=>{try{return new URL(u).hostname.replace(/^www\./,'')}catch(e){return ''}};
G.SAFE={
 screen(x){const h=[x.url,x.src,x.thumb].map(host);
  if(h.some(d=>d&&BL.domains.some(b=>d===b||d.endsWith('.'+b))))return 'blocked domain';
  if(BL.urls.includes(x.url))return 'blocked url';
  if(x.sha256&&BL.sha256.includes(x.sha256))return 'blocked hash';
  if(re.test([x.title,x.preview,x.extra,x.url].join(' ')))return 'nsfw/abuse keyword';
  return null},
 filter(list){return list.filter(x=>!SAFE.screen(x))},
 // thumbnails auto-load only from known text/document hosts
 thumbOK(u){return /(^|\.)(archive\.org|openlibrary\.org|gutenberg\.org)$/.test(host(u))},
 isMedia(x){return ['img','video','audio','cam'].includes(x.kind)||(x.kind==='iframe'&&!/archive\.org$/.test(host(x.src)))||/image|video|audio/i.test(x.mime||'')},
 gate(html,x){const id='g'+Math.random().toString(36).slice(2,8);G['_'+id]=html;
  return `<div class="gate" id="${id}"><div class="ftype">⚠ media not loaded · type: ${x.kind}${x.mime?' / '+x.mime:''} · file: ${String(x.src||x.url).split('/').pop().slice(0,80)}</div>
  <p class="warn">Unknown media from an uncurated source. Signal Miner is text-first and never auto-plays. Load only if you accept the risk; report anything abusive (NCMEC / FBI / IC3 links below).</p>
  <button class="go" onclick="document.getElementById('${id}').outerHTML=window['_${id}']">I understand — load media</button></div>`}
};
})(window);
