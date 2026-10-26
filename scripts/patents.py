"""INVENTO patent miner — Google Patents xhr + Archive.org. Public only."""
import json, random, datetime, requests

UA = {"User-Agent": "SignalMiner/2.0 (github actions; hobby; public patents)"}
now = lambda: datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")

# module -> list of (terms, CPC). Google Patents xhr accepts q=...&cpc=...; before=priority:YYYYMMDD keeps it to old, rarely-viewed filings.
QUERIES = {
    "expired":   [("novelty",""),("improved apparatus","A47G"),("toy","A63H"),("kitchen utensil","A47J")],
    "abandoned": [("amusement device","A63G"),("garment","A41D"),("vehicle","B62K"),("game apparatus","A63F")],
    "secret":    [("cipher","H04K"),("secret communication","H04K"),("cryptographic","H04L9"),("concealment","F41H3"),("eavesdropping","")],
    "wartech":   [("torpedo","F42B19"),("aerial bomb","F42B"),("decoy","F41J"),("armor plate","F41H5"),("death ray",""),("flamethrower","F41H9")],
    "modernuse": [("pneumatic tube","B65G51"),("phonograph","G11B3"),("telegraph","H04L15"),("clockwork","G04B")],
    "formulas":  [("tonic","A61K36"),("beverage","A23L2"),("confection","A23G"),("hair tonic","A61K8"),("liqueur","C12G")],
    "survival":  [("fallout shelter","E04H9"),("bomb shelter","E04H9"),("gas mask","A62B"),("water purification","C02F1"),("radiation shield","G21F")],
    "dead":      [("spirit communication",""),("communicating with the dead",""),("seance",""),("ghost detector",""),("psychic",""),("casket signal","A61G17")],
    "immortal":  [("resurrection",""),("suspended animation","A01N1/02"),("rejuvenation","A61K35"),("immortality",""),("reviving","A61H31"),("cryopreservation","A01N1/02")],
    "mindctl":   [("hypnotizing","A61M21"),("subliminal","A61M21"),("mind control",""),("thought transmission",""),("brain wave","A61N1/36"),("mesmerism","")],
    "weather":   [("rain making","A01G15"),("cloud seeding","A01G15"),("hurricane","A01G15"),("fog dispersal","E01H13"),("hail prevention","A01G15"),("lightning","H05F7")],
    "aliens":    [("flying saucer","B64C39/06"),("extraterrestrial",""),("asteroid deflection","B64G"),("interplanetary","B64G"),("anti gravity","")],
    "deterrent": [("death ray",""),("electromagnetic pulse","H05K9"),("nuclear explosion","G21J"),("blast shelter","E04H9"),("retaliation","")],
}
RE = {
    "dead": r"spirit|dead|deceased|s[eé]ance|ghost|psychic|medium|grave|casket|burial|afterlife|paranormal",
    "mindctl": r"hypno|sublimin|mind|thought|brain|mesmer|trance|behavio|sleep|neural",
    "weather": r"rain|cloud|weather|hail|fog|hurricane|storm|lightning|precipitat|atmospher",
    "aliens": r"saucer|extraterrest|asteroid|planet|space|gravity|meteor|ufo|orbit",
    "immortal": r"resurrect|suspend|rejuven|immortal|reviv|cryo|preserv|aging|life",
    "deterrent": r"ray|pulse|nuclear|blast|explos|retaliat|weapon|shelter|emp\b",
}

def _txt(v):
    if isinstance(v, dict):
        return v.get("text") or v.get("name") or ""
    if isinstance(v, list):
        return ", ".join(_txt(x) for x in v if x)[:160]
    return str(v or "")

