"""Gemini protocol grayspace (port 1965, TLS, no CA). Search via geminispace.info / kennedy, then read a random hit."""
import socket, ssl, random, urllib.parse, re
from grayspace import BAD
def gget(url, n=60000, t=10):
    u=urllib.parse.urlparse(url); ctx=ssl.create_default_context(); ctx.check_hostname=False; ctx.verify_mode=ssl.CERT_NONE
    with socket.create_connection((u.hostname,u.port or 1965),timeout=t) as s, ctx.wrap_socket(s,server_hostname=u.hostname) as c:
        c.sendall((url+"\r\n").encode()); b=b""
        while len(b)<n:
            d=c.recv(8192)
            if not d: break
            b+=d
    head,_,body=b.partition(b"\r\n"); return head.decode("utf-8","replace"),body.decode("utf-8","replace")
WORDS=["theology","gnostic","occult","monastery","heresy","prophecy","ufo","alchemy","ritual","sermon","apocrypha","mysticism","patent","invention","esoteric","tarot","cult","pilgrim","saint","relic"]
SEARCH=["gemini://geminispace.info/search?{q}","gemini://kennedy.gemi.dev/search?{q}","gemini://tlgs.one/search?{q}"]
def gemini_find(n=12):
    import time; end=time.time()+240; out=[]
    for w in random.sample(WORDS,4):
        links=[]
        if time.time()>end: break
        for S in SEARCH:
            try:
                h,b=gget(S.format(q=urllib.parse.quote(w)))
                if not h.startswith("2"): print("gem",S[:30],h[:40]); continue
                links=[l.split()[1] for l in b.splitlines() if l.startswith("=> gemini://") and len(l.split())>1 and not re.search(r"geminispace.info|kennedy.gemi|tlgs.one",l)]
                print("gem",w,S[:30],len(links))
                if links: break
            except Exception as e: print("gem",S[:30],type(e).__name__)
        for L in random.sample(links,min(4,len(links))):
            if BAD.search(L): continue
            try:
                h,b=gget(L,8000)
                if not h.startswith("2") or "text/" not in h: continue
                txt=b.strip()
                if len(txt)<120 or BAD.search(txt[:3000]): continue
                title=next((l.lstrip("# ").strip() for l in txt.splitlines() if l.startswith("#")),L.split("/")[-1] or L)
                out.append({"source":"Geminispace","title":title[:120],"url":"https://portal.mozz.us/gemini/"+L[len("gemini://"):],"gemini":L,"date":"","dateLabel":"","count":len(txt),"countLabel":"chars read",
                  "kind":"text","thumb":"","host":urllib.parse.urlparse(L).hostname,"preview":txt[:1200],"query":f'gemini search "{w}"',"kw":w,"extra":f"capsule: {urllib.parse.urlparse(L).hostname} · read via Gemini protocol (port 1965)","links":[["gemini:// link",L]]})
            except Exception as e: print("gem read",type(e).__name__)
            if len(out)>=n: return out
    return out
if __name__=="__main__":
    o=gemini_find(6);print(len(o));[print(x["host"],"|",x["title"],"|",x["preview"][:80].replace("\n"," ")) for x in o]
