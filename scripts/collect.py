import json, os, random, datetime, requests, yt_dlp, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__) or "."))
from deep import deep_gopher, deep_opendir, deep_crawl
from deeptext import deep_text
from patents import mine_module, QUERIES as PQ
from trench import cameras, satnogs, blockchain, tectonics, radiation, deep_space, hidden_in_files, time_skew

UA={"User-Agent":"SignalMiner/2.0 (github actions; hobby project)"}
now=lambda: datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds").replace("+00:00","Z")
def load(n):
    p=f"finds/{n}.json"; return json.load(open(p)) if os.path.exists(p) else []
import textfix
def _fix(x):
    if "opher" in str(x.get("source","")) or "opher" in str(x.get("mime","")):
        for k in ("title","preview"):
            if x.get(k): x[k]=textfix.fix(x[k])
    return x
def save(n,L): L=[_fix(x) for x in L]; json.dump(L[-(20000 if n=="deep_odindex" else 3000):],open(f"finds/{n}.json","w"),indent=1)

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

from gemini import gemini_find
from grayspace import opendir_index, cdx_media, gray_media
def deep_video():
    import vidharvest; return vidharvest.harvest(900)+vidharvest.opendir_videos(40)+gray_media("video")
def deep_image():
    import skin; return skin.prescreen(cdx_media("image",14,8)+gray_media("image"))

jobs=[
    ("deep_crawl", deep_crawl),
    ("deep_gopher", deep_gopher),
    ("deep_opendir", deep_opendir),
    ("deep_text", lambda: deep_text(load("deep_opendir"))),
    ("cameras", cameras),
    ("satnogs", satnogs),
    ("blockchain", blockchain),
    ("tectonics", tectonics),
    ("radiation", radiation),
    ("space", deep_space),
    ("youtube", lambda: yt("raw clip")),
    ("youtube", lambda: yt("old tv")),
    ("youtube", lambda: yt("old film")),
    ("wayback_image", lambda: cdx_media("image",10,4)),
    ("deep_odindex", opendir_index),
    ("deep_gemini", gemini_find),
    ("deep_video", deep_video),
    ("invento_expired", lambda m="expired": mine_module(m)),
    ("invento_abandoned", lambda m="abandoned": mine_module(m)),
    ("invento_secret", lambda m="secret": mine_module(m)),
    ("invento_wartech", lambda m="wartech": mine_module(m)),
    ("invento_modernuse", lambda m="modernuse": mine_module(m)),
    ("invento_formulas", lambda m="formulas": mine_module(m)),
    ("invento_survival", lambda m="survival": mine_module(m)),
    ("invento_dead", lambda m="dead": mine_module(m)),
    ("invento_immortal", lambda m="immortal": mine_module(m)),
    ("invento_mindctl", lambda m="mindctl": mine_module(m)),
    ("invento_weather", lambda m="weather": mine_module(m)),
    ("invento_aliens", lambda m="aliens": mine_module(m)),
    ("invento_deterrent", lambda m="deterrent": mine_module(m)),

    ("deep_image", deep_image),
    ("wayback_image", lambda: cdx_media("image",10,4)),
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

try:
    import relnews; relnews.harvest(1)
except Exception as e: print('relnews error:',e)
try:
    import gists; gists.harvest()
except Exception as e: print('gists error:',e)

# OPEN DIRECTORIES big keyword index: incremental breadth crawl of public mirrors -> compact [url,size,date] rows
try:
    import odcrawl, re as _re
    try: OH=json.load(open("finds/odhosts.json"))
    except Exception: OH=[]
    try:
        known={h["root"] for h in OH}|set(odcrawl.ROOTS)
        OH+=[h for h in odcrawl.discover_hosts(6,known) if h["root"] not in known]
        json.dump(OH[-500:],open("finds/odhosts.json","w"),indent=0)
    except Exception as e: print("discover error:",e)
    roots=random.sample(odcrawl.ROOTS,4)+random.sample([h["root"] for h in OH],min(3,len(OH)))
    got=odcrawl.crawl(250,240,roots)
    J=_re.compile(r"recipes|linux|comp\.binaries|comp\.sources|alt\.sources|eunet\.sources|/rfc|internet-drafts|/ietf/|/iesg/|gcrypt|nongnu|/viewers/|/Programming/|standards|errata|TED-talks|/(gnu|gentoo|debian|openbsd|slackware|apache|X11|NT|gimp|CTAN|kernel|centos|ubuntu)/|\.(sig|patch|diff|md5|sha\d*|rpm|deb|crate|iso|exe|dll|tar|tgz|bz2|xz|Z|o|so|c|h|f|py|pl|lzh)$|\.tar\.gz$|/diffs|/[\d.]+(\.gz|\.z)?$",_re.I)
    old=json.load(open("finds/odbig.json")); have={r[0] for r in old}
    new=[[x["url"],x.get("size",""),x.get("date","")] for x in got if x["url"] not in have and not J.search(x["url"])]
    old=[r for r in old if not J.search(r[0])]
    json.dump((old+new)[-40000:],open("finds/odbig.json","w"),separators=(",",":")); print("odbig +",len(new))
except Exception as e: print("odbig error:",e)

# forensics + time skew across current finds
all_items = []
for f, L in list(data.items()):
    all_items.extend(L)
# also load any on-disk finds not in this run
for name in os.listdir("finds"):
    if name.endswith(".json") and name[:-5] not in data and name!="odbig.json":
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

# Pass 6: worlds harvest (BLACK VAULT / XENO / VATICAN / Trench BBS + dead forums) — sources with no CORS or heavy rate limits
try:
    sys.path.insert(0,os.path.dirname(__file__)); import worlds; worlds.run(budget_s=900)
    try:
        import preharvest; preharvest.run(); preharvest.theo_gut()
    except Exception as e: print("preharvest error:",e)
except Exception as e: print("worlds error:",e)
