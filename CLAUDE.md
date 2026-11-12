# Monley: what the owner wants most

Read this at the start of every session. These are the owner's standing wishes.
Weigh every change against them, and when you notice something that works
against one of them, say so and recommend a fix.

- **Speed first.** Nothing may slow down the website or the Live TV channels:
  first paint, page loads, channel lists, starting a stream. If a change costs
  speed, find another way.
- **Free only.** Everything runs at $0: Supabase's free plan, Cloudflare Pages,
  free third-party APIs. Say up front if anything would cost money.
- **Claude merges BAZZ website changes.** The owner asked (12 Nov 2026) that Claude open the pull
  request and squash-merge it itself after testing, instead of asking the owner to click merge.
- **Keep the blurred search header** on laptops and TVs (phones have the bottom
  bar, 7 Nov 2026) when changing other things.
- **Quick checks for small changes.** For a small change (text, colours,
  spacing, one page or component), run only what it touches: lint, the type
  check, the unit tests of the files you changed, and the browser tests for
  that page on one screen size (`npx playwright test e2e/<page>.spec.ts --project=desktop`,
  from `monley/`). To keep within the 2,000 free Actions minutes a month, CI
  runs only the quick checks (lint, types, unit, build, database) on a push to
  main (a push to a working branch runs nothing), and the browser tests on all
  four screen sizes only when a pull request opens (or by hand from the Actions
  tab): check that it passes and fix anything it finds. Run the full suite
  yourself for big or risky changes: playback, sign-in, Kids, the database, or
  code shared across pages — and always before merging.
- **Latest docs first.** Before using or adding any tool, library, plugin,
  service or feature (an npm package, Supabase, Cloudflare, a browser API…),
  read its latest official docs and changelog, use its current version, and
  follow what those docs now recommend, not what you remember. Say what you
  checked.
- **Blocked? Ask.** If the session's network blocks a site you need (docs,
  an API, a service), don't settle for second-hand sources: name the host and
  ask the owner to add it to the cloud environment's allowed domains.
- **Quality and timing of the Kurdish subtitles** matter most in that work:
  weigh every subtitle change against both.

## Where things are

- `monley/`: the website (React + Vite). Run every npm command from here.
- `monley-cf-worker/`: the Live TV proxy (a Cloudflare Worker). Merging a
  change to main deploys it; bump `version` in `worker.js` every time.
- `monley/supabase/migrations/`: since 0051 (7 Nov 2026) new tables,
  functions and sequences start open to nobody, so every migration that makes
  one writes its own grants (only what each role uses; a function needs
  grant execute, even a private helper a policy calls) and keeps RLS on.
  `supabase/tests/run.sh` rebuilds the whole database that way and checks the
  site still works (`rebuild.test.sql`): add each new table's uses there.
- `docs/`: reference only (research, design, IPTV channel lists, specs). Not
  part of the website.
- `.claude/skills/`: the project's skills.

Merged branches are deleted on GitHub automatically, so start new work from
the latest main.
