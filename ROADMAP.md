# Milestone: Make the first 30 seconds feel like flight

## Status — BUILT, awaiting a playtest

All three parts are implemented and verified headlessly: the world scrolls, dragons
crumple and fall into it, hits have a voice. What remains is **tuning**, and the
numbers below are starting points, not answers.

The knobs, in the order they are likely to be wrong:

| Knob | Now | If it feels wrong |
|---|---|---|
| `CFG.WORLD.speed` | 120 | Too slow = still feels static. Too fast = nauseating, and it will overtake the dragons. |
| `CFG.ENEMY.speed` | 165 | **Must stay above `WORLD.speed`** or dragons appear to fly backwards. |
| `CFG.WORLD.layers[].a` | .16/.28/.46 | Terrain competing with dragons for attention = lower these. |
| `CFG.FEEL.hitstop` | 0.05 | Above ~0.08 reads as lag, below ~0.03 is imperceptible. |
| `CFG.FEEL.fallDur` | 0.8–1.15s | How long a body hangs in the air before it lands. |
| `CFG.WORLD.markEvery` | 9–18s | How often a landmark crosses. |

## Context

Cindu: Dragon Lord is a complete, working, single-file vertical shooter — and it is
not fun. The owner can tell inside 30 seconds. Diagnosing why, two causes dominate,
and both are about **the absence of a world**, not about difficulty tuning:

1. **Cindu doesn't feel like she's flying.** She slides around inside a rectangle
   over pure black. The only motion cue is `WIND` (`index.html:669-687`): 64 vertical
   amber line segments falling at 110–410 px/s. It's rain, drawn in the same hue as
   fire and dragons, at a speed tied to nothing in the game. It reads as noise
   because it is noise.

2. **Killing a dragon produces nothing.** `killEnemy()` (`index.html:1078`) calls
   `pools.en.release(i)` on the same line it awards the shard — **the corpse is
   deleted on the frame it dies.** There is no body to crumple, no impact, no
   evidence you did anything.

Supporting problems found while tracing the opening 30 seconds (real numbers, from
the constants, not estimates):

- **~2.4s of empty sky** before the first enemy (`startGame` sets `spawnTimer = 2.4`).
- **One enemy type.** Phase 1's pool is `['drifter']` — flies straight down.
- **~4 enemies on screen** (cap 5, spawn every ~1.55s).
- **You cannot die.** 100 HP, enemy bullets do 7, 0.85s i-frames → ~15 hits to kill
  you, and enemies fire once per 3.3s with the first shot delayed 1.4–3.4s.
- **Half your trigger pulls are silent.** Every enemy takes exactly 2 hits.
  `damageEnemy()` sets a flash and 4 particles — **no sound, no shake, no hitstop.**
  `SFX.enemyDie()` fires only on the kill.
- **No score exists.** Zero occurrences in 2,039 lines. First stat change is at kill
  100 (~2.5 min). The HUD reads `DRAGONS 0016/1000` — a bar telling you you're 1.6% done.

**Reference feel:** overhead 2D console jet shooters (Raiden, 1942-era), with
feedback pushed further than those had — impactful, not overwhelming.

**Outcome:** in the first 30 seconds you should feel like you are flying fast over
real terrain, and every dragon you kill should visibly crumple, tumble, hit the
ground, and slide away behind you.

---

## Scope

**In:** scrolling vector landscape · falling corpses · hit feedback ·
the enemy-speed rebalance the scroll forces.

**Explicitly out** (later milestones, do not start them here): score/combo,
ground targets, new enemy types, endless-mode restructure, boss changes, PWA,
hosting, tests. Keep the single-file, zero-dependency, no-build structure.

---

## Part 1 — The world scrolls

Replace `WIND` entirely (delete `WIND`, `buildWind`, `updateWind`, `drawWind`; it is
called from `render()`, `drawTitle()`, `drawStory()` and four `step()` cases).

