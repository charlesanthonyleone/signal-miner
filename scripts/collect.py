import json, os, random, datetime, requests, yt_dlp, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__) or "."))
from deep import deep_gopher, deep_opendir, deep_crawl
from trench import cameras, satnogs, blockchain, tectonics, radiation, deep_space, hidden_in_files, time_skew

UA={"User-Agent":"SignalMiner/2.0 (github actions; hobby project)"}
now=lambda: datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds").replace("+00:00","Z")
def load(n):
    p=f"finds/{n}.json"; return json.load(open(p)) if os.path.exists(p) else []
def save(n,L): json.dump(L[-3000:],open(f"finds/{n}.json","w"),indent=1)

PREF=["IMG","MVI","DSC","VID","MOV","DSCF","P100","GOPR","CIMG","PICT"]
YT={"raw clip":lambda:f"{random.choice(PREF)} {random.randint(0,9999):04d}",
    "old tv":lambda:random.choice(["1970s tv commercial","1980s local news","vhs rip tv","old public access tv","1990s tv broadcast","tv station sign off"]) + f" {random.randint(1965,1999)}",
    "old film":lambda:random.choice(["home movie 8mm","super 8 family film","16mm film transfer","old educational film","public domain film","vhs home video"]) + f" {random.randint(1940,2005)}"}

def yt(cat):
    term=YT[cat]()
    with yt_dlp.YoutubeDL({"quiet":True,"extract_flat":True,"skip_download":True}) as y:
        r=y.extract_info(f"ytsearch30:{term}",download=False)
    lim=100 if cat=="raw clip" else 500
    ents=[e for e in r.get("entries",[]) if e.get("id") and e.get("view_count") is not None and e["view_count"]<=lim]
    th=lambda e:f"https://i.ytimg.com/vi/{e['id']}/hqdefault.jpg"
    return [{"source":"YouTube","title":e.get("title"),"date":"","dateLabel":"","count":e["view_count"],"countLabel":"views","thumb":th(e),"kind":"iframe",
             "src":f"https://www.youtube-nocookie.com/embed/{e['id']}","url":f"https://www.youtube.com/watch?v={e['id']}","query":f'ytsearch "{term}" views<={lim}',
             "extra":f"category: {cat}"+(f" · {e.get('duration')}s" if e.get('duration') else "")} for e in ents[:4]]

SITES=["geocities.com/Hollywood/","geocities.com/SoHo/","geocities.com/TimesSquare/","geocities.com/Area51/","geocities.com/Heartland/","geocities.com/Tokyo/",
       "geocities.com/SunsetStrip/","geocities.com/EnchantedForest/","geocities.com/Athens/","geocities.com/CapeCanaveral/","members.aol.com/","angelfire.com/",
       "members.tripod.com/","geocities.com/Colosseum/","geocities.com/Paris/","geocities.com/Yosemite/"]

def wayback(kind):
    site=random.choice(SITES); mt="video/.*" if kind=="video" else random.choice(["image/gif","image/jpeg"])
    p={"url":site,"matchType":"prefix","filter":[f"mimetype:{mt}","statuscode:200"],"limit":400 if kind=="video" else 300,"output":"json","fl":"timestamp,original,mimetype,length",
       "collapse":"urlkey","offset":random.randint(0,3000) if kind=="image" else 0}
    txt=requests.get("https://web.archive.org/cdx/search/cdx",params=p,headers=UA,timeout=150).text.strip()
    rows=json.loads(txt)[1:] if txt.startswith("[") else []
    if not rows: raise Exception(f"no rows for {site} {mt}")
    if kind=="image": rows=[r for r in rows if r[3].isdigit() and int(r[3])>8000]
    out=[]
    for ts,orig,m,ln in random.sample(rows,min(6,len(rows))):
        d=f"{ts[:4]}-{ts[4:6]}-{ts[6:8]}"; name=orig.rstrip("/").split("/")[-1]
        playable=m in("video/mp4","video/webm","video/ogg") or kind=="image"
        out.append({"source":"Wayback Machine","title":name,"date":d,"dateLabel":"captured","count":None,"countLabel":"",
            "thumb":f"https://web.archive.org/web/{ts}im_/{orig}" if kind=="image" else "","kind":("img" if kind=="image" else "video") if playable else "link",
            "src":f"https://web.archive.org/web/{ts}{'im_' if kind=='image' else 'id_'}/{orig}","url":f"https://web.archive.org/web/{ts}/{orig}",
            "query":f"CDX url={site}* mimetype={mt}","extra":f"{m} · {ln} bytes · original: {orig}"})
    return out

jobs=[
    ("deep_crawl", deep_crawl),
    ("deep_gopher", deep_gopher),
    ("deep_opendir", deep_opendir),
    ("cameras", cameras),
    ("satnogs", satnogs),
    ("blockchain", blockchain),
    ("tectonics", tectonics),
    ("radiation", radiation),
    ("space", deep_space),
    ("youtube", lambda: yt("raw clip")),
    ("youtube", lambda: yt("old tv")),
    ("youtube", lambda: yt("old film")),
    ("wayback_image", lambda: wayback("image")),
    ("wayback_image", lambda: wayback("image")),
]

os.makedirs("finds", exist_ok=True)
data={}
for f, fn in jobs:
    L = data.setdefault(f, load(f))
    seen = {x["url"] for x in L if x.get("url")}
    try:
        n = 0
        for x in fn():
            if not x.get("url") or x["url"] in seen: continue
            x["mined_at"] = now()
            L.append(x); seen.add(x["url"]); n += 1
        print(f, "+", n, "total", len(L))
    except Exception as e:
        print(f, "error:", e)

# forensics + time skew across current finds
all_items = []
for f, L in list(data.items()):
    all_items.extend(L)
# also load any on-disk finds not in this run
for name in os.listdir("finds"):
    if name.endswith(".json") and name[:-5] not in data:
        try: all_items.extend(load(name[:-5]))
        except Exception: pass

img_items = [x for x in all_items if x.get("kind") in ("img",) or (x.get("thumb") or "").endswith((".jpg",".jpeg",".gif",".png")) or "image" in (x.get("mime") or "")]
try:
    L = data.setdefault("hidden", load("hidden")); seen={x["url"]+x.get("preview","")[:40] for x in L}
    n=0
    for x in hidden_in_files(img_items or load("wayback_image")):
        key=x["url"]+x.get("preview","")[:40]
        if key in seen: continue
        x["mined_at"]=now(); L.append(x); seen.add(key); n+=1
    print("hidden +", n)
except Exception as e:
    print("hidden error:", e)

try:
    L = data.setdefault("timeskew", load("timeskew")); seen={x["url"] for x in L}
    n=0
    for x in time_skew(all_items + L):
        if x["url"] in seen: continue
        x["mined_at"]=now(); L.append(x); seen.add(x["url"]); n+=1
    print("timeskew +", n)
except Exception as e:
    print("timeskew error:", e)

for f, L in data.items():
    save(f, L)
print("done", {k: len(v) for k,v in data.items()})
