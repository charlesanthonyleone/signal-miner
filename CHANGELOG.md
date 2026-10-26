# Changelog — 2026-10-26
- TRENCH is grayspace-only: archive.org/YouTube removed from all deep modules (NOIA filter); Internet Archive stays in LIVE only.
- OPEN DIRECTORIES flagship (keyword + random): title-gated "Index of" discovery (DDG/Bing/Mojeek in Action), urlscan, curated mirror seeds (funet, ibiblio, textfiles, lip6, aarnet…); spam-TLD/gambling filter; harvested to finds/deep_odindex.json.
- Deep video/image repointed to Wayback CDX of dead hosts (GeoCities/Angelfire/Tripod) + open-dir/gopher/crawl media; cards show name, type, size, date, host, source. 40 Angelfire images pre-harvested.
- New Gemini module (kennedy.gemi.dev search, via portal.mozz.us proxy).
- Miner: global time budgets, retries, 45-min job cap.
- Invento: Google Patents phrase-quoted queries, tag stripping, tighter on-theme filters; USPTO fallback tightened.
- UX: per-source empty states with hints; safety layer (media gate, blocklist, moderation, reports, Vault) unchanged.

## Pass 4 — 2026-10-26

- **Network robustness (`net.js`, loaded first)**: every fetch now has a timeout (18 s by default; Openverse/Gutendex 25 s; loc.gov 40 s), so a slow source can't leave a module stuck on "scanning". Slow APIs get a 15-minute session cache, plus a last-good fallback in localStorage that is used when a live call fails (the status line flags it). Error messages now say what happened (timeout, rate limit, network/CORS). The retry ladder stops early on a timeout or rate limit instead of hammering the source 6 times.
- **GitHub gists**: now harvested in the Action (`scripts/gists.py` → `finds/gists.json`, using the Action token). TRENCH Gists and THEO Raw gists fall back to that pile when the visitor's IP hits the 60 requests/hour limit.
- **RELIQUARY Old newspapers**: loc.gov takes about 30 s per query, so the Action pre-harvests each theme (`scripts/relnews.py` → `finds/rel_news.json`). The live search is limited to 2 attempts and 10 OCR-snippet fetches, then falls back to the cache, and shows a clear error if both fail.
- **LIVE Archive image/texts/audio**: thin queries (under 8 hits) are widened by dropping the random single-year filter and OR-ing extra terms. Raw title patterns are kept.
- **Deep Video**: `scripts/vidharvest.py` is a resumable, chunked Wayback CDX harvest. It saves its progress in `finds/vidstate.json`, does non-Angelfire hosts first, and splits a timed-out shard into 36 sub-shards that are queued for a later run. It runs every 3 hours, so the GeoCities/OoCities/Tripod/Xoom/50megs/FortuneCity/AOL mix grows over time. Open-directory video files from the 40k index are now added to the pool (at most 3 per directory). The UI says honestly that the pile is Angelfire-heavy for now.
- **Gopher text**: repairs garbled characters (mojibake) where gateway pages were decoded as latin-1 but were really UTF-8, Big5, GBK, Shift-JIS or EUC-KR (`scripts/textfix.py`). It runs at save time and has already cleaned existing finds.
- **Open Directories**: Bing discovery now rejects junk URLs (wp-content, uploads, php/aspx, torrents and release tags, spam TLDs) and scores host quality (academic or mirror hosts, document/media-heavy listings, few site assets). A host needs a score of 2 or more and at least 10 entries. Added 1.4k files from the funet, lip6, aarnet and sunet mirrors. The junk filter was applied to old rows (8.8k numbered usenet .gz files, tarballs and source dumps removed). The index is now about 17.8k quality rows.
- Fixed the OD "Directories found" tab showing `query: undefined`.

## Pass 3 — 2026-10-26

- **Deep Video**: new `scripts/vidshards.py`. Shard queue covers geocities (incl. .ws / oocities), tripod, xoom, 50megs, fortunecity, aol and angelfire. A shard that times out is split into random sub-shards and retried. Tiny .swf files are dropped. Blocklist is applied in the Action.
- **Open Directories**: 6 new roots (avalon, umu conspiracy/EFLIB, sunet tv/movies + Internet-documents, funet culture). Action-side "Index of" host discovery runs over Bing RSS with porn/adult host filters, and every candidate host is verified as a real listing (`finds/odhosts.json`). Index grew to about 25k rows, with a stronger junk filter. Filename hits rank above path hits, synonym groups were expanded, and URLs are decoded. Fixed a "URI malformed" crash.
- **Deep Image safety**: server-side PIL skin-ratio pre-screen (`scripts/skin.py`) drops high-skin images. Media loads blurred until you click to reveal, and high-score images need a confirm. The blocklist was expanded (56 domains / 72 keywords). The UI documents the limits: this is a heuristic, and Wayback has no CORS, so there is no client pixel check.
- **Relevance**: THEO pile/gist/gray return only on-theme items, and bucket regexes are word-bounded.
- **Polish**: mobile layout, scan indicator, nav tooltips. 🔗 permalinks for finds are re-screened by the safety layer when opened. Vault import is screened and reports imported/dropped counts.

## Pass 2 — 2026-10-26 (afternoon)
- OPEN DIRECTORIES: new compact keyword index `finds/odbig.json` (~15k files) built from a breadth crawl of public mirrors (funet culture/doc/misc/sci/pics, lip6, aarnet, uoc.gr, old-gnu) plus the Common Crawl index of textfiles.com dirs (ufo, occult, conspiracy, ezines…). Software/distro noise filtered. Synonym search (vhs→vcr/videotape/video, ufo→saucer/mufon/alien…). Random mode weighted to on-theme dirs. The Action adds to it on every run.
- DEEP VIDEO: Wayback CDX with filename extension + video mime filters across dead Angelfire neighbourhoods (film/indie/music/rock/journal…). 80 real files pre-harvested (mpg/wmv/asf/rm/swf), plus open-dir conference video (AARNet APAN).
- INVENTO: weather queries rewritten (artificial rain, cloud seeding, hail cannon, fog dissipation…), title-gated filters for aliens/weather/dead, a negative filter for off-theme hits, and a fix for double-escaped regexes. Dead now finds ouija boards, coffin alarms and premature-burial devices.
- DEEP TEXT: spam/blocklist screen on every text find. Common Crawl text now reads WARC byte ranges over curated obscure text hosts.
- Fixed a quote syntax error in deepmedia.js. Vault save/view, empty states and the moderation portal were verified in a headless browser.