**Structure.** Three parallax layers of topographic contour ridges. A ridge is a
polyline spanning the screen width, generated procedurally from summed sines plus
jitter. Generate geometry **once per ridge on spawn** and translate it each frame —
never regenerate per frame. **No `shadowBlur` anywhere in terrain drawing**; the
README's own note is that per-frame `shadowBlur` is what kills mobile framerate, and
terrain is by far the highest line count on screen.

| Layer | Speed (near-layer relative) | Alpha | Ridge spacing |
|---|---|---|---|
| Far | 0.35× | 0.22 | wide |
| Mid | 0.6× | 0.38 | medium |
| Near | 1.0× | 0.60 | tight |

**Colour.** Add a third helper beside `amber()`/`purple()` (`index.html:169-170`):
`land(a)` returning a desaturated slate-indigo (start at `#4A6FA5`) at alpha `a`.
The rule the whole game now reads by: **cool = world, warm = things that can kill
you.** Amber stays exclusively fire and dragons; purple stays exclusively souls and
power. The one deliberate exception is a burning village, which flickers amber —
warm light in a cool world, which is why it will draw the eye.

**Landmarks.** Every 10–20s of scroll, a recognizable feature crosses on the near
layer, so you feel you've travelled somewhere rather than watched a texture: a
meandering river, a lake, a burning village, a ruined keep, a forest stipple. Pick
from a table, same data-driven style as the existing `ARCHETYPES`/`PHASES` tables.

**Render order.** Slot the world in exactly where `drawWind()` was called in
`render()` (`index.html:1963`) — behind enemies, boss, bullets, player, particles.

**Reuse:** the existing `Pool` factory (`index.html:173`) for ridges and landmarks —
O(1) alloc with swap-removal, same as every other entity in the file.

### The consequence you must handle: world speed becomes the master clock

This is the part that makes "just add a background" wrong. Once the ground moves,
**every velocity on screen is read against it.** An enemy holding station over the
ground must drift down at world speed; an enemy actively diving at Cindu must be
visibly faster than that.

Enemies currently move at `CFG.ENEMY.speed = 74` px/s. If the ground scrolls faster
than that, dragons will appear to fly *backwards*. So:

- Raise `CFG.ENEMY.speed` substantially (start around 150–200) and tune against the
  world speed, not in isolation.
- Set near-layer world speed **below** enemy speed. Start near 120 px/s.
- This doubles as the fix for "nothing threatens me" — faster enemies close faster.

Expect to iterate on this pair of numbers more than anything else in the milestone.

---

## Part 2 — Dragons crumple and fall

Add a `pools.corpse` (reuse the `Pool` factory). Change `killEnemy()` to spawn a
corpse before releasing the enemy, carrying the dead dragon's `art`, position and
`face`.

Corpses reuse `blit(spr, x, y, rot, alpha, scale)` (`index.html:658`) — the sprites
are already pre-rendered and already take rotation, alpha and scale. **No new art.**

**Phase A — falling (~0.8–1.2s).** Tumbling rotation, gravity on downward velocity,
`scale` shrinking toward ~0.45. In a true overhead view, shrinking *is* falling —
the body is receding from the camera. Sheds a few embers on the way down.

**Phase B — impact.** A small dust/debris burst and a soft thud. The body converts
to a **wreck mark drawn in `land()`, not amber** — the moment it hits, it stops
being a dragon and becomes scenery.

**Phase C — scrolling away.** The wreck moves at **near-layer world speed**, fading
over several seconds, until it leaves the screen. This is the detail that ties the
two halves of the milestone together and is the single most important thing to get
right: your kills become part of the landscape you're flying over.

Cap the corpse pool (~24) so a heavy wave can't tank the framerate.

---

## Part 3 — Make hits land

Small, cheap, and it's what makes the crumple read as *caused by you*.

- **`damageEnemy()` (`index.html:1095`)** — add a short percussive hit sound
  (distinct from `SFX.enemyDie`), 2–3 sparks at the impact point, and a small
  `G.shake` bump (~2). Currently this function is silent.
