# Cindu: Dragon Lord

A vertical-scrolling dragon shooter. One HTML file plus two images and a music
loop, no dependencies and nothing to build in order to play it. Works on a phone
and on a desktop keyboard.

## Play it

**https://drstockinvesting.github.io/dragon_lord/**

Bookmark that. It is the same URL forever, and it always serves whatever is
merged to `main` — every push to `main` redeploys it, usually within a minute or
two. The start and title screens print the build date and commit at the bottom,
so you can always tell which version you just got. Your saved run lives in the browser's
`localStorage` for that URL, so progress survives every update.

To run it from a checkout instead, open `index.html` in any modern browser and
keep `assets/` next to it — without the backdrop the game still runs, just on the
black sky it started life with.

One caveat if you open the file directly: the title music is the only asset the
game reads with `fetch`, and browsers refuse `fetch` on `file://` URLs. Opened by
double-click the menu is simply silent — nothing else is affected. To hear it,
serve the folder:

```sh
python3 -m http.server 8000     # then open http://localhost:8000
```

---

## The tale

Cindu was the Dragon King.

Eanu and his followers fell upon him, nearly slew him, and tore his soul into a
thousand scattered shards. The wizard Gamuut found him barely clinging to life.
Gamuut saved his body, but was powerless over his soul — that task belongs to
Cindu alone.

Fly. Burn. Reclaim the throne.

---

## Controls

**Desktop**

| Input | Action |
|---|---|
| `W` `A` `S` `D` or arrow keys | Fly forward, back, left, right |
| `Space` (hold) | Breathe fire, repeating at your current fire rate |
| `Enter` | Power attack |
| `P` / `Esc` | Pause |
| `M` | Mute |

**Mobile**

- **Lower left:** floating joystick — it appears wherever your thumb lands.
- **Lower right:** `FIRE` (hold to repeat) and `POWER` (with a cooldown ring).

Both work at once; the two thumbs are tracked independently.

The start screen takes any key or any tap, wherever it lands — the `START` button
is the affordance, not a target you have to hit. `M` is the exception there: it
mutes without moving on.

---

## How the run works

Kill minor dragons. Every kill drops **1 fire soul shard**.

```
10 shards  =  1 dragon fire soul
10 souls   =  1 stat upgrade  (+10 max HP, +8% damage, +6% fire rate)
```

A **dragon lord** appears every 100 minor dragons killed — nine of them — and each
is worth a whole fire soul. After 1000 minor dragons, **Eanu the Dragon King**
arrives for the final fight.

### Difficulty is a staircase, not a ramp

Intensity is flat inside a phase and steps up the moment a dragon lord dies.
Phase 1 is deliberately gentle and stays that way for its full 100 kills.

Each lord kill applies one step to every enemy at once — HP ×1.18, speed ×1.06,
fire rate ×1.10, bullet speed ×1.05, spawn interval ×0.92 — and unlocks a new
enemy behaviour, so each of the ten phases has its own character:

| Phase | Name | Adds |
|---|---|---|
| 1 | Ember Skies | drifters |
| 2 | Swift Wings | strafers |
| 3 | Weaving Flame | sine-weavers |
| 4 | Scattered Fire | 3-shot spreaders |
| 5 | The Diving Host | divers |
| 6 | Circling Dread | orbiting shooters |
| 7 | Iron Scales | armored dragons |
| 8 | Paired Talons | paired formations |
| 9 | Storm of Wings | burst shooters |
| 10 | The Last Gauntlet | everything, tightest cadence |

The music's tempo climbs one notch per phase, so the escalation is audible.

### Escapees do not despawn

A dragon that gets past Cindu **stays on the screen**, circling and firing until
it is slain. Letting them through is how you lose. Ten circlers is the cap — while
the sky is that full, no new dragons enter until you thin the pack. Circlers fire
at 60% of a fresh attacker's rate, so a full sky is punishing rather than
impossible.

### The power attack

Requires **both** conditions:

1. 30 seconds since the last use, **and**
2. current HP at 50% or more of maximum.