def gp_search(q, page=0, cpc="", before=""):
    out = []
    try:
        r = requests.get(
            "https://patents.google.com/xhr/query",
            params={"url": f"q=({q})&num=40&page={page}"+(f"&cpc={cpc}" if cpc else "")+(f"&before=priority:{before}" if before else "")},
            headers=UA,
            timeout=45,
        )
        if r.status_code != 200:
            print("gp status", r.status_code, q)
            return out
        data = r.json()
    except Exception as e:
        print("gp err", q, e)
        return out
    for cl in (data.get("results") or {}).get("cluster") or []:
        for item in cl.get("result") or []:
            pat = item.get("patent") or item
            num = _txt(pat.get("publication_number") or pat.get("patent_id") or item.get("id") or "").replace("patent/", "")
            title = _txt(pat.get("title"))
            abstract = _txt(pat.get("abstract") or item.get("snippet"))
            date = _txt(pat.get("publication_date") or pat.get("priority_date"))[:10]
            inventor = _txt(pat.get("inventor") or pat.get("inventors"))
            if not num and not title:
                continue
            gurl = f"https://patents.google.com/patent/{num}/en" if num else "https://patents.google.com/"
            out.append({
                "source": "Google Patents",
                "title": (title or num)[:140],
                "date": date,
                "dateLabel": "published",
                "count": None,
                "countLabel": "",
                "kind": "meta",
                "mime": "patent/text",
                "thumb": "",
                "src": "",
                "preview": abstract[:700],
                "url": gurl,
                "query": f'google patents q="{q}"',
                "extra": f"patent {num} · inventor {inventor or '?'}",
                "patent_number": num,
                "inventor": inventor,
            })
    return out

def ia_patents(q, rows=20):
    out = []
    try:
        r = requests.get(
            "https://archive.org/advancedsearch.php",
            params={
                "q": f"mediatype:texts AND (collection:uspto OR subject:patents) AND ({q})",
                "rows": rows,
                "output": "json",
                "fl[]": ["identifier", "title", "publicdate", "creator", "description"],
            },
            headers=UA,
            timeout=60,
        )
        docs = r.json()["response"]["docs"]
    except Exception as e:
        print("ia", q, e)
        return out
    for d in docs:
        ident = d.get("identifier")
        if not ident:
            continue
        desc = d.get("description")
        if isinstance(desc, list):
            desc = " ".join(desc)
        out.append({
            "source": "Internet Archive USPTO",
            "title": (d.get("title") or ident)[:140],
            "date": (d.get("publicdate") or "")[:10],
            "dateLabel": "uploaded",
            "count": None,
            "countLabel": "",
            "kind": "iframe",
            "mime": "patent/scan",
            "thumb": f"https://archive.org/services/img/{ident}",
            "src": f"https://archive.org/embed/{ident}",
            "preview": (desc or "")[:700],
            "url": f"https://archive.org/details/{ident}",
            "query": f"archive.org USPTO {q}",
            "extra": f"creator: {_txt(d.get('creator'))}",
            "patent_number": "",
            "inventor": _txt(d.get("creator")),
        })
    return out

def mine_module(mod, n=16):
    import re as _re
    qs = list(QUERIES.get(mod, [(mod, "")])); random.shuffle(qs)
    rx = _re.compile(RE[mod], _re.I) if mod in RE else None
    found, seen = [], set()
    for q, cpc in qs:
        before = random.choice(["19400101", "19600101", "19800101", "20000101", ""])
        hits = gp_search(q, page=random.randint(0, 2), cpc=cpc, before=before) or gp_search(q, cpc=cpc)
        print("gp", mod, q, cpc, before, len(hits))
        for x in hits:
            key = x.get("patent_number") or x.get("url")
            if not key or key in seen: continue
            if rx and not rx.search(x["title"] + " " + x.get("preview", "")): continue
            seen.add(key); x["module"] = mod; x["mined_at"] = now()
            x["query"] = f'google patents q="{q}"' + (f" cpc={cpc}" if cpc else "") + (f" before {before[:4]}" if before else "")
            found.append(x)
            if len(found) >= n: return found
    return found
