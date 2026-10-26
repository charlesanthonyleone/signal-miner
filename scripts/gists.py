"""Harvest public gists in the Action (server-side, not subject to visitors' per-IP rate limit)."""
import json, os, re, requests
BAD=re.compile(r"porn|xxx|\bsex\b|nude|onlyfans|hentai|escort|casino|viagra|crack.?key|warez",re.I)
def harvest(pages=4):
    H={"User-Agent":"SignalMiner/2.0","Accept":"application/vnd.github+json"}
    if os.environ.get("GITHUB_TOKEN"): H["Authorization"]="Bearer "+os.environ["GITHUB_TOKEN"]
    try: old=json.load(open("finds/gists.json"))
    except Exception: old=[]
    have={g["id"] for g in old}; new=[]
    for p in range(1,pages+1):
        try: r=requests.get("https://api.github.com/gists/public",params={"per_page":100,"page":p},headers=H,timeout=30); r.raise_for_status()
        except Exception as e: print("gists",p,e); break
        for g in r.json():
            fs={k:{x:v.get(x) for x in ("filename","type","language","size","raw_url")} for k,v in (g.get("files") or {}).items()}
            if g["id"] in have or BAD.search(json.dumps([g.get("description"),list(fs)])): continue
            new.append({"id":g["id"],"html_url":g["html_url"],"description":g.get("description"),"created_at":g.get("created_at"),"comments":g.get("comments",0),
                        "owner":{"login":(g.get("owner") or {}).get("login")} if g.get("owner") else None,"files":fs}); have.add(g["id"])
    L=(old+new)[-3000:]; json.dump(L,open("finds/gists.json","w"),separators=(",",":")); print("gists +",len(new),"total",len(L))
if __name__=="__main__": harvest()
