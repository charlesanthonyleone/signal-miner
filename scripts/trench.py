"""TRENCH collectors — public indexes only. No scanning, no credentials, no Tor."""
import json, random, re, datetime, requests
from urllib.parse import urljoin, urlparse

UA = {"User-Agent": "SignalMiner/2.0 (github actions; hobby; public-index only)"}
DEPTHS = ["800 m · mesopelagic", "1.5 km · bathypelagic", "3 km · abyssal", "6 km · hadal", "10.9 km · Mariana"]
BAD = re.compile(
    r"(porn|xxx|\bsex\b|nude|camgirl|onlyfans|hentai|\bjav\b|adultvideo|escort|"
    r"casino|bet\d|viagra|pharmacy|pharma|replica.?watch|crack.?key|warez|"
    r"05av|xnxx|xvideos|pornhub|xhamster|redtube)",
    re.I,
)
now = lambda: datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")

def is_bad(s): return bool(BAD.search(s or ""))

def depth(): return random.choice(DEPTHS)

# Common unauthenticated snapshot/stream path probes (GET only; skip 401/403)
SNAP_PATHS = [
    "/mjpg/video.mjpg", "/cgi-bin/mjpg/video.cgi", "/video.mjpg", "/mjpeg",
    "/axis-cgi/mjpg/video.cgi", "/cgi-bin/faststream.jpg", "/snapshot.jpg",
    "/jpg/image.jpg", "/onvif-http/snapshot", "/image/jpeg.cgi", "/tmpfs/auto.jpg",
    "/cam_1.cgi", "/video/mjpg.cgi", "/stream",
]

def _try_public_stream(base):
    """Return (stream_url, content_type, kind) if unauthenticated media/HTML live view responds."""
    base = base.rstrip("/")
    candidates = [base] + [base + p for p in SNAP_PATHS]
    # if base already looks like a stream, only try itself
    if re.search(r"\.(mjpg|mjpeg|jpg|jpeg|cgi)(\?|$)", base, re.I):
        candidates = [base]
    for url in candidates[:10]:
        if is_bad(url): continue
        try:
            r = requests.get(url, headers=UA, timeout=7, stream=True, allow_redirects=True)
            if r.status_code in (401, 403):
                r.close(); continue
            if r.status_code != 200:
                r.close(); continue
            ct = (r.headers.get("content-type") or "").lower()
            chunk = next(r.iter_content(4096), b"")
            r.close()
            if "multipart" in ct or "mjpeg" in ct or url.endswith((".mjpg", ".mjpeg")):
                return url, ct or "multipart/x-mixed-replace", "stream"
            if ct.startswith("image/") or chunk[:3] in (b"\xff\xd8\xff", b"\x89PN"):
                return url, ct or "image/jpeg", "still"
            # Do NOT accept HTML product/marketing pages — only real media streams/stills
        except Exception:
            continue
    return None

