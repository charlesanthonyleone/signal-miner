"""Grayspace open-directory index + grayspace media (no archive.org items; Wayback CDX only for dead-host captures)."""
import re, random, json, time, urllib.parse, requests
DEAD=[0]
def budget(sec): DEAD[0]=time.time()+sec
def late(): return DEAD[0] and time.time()>DEAD[0]
UA={"User-Agent":"Mozilla/5.0 (X11; Linux x86_64) SignalMiner/1.0 (+github.com/charlesanthonyleone/signal-miner)"}
VIDX=(".avi",".mpg",".mpeg",".mov",".wmv",".asf",".rm",".ram",".mp4",".m4v",".webm",".flv",".3gp",".ogv",".mkv",".vob",".divx")
IMGX=(".jpg",".jpeg",".gif",".png",".bmp",".tif",".tiff",".webp",".pcx")
TXTX=(".txt",".nfo",".asc",".text",".diz",".ascii",".doc",".pdf",".rtf",".htm",".html",".md",".faq",".1st")
AUDX=(".mp3",".wav",".ogg",".mid",".midi",".ra",".au",".flac",".m4a")
BAD=re.compile(r"porn|xxx|nsfw|nude|naked|sex|fuck|teen|loli|shota|jailbait|pthc|hentai|erotic|fetish|cam ?girl|onlyfans|escort|incest|rape|cp\b|preteen|underage|child",re.I)
SPAM=re.compile(r"\.(cfd|sbs|top|shop|online|xyz|click|buzz|icu|monster|rest|lol)(/|$)|bet|slot|casino|togel|gacor|4d|judi|toto|poker|loan|viagra|crypto|airdrop|domains",re.I)
SKIPHOST=re.compile(r"archive\.org|google|bing\.com|duckduckgo|facebook|reddit|youtube|github\.com|wikipedia|amazon",re.I)
KEYWORDS=["occult","ufo","vhs","theology","bible","gnostic","alchemy","patent","manual","radio","scan","sermon","monastery","conspiracy","cult","hermetic","tarot","newsletter","bbs","zine","apocrypha","shortwave","family","church","camcorder","prophecy","esoteric","cipher","grimoire","mythology"]
SEEDS=["http://www.textfiles.com/ufo/","http://www.textfiles.com/occult/","http://www.textfiles.com/conspiracy/","http://www.textfiles.com/magazines/","http://www.textfiles.com/religion/","http://artifice.bbs.textfiles.com/","https://ftp.lip6.fr/pub/","https://ftp.uni-stuttgart.de/pub/","https://mirror.aarnet.edu.au/pub/","https://ftp.ussg.iu.edu/","https://ftp.cc.uoc.gr/","https://ftp.funet.fi/pub/sci/","https://ftp.funet.fi/pub/pics/","https://ftp.funet.fi/pub/culture/","https://ftp.funet.fi/pub/culture/occult/","https://ftp.funet.fi/pub/culture/religion/","https://ftp.funet.fi/pub/doc/","http://www.textfiles.com/","http://cd.textfiles.com/","https://www.ibiblio.org/pub/academic/religion/","https://www.ibiblio.org/pub/docs/","https://ftp.gnu.org/old-gnu/","https://ftp.sunet.se/mirror/archive/ftp.sunet.se/pub/"]
def kind(name):
    n=name.lower().split("?")[0]
    for k,ex in (("video",VIDX),("image",IMGX),("audio",AUDX),("text",TXTX)):
        if n.endswith(ex): return k
    return "text" if "." not in n.rsplit("/",1)[-1] else "other"
def get(u,t=20,tries=2):
    for i in range(tries):
        try:
            r=requests.get(u,headers=UA,timeout=(8,t)); return r
        except Exception as e: err=e; time.sleep(2)
    raise err
ROW=re.compile(r'<a href="([^"?#][^"]*)"[^>]*>([^<]*)</a>\s*(?:</td>\s*<td[^>]*>)?\s*([0-9]{1,4}[-/][0-9A-Za-z]{2,3}[-/][0-9]{2,4}[ T]?[0-9:]{0,8})?\s*(?:</td>\s*<td[^>]*>)?\s*([0-9.]+[KMGT]?|-)?',re.I)
def listing(url):
    r=get(url); b=r.text[:200000]
    if r.status_code!=200 or not re.search(r"index of|parent directory",b,re.I): return None
    out=[]
    for href,label,date,size in ROW.findall(b):
        if href.startswith(("/","..","mailto:","javascript:")) or href.startswith("http") and not href.startswith(url): continue
        full=urllib.parse.urljoin(url,href); name=urllib.parse.unquote(href.rstrip("/").split("/")[-1])
        if not name or BAD.search(full): continue
        out.append({"name":name,"url":full,"dir":href.endswith("/"),"date":(date or "").strip(),"size":(size or "").strip(),"type":"dir" if href.endswith("/") else kind(name)})
    return out
