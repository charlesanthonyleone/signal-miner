"""Pass 9: pre-harvest slow public APIs (Gutendex, Open Library, Openverse) so the site can fall back to a cached pile when they time out."""
import json, random, requests, os, time
UA={"User-Agent":"signal-miner/1.0 (github.com/charlesanthonyleone/signal-miner)"}
W="lantern harbor orchard mill lighthouse quarry ferry canal railway telegraph almanac sermon diary letters ballad river forest winter garden island village chapel market bridge school".split()
def get(u,p,tries=2):
    for i in range(tries):
        try:
            r=requests.get(u,params=p,headers=UA,timeout=70)
            if r.status_code==200: return r.json()
            print("pre",u,r.status_code)
        except Exception as e: print("pre",u,e)
        time.sleep(5*(i+1))
    return None
def keep(name,new,idk,cap=3000):
    f=f"finds/{name}.json"
    old=json.load(open(f)) if os.path.exists(f) else []
    seen={str(x.get(idk)) for x in old}; add=[x for x in new if str(x.get(idk)) not in seen]
    L=(old+add)[-cap:]; json.dump(L,open(f,"w")); print(f,"+",len(add),"total",len(L))
def run(n=5):
    g=[];o=[];vi=[];va=[]
    for _ in range(n):
        j=get("https://gutendex.com/books/",{"page":random.choice([random.randint(1,120),random.randint(2350,2480)])}); g+= (j or {}).get("results",[])
        j=get("https://openlibrary.org/search.json",{"q":random.choice(W),"limit":30,"page":random.randint(1,5),"fields":"key,title,author_name,first_publish_year,cover_i,edition_count,ia,ebook_access"}); o+=(j or {}).get("docs",[])
        for kind,acc in (("images",vi),("audio",va)):
            j=get(f"https://api.openverse.org/v1/{kind}/",{"q":random.choice(W),"page_size":20,"page":random.randint(1,10)}); acc+=(j or {}).get("results",[])
    for b in g: b.pop("summaries",None)
    keep("pre_gutendex",g,"id"); keep("pre_openlib",o,"key"); keep("pre_openverse_images",vi,"id"); keep("pre_openverse_audio",va,"id")

def theo_gut(per=2):
    """Pass 10: themed Gutendex pile — every gut:[...] topic in theo.js, so Theo's Gutenberg source has on-theme fallback when gutendex is slow."""
    import re as _re
    src=open(os.path.join(os.path.dirname(__file__),"..","theo.js")).read()
    topics=sorted({t for g in _re.findall(r"gut:\[([^\]]*)\]",src) for t in _re.findall(r"'([^']+)'",g)})
    out=[]
    for t in topics:
        for pg in range(1,per+1):
            j=get("https://gutendex.com/books/",{"topic":t,"page":pg},tries=1)
            for b in (j or {}).get("results",[]): b.pop("summaries",None); b["_topic"]=t; out.append(b)
            if not j or not j.get("next"): break
    keep("pre_gutendex_theo",out,"id",cap=5000)

if __name__=="__main__": run(); theo_gut()