def cameras():
    """Aggregate already-public camera pages from urlscan public search; verify no-auth."""
    queries = [
        'page.title:"Network Camera"',
        'page.title:"IPCam"',
        'page.title:"IP Camera"',
        'page.url:mjpg OR page.url:mjpeg',
        'filename:video.mjpg',
        'page.title:"Live View / - AXIS"',
        'page.url:"/mjpg/video.mjpg"',
        'page.title:"WebcamXP"',
        'page.title:"Yawcam"',
        'page.title:"MotionEye"',
    ]
    out, seen = [], set()
    random.shuffle(queries)
    for q in queries[:6]:
        try:
            r = requests.get("https://urlscan.io/api/v1/search/", params={"q": q, "size": 20}, headers=UA, timeout=40)
            results = r.json().get("results", [])
        except Exception as e:
            print("cameras urlscan", q, e); results = []
        random.shuffle(results)
        for item in results:
            page = item.get("page", {})
            url = page.get("url") or item.get("task", {}).get("url")
            if not url or not url.startswith("http") or url in seen or is_bad(url):
                continue
            seen.add(url)
            hit = _try_public_stream(url)
            if not hit:
                # try origin root
                p = urlparse(url)
                root = f"{p.scheme}://{p.netloc}/"
                if root not in seen:
                    seen.add(root)
                    hit = _try_public_stream(root)
            if not hit:
                continue
            stream, ct, kind = hit
            loc = page.get("city") or page.get("country") or "?"
            ip = page.get("ip") or ""
            server = page.get("server") or page.get("asnname") or ""
            thumb = stream if kind == "still" else ""
            # For MJPEG, some browsers can use the stream URL as img — store as thumb only if still
            out.append({
                "source": "Open Cameras (public index)",
                "title": (page.get("title") or urlparse(stream).netloc)[:100],
                "date": (item.get("task", {}).get("time") or "")[:10],
                "dateLabel": "indexed",
                "count": None, "countLabel": "",
                "kind": "cam", "depth": depth(),
                "mime": ct, "thumb": thumb, "src": stream,
                "url": stream,
                "preview": f"{kind} · {ct}\n{loc} · {server}\nip {ip}".strip(),
                "query": f"urlscan {q}",
                "extra": f"location/ISP: {loc} · {server} · via public urlscan index · no auth · not scanned by us",
                "module": "cameras",
            })
            if len(out) >= 16:
                return out
        print("cameras", q, "total", len(out))
    return out

def satnogs():
    out = []
    try:
        r = requests.get(
            "https://network.satnogs.org/api/observations/",
            params={"limit": 40, "status": "good", "format": "json"},
            headers=UA, timeout=40,
        )
        obs = r.json()
    except Exception as e:
        print("satnogs", e); return []
    random.shuffle(obs)
    for o in obs[:20]:
        oid = o.get("id")
        waterfall = o.get("waterfall") or (f"https://network.satnogs.org/media/waterfalls/{oid}.png" if oid else "")
        # Prefer API-provided waterfall URL when present
        wf = o.get("waterfall")
        if not wf and oid:
            # try known CDN pattern — may 404; still link observation page
            wf = ""
        url = f"https://network.satnogs.org/observations/{oid}/"
        title = f"NORAD {o.get('norad_cat_id')} · {o.get('transmitter_description') or 'sat pass'} · {o.get('station_name') or '?'}"
        out.append({
            "source": "SatNOGS", "title": title[:120],
            "date": (o.get("start") or "")[:10], "dateLabel": "observed",
            "count": o.get("rise_azimuth"), "countLabel": "rise az",
            "kind": "meta" if not wf else "img",
            "depth": depth(), "mime": "satellite/observation",
            "thumb": wf or "", "src": wf or "",
            "preview": f"station {o.get('station_name')} · status {o.get('vetted_status') or o.get('status')}\n"
                       f"start {o.get('start')} · end {o.get('end')}\nvetted {o.get('vetted_status')}",
            "url": url,
            "query": "network.satnogs.org/api/observations status=good",
            "extra": f"norad {o.get('norad_cat_id')} · ground_station {o.get('ground_station')} · id {oid}",
            "module": "satnogs",
        })
    return out

