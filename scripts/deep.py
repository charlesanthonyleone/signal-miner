import json, random, re, requests
UA={"User-Agent":"SignalMiner/2.0 (github actions; hobby project)"}
DEPTHS=["800 m · mesopelagic","1.5 km · bathypelagic","3 km · abyssal","6 km · hadal","10.9 km · Mariana"]
CC="https://index.commoncrawl.org/CC-MAIN-2026-39-index"
TLDS=[".museum",".edu",".is",".li",".fm",".io",".nu",".ws",".ge",".md",".kg",".by"]
# URL/title denylist for adult spam and obvious scam SEO — not a full classifier
BAD=re.compile(
    r"(porn|xxx|\bsex\b|nude|camgirl|onlyfans|hentai|\bjav\b|adultvideo|escort|"
    r"casino|bet\d|viagra|pharmacy|pharma|replica.?watch|crack.?key|warez|"
    r"05av|xnxx|xvideos|pornhub|xhamster|redtube)",
    re.I,
)

def is_bad(url_or_title: str) -> bool:
    return bool(BAD.search(url_or_title or ""))

def deep_crawl():
    """Obscure-TLD HTML captures from Common Crawl index; text/metadata only."""
    out=[]; seen=set(); hosts={}
    for _ in range(10):
        if len(out)>=16: break
        tld=random.choice(TLDS); page=random.randint(0,10)
        try:
            r=requests.get(CC,params={"url":f"*{tld}/*","output":"json","page":page,"limit":40,
                "filter":["mime:text/html","status:200"]},headers=UA,timeout=70)
            if r.status_code!=200 or not r.text.strip() or "No Captures" in r.text or r.text.strip()[:1] not in "{[":
                print("crawl",tld,page,r.status_code); continue
            rows=[]
            for line in r.text.strip().splitlines():
                try: rows.append(json.loads(line))
                except Exception: pass
            random.shuffle(rows); added=0
            for row in rows:
                url=row.get("url") or ""
                if not url or url in seen or is_bad(url): continue
                host=url.split("/")[2] if "://" in url else ""
                if hosts.get(host,0)>=2: continue
                if any(host.endswith(b) for b in ("google.com","facebook.com","wikipedia.org","amazon.com","youtube.com")): continue
                ts=row.get("timestamp") or ""
                date=f"{ts[:4]}-{ts[4:6]}-{ts[6:8]}" if len(ts)>=8 else ""
                out.append({"source":"Common Crawl","title":url.replace("https://","").replace("http://","")[:100],
                  "date":date,"dateLabel":"captured",
                  "count":int(row["length"]) if str(row.get("length","")).isdigit() else None,
                  "countLabel":"bytes (warc)","kind":"meta","depth":random.choice(DEPTHS),
                  "mime":row.get("mime") or "text/html",
                  "preview":"(open source link for live text — pre-mined metadata only)",
                  "url":url,"query":f"CC-MAIN-2026-39 url=*{tld}/* page={page}",
                  "extra":f"mime {row.get('mime')} · status {row.get('status')} · host {host}"})
                seen.add(url); hosts[host]=hosts.get(host,0)+1; added+=1
                if added>=4 or len(out)>=16: break
            print("crawl",tld,page,"+",added)
        except Exception as e:
            print("crawl err",e)
    return out

def deep_gopher():
    holes=["gopher://gopher.floodgap.com/1/","gopher://gopher.floodgap.com/1/new","gopher://gopher.floodgap.com/1/world",
           "gopher://gopher.floodgap.com/1/fun","gopher://sdf.org/1/","gopher://gopher.quux.org/1/",
           "gopher://gopher.floodgap.com/1/world/ka","gopher://gopherpedia.com/1/"]
    out=[]
    for h in random.sample(holes,min(4,len(holes))):
        gw="https://gopher.floodgap.com/gopher/gw?a="+requests.utils.quote(h,safe="")
        try: html=requests.get(gw,headers=UA,timeout=40).text
        except Exception as e: print("gopher",h,e); continue
        text=re.sub(r"(?is)<script.*?</script>|<style.*?</style>","",html)
        text=re.sub(r"(?is)<[^>]+>","\n",text)
        text=re.sub(r"\n{2,}","\n",text).strip()[:1200]
        if len(text)<40: continue
        out.append({"source":"Gopher","title":h.replace("gopher://","")[:100],"date":"","dateLabel":"","count":len(text),"countLabel":"chars",
          "kind":"meta","depth":random.choice(DEPTHS),"mime":"text/gopher",
          "preview":text,"url":gw,"query":f"floodgap gateway {h}","extra":"via public Floodgap HTTP gateway"})
    return out

def deep_opendir():
    """Find public Index-of pages via urlscan.io public search, then list filenames only."""
    out=[]
    q=random.choice(['page.title:"Index of /"','page.title:"Index of" AND page.mimeType:text/html','page.title:"Parent Directory"'])
    try:
        r=requests.get("https://urlscan.io/api/v1/search/",params={"q":q,"size":30},headers=UA,timeout=40)
        results=r.json().get("results",[])
    except Exception as e:
        print("urlscan",e); results=[]
    for item in random.sample(results,min(12,len(results))) if results else []:
        page=item.get("page",{}); url=page.get("url") or item.get("task",{}).get("url")
        if not url or not url.startswith("http") or is_bad(url): continue
        try:
            h=requests.get(url,headers=UA,timeout=12,allow_redirects=True)
            body=h.text[:12000]
        except Exception: continue
        low=body.lower()
        if "index of" not in low and "parent directory" not in low: continue
        files=re.findall(r'href=["\']([^"\']+)["\']',body,flags=re.I)
        files=[f.split("?")[0] for f in files if not f.startswith("?") and f not in ("/","../")]
        files=[f for f in files if "." in f.rstrip("/").split("/")[-1]][:40]
        listing=[]
        for f in files:
            name=f.rstrip("/").split("/")[-1]
            if is_bad(name): continue
            ext=name.rsplit(".",1)[-1].lower() if "." in name else "?"
            listing.append(f"{name}  [{ext}]")
        date=(item.get("task",{}).get("time") or "")[:10]
        preview="Index of / (filenames only)\n"+"\n".join(listing[:25])
        out.append({"source":"Open Directory","title":url[:120],"date":date,"dateLabel":"seen",
          "count":len(listing),"countLabel":"files listed","kind":"meta","depth":random.choice(DEPTHS),
          "mime":"text/html","preview":preview,"url":url,
          "query":f'urlscan {q}',"extra":f"domain {page.get('domain','?')} · status {page.get('status','?')}"})
        if len(out)>=8: break
    return out
