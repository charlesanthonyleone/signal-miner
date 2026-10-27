"""Pass 6 pre-harvest for the new worlds (REDACTED / XENO / VATICAN) and new TRENCH grayspace modules.
Everything here is public, unauthenticated HTTP; no scanning, no logins. Each harvester is budgeted and append-only (dedup by url)."""
import json, re, random, time, csv, io, requests, sys
UA={"User-Agent":"SignalMiner/2.0 (github actions; hobby project; contact via github)"}
BAD=re.compile(r"\b(sex|porn|xxx|nude|naked|erotic|adult|fetish|hentai|nsfw|escort|incest|rape|pedo|lolita|child abuse)\w*",re.I)
def load(p):
    try: return json.load(open(p,encoding="utf-8"))
    except Exception: return []
def save(p,old,new,cap):
    have=set(); L=[]
    for x in old+new:
        if x["url"] in have or BAD.search(x.get("title","")+" "+x.get("preview","")): continue
        have.add(x["url"]); L.append(x)
    L=L[-cap:]; json.dump(L,open(p,"w",encoding="utf-8"),ensure_ascii=False,separators=(",",":")); print(p,"+",len(L)-len([x for x in old if x["url"] in have]),"total",len(L)); return L

# ---------- UK National Archives Discovery (no CORS -> harvest) ----------
TNA={"uap":["unidentified flying objects","UFO sightings","flying saucers","aerial phenomena"],
 "mkultra":["mind control","brainwashing","LSD","truth drug","psychological warfare","Porton Down volunteers","hallucinogenic"],
 "psychic":["extra sensory perception","telepathy","psychical research","parapsychology","dowsing","clairvoyance","spiritualist medium","psychic"],
 "coldwar":["civil defence nuclear","Soviet defector","atomic spies","nuclear bunker","cold war contingency"],
 "deaths":["unexplained death","mysterious death","death in custody inquest","unidentified body","missing scientist"],
 "weather":["cloud seeding","rainmaking","weather modification","Project Cumulus","fog dispersal","artificial rain","Lynmouth flood","fog investigation"],
 "odd":["poltergeist","sea serpent","ghost","ball lightning","strange phenomena","unexplained noise"]}
def tna(pages=2):
    old=load("finds/tna.json"); new=[]
    for theme,qs in TNA.items():
        for q in random.sample(qs,min(2,len(qs))):
            for _ in range(pages):
                try:
                    P={"sps.searchQuery":q,"sps.resultsPageSize":30,"sps.page":random.randint(0,4),"sps.heldByCode":"TNA"}
                    r=requests.get("https://discovery.nationalarchives.gov.uk/API/search/records",params=P,headers={**UA,"Accept":"application/json"},timeout=40).json()
                    if not r.get("records"):  # niche theme: random page past the end -> page 0
                        P["sps.page"]=0; r=requests.get("https://discovery.nationalarchives.gov.uk/API/search/records",params=P,headers={**UA,"Accept":"application/json"},timeout=40).json()
                except Exception as e: print("tna",q,e); continue
                for x in r.get("records",[]):
                    new.append({"theme":theme,"source":"UK National Archives (Discovery)","title":(x.get("title") or "").strip()[:200],"date":x.get("coveringDates",""),
                      "url":"https://discovery.nationalarchives.gov.uk/details/r/"+x["id"],"ref":x.get("reference",""),"preview":re.sub(r"<[^>]+>","",(x.get("description") or x.get("context") or ""))[:500],
                      "query":f'"{q}" · random page',"closed":x.get("closureStatus","")})
                time.sleep(1)
    return save("finds/tna.json",old,new,6000)

# ---------- NUFORC-style raw sighting reports (public GitHub dataset) ----------
def nuforc(n=4000):
    old=load("finds/nuforc.json")
    if len(old)>=n: print("nuforc ok",len(old)); return old
    t=requests.get("https://raw.githubusercontent.com/planetsig/ufo-reports/master/csv-data/ufo-scrubbed-geocoded-time-standardized.csv",headers=UA,timeout=120).text
    rows=list(csv.reader(io.StringIO(t))); random.shuffle(rows); new=[]
    import html
    for r in rows:
        if len(r)<11: continue
        dt,city,st,co,shape,secs,dur,text,posted,lat,lon=r[:11]; text=html.unescape(html.unescape(text))
        if len(text)<40: continue
        new.append({"source":"NUFORC reports (public dataset, planetsig/ufo-reports)","title":f"{shape or 'unknown'} · {city.title()}, {st.upper()} {co.upper()}".strip(),"date":dt,"posted":posted,
          "url":f"https://www.openstreetmap.org/?mlat={lat}&mlon={lon}#map=9/{lat}/{lon}&r={len(new)}","preview":text,"shape":shape,"duration":dur})
        if len(new)>=n: break
    return save("finds/nuforc.json",old,new,n)

