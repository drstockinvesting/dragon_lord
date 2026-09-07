# Cindu: Dragon Lord — Flight Plan

How to play the game today, and the six stages that take it from a single HTML file
in a git repo to something other people can find.

**Visual map:** <https://claude.ai/code/artifact/0b686a61-a1d1-40c4-9c25-d64d8a3ba1b0>
**Playable build:** <https://claude.ai/code/artifact/2af9e24f-33de-45f4-abd9-76d4bd36cea2>

Both links are private to the repository owner's Claude account until shared.

---

## Current state

Read from the repository at commit `49a2492`:

| | |
|---|---|
| Source | 1 file (`index.html`) |
| Lines | 2,039 |
| Weight | 81 KB |
| Dependencies | 0 |
| Build steps | 0 |
| Full campaign | 1,000 kills, ~25 minutes |

Runs clean in a headless browser with no console errors. The repository contains
`README.md` and `index.html` and nothing else — no tests, no CI, no licence.

---

## Playing it

Three routes, in ascending order of setup.

1. **The published build** (link above). Opens on a phone or a desktop browser,
   keyboard and touch both live, saves progress in that browser.
2. **GitHub Pages** — a permanent public URL that redeploys on every push.
   Requires the github.com web UI (see Stage 0). No repository changes needed:
   `index.html` at the root is exactly what Pages serves.
3. **The file itself** — download `index.html` and double-click it. No server,
   no install. Works offline.

---

## The six stages

Each stage is worth doing on its own, and each unlocks the next.
**Stages 1 and 3 never leave this repository. Stages 0, 2, 4 and 5 require an
outside tool** — those are marked below.

### Stage 0 — Access *(outside: github.com web UI)*

*Goal: a link you can text to somebody.*

- **Turn on GitHub Pages.** Settings → Pages → deploy from `main`, root folder.
  Four clicks, free, redeploys on push. This is the one step that cannot be done
  from Claude Code — it needs repository-admin scope in the web UI.
- **Put the live URL in the README.** It currently says "open `index.html`",
  which is the worst of the three routes.
- **Add a LICENSE.** With no licence file nobody can legally fork, remix or embed
  it. MIT is one commit.

### Stage 1 — Safety net *(no outside app)*

*Goal: change the balance without breaking the game.*

Highest value on the board and the cheapest. A balance tweak three phases deep is
currently unverifiable except by playing for twenty-five minutes.

- **Commit the playtests the README already claims exist.** The README says
  `window.__CINDU` is "used by the automated playtests." There are no test files
  in the repository. Either write them or delete the sentence — I would write
  them; the debug hook makes it trivial to jump to phase 9 and assert nothing throws.
- **Add a GitHub Actions workflow.** Runs the playtests on every push. The YAML is
  a committed file; Actions is on by default, so there is no account setup.
- **Gate the debug hook.** `window.__CINDU.jump(999, 50)` works for anyone with a
  console. Harmless today, fatal to any leaderboard built in Stage 4. Put it
  behind `?debug=1` now, while it costs one line.
- **Add a `.gitignore`.** Screenshots and `node_modules` from the test runner will
  otherwise land in commits.

### Stage 2 — Installable app *(outside: a design tool, maybe)*

*Goal: it lives on a phone home screen and plays offline.*

- **Web app manifest + service worker.** Standalone display, portrait lock, black
  splash, cache-first. The whole game is 81 KB, so one fetch caches everything.
- **An app icon.** The first real asset the project has ever needed — every dragon
  is a stroked vector path drawn at runtime and there is not one image file in the
  repository. **Figma or Canva** (both browser-only, free) will do it.
  *Try this first, though:* the game's own `dragonPath()` already draws Cindu.
  Rendering that to PNG in a headless browser keeps the asset in the repo, in the
  game's own hand, and skips the outside app entirely. Reach for a design tool
  only if you want an icon that reads at 48 px, which a thin amber outline will not.
