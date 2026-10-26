"""Resumable, chunked Wayback CDX harvest for DEEP VIDEO (runs in the scheduled Action).
State lives in finds/vidstate.json: a work queue of URL-prefix shards (non-Angelfire hosts first),
per-shard results and failure counts. A shard that times out is split into 36 sub-shards that are
queued at the back, so each 3-hourly run picks up where the last left off and the pile grows
across geocities / oocities / tripod / xoom / 50megs / fortunecity / aol over time."""
import json, time, random, re, urllib.parse, requests, vidshards
from grayspace import BAD, UA
ST="finds/vidstate.json"
def _load():
    try: return json.load(open(ST))
    except Exception:
        S=vidshards.shards(); S.sort(key=lambda s:"angelfire" in s)   # non-Angelfire hosts first
        return {"queue":S,"done":{},"fails":{},"runs":0}
def _item(ts,orig,m,ln,shard):
    name=urllib.parse.unquote(orig.rstrip("/").split("/")[-1]); h=orig.split("/")[2]
    play=m in("video/mp4","video/webm","video/ogg")
    return {"source":"Wayback CDX (dead host)","title":name,"date":f"{ts[:4]}-{ts[4:6]}-{ts[6:8]}","dateLabel":"captured","count":None,"countLabel":"",
      "size":f"{int(ln)//1024} KB" if ln.isdigit() else "","ftype":m,"host":h,"gated":True,"thumb":"","kind":"video" if play else "link",
      "src":f"https://web.archive.org/web/{ts}id_/{orig}","url":f"https://web.archive.org/web/{ts}/{orig}",
      "query":f"CDX {shard}* (resumable harvest)","preview":f"{m} · {ln} bytes · originally at {orig}","extra":f"original host: {h} (offline) · {m}","links":[["original URL",orig]]}
def harvest(budget=900,per_shard=6):
    st=_load(); st["runs"]+=1; end=time.time()+budget; out=[]
    mt="(video/.*|application/vnd.rn-realmedia|application/x-shockwave-flash)"
    while st["queue"] and time.time()<end:
        sh=st["queue"].pop(0)
        p={"url":sh,"matchType":"prefix","filter":[vidshards.VIDRE,f"mimetype:{mt}","statuscode:200"],"limit":400,"output":"json","fl":"timestamp,original,mimetype,length","collapse":"urlkey"}
        try:
            txt=requests.get("https://web.archive.org/cdx/search/cdx",params=p,headers=UA,timeout=min(75,max(10,end-time.time()))).text.strip()
            rows=json.loads(txt)[1:] if txt.startswith("[") else []
        except Exception as e:
            st["fails"][sh]=st["fails"].get(sh,0)+1
            if len(sh.rsplit("/",1)[-1])<3: st["queue"]+=vidshards.split(sh)      # chunk it, retry later
            elif st["fails"][sh]<3: st["queue"].append(sh)
            print("vid",sh,type(e).__name__); continue
        rows=[r for r in rows if not BAD.search(r[1]) and r[3].isdigit() and int(r[3])>30000 and not (r[1].lower().endswith(".swf") and int(r[3])<250000)]
        st["done"][sh]=len(rows); print("vid",sh,len(rows))
        out+=[_item(*r,sh) for r in random.sample(rows,min(per_shard,len(rows)))]
    if not st["queue"]:  # full cycle complete: start a new shuffled cycle
        S=vidshards.shards(); S.sort(key=lambda s:"angelfire" in s); st["queue"]=S
    json.dump(st,open(ST,"w"),separators=(",",":"))
    return out
def opendir_videos(n=40):
    try: L=json.load(open("finds/odbig.json"))
    except Exception: return []
    V=[r for r in L if re.search(r"\.(mpe?g|avi|mov|wmv|asf|rm|flv|mp4|m4v|webm|mkv|ogv)$",r[0],re.I) and not BAD.search(r[0])]
    out=[]
    for u,size,date in random.sample(V,min(n,len(V))):
        name=urllib.parse.unquote(u.rsplit("/",1)[-1]); h=u.split("/")[2]; ext=name.rsplit(".",1)[-1].lower()
        out.append({"source":"Open Directory (index)","title":name,"date":(date or "")[:10],"dateLabel":"modified","count":None,"countLabel":"","size":size,
          "ftype":"video/"+ext,"host":h,"gated":True,"thumb":"","kind":"video" if ext in("mp4","webm","ogv") else "link","src":u,"url":u,
          "query":"open-directory index (odbig) video extensions","preview":f"{name} · {size} · in {u.rsplit('/',1)[0]}/","extra":f"open directory on {h}"})
    return out