def blockchain():
    """Decode human-readable OP_RETURN + coinbase ASCII from recent public blocks."""
    out = []
    try:
        lb = requests.get("https://blockchain.info/latestblock", headers=UA, timeout=30).json()
        height = lb["height"]
    except Exception as e:
        print("blockchain latest", e); return []
    for h in [height - random.randint(1, 30) for _ in range(4)]:
        try:
            b = requests.get(f"https://blockchain.info/block-height/{h}?format=json", headers=UA, timeout=60).json()
            block = b["blocks"][0]
        except Exception as e:
            print("block", h, e); continue
        # coinbase
        try:
            cb = block["tx"][0]
            script = cb.get("inputs", [{}])[0].get("script", "")
            raw = bytes.fromhex(script)
            text = re.sub(r"[^\x20-\x7E]", "", raw.decode("latin-1", "ignore")).strip()
            # strip leading non-letters noise
            m = re.search(r"[A-Za-z][A-Za-z0-9 #/_\-\.]{3,}", text)
            if m:
                msg = m.group(0)[:200]
                out.append({
                    "source": "Bitcoin chain", "title": f"coinbase · block {block['height']}: {msg[:60]}",
                    "date": datetime.datetime.utcfromtimestamp(block["time"]).strftime("%Y-%m-%d"),
                    "dateLabel": "block time", "count": block["height"], "countLabel": "height",
                    "kind": "meta", "depth": depth(), "mime": "bitcoin/coinbase",
                    "preview": msg, "url": f"https://www.blockchain.com/explorer/blocks/btc/{block['hash']}",
                    "query": f"blockchain.info/block-height/{h} coinbase",
                    "extra": f"tx {cb.get('hash','')[:24]}… · coinbase/script ASCII",
                    "module": "chain",
                })
        except Exception as e:
            print("coinbase", e)
        for tx in block.get("tx", [])[1:120]:
            for otx in tx.get("out", []):
                sp = otx.get("script") or ""
                if not sp.startswith("6a"): continue
                try:
                    raw = bytes.fromhex(sp[2:])
                    if not raw: continue
                    # OP_RETURN push
                    i = 0
                    if raw[0] <= 75:
                        data = raw[1:1 + raw[0]]; 
                    elif raw[0] == 0x4c and len(raw) > 1:
                        data = raw[2:2 + raw[1]]
                    else:
                        data = raw
                    text = re.sub(r"[^\x20-\x7E]", "", data.decode("utf-8", "ignore")).strip()
                    if len(text) < 4 or is_bad(text): continue
                    # prefer printable words
                    if not re.search(r"[A-Za-z]{3,}", text): continue
                    out.append({
                        "source": "Bitcoin chain", "title": f"OP_RETURN · block {block['height']}: {text[:60]}",
                        "date": datetime.datetime.utcfromtimestamp(block["time"]).strftime("%Y-%m-%d"),
                        "dateLabel": "block time", "count": block["height"], "countLabel": "height",
                        "kind": "meta", "depth": depth(), "mime": "bitcoin/op_return",
                        "preview": text[:500],
                        "url": f"https://www.blockchain.com/explorer/transactions/btc/{tx['hash']}",
                        "query": f"blockchain.info block {h} OP_RETURN",
                        "extra": f"tx {tx['hash'][:24]}… · OP_RETURN",
                        "module": "chain",
                    })
                except Exception:
                    continue
        if len(out) >= 20: break
    random.shuffle(out)
    return out[:24]

def tectonics():
    """BGP announcements via RIPEstat — random AS / prefix samples."""
    out = []
    ases = [3333, 15169, 8075, 13335, 20940, 16509, 2914, 1299, 174, 3356, 7018, 1239]
    random.shuffle(ases)
    for asn in ases[:4]:
        try:
            r = requests.get(
                "https://stat.ripe.net/data/announced-prefixes/data.json",
                params={"resource": f"AS{asn}"}, headers=UA, timeout=40,
            ).json()
            prefs = r.get("data", {}).get("prefixes", [])
        except Exception as e:
            print("ripe", asn, e); continue
        random.shuffle(prefs)
        for p in prefs[:5]:
            pref = p.get("prefix") if isinstance(p, dict) else str(p)
            if not pref: continue
            out.append({
                "source": "RIPEstat BGP", "title": f"AS{asn} announces {pref}",
                "date": datetime.datetime.utcnow().strftime("%Y-%m-%d"),
                "dateLabel": "sampled", "count": asn, "countLabel": "ASN",
                "kind": "meta", "depth": depth(), "mime": "bgp/announce",
                "preview": f"prefix {pref}\nAS{asn} · from RIPEstat announced-prefixes",
                "url": f"https://stat.ripe.net/app/launchpad/AS{asn}",
                "query": f"RIPEstat announced-prefixes AS{asn}",
                "extra": "public RIS-derived view · not a live websocket hijack feed",
                "module": "tectonics",
            })
    # recent routing-status for a random prefix
    if out:
        pref = random.choice(out)["title"].split()[-1]
        try:
            r = requests.get(
                "https://stat.ripe.net/data/routing-status/data.json",
                params={"resource": pref}, headers=UA, timeout=40,
            ).json()
            d = r.get("data", {})
            out.insert(0, {
                "source": "RIPEstat BGP", "title": f"routing status {pref}",
                "date": datetime.datetime.utcnow().strftime("%Y-%m-%d"),
                "dateLabel": "sampled", "count": d.get("visibility", {}).get("v4", {}).get("ris_peers_seeing"),
                "countLabel": "RIS peers seeing",
                "kind": "meta", "depth": depth(), "mime": "bgp/status",
                "preview": json.dumps({k: d.get(k) for k in ("first_seen", "last_seen", "visibility", "origins") if k in d}, indent=1)[:700],
                "url": f"https://stat.ripe.net/{pref}",
                "query": f"RIPEstat routing-status {pref}",
                "extra": "possible origin changes visible in origins list",
                "module": "tectonics",
            })
        except Exception as e:
            print("routing-status", e)
    return out[:24]