- **Safe-area insets and wake lock.** The touch pad sits where an iPhone home
  indicator lives, and the screen dims mid-boss because nothing holds it awake.

### Stage 3 — More game *(no outside app)*

*Goal: a reason to open it a second time.*

The current structure is one 1,000-kill campaign ending at Eanu, with a single
save slot and nothing after the credits. That is a complete game, and it is also a
game you finish once.

- **Endless mode.** `PHASE_STEP` multiplies cleanly past step 10. Score = kills
  survived. This is the single change that makes a leaderboard worth building.
- **Difficulty settings.** One multiplier on `PHASE_STEP` covers it.
- **Multiple save slots.** `SAVE_KEY` is a single localStorage string.
- **A run summary screen.** Deaths per phase, damage taken, power attacks used —
  needed anyway before anything can be reported to a server.
- **New content in the existing tables.** A sixth `POWER_TIERS` entry, new
  `ARCHETYPES`, new `LORDS` — all data, no logic, exactly as the README promises.

### Stage 4 — Audience *(outside: a backend and an analytics service)*

*Goal: the game knows other people are playing it.*

First stage that cannot be a static file.

- **Leaderboard** — endless-mode scores. Do Stage 1's debug gate first, or the top
  ten will be `__CINDU.jump(99999)` within a day.
- **Cross-device saves** — same backend.
- **Analytics** — where players stop. If everyone quits at phase 6, that is a
  balance bug you cannot see any other way.

Use **Supabase** (Postgres, auth and a REST API on a free tier) or **Cloudflare
Workers + KV** (cheaper and simpler for a scores table alone). Both are
browser-only sign-ups. I can write the client code and the schema here; you create
the project and paste back the URL and anon key.

For analytics, **Plausible** or **Cloudflare Web Analytics** — one script tag,
no cookie banner. Google Analytics needs one, and would be the heaviest thing on a
page whose game is 81 KB.

### Stage 5 — Distribution *(outside: itch.io, or app-store tooling)*

*Goal: players who were not looking for you.*

- **itch.io** — free, ten minutes, drag the HTML file in. Purpose-built for exactly
  this. Do this one.
- **Newgrounds** — same effort, an audience that likes retro shooters.
- **Native app stores** — Capacitor wraps the file, then **Xcode on a Mac** for iOS
  and **Android Studio** for Android. See the verdict below.

---

## Every outside app, in one place

| Tool | Stage | What it buys | Install? | Cost |
|---|---|---|---|---|
| github.com Settings | 0 | A permanent public URL that redeploys on push | Browser only | Free |
| Figma or Canva | 2 | App icons that read at 48 px | Browser only | Free |
| Supabase | 4 | Leaderboard and cross-device saves | Browser only | Free tier |
| Plausible | 4 | Where players actually stop playing | Browser only | ~$9/mo |
| itch.io | 5 | An audience that browses for games like this | Browser only | Free |
| Xcode + a Mac | 5 | An App Store listing | Mac required | $99/yr |
| Android Studio | 5 | A Play Store listing | Desktop install | $25 once |

---

## What I'd do, and what I'd cut

- **Do stages 0 and 1 this week.** Pages costs four clicks. The playtests cost one
  session and turn every future balance change from a gamble into a check.
- **The README describes tests that do not exist.** That is the only thing in this
  repository I would call a defect rather than a gap.
- **Cut the app stores.** An 81 KB browser game with no monetisation, no accounts
  and a 25-minute campaign will not repay a $99/yr Apple account, a Mac, a review
  queue and a privacy policy. A PWA (Stage 2) gives you the home-screen icon and
  offline play — 90% of the benefit for zero dollars and zero outside accounts.
  Revisit only if Stage 4's analytics show real retention.
- **Do endless mode before the leaderboard.** A leaderboard on a fixed campaign
  ranks people by whether they finished, which is a yes/no. Score needs an
  unbounded axis first.
