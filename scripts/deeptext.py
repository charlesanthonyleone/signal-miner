"""Uncurated TEXT mining: Veronica-2 gopherspace search, Common Crawl text/plain captures (WARC snippet),
and .txt files inside open 'Index of /' directories. Every find gets a theme bucket label. Text only."""
import gzip, io, json, random, re, requests
from deep import is_bad, DEPTHS, CC
UA={"User-Agent":"SignalMiner/2.0 (github actions; hobby project)"}
GW="https://gopher.floodgap.com/gopher/gw"
BUCKETS={
 "grimoire":r"grimoire|goetia|solomon|picatrix|necronom|occult|ritual magic|magick|sigil|demon|enochian|alchem|hermetic|kabbal|qabal|thelema|crowley|tarot",
 "mystery":r"mithra|eleusi|orphic|orphism|dionys|bacch|mystery religion|mystery cult|cybele|attis|isis and osiris|samothrac",
 "apocrypha":r"apocryph|pseudepigrap|book of enoch|\benoch\b|jubilees|gospel of (thomas|judas|mary|philip|peter)|lost books",
 "heresies":r"gnostic|cathar|albigens|manich|bogomil|marcion|valentinian|arian heresy|heres(y|ies)|heretic",
 "scrolls":r"dead sea scroll|qumran|nag hammadi|essene",
 "deadgods":r"pantheon|forgotten god|\bdeit(y|ies)\b|baal|moloch|astarte|dagon|tiamat|marduk",
 "folkmagic":r"folk magic|hoodoo|charm|spell|witch|cunning|hex|conjure|amulet|talisman|superstition",
 "prophets":r"prophec|prophet|messiah|apocalyps|end times|millenni|rapture|revelation",
 "burial":r"afterlife|book of the dead|necromanc|burial|funer|underworld|reincarnat",
 "astrorel":r"astrolog|zodiac|star worship|sun worship|archaeoastronom",
 "tablets":r"cuneiform|sumer|akkad|babylon|gilgamesh|enuma elish",
 "suppressed":r"inquisition|persecut|forbidden|banned book|suppressed|censored|secret society|illuminati|freemason|rosicruc",
 "patent":r"patent|invention|perpetual motion|free energy|tesla|apparatus|device for",
 "lost":r"treasure|buried|cipher|cryptogram|shipwreck|time capsule|deathbed|confession|lost mine",
}
RX={k:re.compile(v,re.I) for k,v in BUCKETS.items()}
def bucket(t):
    hits=[(len(r.findall(t)),k) for k,r in RX.items()]; hits=[h for h in hits if h[0]]
    return max(hits)[1] if hits else None
TERMS=["grimoire","goetia","necronomicon","enochian","mithras","eleusis","orphic","gnostic","cathar","apocrypha","enoch","nag hammadi",
       "hoodoo","witchcraft","demonology","alchemy","hermetic","kabbalah","prophecy","heresy","rosicrucian","sumerian","egyptian book of the dead",
       "perpetual motion","free energy","patent","time capsule","buried treasure","cipher","beale","shipwreck","deathbed confession","lost mine"]

def _gw_text(url):
    html=requests.get(url,headers=UA,timeout=40).text
    m=re.findall(r"(?is)<pre[^>]*>(.*?)</pre>",html)
    if m: html=max(m,key=len)
    t=re.sub(r"(?is)<script.*?</script>|<style.*?</style>|<!--.*?-->","",html); t=re.sub(r"(?is)<[^>]+>","\n",t)
    t=re.sub(r"&nbsp;"," ",t); t=re.sub(r"\n\s*\n+","\n",t)
    for junk in ("Floodgap","Overbite","Gopher proxy","Simultaneous clients","Access to the proxy","<< Back","View in Gopher"):
        t="\n".join(l for l in t.splitlines() if junk not in l)
    return t.strip()

