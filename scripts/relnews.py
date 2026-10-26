"""Pre-harvest Chronicling America (loc.gov, ~30s/query) per RELIQUARY theme so the module never hangs."""
import json, re, random, requests
UA={"User-Agent":"SignalMiner/2.0 (github actions; hobby project)"}
def themes():
    js=open("reliquary.js",encoding="utf-8").read(); out={}
    for m in re.finditer(r"\n ?(\w+):\{name:'([^']+)'.*?news:\[([^\]]*)\]",js,re.S):
        out[m.group(1)]=re.findall(r"'([^']+)'",m.group(3))
    return out
def harvest(per=2):
    try: old=json.load(open("finds/rel_news.json"))
    except Exception: old=[]
    have={x["url"] for x in old}; new=[]
    for k,phr in themes().items():
        for ph in random.sample(phr,min(per,len(phr))):
            y=random.randint(1840,1920)
            try: r=requests.get("https://www.loc.gov/collections/chronicling-america/",params={"q":f'"{ph}"',"dates":f"{y}/{y+12}","fo":"json","c":25},headers=UA,timeout=90).json()
            except Exception as e: print("relnews",k,ph,e); continue
            for x in r.get("results",[]):
                u=x.get("url") or x.get("id")
                if not u or u in have: continue
                d=" ".join(x.get("description") or [])[:600]
                new.append({"theme":k,"source":"Chronicling America (LoC)","title":re.sub(r"^Image \d+ of ","",str(x.get("title",""))),"date":x.get("date",""),
                  "thumb":(x.get("image_url") or [""])[0],"url":u,"preview":d,"query":f'"{ph}" · {y}–{y+12} (pre-harvested)',
                  "place":" ".join((x.get("location_city") or [])+(x.get("location_state") or []))}); have.add(u)
    L=(old+new)[-4000:]; json.dump(L,open("finds/rel_news.json","w"),separators=(",",":")); print("relnews +",len(new),"total",len(L))
if __name__=="__main__": harvest(1)