# ---------- vatican.va document indexes (no CORS -> harvest) ----------
POPES=["leo-xiii","pius-x","benedict-xv","pius-xi","pius-xii","john-xxiii","paul-vi","john-paul-i","john-paul-ii","benedict-xvi","francesco"]
KINDS=["encyclicals","apost_letters","apost_constitutions","motu_proprio","letters","speeches","homilies","messages","audiences","angelus","bulls","briefs","apost_exhortations","prayers"]
def vatva(budget=14):
    old=load("finds/vatva.json"); new=[]
    def get(u):
        try:
            h=requests.get(u,headers=UA,timeout=30); h.encoding="utf-8"; return h.text if h.status_code==200 else ""
        except Exception as e: print("vatva",e); return ""
    for _ in range(budget):
        p,k=random.choice(POPES),random.choice(KINDS)
        for lang in ("en","it","la","es"):
            u=f"https://www.vatican.va/content/{p}/{lang}/{k}.index.html"; h=get(u)
            if not h: continue
            for depth in range(3):  # descend year/month sub-indexes at random
                docs=re.findall(r'href="(/content/'+re.escape(p)+r'/[a-z]{2}/[^"]*?/documents/[^"]+\.html)"[^>]*>(.*?)</a>',h,re.S)
                docs=[(d,re.sub(r"<[^>]+>|\s+"," ",t).strip()) for d,t in docs]; docs=[x for x in docs if len(x[1])>=8]
                if docs: break
                subs=sorted(set(re.findall(r'href="(/content/'+re.escape(p)+r'/'+lang+r'/'+k+r'/[^"]+\.index\.html)"',h)))
                if not subs: break
                u="https://www.vatican.va"+random.choice(subs); h=get(u)
            for href,t in docs:
                m=re.search(r"_(\d{8})_",href); d=m.group(1) if m else ""
                if d and not d.startswith(("18","19","20")): d=d[4:]+d[2:4]+d[:2]
                new.append({"source":"vatican.va","title":t[:220],"date":(d[:4]+"-"+d[4:6]+"-"+d[6:8]) if len(d)==8 else "","url":"https://www.vatican.va"+href,"pope":p.replace("-"," ").title(),"kind":k.replace("_"," "),"preview":f"{k.replace('_',' ')} · {p.replace('-',' ').title()} · {lang}","query":u})
            break
        time.sleep(1)
    return save("finds/vatva.json",old,new,9000)

# ---------- Wayback CDX: BBS text (textfiles.com) + dead forum hosts ----------
TFDIRS=["ufo","conspiracy","occult","science","stories","humor","history","bbs","fun","politics","hacking","phreak","programming","survival","food","music","news","drugs/../law","law","magazines","anarchy","apple","computers","games","holiday","internet","media","piracy","rpg","reports","uploaded","100","adventure","art","artifacts/../computers","digest","exhibits/../history","floppies/../bbs","groups","hamradio","messages","virus"]
TFSKIP=re.compile(r"/(sex|adult|erotic|porn|drugs)/",re.I)
FORUMS=["ezboard.com","network54.com","voy.com","delphiforums.com","forumer.com","proboards.com","boards.theforce.net","invisionfree.com","phpbbplanet.com","conforums.com","quicktopic.com","insidetheweb.com"]
def cdx(q,limit=600,extra=None):
    p={"url":q,"output":"json","limit":limit,"filter":["statuscode:200"],"collapse":"urlkey","fl":"timestamp,original,mimetype,length"}
    if extra: p["filter"]=p["filter"]+[extra]
    r=requests.get("https://web.archive.org/cdx/search/cdx",params=p,headers=UA,timeout=60).json(); return r[1:] if r else []
def bbs(dirs=5):
    old=load("finds/bbs.json"); new=[]
    for d in random.sample([x for x in TFDIRS if ".." not in x],dirs):
        try: rows=cdx(f"textfiles.com/{d}/*",800,"mimetype:text/plain")
        except Exception as e: print("bbs",d,e); continue
        random.shuffle(rows)
        for ts,orig,mt,ln in rows[:60]:
            if TFSKIP.search(orig): continue
            name=orig.split("/")[-1]
            new.append({"source":"textfiles.com via Wayback","title":f"{d} / {name}","date":ts[:4]+"-"+ts[4:6]+"-"+ts[6:8],"url":f"https://web.archive.org/web/{ts}/{orig}","raw":f"https://web.archive.org/web/{ts}id_/{orig}","dir":d,"size":ln,"preview":""})
        time.sleep(2)
    # fetch first lines for a few new rows (preview text, screened later in the browser too)
    for x in random.sample(new,min(25,len(new))):
        try: x["preview"]=re.sub(r"[^\x09\x0a\x20-\x7e]","",requests.get(x["raw"],headers=UA,timeout=25).text[:900]).strip()[:600]
        except Exception: pass
    return save("finds/bbs.json",old,new,8000)
