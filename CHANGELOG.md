# Changelog — 2026-10-26
- TRENCH is grayspace-only: archive.org/YouTube removed from all deep modules (NOIA filter); Internet Archive stays in LIVE only.
- OPEN DIRECTORIES flagship (keyword + random): title-gated "Index of" discovery (DDG/Bing/Mojeek in Action), urlscan, curated mirror seeds (funet, ibiblio, textfiles, lip6, aarnet…); spam-TLD/gambling filter; harvested to finds/deep_odindex.json.
- Deep video/image repointed to Wayback CDX of dead hosts (GeoCities/Angelfire/Tripod) + open-dir/gopher/crawl media; cards show name, type, size, date, host, source. 40 Angelfire images pre-harvested.
- New Gemini module (kennedy.gemi.dev search, via portal.mozz.us proxy).
- Miner: global time budgets, retries, 45-min job cap.
- Invento: Google Patents phrase-quoted queries, tag stripping, tighter on-theme filters; USPTO fallback tightened.
- UX: per-source empty states with hints; safety layer (media gate, blocklist, moderation, reports, Vault) unchanged.

## Pass 2 — 2026-10-26 (afternoon)
- OPEN DIRECTORIES: new compact keyword index `finds/odbig.json` (~15k files) built from a breadth crawl of public mirrors (funet culture/doc/misc/sci/pics, lip6, aarnet, uoc.gr, old-gnu) plus the Common Crawl index of textfiles.com dirs (ufo, occult, conspiracy, ezines…). Software/distro noise filtered. Synonym search (vhs→vcr/videotape/video, ufo→saucer/mufon/alien…). Random mode weighted to on-theme dirs. The Action adds to it on every run.
- DEEP VIDEO: Wayback CDX with filename extension + video mime filters across dead Angelfire neighbourhoods (film/indie/music/rock/journal…). 80 real files pre-harvested (mpg/wmv/asf/rm/swf), plus open-dir conference video (AARNet APAN).
- INVENTO: weather queries rewritten (artificial rain, cloud seeding, hail cannon, fog dissipation…), title-gated filters for aliens/weather/dead, a negative filter for off-theme hits, and a fix for double-escaped regexes. Dead now finds ouija boards, coffin alarms and premature-burial devices.
- DEEP TEXT: spam/blocklist screen on every text find. Common Crawl text now reads WARC byte ranges over curated obscure text hosts.
- Fixed a quote syntax error in deepmedia.js. Vault save/view, empty states and the moderation portal were verified in a headless browser.
