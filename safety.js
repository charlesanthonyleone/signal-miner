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
 thumbOK(u,x){if(x&&x.gated)return false;return /(^|\.)(archive\.org|openlibrary\.org|gutenberg\.org|i\.ytimg\.com)$/.test(host(u))},
 isMedia(x){return !!x.gated||['img','video','audio','cam'].includes(x.kind)||(x.kind==='iframe'&&!/(archive\.org|youtube-nocookie\.com)$/.test(host(x.src)))||/image|video|audio/i.test(x.mime||'')},
 gate(html,x){const id='g'+Math.random().toString(36).slice(2,8);G['_'+id]=html;
  return `<div class="gate" id="${id}"><div class="ftype">⚠ media not loaded · type: ${x.kind}${x.mime?' / '+x.mime:''} · file: ${String(x.src||x.url).split('/').pop().slice(0,80)}${x.skin!=null&&x.skin!==undefined?` · server pixel pre-screen: skin-tone ${Math.round(x.skin*100)}% (pass)`:(x.kind==='img'?' · server pixel pre-screen: not run':'')}</div>
  <p class="warn">Unknown media from an uncurated source. Signal Miner is text-first and never auto-plays. Load only if you accept the risk; report anything abusive (NCMEC / FBI / IC3 links below).</p>
  <button class="go" onclick="SAFE.open('${id}')">I understand — load media</button></div>`},
 // Loaded images/video start BLURRED; a pixel skin-tone heuristic keeps likely-nude images blurred behind a 2nd confirm.
 open(id){const el=document.getElementById(id);if(!el)return;const w=document.createElement('div');w.className='blurwrap blurred';w.innerHTML=G['_'+id]+
  '<div class="blurnote">blurred by default · <b>click to reveal</b><span class="skin"></span></div>';el.replaceWith(w);
  w.onclick=e=>{if(!w.classList.contains('blurred'))return;if(w.dataset.skin==='hi'&&!confirm('Skin-tone heuristic flagged this image as possibly explicit. Reveal anyway? (Report it if abusive.)'))return;w.classList.remove('blurred')};
  w.querySelectorAll('img').forEach(im=>{const chk=()=>{const r=SAFE.skin(im);const n=w.querySelector('.skin');
   if(r==null){n.textContent=' · pixel check unavailable (cross-origin)';return}
   n.textContent=` · skin-tone ${Math.round(r*100)}%`;if(r>0.38){w.dataset.skin='hi';n.textContent+=' ⚠ flagged';}};
   if(im.complete&&im.naturalWidth)chk();else im.addEventListener('load',chk,{once:true})})},
 // fraction of sampled pixels in a conservative YCbCr skin range; null if canvas is tainted
 skin(im){try{const c=document.createElement('canvas'),W=c.width=64,H=c.height=64,x=c.getContext('2d');
  let src=im;if(!im.crossOrigin){src=new Image();src.crossOrigin='anonymous';src.src=im.src;if(!src.complete)return null}
  x.drawImage(src,0,0,W,H);const d=x.getImageData(0,0,W,H).data;let k=0;
  for(let i=0;i<d.length;i+=4){const r=d[i],g=d[i+1],b=d[i+2],y=.299*r+.587*g+.114*b,cb=128-.168736*r-.331264*g+.5*b,cr=128+.5*r-.418688*g-.081312*b;
   if(y>60&&cb>=77&&cb<=127&&cr>=133&&cr<=173)k++}return k/(W*H)}catch(e){return null}}
};
})(window);