The HUD shows the two conditions separately, so a denied press is never a mystery.
It costs nothing to fire — but being hurt locks it away, which is exactly when you
want it.

It evolves as dragon lords fall:

| Unlocked after | Form | Effect |
|---|---|---|
| start | Fire Cone | wide amber cone |
| 2 lords | Soul Burn | cone plus lingering purple burn |
| 4 lords | Soul Lance | piercing column up the screen |
| 6 lords | Ruin Wave | lance plus a radial shockwave |
| 8 lords | King's Nova | screen-clearing nova that also scrubs enemy fire |

### Saving

Progress is written to browser `localStorage` — after every dragon lord and every
25 kills. **Continue** on the title screen resumes where you stopped. Dying sends
you back to the last dragon-lord checkpoint, not to zero.

---

## Look and sound

Amber outlines and purple effects over a painted backdrop. Every dragon is still a
stroked vector path — there are no sprites — but the sky behind them is no longer
black.

`assets/bg_loop.webp` is a single 1080×2288 tile: snow-capped ridges falling into a
river valley of patchwork farmland, hedgerows, a village and a stone bridge. It
scrolls slowly upward behind the wind streaks and wraps seamlessly, so the flight
never ends. The image was generated locally with ComfyUI and SDXL; the workflows
and the script that made it live in the `comfyUI-setup` repo under `workflows/` and
`scripts/generate_backgrounds.py`.

On the start and title screens Cindu hovers rather than travels: the wings beat
through the same four painted frames as in flight, but he holds his station,
with only a 3px bob so he does not read as a decal. `HOVER_BOB` next to
`drawCinduHover()` is the knob; 0 nails him down completely.

He is sized to fill the screen: at the widest point of the flap the wingtips
land 24px from each edge (`HOVER_SPAN`). That scale is measured from the art
rather than picked by hand — `blit` squashes a sprite cell into a `dim`-square,
so `cinduSpanFrac()` reads the widest frame's share of its cell once and caches
it. The painted sheet is cut flush at the cell edge on the downbeat; the
wireframe fallback carries a lot of glow padding around a narrower dragon, and
would be half the size under a fixed scale. `SPAN_ALPHA` is what counts as wing:
measuring the soft halo instead of the membrane would size him by his glow and
leave the wings visibly short.

The vector art was tuned against pure black, so a black scrim sits between the
backdrop and the action. **`CFG.BACKDROP.dim` is the knob** — raise it toward 1 if
the amber is ever hard to read, drop it toward 0 to let the landscape through.
`speed` sets the parallax (the wind moves at 110–410, the ground at 46) and
`tileH` is the tile's height in virtual units, which must match the image's real
height halved.

Gameplay audio is synthesised at runtime with Web Audio oscillators and filtered
noise: a driving major-key loop for regular waves, a minor-key tritone drone for
boss rounds, and effects for firing, power attacks, enemy deaths, Cindu's death,
lord spawns, boss victories, level-ups and menu selections. It is honestly retro —
this is chiptune, not an orchestra.

The one exception is `assets/menu_loop.m4a`, the title music: a 30.000s dark
Gregorian chant loop — low male choir over an organ drone at about 72 Hz, with a
slow funeral bell — generated with Stable Audio 3 and cut to an exact seamless
loop with a two-second equal-power crossfade. It plays across the title menu
*and* the scrolling tale, then fades out over 0.35s the moment `startGame()` makes
Cindu playable, handing off to the synth tracks. That rule is stated once, at the
top of `step()`, rather than toggled at each screen transition, so every route in
and out of the menu is covered by construction.

It plays as one looping buffer on the same `musBus` as everything else, so
`SOUND: ON/OFF` and the `M` key gate it identically — and because muting drops the
bus rather than stopping the source, unmuting returns you to the chant where it
would have been, not to the top.

