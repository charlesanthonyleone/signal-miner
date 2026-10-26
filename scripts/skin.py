"""Server-side image pre-screen (Action): fraction of pixels in a conservative YCbCr skin range.
Images above THRESH are dropped before they ever reach the site; the rest carry their score."""
import io,requests
THRESH=0.38
def skin_ratio(url,timeout=25):
    from PIL import Image
    b=requests.get(url,timeout=timeout,headers={"User-Agent":"Mozilla/5.0 signal-miner prescreen"}).content[:4_000_000]
    im=Image.open(io.BytesIO(b)).convert("YCbCr").resize((64,64))
    px=list(im.getdata()); k=sum(1 for y,cb,cr in px if y>60 and 77<=cb<=127 and 133<=cr<=173)
    return k/len(px)
def prescreen(items):
    out=[]
    for x in items:
        if x.get("kind")!="img" and x.get("ftype")!="image": out.append(x); continue
        try: r=skin_ratio(x.get("src") or x.get("url"))
        except Exception as e: x["skin"]=None; x["extra"]=(x.get("extra","")+" · pixel pre-screen failed").strip(" ·"); out.append(x); continue
        if r>THRESH: print("skin drop",round(r,2),x.get("url")); continue
        x["skin"]=round(r,3); out.append(x)
    return out