def veronica(n=14):
    out=[]
    for term in random.sample(TERMS,6):
        try: html=requests.get(GW,params={"ss":"gopher://gopher.floodgap.com:70/7/v2/vs","sq":term},headers=UA,timeout=50).text
        except Exception as e: print("veronica",term,e); continue
        links=re.findall(r'href = "/gopher/gw\?=([^"+]+)\+(\d+)\+([0-9a-f]+)">([^<]*)</a>',html)
        links=[l for l in links if "floodgap" not in l[0]]; random.shuffle(links)
        for host,port,hx,label in links[:4]:
            label=re.sub(r"(&nbsp;|\s)+"," ",label).strip()
            try: sel=bytes.fromhex(hx).decode("latin1")
            except Exception: continue
            typ=sel[:1]; path=sel[1:]; gurl=f"gopher://{host}:{port}/{typ}{path}"
            if is_bad(gurl+label) or typ not in "019": continue
            gw=f"{GW}?={host}+{port}+{hx}"; prev=""
            if typ=="0":
                try: prev=_gw_text(gw)[:1500]
                except Exception: pass
            if is_bad(prev): continue
            b=bucket(f"{label} {path} {prev}") or bucket(term)
            out.append({"source":"Gopherspace (Veronica-2)","title":f"{label.strip() or path} — {host}","date":"","dateLabel":"",
              "count":len(prev) if prev else None,"countLabel":"chars","kind":"meta","depth":random.choice(DEPTHS),
              "mime":{"0":"text/plain","1":"gopher/menu","9":"binary"}[typ],"preview":prev or f"(gopher {'menu' if typ=='1' else 'binary file — not fetched'}: {path})",
              "url":gw,"query":f"veronica-2 search '{term}'","bucket":b,"extra":f"bucket: {b or 'unsorted'} · raw: {gurl} · uploader: {host}"})
        if len(out)>=n: break
    return out

def _warc_snip(row):
    try:
        off,ln=int(row["offset"]),int(row["length"])
        r=requests.get("https://data.commoncrawl.org/"+row["filename"],headers={**UA,"Range":f"bytes={off}-{off+ln-1}"},timeout=40)
        raw=gzip.GzipFile(fileobj=io.BytesIO(r.content)).read().decode("utf-8","replace")
        body=raw.split("\r\n\r\n",2)[-1]; return body[:1500]
    except Exception as e: return ""

CTLDS=[".nu",".is",".li",".ws",".md",".kg",".by",".ge",".am",".su",".tk",".ml",".fm",".museum",".coop",".aero",".int"]
JUNKTXT=("robots.txt","ads.txt","app-ads.txt","security.txt","humans.txt","sitemap.txt","llms.txt","license.txt","readme.txt","changelog.txt")
def _hosts_from_crawl():
    try: d=json.load(open("finds/deep_crawl.json"))
    except Exception: d=[]
    h=list({x["url"].split("/")[2] for x in d if "://" in x.get("url","")})
    random.shuffle(h); return h
def _cdx_txt(host):
    """Per-host text/plain captures: Common Crawl index first, Wayback CDX fallback (TLD-wide wildcards time out / need auth)."""
    rows=[]
    try:
        r=requests.get(CC,params={"url":f"{host}/*","output":"json","limit":200,"filter":["mime:text/plain","status:200"]},headers=UA,timeout=40)
        rows=[json.loads(l) for l in r.text.splitlines() if l.startswith("{")]
        rows=[{"url":x["url"],"timestamp":x.get("timestamp",""),"length":x.get("length",0),"via":"Common Crawl"} for x in rows]
    except Exception as e: print("cc host",host,e)
    if not rows:
        try:
            r=requests.get("https://web.archive.org/cdx/search/cdx",params={"url":f"{host}/*","filter":["mimetype:text/plain","statuscode:200"],"limit":200,"output":"json","collapse":"urlkey"},headers=UA,timeout=40)
            j=r.json() if r.text.strip().startswith("[") else []
            rows=[{"url":x[2],"timestamp":x[1],"length":x[6],"via":"Wayback CDX"} for x in j[1:]]
        except Exception as e: print("wb host",host,e)
    return [x for x in rows if not x.get("url","").lower().split("?")[0].endswith(JUNKTXT) and not is_bad(x["url"])]
def cc_text(n=10, hosts=None):
    out=[]; hosts=(hosts or _hosts_from_crawl())[:14]
    for host in hosts:
        if len(out)>=n: break
        rows=_cdx_txt(host); random.shuffle(rows)
        print("cc_text",host,len(rows))
        for row in rows[:2]:
            ts=row["timestamp"]
            try: t=requests.get(f"https://web.archive.org/web/{ts}id_/{row['url']}",headers=UA,timeout=25).text[:3000]
            except Exception: continue
            if len(t.strip())<60 or is_bad(t) or "<html" in t[:300].lower(): continue
            b=bucket(row["url"]+" "+t)
            out.append({"source":row["via"]+" text/plain","title":row["url"].split("://")[-1][:110],"date":f"{ts[:4]}-{ts[4:6]}-{ts[6:8]}","dateLabel":"captured",
              "count":int(row.get("length") or 0),"countLabel":"bytes","kind":"meta","depth":random.choice(DEPTHS),"mime":"text/plain","preview":t[:1500],
              "url":f"https://web.archive.org/web/{ts}/{row['url']}","query":f"{row['via']} url={host}/* mime:text/plain (host from obscure-TLD crawl)","bucket":b,
              "extra":f"bucket: {b or 'unsorted'} · original: {row['url']} · host: {host}"})
    return out

