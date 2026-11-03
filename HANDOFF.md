# Signal Miner — worker handoff (SA-4, Nov 2 2026 ET)

## State
- Live: https://charlesanthonyleone.github.io/signal-miner/ — verified headless (desk+mobile) after SA-4 CSS; consent gate, tabs, accent vignette render OK. Shots in box `/workspace/sm-shots/` (`shot.py URL prefix` clicks consent and captures 1400px + 390px).
- Full `scripts/collect.py` is long (>25 min locally, buffered output); it runs in GitHub Actions (`python -u`, 50 min cap). Locally test pieces: `cd scripts && N=8 python3 -u ytpool.py`, `python3 scripts/curate.py`. Restore data with `git checkout -- finds` — let Actions commit finds/.

## SA-4 changes
- ytpool.py: upload-date filter this week/month (sp=CAISBAgCEAE / CAISBAgDEAE), ~70 themes, 50% raw camera-filename queries, JUNK + BAIT regexes (content farms, explainers, finance clickbait, games, Topic/"Films"/"Media"/news channels), emoji/all-caps cut, title+channel dedupe, ≤2/channel/run, ≤5/query, 21-day pool expiry, ID ledger unchanged (finds/yt_ids.json, never repeats).
- curate.py: SPAM regex all piles, per-file URL dedupe (keep #fragments — nuforc relies on them), long-title dedupe only for URL-less rows. hidden.json 421→25 is genuine (same camera titles ×26).
- style.css tail: grain, accent vignette, card lift/hover grade, reduced-motion guard.

## SA-6/7 (Nov 2, ~10:15 PM ET)
- ytpool `score()` stored per find (raw filename +2, non-English +1.5, theme +2, home/tape words +1, 20s–20min +1, Title-Case scripted −2.5, em-dash −1.5, −views/25); rows <−1.5 dropped.
- youtube.js pool ranks by score − age/48h + jitter; cards show "found N h ago" and a pulsing **New** badge (<24h).
- Local preview: `python3 -m http.server 8937 --bind 127.0.0.1` in repo (8765 is another build's server). `sm-shots/dom.py` dumps card text.
- mine.yml has workflow_dispatch; scheduled runs lag hours. Manual run 41571292264 started 10:17 PM ET.

## SA-8 (Nov 2, ~10:55 PM ET)
- ytpool backfills `score` on legacy pool rows (parsed from extra channel/duration; all 365 parse) and drops <−1.5 (23 of 365 locally), so client ranking uses real scores pool-wide. Run 41571292264 was still in progress at 10:55 PM ET; applies on next Actions run.
- Worktree is detached HEAD (main lives in /workspace/signal-miner): push with `git push origin HEAD:main`.

## SA-9 (Nov 2, ~11:00 PM ET)
- curate.py cross-file URL dedupe retried, scoped to same-prefix piles only (wb_*, invento_*, deep_*, pre_*); hidden/nuforc/news etc. untouched cross-file. Local dry-run: wb_* lose 1–24 rows each (tripod variants most), deep_odindex −11; finds restored (Actions commits).
- Run 41571292264 still in collect.py at ~11:00 PM ET (setup steps green).

## SA-10 (Nov 2, ~11:15 PM ET)
- Run 41571292264 **succeeded** (finished 11:07 PM ET, committed a5f8ad7). Its log showed web.archive.org refusing connections, with each wb_/forums call burning ~2–4 min on retries (one with a 240 s timeout).
- worlds.py `_cdxget`: per-call timeout capped at 90 s; circuit breaker opens after 2 calls die on refused/timeout (429/5xx still retry normally; success resets it). Mock-tested: the 3rd+ call fails instantly.

## SA-11
- New `scripts/cdxgate.py`: one breaker shared by worlds `_cdxget`, grayspace, vidharvest (when the breaker is open it re-queues the shard and stops) and deeptext (skips the Wayback fallback). Only refused/timeout errors count; any success resets it.

- Checked: run 41576436642 (dispatched 11:10 PM ET) succeeded in about 22 min (the previous run took about 50), finished 11:39 PM ET, data commit c6fd25f. Wayback was still down, so the breaker opened and skipped CDX calls with zero retry stalls; no new wb_/vid harvest this run. Expect normal harvesting when archive.org recovers.

## Next ideas
- Rules: stage only own files, `git pull --rebase` (no autostash), $0, no secrets, safety layer stays on, don't touch other builds.
