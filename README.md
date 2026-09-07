# Cindu: Dragon Lord

A vertical-scrolling dragon shooter. One HTML file, no dependencies, nothing downloaded
at runtime. Plays on a phone and on a desktop keyboard.

**Play it:** open `index.html` in any modern browser.

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

---

## How the run works

Kill minor dragons. Every kill drops **1 fire soul shard**.

```
10 shards  =  1 dragon fire soul
10 souls   =  1 stat upgrade  (+10 max HP, +8% damage, +6% fire rate)
```

The three rewards are deliberately three sizes. A shard fires on every kill, so it stays
a rising blip and a pulse on the HUD counter. A soul is ten of those and earns a ring, a
flash and a nudge of screen shake. A level is a hundred, takes the screen, and **restores
Cindu to full health** — the card says SOUL RESTORED, so it restores her.

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

Three colours only: black background, amber outlines, purple effects. Every dragon
is a stroked vector path.

Behind them, a three-layer parallax backdrop of ruined citadel spires — the throne Eanu
took — drifts past: two spire layers off one image plus the wind streaks in front. The
image is base64-inlined, so it is still one file you can double-click. `assets/backdrop.png`
is the editable master; swap the art with
`node tools/inline-asset.mjs BACKDROP assets/backdrop.png` and see
[`docs/AI-ASSETS.md`](docs/AI-ASSETS.md) for what a replacement tile has to satisfy.

All audio is synthesised at runtime with Web Audio oscillators and filtered noise:
a driving major-key loop for regular waves, a minor-key tritone drone for boss
rounds, and effects for firing, power attacks, enemy deaths, Cindu's death, lord
spawns, boss victories, level-ups and menu selections. It is honestly retro — this
is chiptune, not an orchestra.

---

## Working on it

Everything lives in `index.html`, sectioned in order: config, utilities, audio,
sprites, input, entities, progression, bosses, power attack, drawing, screens,
main loop.

**All balance numbers are in the `CFG` object at the top of the script**, plus the
`ARCHETYPES`, `PHASES`, `LORDS`, `EANU` and `POWER_TIERS` tables directly beneath
it. Tuning the game should not require touching any logic.

Thinking about replacing the vector art or the chiptune with generated assets? Read
[`docs/AI-ASSETS.md`](docs/AI-ASSETS.md) for the tools and
[`docs/ASSET-PIPELINE.md`](docs/ASSET-PIPELINE.md) for what the code would have to
change — which is the larger half of the job.

Technical notes worth knowing before editing:

- The virtual resolution is a fixed 540×960, scaled to fit with letterboxing, so
  gameplay is identical on every screen. Device pixel ratio is capped at 2.
- Dragons are pre-rendered once into offscreen canvases with their glow baked in,
  then blitted. Running `shadowBlur` per stroke per frame is what kills framerate
  on a phone.
- Bullets, enemies and particles come from fixed pools with O(1) alloc and
  swap-removal — allocation churn during a 25-minute run is what causes GC stutter.
- The logic loop is a fixed 60 Hz accumulator with `dt` clamped, so a backgrounded
  tab cannot spiral.
- Music is scheduled with a lookahead against `AudioContext.currentTime`; firing
  notes straight off `setTimeout` drifts audibly.
- Cindu's fireball has two radii: `b.r` drives the drawing and `b.hr` drives
  collision. `hr` tracks the visible flame at half its growth rate, so a hit always
  lands inside the fire you can see and never outside it.
- The backdrop tile scrolls and wraps forever, so it fades to nothing at **both** its top
  and bottom edges. Fading only one leaves towers sliced off against black.
- Cindu banks into horizontal input. It is a draw-time angle only — `P.x`, `P.y` and her
  collision radius never see it, and the overlays that sit on her stay upright.
- Art is either inlined or loaded, by how often it is on screen. Cindu is inlined (three
  frames, `tools/inline-asset.mjs CINDU`) because she is visible every frame and a moment
  of fallback would show. Dragon lords load from `assets/bosses/` because ten of them would
  be megabytes.
- Cindu's three frames are all-or-nothing: a partial set falls back to vectors entirely
  rather than strobing one raster frame against two vector ones.
- Dragon lords and minor mobs fall back to the vector dragon when there is no PNG, so
  either art set can be filled in one at a time. Mob art is per archetype rather than per
  sprite kind, so a diver, a strafer and a weaver can stop looking identical — the point
  is reading a threat before it acts, not decoration.
- Boss art is fetched when the boss spawns; mob art is preloaded at boot, because mobs
  turn up about two seconds into a run. Boss art is a single
  frame; the flap is replaced by a procedural bob and breath in `drawBoss`, applied at draw
  time only so collision never sees it.
- `window.__CINDU` exposes a debug hook (`jump`, `summon`, `power`, `stats`) used
  by the automated playtests.
