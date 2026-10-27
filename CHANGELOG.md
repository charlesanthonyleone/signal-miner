# Signal Miner — status & changelog

## Status summary (end of Pass 5, 2026-10-26)

**What it is.** A static site (GitHub Pages) for mining obscure, low-traffic public material: unwatched uploads, dead-host web media, open directories, gopher/Gemini text, live sensor feeds, forgotten patents and old religious and historical texts. It uses legal public sources only: no Tor/onion, no logins, no scanning.

**Safety layer (unchanged, verified live).** Media gate (thumbnails hidden until clicked), keyword/domain blocklist on every card, per-card Report & hide, `moderation.html` portal with NCMEC CyberTipline, FBI and IC3 links plus per-platform report links, disclaimer, and a local-only Vault (saved finds) with 🔗 share links.

**How it stays fed.** The `mine.yml` GitHub Action runs every 3 hours (cron `17 */3 * * *`, about 45 min cap) and runs `scripts/collect.py`, which commits refreshed JSON in `finds/`:
- gopher (Veronica-2), Common Crawl text and open-dir .txt → `deep_text.json` (mojibake repaired)
- open-directory discovery (DDG/Bing/Mojeek "Index of", curated mirrors, junk/quality filter) → `odbig.json` (about 17.8k quality rows)
- Wayback CDX dead-host media, resumable and chunked (`vidstate.json`) → `deep_video.json` and deep images
- public gists → `gists.json` (fallback for GitHub's 60 requests/hour browser limit)
- loc.gov newspapers per RELIQUARY theme → `rel_news.json` (fallback for slow loc.gov)

In the browser, `net.js` gives every fetch a timeout, a 15-minute cache for slow APIs, a last-good fallback and readable errors.

### Final live smoke test (live site, 210 sources, 5 at a time)
| Section | Modules | Result |
|---|---|---|
| LIVE | video, image, audio, book | PASS. 16/17 sources returned results. Openverse timed out once (25 s); it is intermittent and returned 20 in Pass 4. |
| TRENCH (grayspace only, no archive.org) | opendirx (all/text/media/dirs 40 each), deepimage 74, deepvideo 36, gopher 8, gemini 32, crawl 48, gists 16, cameras 48, satnogs 48, space 20, chain 48, hidden 48, timeskew 48, tectonics 17, radiation 5 | PASS. 20/20 sources returned results. |
| THEO (20 belief themes × ia / pile / gray / openlib / gutenberg / gist) | all 20 | PASS with gaps. Every theme has results from its deep-mine and Open Library tabs. The zero-download pile now falls back to a theme-keyword search. Gray is empty only for geniza and deadlang, and their message names what was checked. Gists are almost never on-theme, so that tab usually shows an honest "none in 500 scanned" message. |
| INVENTO (14 patent themes × Google Patents / USPTO / gray) | all 14 | PASS. Google Patents and USPTO return results for 13 of 14 themes (inv_weird only has USPTO). USPTO is thin for aliens, dead and mindctl. Gray now adds open-directory invention files. |
| RELIQUARY (maps, confessions, ciphers, wrecks, capsules) | all 5 | PASS. ia, gray and wd return results. News returns 12–25, but loc.gov can take more than 60 s (capsule timed out once; the cached harvest covers it). |
| Vault / share / moderation | | PASS. Save, view and 🔗 work; `moderation.html` loads with NCMEC and IC3; no JS errors. |

### Known limitations / blockers
- archive.org, loc.gov, Openverse and Gutendex are slow at times. Modules show a timeout message or cached results rather than hanging.
- Deep Video is still mostly Angelfire (the UI says so). Wayback CDX is slow, so each Action run adds only about 4–8 Wayback items.
- THEO theme regexes are deliberately broad, so some pile hits are loosely related (for example "codex" or "annotation" in unrelated titles).
- geniza and deadlang have no grayspace text yet. Gists are rarely on-theme.
- Dailymotion raw mode (camera filenames with ≤300 views) is sparse because Dailymotion search favours popular videos. It widens automatically and says so when empty.
- Open-directory discovery through Bing finds few new hosts. Growth comes mostly from curated mirrors.
- The Vault is per-browser (localStorage). Share links encode the find in the URL.

## Pass 7 (2026-10-27)
- Verified live: the Pass 6 filter fix (084ff2a), Reliquary Vanished People (24/19) and Ghost Towns (24/24).
- Legal alternatives for blocked sites, built from Wayback CDX captures of public pages with titles pulled from each capture: **FBI Vault** (343 rows) and **MuckRock** (187) modules in Black Vault, **GEIPAN** (French UFO bureau, deduplicated) in Xeno, **GeoCities Area51** in Trench (grayspace) and as an Xeno source. Harvested by `worlds.wb()` in the Action.
- Vatican Secret Stacks: `worlds.vatlib()` probes 25 fonds and keeps verified IIIF shelfmarks (`finds/vatlib.json`, 233 to start, grows each run). `digi` draws from that list first, so it no longer depends on random probes.
- Noise: stricter TNA patterns for psy/odd/weather, more junk terms dropped (Holy Ghost schools, criminal records), FOIA query excludes RTI/panchayat items. New global off-theme filter on Theo/Black Vault/Xeno/Vatican drops games, fandom, homework and marketing items unless you typed a keyword.
- UI: cards fade in, hub cards glow and show a source count, a CLASSIFIED stamp on Black Vault, a radar sweep on Xeno, a gilded hub on Vatican. Motion is off under prefers-reduced-motion.
- Safety layer unchanged on every new module. No adult content, no Tor, no logins, no scanning.

## Pass 6 (2026-10-26): three new worlds + grayspace
**New top pages**, each with its own theme: THE BLACK VAULT (`#redacted`, a redaction-bar/typewriter look), XENO (`#xeno`, green radar), VATICAN (`#vatican`, crimson and gold vellum). They also appear in the nav, the home hub and the depth gauge.
- **THE BLACK VAULT.** Seven modules: UAP, MKULTRA/mind control, psychic research/Stargate, Cold War, unexplained deaths, weather/geo experiments, redacted oddities. Each module has four sources:
  - CIA CREST: random deep pages of IA `cia-rdp*`, lowest downloads first. Stargate uses the CIA-RDP96-00788/89/91/92 series.
  - UK National Archives: Discovery API, harvested by the Action.
  - FOIA deep mine.
  - Period press: LoC, with a 20 s live limit and then the cached harvest.
- **XENO.** Sighting logs (NUFORC dataset, 4000 random rows), foreign government files (UK MoD via TNA, plus foreign releases on IA), Blue Book/CREST, saucer clippings (LoC), saucer patents (the INVENTO alien-tech harvest), and grayspace UFO text (gopher, crawl and open-dir).
- **VATICAN.** Secret Stacks: random shelfmarks across 16 DigiVatLib fonds, opened to a random folio through IIIF; the image sits behind the media gate. Buried Bulls: random pope, document type and year index on vatican.va, harvested. Exorcism, Apparitions, Inquisition, Index of Forbidden Books and Lost Councils each have a deep mine plus LoC.
- **TRENCH.** BBS TEXTFILES (Wayback captures of textfiles.com; adult and drug directories excluded) and DEAD FORUMS (ezboard, network54, quicktopic and similar captures, with admin and junk pages filtered out). No archive.org items.
- **RELIQUARY extras.** Vanished People, Ghost Towns.
- **Action.** `scripts/worlds.py` (TNA, NUFORC, vatican.va, BBS CDX, forum CDX, LoC per theme) runs from `collect.py` with a 900 s budget. The job cap is now 60 min.
- **Safety.** Unchanged and applied centrally to every new module: blocklist pre-screen, `SAFE.filter`, media gate, Report & hide. The harvester also drops rows that match an adult-term regex. Adult or sexual content was requested and is declined.
- **Blocked or skipped.** These are blocked by Cloudflare or return 403 from the runner: FBI Vault, DocumentCloud, MuckRock, AARO, NSA, GEIPAN direct, usenetarchives. CIA reading room is in maintenance. The NARA API needs a key. rtfm.mit.edu (Usenet FAQs) returns 500. Paste sites were skipped because of moderation risk.
- **Live sweep.** 52/52 sources returned results (see the report).

## Pass 5 — 2026-10-26 (wrap-up)
- THEO zero-download pile: when the random window has nothing on-theme, it falls back to a low-download (≤20) title search built from the theme's own keywords and matched strictly on title. This fixed a bug that requested a random page up to 40 (lostciv pile 0 → 7).
- THEO gist: scans one live page plus the Action pile (about 500 gists) and matches the theme regex strictly. When nothing matches, it says how many it scanned.
- THEO gray: accurate empty state (counts of texts and filenames checked). Open-dir filename noise filter added (aspell/dictionaries/wordlists, games/roms/mods, fonts, drivers, src, readme/license/install, 00INDEX). .zip files are no longer treated as documents.
- lostciv: `indus` is word-bounded, so it no longer matches "Industries".
- INVENTO gray: adds open-directory files named for inventions (orgone, Schauberger, Tesla, patent…), deduplicated, at most 3 per directory. Previously every theme showed the same single file.
- Dailymotion: when thin, widens (drops the date window, tries 2 more terms). Raw mode shows an honest message when empty.
- CHANGELOG tidied (stray Pass 4 line moved into Pass 4) and this status summary added.

## Pass 4 — 2026-10-26

- **Network robustness (`net.js`, loaded first)**: every fetch now has a timeout (18 s by default; Openverse/Gutendex 25 s; loc.gov 40 s), so a slow source can't leave a module stuck on "scanning". Slow APIs get a 15-minute session cache, plus a last-good fallback in localStorage that is used when a live call fails (the status line flags it). Error messages now say what happened (timeout, rate limit, network/CORS). The retry ladder stops early on a timeout or rate limit instead of hammering the source 6 times.
- **GitHub gists**: now harvested in the Action (`scripts/gists.py` → `finds/gists.json`, using the Action token). TRENCH Gists and THEO Raw gists fall back to that pile when the visitor's IP hits the 60 requests/hour limit.
- **RELIQUARY Old newspapers**: loc.gov takes about 30 s per query, so the Action pre-harvests each theme (`scripts/relnews.py` → `finds/rel_news.json`). The live search is limited to 2 attempts and 10 OCR-snippet fetches, then falls back to the cache, and shows a clear error if both fail.
- **LIVE Archive image/texts/audio**: thin queries (under 8 hits) are widened by dropping the random single-year filter and OR-ing extra terms. Raw title patterns are kept.
- **Deep Video**: `scripts/vidharvest.py` is a resumable, chunked Wayback CDX harvest. It saves its progress in `finds/vidstate.json`, does non-Angelfire hosts first, and splits a timed-out shard into 36 sub-shards that are queued for a later run. It runs every 3 hours, so the GeoCities/OoCities/Tripod/Xoom/50megs/FortuneCity/AOL mix grows over time. Open-directory video files from the open-directory index are now added to the pool (at most 3 per directory). The UI says honestly that the pile is Angelfire-heavy for now.
- **Gopher text**: repairs garbled characters (mojibake) where gateway pages were decoded as latin-1 but were really UTF-8, Big5, GBK, Shift-JIS or EUC-KR (`scripts/textfix.py`). It runs at save time and has already cleaned existing finds.
- **Open Directories**: Bing discovery now rejects junk URLs (wp-content, uploads, php/aspx, torrents and release tags, spam TLDs) and scores host quality (academic or mirror hosts, document/media-heavy listings, few site assets). A host needs a score of 2 or more and at least 10 entries. Added 1.4k files from the funet, lip6, aarnet and sunet mirrors. The junk filter was applied to old rows (8.8k numbered usenet .gz files, tarballs and source dumps removed). The index is now about 17.8k quality rows.
- Fixed the OD "Directories found" tab showing `query: undefined`.
- THEO "gray" sources now also mine the open-directory filename index by theme regex (lostciv gray: 0 → 1; 18/20 locally; verified live in Pass 5 theo gray sources non-empty).

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

## Pass 1 — 2026-10-26 (initial build)
- TRENCH is grayspace-only: archive.org/YouTube removed from all deep modules (NOIA filter); Internet Archive stays in LIVE only.
- OPEN DIRECTORIES flagship (keyword + random): title-gated "Index of" discovery (DDG/Bing/Mojeek in Action), urlscan, curated mirror seeds (funet, ibiblio, textfiles, lip6, aarnet…); spam-TLD/gambling filter; harvested to finds/deep_odindex.json.
- Deep video/image repointed to Wayback CDX of dead hosts (GeoCities/Angelfire/Tripod) + open-dir/gopher/crawl media; cards show name, type, size, date, host, source. 40 Angelfire images pre-harvested.
- New Gemini module (kennedy.gemi.dev search, via portal.mozz.us proxy).
- Miner: global time budgets, retries, 45-min job cap.
- Invento: Google Patents phrase-quoted queries, tag stripping, tighter on-theme filters; USPTO fallback tightened.
- UX: per-source empty states with hints; safety layer (media gate, blocklist, moderation, reports, Vault) unchanged.