The bytes are fetched at boot, but the chant still cannot begin until you press
a key or click: every browser refuses to start audio before a user gesture, and
no amount of preloading changes that. So the two halves are split. `fetch` needs
no `AudioContext` and runs immediately; only `decodeAudioData` and playback wait
for the gesture. Without that split the first key press paid for a 480KB
download before a note sounded, which reads as broken rather than loading.

**That gesture is what the start screen is for.** The name, Cindu hovering, and a
single `START` button — any key or any tap takes it. Pressing it unlocks the audio
context, so by the time the menu draws the chant is already playing rather than
waiting for the player to happen to touch something. If it is not singing yet the
menu says **THE CHANT IS RISING...** while the file is still on the wire, and
**THE CHANT IS LOST** if the load failed, so a silent menu is always explained
rather than merely silent. A failed load latches and is never retried --
`decodeAudioData` detaches its buffer, so there is nothing left to retry with.
(A Chromium build without the proprietary AAC decoder — the Playwright bundle,
for one — always lands on **THE CHANT IS LOST**. Real Chrome, Safari and Firefox
decode it fine.)

Stable Audio 3's Community License requires registration for commercial use.

---

## Working on it

Everything lives in `index.html`, sectioned in order: config, utilities, audio,
sprites, input, entities, progression, bosses, power attack, drawing, screens,
main loop.

**All balance numbers are in the `CFG` object at the top of the script**, plus the
`ARCHETYPES`, `PHASES`, `LORDS`, `EANU` and `POWER_TIERS` tables directly beneath
it. Tuning the game should not require touching any logic.

Technical notes worth knowing before editing:

- The virtual resolution is a fixed 540×960, scaled to fit with letterboxing, so
  gameplay is identical on every screen. Device pixel ratio is capped at 2.
- The backdrop blits only the visible slice of each tile rather than the whole
  1080×2288 texture, and everything in the `BACKDROP` module is a no-op until the
  image decodes — a missing or broken asset costs nothing and breaks nothing.
- Dragons are pre-rendered once into offscreen canvases with their glow baked in,
  then blitted. Running `shadowBlur` per stroke per frame is what kills framerate
  on a phone.
- Bullets, enemies and particles come from fixed pools with O(1) alloc and
  swap-removal — allocation churn during a 25-minute run is what causes GC stutter.
- The logic loop is a fixed 60 Hz accumulator with `dt` clamped, so a backgrounded
  tab cannot spiral.
- Music is scheduled with a lookahead against `AudioContext.currentTime`; firing
  notes straight off `setTimeout` drifts audibly.
- The menu loop sets `loopStart`/`loopEnd` explicitly from `CFG.MENU_MUSIC`
  instead of trusting `buffer.duration`. Chrome trims the AAC encoder padding
  exactly, but a decoder that leaves it on would play those frames as a gap at
  the seam. Prefer `.m4a` over `.mp3` here for the same reason — MP3's padding is
  guaranteed and decodes as silence at both ends.
- `window.__CINDU` exposes a debug hook (`jump`, `summon`, `power`, `stats`) used
  by the automated playtests.

### Deploying

`.github/workflows/pages.yml` runs on every push to `main` and publishes to
GitHub Pages. It calls `scripts/build-site.py`, which assembles `_site/` and does
the two things the source file cannot do for itself:

- rewrites `const BUILD = 'dev'` to the commit date and short sha, which is what
  the start and title screens show;
- appends a content hash to each `assets/` URL, so a changed backdrop or sprite
  sheet is refetched instead of being served from a stale browser cache.

`_site/` is generated and git-ignored. Build it locally the same way CI does with
`python3 scripts/build-site.py`.

Pages needs two one-time settings before the workflow can succeed, both requiring
repository admin: the repository must be **public**, and **Settings → Pages →
Build and deployment → Source** must be set to **GitHub Actions**. Neither can be
done from the workflow — `configure-pages` accepts an `enablement: true` input
that calls the create-a-Pages-site API, but the Actions `GITHUB_TOKEN` is refused
("Resource not accessible by integration") whatever `permissions:` it is given.
Once those two are set, every push to `main` deploys with no further intervention.
