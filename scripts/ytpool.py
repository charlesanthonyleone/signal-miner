"""SB-1: fresh near-zero-view YouTube pool. YouTube search sorted by UPLOAD DATE (sp=CAISAhAB) via yt-dlp flat
extraction, raw camera-filename / date / obscure-theme slices, keep <=50 views, drop SEO/tutorial/shorts junk + blocklist,
and never republish an ID ever harvested before (finds/yt_ids.json)."""
import json, random, re, time, datetime, os, yt_dlp
from grayspace import BAD
P=lambda n,w:str(n).zfill(w)
def cam():
    y=random.randint(2024,2026);m=random.randint(1,12);d=random.randint(1,28)
    return random.choice([f"IMG_{P(random.randint(0,9999),4)}",f"MVI_{P(random.randint(0,9999),4)}",f"DSC_{P(random.randint(0,9999),4)}",
      f"MOV_{P(random.randint(0,9999),4)}",f"DSCF{P(random.randint(0,9999),4)}",f"GOPR{P(random.randint(0,9999),4)}",f"PXL_{y}{P(m,2)}{P(d,2)}",
      f"VID_{y}{P(m,2)}{P(d,2)}",f"VID{y}{P(m,2)}{P(d,2)}",f"WIN_{y}{P(m,2)}{P(d,2)}",f"{y} {P(m,2)} {P(d,2)}",f"20{random.randint(24,26)}{P(m,2)}{P(d,2)}_{P(random.randint(0,235959),6)}"])
THEME=["sermon","chapel","monastery","shortwave","numbers station","vhs transfer","8mm film","cemetery","ruins","abandoned","ghost town","old church",
 "manuscript","relic","shrine","folk song","hymn","dowsing","seance","ufo sighting","strange light","meteor","radio static","local history","grandpa story",
 "oral history","old map","pilgrimage","processions","rosary","icon","catacomb","mine shaft","lighthouse","shipwreck","tornado siren","ham radio","field recording","home movie","family reunion","choir rehearsal","church bells",
 "basement tapes","cassette rip","reel to reel","answering machine","farm auction","estate sale","old photos","bog","cave","quarry","storm footage",
 "night sky","aurora","owl","fog","hermit","tape found","dashcam night","trail cam","old radio","organ recital","bell ringing","folk dance"]
JUNK=re.compile(r"means nothing|rename|seo|alt text|tutorial|how to|file nam|#shorts|\bshorts?\b|asmr|prank|reaction|fortnite|roblox|minecraft|gta|free fire|tiktok|giveaway|subscribe|crypto|bitcoin|forex|earn money|airdrop|casino|betting|slot|\bvlog\b|unboxing|review|gameplay|walkthrough|lyrics|remix|edit\b|status|whatsapp|trailer|full movie|episode|podcast|live ?stream|\bai\b|motivation|#\w+.*#\w+",re.I)
EMOJI=re.compile(r"[\U0001F300-\U0001FAFF]")
def tkey(t): return re.sub(r"[^a-z]+","",t.lower())[:40]
def search(q):
    with yt_dlp.YoutubeDL({"quiet":True,"extract_flat":True,"playlistend":40,"socket_timeout":20}) as y:
        r=y.extract_info("https://www.youtube.com/results?search_query="+q.replace(" ","+")+"&sp="+random.choice(["CAISBAgCEAE","CAISBAgDEAE"]),download=False)
    return r.get("entries") or []
def harvest(n=30,budget=420):
    try: ids=set(json.load(open("finds/yt_ids.json")))
    except Exception: ids=set()
    try: pool=json.load(open("finds/yt_pool.json"))
    except Exception: pool=[]
    seen={(tkey(x.get("title",""))+"|"+x.get("extra","").split(" · ")[0])[:70] for x in pool};chan={}
    t0=time.time();new=[];now=datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%MZ")
    for i in range(n):
        if time.time()-t0>budget: break
        q=cam() if random.random()<.3 else random.choice([f"{random.choice(THEME)} {random.randint(2025,2026)}",random.choice(THEME),f"{random.choice(THEME)} {random.choice(THEME)}"])
        try: ents=search(q)
        except Exception as e: print("ytpool",q,e); continue
        k=0
        for e in ents:
            if k>=8: break
            v=e.get("view_count");vid=e.get("id");t=e.get("title") or "";d=e.get("duration") or 0
            if not vid or vid in ids or v is None or v>50 or d<8 or d>5400: continue
            ch=e.get("channel") or "?";tk=tkey(t)+"|channel: "+ch
            if len(EMOJI.findall(t))>2 or (t.isupper() and len(t)>12) or tk[:70] in seen or chan.get(ch,0)>=2: continue
            if JUNK.search(t) or BAD.search(t+" "+(e.get("channel") or "")): continue
            k+=1;ids.add(vid);seen.add(tk[:70]);chan[ch]=chan.get(ch,0)+1;new.append({"source":"YouTube","module":"youtube","ytid":vid,"title":t,"url":"https://www.youtube.com/watch?v="+vid,"kind":"iframe",
              "src":f"https://www.youtube-nocookie.com/embed/{vid}?autoplay=1","thumb":f"https://i.ytimg.com/vi/{vid}/hqdefault.jpg","count":v,"countLabel":"views",
              "date":now[:10],"dateLabel":"harvested","extra":f"channel: {e.get('channel') or '?'} · {d//60}:{P(d%60,2)} · this-week/month upload, newest-first, ≤50 views at harvest","query":q,"harvested":now})
        time.sleep(1)
    cut=(datetime.datetime.utcnow()-datetime.timedelta(days=21)).strftime("%Y-%m-%d")
    pool=[x for x in new+pool if x.get("date","9")>=cut][:900]
    json.dump(pool,open("finds/yt_pool.json","w"),indent=0); json.dump(sorted(ids)[-60000:],open("finds/yt_ids.json","w"))
    print("ytpool +",len(new),"pool",len(pool)); return len(new)
if __name__=="__main__":
    os.chdir(os.path.join(os.path.dirname(__file__),"..")); harvest(int(os.environ.get("N","30")))
