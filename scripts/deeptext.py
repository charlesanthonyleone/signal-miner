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
def cc_text(n=10):
    out=[]
    for _ in range(6):
        if len(out)>=n: break
        tld=random.choice(CTLDS)
        try:
            r=requests.get(CC,params={"url":f"*{tld}/*","output":"json","limit":60,"page":random.randint(0,4),"filter":["mime:text/plain","status:200"]},headers=UA,timeout=80)
            rows=[json.loads(l) for l in r.text.splitlines() if l.startswith("{")]
        except Exception as e: print("cc",tld,e); continue
        rows=[x for x in rows if not is_bad(x.get("url","")) and not x["url"].endswith(("robots.txt","ads.txt","security.txt","humans.txt","sitemap.txt"))]
        random.shuffle(rows)
        for row in rows[:5]:
            sn=_warc_snip(row)
            if len(sn.strip())<60 or is_bad(sn): continue
            b=bucket(row["url"]+" "+sn); ts=row.get("timestamp","")
            out.append({"source":"Common Crawl text/plain","title":row["url"].split("://")[-1][:110],"date":f"{ts[:4]}-{ts[4:6]}-{ts[6:8]}","dateLabel":"captured",
              "count":int(row.get("length",0)),"countLabel":"bytes (warc)","kind":"meta","depth":random.choice(DEPTHS),"mime":"text/plain","preview":sn,
              "url":f"https://web.archive.org/web/{ts}/{row['url']}","query":f"{CC.split('/')[-1]} url=*{tld}/* mime:text/plain","bucket":b,
              "extra":f"bucket: {b or 'unsorted'} · original: {row['url']} · host: {row['url'].split('/')[2]}"})
    return out

def opendir_text(dirs, n=8):
    out=[]
    for d in random.sample(dirs,min(8,len(dirs))):
        names=[l.split("  [")[0] for l in d.get("preview","").splitlines()[1:] if l.endswith("[txt]") or l.endswith("[md]") or l.endswith("[nfo]")]
        for nm in names[:2]:
            u=d["url"].rstrip("/")+"/"+nm
            try:
                r=requests.get(u,headers=UA,timeout=15,stream=True); t=r.raw.read(4000,decode_content=True).decode("utf-8","replace")
            except Exception: continue
            if is_bad(u+t) or len(t.strip())<40: continue
            b=bucket(nm+" "+t)
            out.append({"source":"Open Directory .txt","title":nm,"date":d.get("date",""),"dateLabel":"seen","count":len(t),"countLabel":"chars read","kind":"meta",
              "depth":random.choice(DEPTHS),"mime":"text/plain","preview":t[:1500],"url":u,"query":"Index of / → text file","bucket":b,"extra":f"bucket: {b or 'unsorted'} · dir: {d['url']}"})
        if len(out)>=n: break
    return out

def deep_text(opendirs=()):
    out=[]
    for fn in (veronica, cc_text, lambda: opendir_text(list(opendirs))):
        try: out+=fn()
        except Exception as e: print("deep_text",e)
    return out

if __name__=="__main__":
    r=veronica(6); print(json.dumps([(x["title"],x["extra"][:60],x["preview"][:80]) for x in r],indent=1))
