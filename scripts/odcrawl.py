"""Broad breadth-first crawl of known public open directories -> keyword-searchable file index."""
import json,random,sys,time
from concurrent.futures import ThreadPoolExecutor
from grayspace import listing,card,SPAM,BAD
ROOTS=["https://ftp.funet.fi/pub/culture/","https://ftp.funet.fi/pub/sci/","https://ftp.funet.fi/pub/doc/","https://ftp.funet.fi/pub/pics/",
 "https://ftp.funet.fi/pub/misc/","https://ftp.funet.fi/pub/archive/","http://www.textfiles.com/ufo/","http://www.textfiles.com/occult/",
 "http://www.textfiles.com/conspiracy/","http://www.textfiles.com/media/","http://www.textfiles.com/anarchy/","http://cd.textfiles.com/",
 "https://avalonlibrary.net/ebooks/","https://ftp.acc.umu.se/pub/conspiracy/","https://ftp.sunet.se/mirror/archive/ftp.sunet.se/pub/tv+movies/",
 "https://ftp.sunet.se/mirror/archive/ftp.sunet.se/pub/Internet-documents/","https://ftp.funet.fi/pub/culture/tv+film/","https://ftp.acc.umu.se/pub/EFLIB/",
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

# ---- NEW-HOST DISCOVERY (Action-side): Bing RSS phrase search for Apache/nginx listings, verified by fetching the listing.
import re, requests, urllib.parse
THEMES=["ufo","occult","vhs","conspiracy","paranormal","ghost","bbs","zine","textfiles","shortwave","numbers station","radio","tv","cult","esoteric","folklore","cryptid","mpg","avi","scans","newsletter","fanzine","mythology","magick","alchemy","tarot","psychic","cold war","propaganda","pulp","comics","amiga","demoscene","cassette","8mm","home movies","public domain film","sci-fi","horror","video","movies","midi","mod tracker","ham radio","astronomy"]
NOHOST=re.compile(r"xxx|porn|sex|nude|adult|reddit|github|wikipedia|stackoverflow|bing\.|google\.|youtube|facebook|archive\.org|ubuntu|debian|centos|fedora|kernel\.org|pypi|npmjs|maven|\.(gov|mil)/",re.I)
def discover_hosts(n=6,known=()):
    found={}
    for kw in random.sample(THEMES,n):
        q=f'"index of /" "parent directory" {kw}'
        try:
            t=requests.get("https://www.bing.com/search",params={"q":q,"format":"rss","count":30},headers={"User-Agent":"Mozilla/5.0 (X11; Linux x86_64) Chrome/120"},timeout=25).text
            for u in re.findall(r"<link>(https?://[^<]+)</link>",t):
                u=urllib.parse.unquote(u)
                if NOHOST.search(u) or SPAM.search(u) or BAD.search(u) or u in known: continue
                found.setdefault(u,kw)
        except Exception as e: print("bing",kw,type(e).__name__)
        time.sleep(2)
    ok=[]
    for u,kw in list(found.items())[:40]:
        try:
            L=listing(u if u.endswith("/") else u.rsplit("/",1)[0]+"/")
            if L and len(L)>=3: ok.append({"root":u if u.endswith("/") else u.rsplit("/",1)[0]+"/","kw":kw,"n":len(L),"found":time.strftime("%Y-%m-%d")})
        except Exception: pass
    print("discovered",len(found),"verified",len(ok)); return ok