def discover(kw):
    found=set()
    for q in (f'intitle:"index of" {kw}',f'"index of /" "parent directory" {kw}'):
        try:
            h=requests.get("https://html.duckduckgo.com/html/",params={"q":q},headers={"User-Agent":"Mozilla/5.0"},timeout=25).text
            found|={urllib.parse.unquote(u) for u,t in re.findall(r'class="result__a" href="[^"]*?uddg=([^&"]+)[^"]*"[^>]*>(.*?)</a>',h) if re.search(r"index\s+of",re.sub("<[^>]+>","",t),re.I)}
        except Exception as e: print("ddg",kw,e)
        try:
            h=requests.get("https://www.bing.com/search",params={"q":q,"count":30},headers={"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"},timeout=25).text
            found|={u for u,t in re.findall(r'<h2[^>]*><a[^>]+href="(https?://[^"]+)"[^>]*>(.*?)</a>',h) if re.search(r"index\s+of",re.sub("<[^>]+>","",t),re.I)}
        except Exception as e: print("bing",kw,e)
        try:
            h=requests.get("https://www.mojeek.com/search",params={"q":q},headers={"User-Agent":"Mozilla/5.0"},timeout=25).text
            found|={u for u,t in re.findall(r'<a class="ob" href="(https?://[^"]+)"[^>]*>(.*?)</a>',h) if re.search(r"index\s+of",t,re.I)}
        except Exception as e: print("mojeek",kw,e)
        time.sleep(2)
    print("engines",kw,len(found))
    return [u for u in found if not SPAM.search(u) and not SKIPHOST.search(u.split("/")[2] if "://" in u else u) and not BAD.search(u)]
def urlscan_dirs(n=60):
    """Recently-seen 'Index of' pages anywhere on the web (urlscan public search)."""
    try:
        j=get(f"https://urlscan.io/api/v1/search/?q={urllib.parse.quote('page.title:\"Index of\"')}&size={n}",25).json()
        return list({x["page"]["url"] for x in j.get("results",[]) if "/wp-" not in x["page"]["url"] and not SKIPHOST.search(x["page"]["url"])})
    except Exception as e: print("urlscan",e); return []
def crawl_dir(url,kw=None,depth=2,budget=6):
    """List a dir, then descend into subdirs (keyword-matching first)."""
    files,q,seen=[],[(url,0)],set()
    while q and budget>0 and not late():
        u,d=q.pop(0)
        if u in seen: continue
        seen.add(u); budget-=1
        try: L=listing(u)
        except Exception as e: print("list",u,e); continue
        if L is None: continue
        host=u.split("/")[2]
        if SPAM.search(host): continue
        for x in L:
            if not x["dir"]: files.append({**x,"host":host,"parent":u,"kw":kw or ""})
        subs=[x["url"] for x in L if x["dir"]]
        if d<depth and subs:
            m=[s for s in subs if kw and kw.lower() in s.lower()]; random.shuffle(subs)
            q+= [(s,d+1) for s in (m+subs)[:3]]
    return files
def card(f,via):
    k=f["type"]; gated=k in("image","video")
    return {"source":"Open Directory","title":f["name"],"date":f["date"],"dateLabel":"listed","count":None,"countLabel":"","size":f["size"],"ftype":k,
      "host":f["host"],"thumb":f["url"] if k=="image" else "","kind":{"image":"img","video":"video"}.get(k,"link"),"src":f["url"] if gated else "","gated":gated,
      "url":f["url"],"mime":k+"/*","query":via,"kw":f.get("kw",""),"preview":f"{k} · {f['size'] or '? size'} · {f['date'] or 'no date'} · in {f['parent']}",
      "extra":f"host: {f['host']} · dir: {f['parent']}","links":[["parent dir ↗",f["parent"]]]}
def opendir_index(n_kw=5):
    budget(600); out=[]
    for kw in random.sample(KEYWORDS,n_kw):
        for d in discover(kw)[:6]:
            fs=crawl_dir(d,kw,depth=1,budget=3); print("  kwdir",kw,d,len(fs))
            random.shuffle(fs); out+=[card(f,f'engine search "{kw}" → {d}') for f in fs[:30]]
    for d in random.sample(urlscan_dirs(),min(12,len(urlscan_dirs()) or 0)) if True else []:
        fs=crawl_dir(d,None,depth=2,budget=3); print("  urlscan",d,len(fs))
        random.shuffle(fs); out+=[card(f,f"urlscan 'Index of' sighting → {d}") for f in fs[:25]]
    for s_ in random.sample(SEEDS,4):
        fs=crawl_dir(s_,None,depth=3,budget=6); print("  seed",s_,len(fs))
        random.shuffle(fs); out+=[card(f,f"random descent from {s_}") for f in fs[:30]]
    for kw in KEYWORDS:
        for f in out:
            if not f["kw"] and kw in (f["url"]).lower(): f["kw"]=kw
    return out
