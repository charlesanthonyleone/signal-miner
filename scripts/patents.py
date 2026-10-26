"""INVENTO patent miner — Google Patents xhr + Archive.org. Public only."""
import json, random, datetime, requests

UA = {"User-Agent": "SignalMiner/2.0 (github actions; hobby; public patents)"}
now = lambda: datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")

QUERIES = {
    "wild": [
        "spirit communication", "immortality apparatus", "thought reading",
        "mind control apparatus", "weather modification", "rain making",
        "flying saucer", "death ray", "anti gravity", "resurrection apparatus",
    ],
    "weird": [
        "perpetual motion", "flying car", "invisibility", "telepathy",
        "hat ventilator", "time machine", "smellophone",
    ],
    "survival": ["fallout shelter", "bomb shelter", "gas mask", "water purification", "emergency shelter"],
    "wartech": ["torpedo patent", "radar apparatus", "camouflage apparatus", "ordnance"],
    "formulas": ["toothpaste composition", "soft drink concentrate", "photographic developer"],
    "secret": ["invention secrecy act", "patent secrecy order"],
    "abandoned": ["abandoned patent application"],
    "expired": ["US patent"],
    "trademarks": ["expired trademark", "abandoned trademark"],
    "modernuse": ["pneumatic tube", "stereoscope", "wireless telegraphy"],
    "expired_patents": ["US1", "US2", "US3"],  # unused
}

def _txt(v):
    if isinstance(v, dict):
        return v.get("text") or v.get("name") or ""
    if isinstance(v, list):
        return ", ".join(_txt(x) for x in v if x)[:160]
    return str(v or "")

def gp_search(q, page=0):
    out = []
    try:
        r = requests.get(
            "https://patents.google.com/xhr/query",
            params={"url": f"q={q}&num=20&page={page}"},
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
    qs = list(QUERIES.get(mod, [mod]))
    random.shuffle(qs)
    found, seen = [], set()
    for q in qs:
        hits = gp_search(q) or ia_patents(q)
        for x in hits:
            key = x.get("patent_number") or x.get("url")
            if not key or key in seen:
                continue
            seen.add(key)
            x["module"] = mod
            x["mined_at"] = now()
            found.append(x)
            if len(found) >= n:
                return found
    return found