- **`killEnemy()`** — `G.shake = Math.max(G.shake, 4)`. Killing a dragon currently
  produces zero shake while six *other* events produce plenty; that's backwards.
- **Hitstop.** Add `G.freeze`; on a kill set it to ~0.05s. In `step()`
  (`index.html:1936`), at the top of the `playing` case: if `G.freeze > 0`,
  decrement by `STEP` and return without updating. Rendering continues, so the
  frame holds. Keep it short — at 60Hz this is 3 frames; more than ~5 feels laggy.
- **Faster first contact.** Drop `startGame`'s `spawnTimer` from 2.4 to ~0.8.
  2.4 seconds of empty black is a bad first impression.

---

## Files

Everything is in `index.html`. Touched, in file order:

- `CFG` (~line 39) — add a `WORLD` block (speeds, layer alphas, landmark cadence);
  raise `CFG.ENEMY.speed`.
- `land()` helper beside `amber()`/`purple()` (~line 169).
- `WIND` block (669–687) — **delete**, replace with the world system.
- `killEnemy` (1078), `damageEnemy` (1095) — corpse spawn, hit feedback.
- `updateFx` (1402) — advance corpses; `G.freeze` decay alongside `G.shake`/`G.flash`.
- `render()` (1955) and `step()` (1930) — swap `drawWind`/`updateWind` for the world.
- `startGame` (1444) — `spawnTimer`.

Keep all new tuning numbers in `CFG` and the landmark list in a table beside
`ARCHETYPES`/`PHASES`, per the README's standing rule that tuning must not require
touching logic.

---

## Verification

1. **Playtest headlessly.** Load in Chromium via Playwright (already installed at
   `/opt/pw-browsers`; do not run `playwright install`). Use the existing
   `window.__CINDU` hook — `start()`, `spawn()`, `stats()`. Assert no console
   errors and `frameMs` stays low with a full corpse pool and a landmark on screen.
2. **Look at it.** Screenshot at ~2s, 8s, 15s, 30s of a running game. Check
   specifically: terrain reads as terrain and not noise; dragons are clearly
   distinguishable from ground at a glance; a landmark is identifiable; corpses are
   visible mid-fall and as wrecks.
3. **Watch a death in motion.** Capture ~10 frames across a single kill and confirm
   the crumple → impact → scroll-away sequence actually reads.
4. **Ship it to a phone.** Republish the playable artifact
   (`https://claude.ai/code/artifact/2af9e24f-33de-45f4-abd9-76d4bd36cea2` — publish
   with that `url` to keep the link) so it can be played on a real device. **This is
   the only verification that counts.** Screenshots cannot tell you whether it feels
   like flying.
5. Commit to `claude/game-access-roadmap-2v0bor`.

**The test is not "does it run." The test is: does the owner want to keep playing
after 30 seconds?** If the terrain is pretty but the flight still feels static, the
world speed and enemy speed are wrong relative to each other — tune that pair before
adding anything.

---

## Later, not now

Deliberately parked until the game is fun. Recorded so the thinking isn't lost,
subordinate to the milestone above — do not start any of these first.

- **Next milestones (gameplay):** a score/combo chase; frequent level-ups (currently
  one per 100 kills, ~2.5 min); formation waves instead of random single spawns;
  Raiden-style ground targets, which become possible once terrain exists; endless-mode
  restructure.
- **Then (shipping):** GitHub Pages for a public URL (`Settings → Pages`, deploy from
  `main`/root — four clicks, nothing in the repo changes); a PWA manifest and service
  worker for home-screen install and offline play; itch.io.
- **Known repo gaps:** no LICENSE, so nobody can legally fork it. The README claims
  `window.__CINDU` is "used by the automated playtests" — no such tests exist in the
  repo. `window.__CINDU` is exported unconditionally, so anyone with a console can
  call `jump(999, 50)`; gate it behind `?debug=1` before any leaderboard exists.
- **Not worth it:** native app stores. A single-file browser game with no monetisation
  won't repay a Mac, Xcode, $99/yr, and a review queue. A PWA gets ~90% of the benefit
  for nothing.
