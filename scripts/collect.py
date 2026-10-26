import json, random, datetime, requests, yt_dlp
UA={"User-Agent":"UncuratedMediaMiner/1.0 (github actions)"}
PREFIXES=["IMG","MVI","DSC","VID","MOV","DSCF","P100","GOPR","CIMG","PICT"]
now=lambda: datetime.datetime.utcnow().isoformat(timespec="seconds")+"Z"
def ia():
    pat=random.choice(["IMG_*","MVI_*","DSC*","VID_*","MOV*","untitled","video*","GOPR*"]); y=random.randint(2004,2025)
    q=f"mediatype:movies AND title:({pat}) AND downloads:[0 TO 25] AND publicdate:[{y}-01-01T00:00:00Z TO {y}-12-31T23:59:59Z]"
    docs=requests.get("https://archive.org/advancedsearch.php",params={"q":q,"fl[]":["identifier","title","publicdate","downloads"],"rows":50,"output":"json"},headers=UA,timeout=30).json()["response"]["docs"]
    out=[]
    for d in random.sample(docs,min(2,len(docs))):
        i=d["identifier"]; out.append({"source":"Internet Archive","title":d.get("title"),"date":d.get("publicdate","")[:10],"views":d.get("downloads"),"views_label":"downloads","url":f"https://archive.org/details/{i}","embed":f"https://archive.org/embed/{i}","query":q})
    return out
def yt():
    term=f"{random.choice(PREFIXES)} {random.randint(0,9999):04d}"
    with yt_dlp.YoutubeDL({"quiet":True,"extract_flat":True,"skip_download":True}) as y:
        r=y.extract_info(f"ytsearch20:{term}",download=False)
    ents=[e for e in r.get("entries",[]) if e.get("id") and e.get("view_count") is not None and e["view_count"]<=100]
    return [{"source":"YouTube","title":e.get("title"),"date":"","views":e["view_count"],"views_label":"views","url":f"https://www.youtube.com/watch?v={e['id']}","embed":f"https://www.youtube-nocookie.com/embed/{e['id']}","query":term} for e in ents[:3]]
finds=json.load(open("finds.json")); seen={f["url"] for f in finds}; new=[]
for fn,n in ((yt,3),(ia,1)):
    for _ in range(n):
        try:
            for f in fn():
                if f["url"] not in seen: f["mined_at"]=now(); new.append(f); seen.add(f["url"])
        except Exception as e: print(fn.__name__,"error:",e)
print("new finds:",len(new),[f["source"] for f in new])
json.dump((finds+new)[-2000:],open("finds.json","w"),indent=1)