TXT_EXT=(".txt",".nfo",".asc",".md",".text",".diz",".ascii",".doc",".1st",".me",".faq")
def _istxt(f):
    b=f.rsplit("/",1)[-1].lower()
    return b.endswith(TXT_EXT) or ("." not in b and len(b)>2)
def _links(url):
    h=requests.get(url,headers=UA,timeout=15); body=h.text[:60000]
    if "index of" not in body.lower() and "parent directory" not in body.lower(): return [],[]
    L=[f.split("?")[0] for f in re.findall(r'href=["\']([^"\'#]+)["\']',body,flags=re.I)]
    L=[f for f in L if not f.startswith(("?","/","..","http","mailto:"))]
    return [f for f in L if f.endswith("/")],[f for f in L if _istxt(f)]
OPEN_SEEDS=["http://cd.textfiles.com/","https://ftp.funet.fi/pub/culture/occult/","https://ftp.funet.fi/pub/culture/religion/","https://ftp.funet.fi/pub/culture/","https://www.ibiblio.org/pub/docs/","https://www.ibiblio.org/pub/academic/religion/","http://www.textfiles.com/"]
def _walk_any(base,exts,depth=6):
    path=base
    for _ in range(depth):
        try:
            h=requests.get(path,headers=UA,timeout=15); body=h.text[:60000]
        except Exception: return path,[]
        if "index of" not in body.lower() and "parent directory" not in body.lower(): return path,[]
        L=[f.split("?")[0] for f in re.findall(r'href=["\']([^"\'#]+)["\']',body,flags=re.I)]
        L=[f for f in L if not f.startswith(("?","/","..","http","mailto:"))]
        subs=[f for f in L if f.endswith("/")]; hits=[path+f for f in L if f.lower().endswith(exts)]
        if hits and (not subs or random.random()<0.6): return path,hits
        if not subs: return path,[]
        path=path+random.choice(subs)
    return path,[]
def _walk(base,depth=6):
    """Random descent through an open Index-of tree until text files appear."""
    path=base
    for _ in range(depth):
        try: subs,txts=_links(path)
        except Exception: return path,[]
        if txts and (not subs or random.random()<0.6): return path,[path+t for t in txts]
        if not subs: return path,[]
        path=path+random.choice(subs)
    return path,[]
def opendir_text(dirs, n=8):
    """Random-walk public open directories (urlscan-found Index-of pages + long-lived public text mirrors) and read the first 4 KB of text files."""
    out=[]; bases=[d["url"].split("?")[0] for d in dirs if "/wp-" not in d.get("url","")]
    bases=[u if u.endswith("/") else u.rsplit("/",1)[0]+"/" for u in bases]
    pool=random.sample(bases,min(4,len(bases)))+random.sample(OPEN_SEEDS*2,10)
    for base in pool:
        if len(out)>=n: break
        where,found=_walk(base); print("opendir",base,"->",where,len(found),"txt")
        random.shuffle(found)
        for u in [f for f in found if not f.lower().endswith(JUNKTXT)][:1]:
            try:
                r=requests.get(u,headers=UA,timeout=15,stream=True)
                if "html" in r.headers.get("content-type","") or "octet" in r.headers.get("content-type","") and "." in u.rsplit("/",1)[-1]: continue
                t=r.raw.read(4000,decode_content=True).decode("utf-8","replace")
                if t.count("\ufffd")>20 or sum(c<" " and c not in "\r\n\t" for c in t)>40: continue
            except Exception: continue
            if is_bad(u+t) or len(t.strip())<40 or "<html" in t[:300].lower(): continue
            b=bucket(u+" "+t)
            out.append({"source":"Open Directory .txt","title":u.split("://")[-1][:110],"date":"","dateLabel":"seen","count":len(t),"countLabel":"chars read","kind":"meta",
              "depth":random.choice(DEPTHS),"mime":"text/plain","preview":t[:1500],"url":u,"query":f"random descent from {base}","bucket":b,"extra":f"bucket: {b or 'unsorted'} · dir: {where}"})
    return out

def deep_text(opendirs=()):
    out=[]
    for fn in (veronica, cc_text, lambda: opendir_text(list(opendirs))):
        try: out+=fn()
        except Exception as e: print("deep_text",e)
    return out

if __name__=="__main__":
    r=veronica(6); print(json.dumps([(x["title"],x["extra"][:60],x["preview"][:80]) for x in r],indent=1))
