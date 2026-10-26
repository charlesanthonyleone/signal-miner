"""Broad breadth-first crawl of known public open directories -> keyword-searchable file index."""
import json,random,sys,time
from concurrent.futures import ThreadPoolExecutor
from grayspace import listing,card,SPAM,BAD
ROOTS=["https://ftp.funet.fi/pub/culture/","https://ftp.funet.fi/pub/sci/","https://ftp.funet.fi/pub/doc/","https://ftp.funet.fi/pub/pics/",
 "https://ftp.funet.fi/pub/misc/","https://ftp.funet.fi/pub/archive/","http://www.textfiles.com/ufo/","http://www.textfiles.com/occult/",
 "http://www.textfiles.com/conspiracy/","http://www.textfiles.com/media/","http://www.textfiles.com/anarchy/","http://cd.textfiles.com/",
 "https://ftp.lip6.fr/pub/","https://mirror.aarnet.edu.au/pub/","https://ftp.cc.uoc.gr/","https://ftp.gnu.org/old-gnu/"]
def crawl(pages=1500,secs=480,roots=ROOTS):
    end=time.time()+secs; q=list(roots); seen=set(); out=[]
    def one(u):
        try: return u,listing(u)
        except Exception: return u,None
    with ThreadPoolExecutor(8) as ex:
        while q and len(seen)<pages and time.time()<end:
            batch=[]
            while q and len(batch)<16:
                u=q.pop(0)
                if u not in seen and not SPAM.search(u.split("/")[2]): seen.add(u); batch.append(u)
            for u,L in ex.map(one,batch):
                if not L: continue
                host=u.split("/")[2]
                for x in L:
                    if x["dir"]:
                        if x["url"].startswith(u) and len(x["url"])>len(u): q.append(x["url"])
                    elif not BAD.search(x["url"]):
                        out.append(card({**x,"host":host,"parent":u,"kw":""},f"open-dir crawl of {host}"))
            random.shuffle(q) if len(q)>400 else None
            print("pages",len(seen),"files",len(out),flush=True)
    return out
if __name__=="__main__":
    o=crawl(int(sys.argv[1]),int(sys.argv[2])); json.dump(o,open("/tmp/odcrawl.json","w")); print("DONE",len(o))
