# Signal Miner — worker handoff (SA-4, Nov 2 2026 ET)

## State
- Live: https://charlesanthonyleone.github.io/signal-miner/ — verified headless (desk+mobile) after SA-4 CSS; consent gate, tabs, accent vignette render OK. Shots in box `/workspace/sm-shots/` (`shot.py URL prefix` clicks consent and captures 1400px + 390px).
- Full `scripts/collect.py` is long (>25 min locally, buffered output); it runs in GitHub Actions (`python -u`, 50 min cap). Locally test pieces: `cd scripts && N=8 python3 -u ytpool.py`, `python3 scripts/curate.py`. Restore data with `git checkout -- finds` — let Actions commit finds/.

## SA-4 changes
- ytpool.py: upload-date filter this week/month (sp=CAISBAgCEAE / CAISBAgDEAE), ~70 themes, 50% raw camera-filename queries, JUNK + BAIT regexes (content farms, explainers, finance clickbait, games, Topic/"Films"/"Media"/news channels), emoji/all-caps cut, title+channel dedupe, ≤2/channel/run, ≤5/query, 21-day pool expiry, ID ledger unchanged (finds/yt_ids.json, never repeats).
- curate.py: SPAM regex all piles, per-file URL dedupe (keep #fragments — nuforc relies on them), long-title dedupe only for URL-less rows. hidden.json 421→25 is genuine (same camera titles ×26).
- style.css tail: grain, accent vignette, card lift/hover grade, reduced-motion guard.

## Next ideas
- Score YT finds (raw filename/non-English/home-footage boost) instead of pure filters; surface "harvested N h ago" on cards.
- Cross-file URL dedupe was too aggressive (hidden vs wb_*); if retried, restrict to same-module files.
- Rules: stage only own files, `git pull --rebase` (no autostash), $0, no secrets, safety layer stays on, don't touch other builds.