def forums(hosts=4):
    old=load("finds/forums.json"); new=[]
    for h in random.sample(FORUMS,hosts):
        try: rows=cdx(f"{h}/*",1500,"mimetype:text/html")
        except Exception as e: print("forums",h,e); continue
        rows=[r for r in rows if re.search(r"(topic|thread|message|read|viewtopic|showthread|messages|\?|/\d{3,})",r[1],re.I) and not re.search(r"\.(css|js|gif|jpg|png)$|login|register|search|profile",r[1],re.I)]
        random.shuffle(rows)
        for ts,orig,mt,ln in rows[:50]:
            new.append({"source":f"{h} via Wayback","title":orig.split("://")[-1][:140],"date":ts[:4]+"-"+ts[4:6]+"-"+ts[6:8],"url":f"https://web.archive.org/web/{ts}/{orig}","raw":f"https://web.archive.org/web/{ts}id_/{orig}","host":h,"preview":""})
        time.sleep(2)
    for x in random.sample(new,min(30,len(new))):
        try:
            t=requests.get(x["raw"],headers=UA,timeout=25).text
            m=re.search(r"<title>(.*?)</title>",t,re.S|re.I)
            if m and len(m.group(1).strip())>3: x["title"]=re.sub(r"\s+"," ",m.group(1)).strip()[:160]
            body=re.sub(r"(?s)<(script|style).*?</\1>|<[^>]+>"," ",t); x["preview"]=re.sub(r"\s+"," ",body).strip()[:600]
        except Exception: pass
    return save("finds/forums.json",old,new,8000)

# ---------- LoC newspaper clippings for the new worlds ----------
NEWS={"x_clip":["flying saucer","mysterious airship","strange light in the sky","flying disc","fiery object in the sky","meteor fell","sky monster"],
 "g_uap":["flying saucer","unidentified flying object","air force investigating"],"g_mk":["brain washing","truth serum","hypnotized soldiers"],"g_psy":["mind reader","telepathy test","spiritualist medium"],
 "g_deaths":["mysterious death","died mysteriously","found dead under mysterious"],"g_weather":["rain maker","rainmaking experiment","cloud seeding"],"g_odd":["sea serpent","ghost seen","strange creature"],"g_cold":["red spy","atomic secrets","bomb shelter"],"rel_missing":["no trace has been found","mysteriously disappeared","vanished without a trace"],"rel_ghost":["deserted village","ghost town","abandoned mining camp"],
 "v_exorc":["exorcism","possessed by devils","cast out the devil"],"v_appar":["apparition of the virgin","miraculous cure","weeping statue","bleeding statue"],"v_inq":["inquisition","heresy trial","excommunicated"],"v_index":["index of forbidden books","placed on the index","condemned by the pope"],"v_council":["ecumenical council","church council","synod"]}
def news(per=1):
    old=load("finds/world_news.json"); new=[]
    for k,phr in NEWS.items():
        for ph in random.sample(phr,per):
            y=random.randint(1840,1950)
            try: r=requests.get("https://www.loc.gov/collections/chronicling-america/",params={"q":f'"{ph}"',"dates":f"{y}/{y+15}","fo":"json","c":25},headers=UA,timeout=90).json()
            except Exception as e: print("news",k,e); continue
            for x in r.get("results",[]):
                u=x.get("url") or x.get("id")
                if not u: continue
                new.append({"theme":k,"source":"Chronicling America (LoC)","title":re.sub(r"^Image \d+ of ","",str(x.get("title",""))),"date":x.get("date",""),"thumb":(x.get("image_url") or [""])[0],"url":u,
                  "preview":" ".join(x.get("description") or [])[:600],"query":f'"{ph}" · {y}–{y+15} (pre-harvested)'})
    return save("finds/world_news.json",old,new,6000)

def run(budget_s=900):
    t0=time.time()
    for f in (nuforc,tna,vatva,news,bbs,forums):
        if time.time()-t0>budget_s: print("worlds: budget hit before",f.__name__); break
        try: f()
        except Exception as e: print("worlds",f.__name__,"error:",e)
if __name__=="__main__":
    fs=sys.argv[1:] or ["run"]
    for f in fs: globals()[f]()