# ---- grayspace media ----
def seed_hosts():
    H=[]
    for n in ["Area51","Hollywood","Tokyo","SoHo","Heartland","Athens","Paris","TimesSquare","SiliconValley","Yosemite","EnchantedForest","Pentagon","Colosseum","Petsburgh","CapeCanaveral","Bourbonstreet","Vienna","Wellesley"]:
        H.append(f"geocities.com/{n}/{random.randint(1000,9999)}/")
    for a in ["80s","ar","bc","ca","co","de","fl","hi","id","il","in","ky","me","mi","mn","mo","ms","mt","nc","nd","ne","nj","nm","ny","oh","ok","or","pa","ri","sc","tn","tx","va","wa","wi","wy","indie","journal","rock","music","film","anime"]:
        H.append(f"angelfire.com/{a}/")
    H+= [f"members.tripod.com/{c}" for c in "abcdefghijklmnopqrstuvwxyz"]+[f"{c}.tripod.com/" for c in ["home","hometown","members"]]
    H+= ["members.aol.com/","home.earthlink.net/","www.fortunecity.com/","homepage.mac.com/","members.xoom.com/","www.oocities.org/","users.rcn.com/","home.att.net/","www.webspawner.com/","members.fortunecity.com/","home.comcast.net/"]
    try:
        for f in ("deep_opendir","deep_crawl"):
            for x in json.load(open(f"finds/{f}.json"))[-60:]:
                u=x.get("url","")
                if "://" in u and not SKIPHOST.search(u): H.append(u.split("/")[2]+"/")
    except Exception: pass
    random.shuffle(H); return H
def cdx_media(kind,want=12,tries=8):
    budget(300)
    mt="(video/.*|application/vnd.rn-realmedia|application/x-shockwave-flash)" if kind=="video" else "image/(gif|jpeg|png)"
    out=[]
    hosts=seed_hosts()
    if kind=="video":  # verified yielding: Angelfire themed neighbourhoods, sub-sharded by first letter for variety
        hosts=[f"www.angelfire.com/{a}/{c}" for a in ("film","indie","music","rock","journal","80s","anime","biz","punk","scifi","tv") for c in "abcdefghijklmnopqrstuvwxyz0123456789"]
        random.shuffle(hosts)
    for host in hosts[:tries]:
        flt=[f"mimetype:{mt}","statuscode:200"]
        if kind=="video": flt.insert(0,"original:.*\\.(mpg|mpeg|avi|mov|wmv|asf|rm|flv|mp4|swf)$")
        p={"url":host,"matchType":"prefix","filter":flt,"limit":300,"output":"json","fl":"timestamp,original,mimetype,length","collapse":"urlkey"}
        rows=[]
        if late(): break
        for t in (60,40):
            try:
                txt=requests.get("https://web.archive.org/cdx/search/cdx",params=p,headers=UA,timeout=t).text.strip()
                rows=json.loads(txt)[1:] if txt.startswith("[") else []; break
            except Exception as e: print("cdx",kind,host,type(e).__name__); time.sleep(3)
        rows=[r for r in rows if not BAD.search(r[1]) and (r[3].isdigit() and int(r[3])>(30000 if kind=="video" else 6000))]
        print("cdx",kind,host,len(rows))
        for ts,orig,m,ln in random.sample(rows,min(4,len(rows))):
            name=urllib.parse.unquote(orig.rstrip("/").split("/")[-1]); h=orig.split("/")[2]
            play=kind=="image" or m in("video/mp4","video/webm","video/ogg")
            out.append({"source":"Wayback CDX (dead host)","title":name,"date":f"{ts[:4]}-{ts[4:6]}-{ts[6:8]}","dateLabel":"captured","count":None,"countLabel":"",
              "size":f"{int(ln)//1024} KB" if ln.isdigit() else "","ftype":m,"host":h,"gated":True,
              "thumb":f"https://web.archive.org/web/{ts}im_/{orig}" if kind=="image" else "","kind":("img" if kind=="image" else "video") if play else "link",
              "src":f"https://web.archive.org/web/{ts}{'im_' if kind=='image' else 'id_'}/{orig}","url":f"https://web.archive.org/web/{ts}/{orig}",
              "query":f"CDX {host}* mimetype {mt}","preview":f"{m} · {ln} bytes · originally at {orig}","extra":f"original host: {h} (offline) · {m}","links":[["original URL",orig]]})
        if len(out)>=want: break
    return out
def gray_media(kind):
    """Media files from the open-directory index and gopher/crawl finds."""
    budget(180); out=[]
    try:
        for x in json.load(open("finds/deep_opendir.json")):
            if x.get("ftype")==kind: out.append(x)
    except Exception: pass
    for s in random.sample(SEEDS,2):
        fs=[f for f in crawl_dir(s,None,depth=4,budget=8) if f["type"]==kind]; print("od",kind,s,len(fs))
        out+= [card(f,f"open-dir descent from {s}") for f in fs[:8]]
    try:
        for f in ("deep_gopher","deep_crawl"):
            for x in json.load(open(f"finds/{f}.json")):
                u=x.get("url","")
                if kind_of(u)==kind and not SKIPHOST.search(u):
                    out.append({**x,"gated":True,"ftype":kind,"host":u.split("/")[2] if "://" in u else ""})
    except Exception: pass
    return out
def kind_of(u):
    return kind(u) if "." in u.rsplit("/",1)[-1] else ""
