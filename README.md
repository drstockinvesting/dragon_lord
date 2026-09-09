# Cindu: Dragon Lord

A vertical-scrolling dragon shooter. One HTML file plus one background image, no
dependencies, no build step. Plays on a phone and on a desktop keyboard.

**Play it:** open `index.html` in any modern browser. Keep `assets/` next to it —
without the backdrop the game still runs, just on the black sky it started life
with.

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

The vector art was tuned against pure black, so a black scrim sits between the
backdrop and the action. **`CFG.BACKDROP.dim` is the knob** — raise it toward 1 if
the amber is ever hard to read, drop it toward 0 to let the landscape through.
`speed` sets the parallax (the wind moves at 110–410, the ground at 46) and
`tileH` is the tile's height in virtual units, which must match the image's real
height halved.

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
- `window.__CINDU` exposes a debug hook (`jump`, `summon`, `power`, `stats`) used
  by the automated playtests.