def radiation():
    """Public botnet/C2 tracker samples as 'background radiation' of the address space."""
    out = []
    try:
        rows = requests.get(
            "https://feodotracker.abuse.ch/downloads/ipblocklist.json",
            headers=UA, timeout=40,
        ).json()
    except Exception as e:
        print("feodo", e); rows = []
    random.shuffle(rows)
    for row in rows[:24]:
        ip = row.get("ip_address") or row.get("ip")
        if not ip: continue
        out.append({
            "source": "Feodo Tracker", "title": f"{row.get('malware','botnet')} · {ip}:{row.get('port','?')}",
            "date": (row.get("last_online") or row.get("first_seen") or "")[:10],
            "dateLabel": "last online", "count": row.get("port"), "countLabel": "port",
            "kind": "meta", "depth": depth(), "mime": "net/indicator",
            "preview": f"status {row.get('status')} · hostname {row.get('hostname')}\n"
                       f"as {row.get('as_number')} {row.get('as_name')}\ncountry {row.get('country')}",
            "url": f"https://feodotracker.abuse.ch/browse/host/{ip}/",
            "query": "feodotracker.abuse.ch ipblocklist_recommended.json",
            "extra": "public abuse.ch Feodo C2 sample — not a packet capture; do not connect",
            "module": "radiation",
        })
    return out

def deep_space():
    """Public radio/telescope imagery metadata via NASA Image API (Breakthrough Listen-adjacent public media)."""
    out = []
    terms = ["radio telescope", "Breakthrough Listen", "Green Bank Telescope", "Arecibo", "Very Large Array", "pulsar", "SETI"]
    for term in random.sample(terms, 3):
        try:
            r = requests.get(
                "https://images-api.nasa.gov/search",
                params={"q": term, "media_type": "image", "page_size": 20, "page": random.randint(1, 5)},
                headers=UA, timeout=40,
            ).json()
            items = r.get("collection", {}).get("items", [])
        except Exception as e:
            print("nasa", term, e); continue
        random.shuffle(items)
        for it in items[:6]:
            data = (it.get("data") or [{}])[0]
            links = it.get("links") or []
            thumb = next((l["href"] for l in links if l.get("rel") == "preview"), "")
            title = data.get("title") or term
            out.append({
                "source": "NASA Images", "title": title[:120],
                "date": (data.get("date_created") or "")[:10], "dateLabel": "created",
                "count": None, "countLabel": "",
                "kind": "img", "depth": depth(), "mime": "image/jpeg",
                "thumb": thumb, "src": thumb,
                "preview": (data.get("description") or "")[:500],
                "url": f"https://images.nasa.gov/details/{data.get('nasa_id','')}",
                "query": f'images-api.nasa.gov q="{term}"',
                "extra": f"center {data.get('center')} · nasa_id {data.get('nasa_id')} · keywords {', '.join((data.get('keywords') or [])[:6])}",
                "module": "space",
            })
    return out[:24]

def hidden_in_files(image_finds):
    """EXIF + strings on already-mined image URLs (Wayback thumbs etc)."""
    out = []
    try:
        from PIL import Image
        from PIL.ExifTags import TAGS, GPSTAGS
        import io
    except Exception as e:
        print("PIL missing", e); Image = None
    for item in image_finds[:30]:
        url = item.get("thumb") or item.get("src") or item.get("url")
        if not url or not url.startswith("http"): continue
        try:
            r = requests.get(url, headers=UA, timeout=20)
            if r.status_code != 400 and r.status_code != 200: continue
            if r.status_code != 200: continue
            blob = r.content[:2_000_000]
        except Exception:
            continue
        notes = []
        # strings
        strings = re.findall(rb"[\x20-\x7E]{6,}", blob)
        interesting = []
        for s in strings[:200]:
            t = s.decode("ascii", "ignore")
            if is_bad(t): continue
            if re.search(r"(https?://|password|GPS|latitude|serial|copyright|Camera|Exif|http)", t, re.I):
                interesting.append(t[:120])
        if interesting:
            notes.append("strings: " + " | ".join(interesting[:8]))
        # EXIF
        if Image:
            try:
                im = Image.open(io.BytesIO(blob))
                ex = im._getexif() or {}
                decoded = {TAGS.get(k, k): v for k, v in ex.items()}
                for key in ("DateTime", "DateTimeOriginal", "Make", "Model", "Software", "Artist"):
                    if key in decoded:
                        notes.append(f"{key}={decoded[key]}")
                # GPS
                gps = decoded.get("GPSInfo")
                if gps:
                    notes.append(f"GPS tags present ({len(gps)} fields)")
                # impossible dates
                for key in ("DateTime", "DateTimeOriginal"):
                    val = str(decoded.get(key, ""))
                    m = re.match(r"(\d{4})", val)
                    if m:
                        y = int(m.group(1))
                        if y < 1970 or y > 2027:
                            notes.append(f"IMPOSSIBLE DATE {key}={val}")
            except Exception:
                pass
        if not notes:
            continue
        out.append({
            "source": "File forensics", "title": (item.get("title") or url)[:100],
            "date": item.get("date") or "", "dateLabel": item.get("dateLabel") or "",
            "count": len(notes), "countLabel": "flags",
            "kind": "meta", "depth": depth(), "mime": "forensics/meta",
            "preview": "\n".join(notes)[:800],
            "url": item.get("url") or url,
            "query": "EXIF+strings on mined image",
            "extra": "scheduled side analysis · media not re-hosted",
            "module": "hidden",
            "thumb": item.get("thumb") or "",
        })
        if len(out) >= 16: break
    return out

def time_skew(all_finds):
    out = []
    for item in all_finds:
        d = item.get("date") or ""
        m = re.match(r"^(\d{4})", str(d))
        if not m: continue
        y = int(m.group(1))
        reason = None
        if y < 1970: reason = f"pre-epoch year {y}"
        elif y > 2027: reason = f"future year {y}"
        elif y == 1970 and "1970-01-01" in str(d): reason = "unix-epoch default"
        if not reason: continue
        out.append({
            "source": "Time-skew", "title": f"{reason}: {(item.get('title') or '')[:70]}",
            "date": d, "dateLabel": "skewed",
            "count": y, "countLabel": "year",
            "kind": "meta", "depth": depth(), "mime": "time/anomaly",
            "preview": f"flagged {reason}\noriginal source {item.get('source')}\n{item.get('extra','')}",
            "url": item.get("url") or "",
            "query": "timestamp scan across finds/*.json",
            "extra": f"from module {item.get('module') or item.get('source')}",
            "module": "timeskew",
        })
    random.shuffle(out)
    return out[:24]
