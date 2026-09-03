# AI-generated assets for Cindu: Dragon Lord

Notes on which AI tools are worth using for this project's art and audio, written
against what you already pay for (Gemini, Grok) and a hard preference for not adding
another subscription.

Read `ASSET-PIPELINE.md` next. It covers what the code would actually have to change
to display any of this, which is a bigger job than generating the art.

**Currency warning:** tool tiers, prices and licences move monthly. Everything below
was checked in September 2026 against vendor pages and secondary reporting, and the
secondary sources for the sprite tools in particular are SEO-heavy listicles — treat
the free-tier numbers as "roughly this, verify before you rely on it." Licence terms
are the one thing worth reading yourself on the vendor's own page.

---

## The headline: your two paid tools split badly

| | Art | Audio |
|---|---|---|
| **Gemini (paid)** | Genuinely good. Your primary art tool. | No music/SFX generation. |
| **Grok (paid)** | Weakened. See below. | No music/SFX generation. |

Neither Gemini nor Grok generates music or sound effects. Whatever you do for audio,
it comes from somewhere else — that's the one place a free tier is unavoidable.

### Gemini — use this for the art

Gemini's image generation (Nano Banana Pro / Gemini 3 Pro Image) is the strongest thing
you already have. Two things matter for sprites specifically:

1. **It cannot output transparency.** Google's image models emit flat RGB with no alpha
   channel. Asking for "transparent background" gets you white, black, or a *painted
   picture of* a checkerboard. This is the single biggest practical obstacle and there
   is no setting that fixes it.

2. **Two workarounds, both real:**
   - **Green screen.** Prompt for a pure `#00FF00` background plus a 2–3px outline
     around the sprite, then key out the green in HSV space. Fast, slightly lossy on
     glow edges — which matters here, because every dragon in this game *is* glow.
   - **Difference matting.** Generate the same subject twice, once on white and once on
     black, and recover a true alpha channel by comparing them. Slower, needs the model
     to reproduce the subject consistently between runs, but gives clean edges on
     translucent effects. **For this game's neon look, use this one.**

### Grok — deprioritise it

Grok Imagine went paid-only in March 2026, and since June 2026 xAI meters chat, images
and video out of one shared weekly pool. So image generation now eats the same budget
as your normal Grok usage. It is not a second free art pipeline; treat it as a fallback
for style exploration, not production.

---

## 2D art

### What you actually need, in order

1. **Cindu** — one character, three flap frames, must read at ~54px tall.
2. **Five mob archetypes** — `minor`, `swift`, `caster`, `armored` (and Cindu's own
   sheet). These are drawn at s:16–18, so roughly 32–40px tall on a 540×960 field.
   Detail is wasted here.
3. **Ten bosses** — nine lords plus Eanu, drawn at s:40 and s:54. These are the ones
   worth real effort: they're big, they're on screen for a long time, and they each
   have a name and a personality the current vector dragon can't express.
4. **Effects and landscape** — last, and the least suited to raster (see below).

**Blunt recommendation: start with the bosses.** They have the best
effort-to-visible-improvement ratio. The mobs are 36px tall and moving fast; a
hand-rendered dragon and a generated one will look nearly identical at that size, and
you'd be trading a 40KB HTML file for a sprite atlas to get there.

### Tools

| Tool | Free tier (approx., verify) | Why for this project |
|---|---|---|
| **Gemini** (you have it) | Paid | **Primary.** Best prompt adherence; use difference matting for alpha. |
| [Scenario](https://www.scenario.com/) | ~50 credits/day | The one worth adding. Its point is *style consistency* — train a model on a few approved dragons and every later generation matches. That's the thing that makes ten bosses look like one game. |
| [Leonardo.Ai](https://leonardo.ai/) | ~150 tokens/day | Game-tuned models plus tileable texture synthesis. Best free option for the landscape/background work later. |
| [PixelLab](https://www.pixellab.ai/) / [Retro Diffusion](https://www.retrodiffusion.ai/) | Limited | Only if you switch to a pixel-art look. They produce *true* pixel grids rather than a downscaled render. |
| [Piskel](https://www.piskelapp.com/) | Free, open source | Not AI. A browser sprite editor for cleaning up generated frames. You will need something like this regardless. |

**Consistency is the actual problem, not quality.** Any of these makes one good dragon.
Making ten bosses that look like they belong in the same game is the hard part, and it's
why Scenario's trained-model approach is worth the free tier even though you have Gemini.

### Prompt recipe for this game

The game's look is fixed and narrow — three colours, stroked vectors, no fills. Any
prompt that ignores that produces art that will not sit next to the existing HUD:

```
A [dragon description], drawn as glowing neon vector line art.
Stroke-only rendering — outlines and thin interior lines, NO solid fills,
NO shading, NO gradients.
Palette: amber #FFB000 for the body outline, purple #B026FF for the eyes,
soul-core and inner glow. Pure black #000000 background.
Soft outer bloom on every stroke, like a CRT vector display.
Side-on silhouette, nose pointing up, wings spread, symmetrical.
Centred, full body in frame, generous margin.
```

Then for matting, append `Solid pure white #FFFFFF background.` and
`Solid pure black #000000 background.` and generate both.

For the three-frame flap, generate one master pose and ask for wing variants of *that
image* rather than three independent generations — the existing code uses flap phases
`[0.15, 0.55, 0.95]` where only the wing span changes and the body is identical.

**Per-boss prompts:** the nine lords have names that carry design intent — Vurath the
Emberwing, Skoll the Ashmaw, Merexis the Brooder, Tyrn the Swift Lance, Azkalor
Ringbearer, Nyxheim the Coiled, Draveth the Charger, Solareth the Cross, Vorgaal
Souleater. Each also has an attack pattern (`radial`, `sweep`, `summon`, `volley`,
`rings`, `spiral`, `charge`, `cross`) in the `LORDS` table. Feed the name *and* the
pattern into the prompt so the silhouette telegraphs the fight.

### Effects and landscape — think twice

Effects (particles, rings, the power attack) are the worst fit for generated raster art.
They're procedural, they scale and fade per-frame, and they're currently ~15 lines of
canvas code each. A sprite sheet would be larger, less flexible, and worse. **Keep the
effects procedural.**

Landscape/background is the opposite — the current backdrop is 64 wind streaks, and a
generated parallax layer would be a real improvement and is the *easiest* thing to add
technically (one image, one draw call, no alpha problem, no animation frames). If you
want the biggest visual win for the least work, do the background before the sprites.

---

## Audio

Two separate problems with different answers.

### Music loops

The game currently has two synthesised tracks (`triumph` and `boss`) whose tempo climbs
with the phase. Replacing them with generated audio means losing that dynamic tempo
unless you generate one loop per phase, or accept a fixed tempo.

| Tool | Free tier (approx., verify) | Notes |
|---|---|---|
| [Suno](https://suno.com/) | ~50 credits/day (~10 songs) | Most generous free volume. **Free tier does not grant commercial rights** — fine for a personal project, not for anything you'd monetise. |
| [Udio](https://www.udio.com/) | ~25/month | Slightly better per-generation quality, but downloads were reported disabled during a licensing transition. Check before investing time. |
| [ACE-Step 1.5](https://github.com/ace-step/ACE-Step-1.5) | Free, **Apache 2.0** | **The one I'd actually recommend.** Runs locally, needs ~8GB VRAM, no subscription, no rate limit, and the permissive licence means no ambiguity about what you own. If you have a GPU, this ends the licensing question entirely. |
| [Stable Audio Open 1.5](https://stability.ai/) | Free weights | Better at texture and sound design than at songs. Community licence permits commercial use under a revenue threshold. |
| Meta MusicGen | Free weights, **CC BY-NC 4.0** | Non-commercial only. Avoid unless this stays strictly personal. |

**The looping problem is the real one.** Almost none of these generate seamless loops
by default — you get a track with an intro and an ending. You will need to cut loop
points by hand in [Audacity](https://www.audacityteam.org/) (free) regardless of which
generator you use. Budget more time for that than for the generation.

### Sound effects

| Tool | Free tier | Notes |
|---|---|---|
| [ElevenLabs SFX](https://elevenlabs.io/sound-effects) | Yes, **attribution required** | Best quality by a wide margin. Text-to-SFX, 48kHz, up to 30s, with a looping option. Commercial licence only on paid plans. |
| [jsfxr](https://sfxr.me/) / [ChipTone](https://sfbgames.itch.io/chiptone) | Free, no account | **Not AI, and arguably better here.** These are retro SFX synths. Your game's entire sound identity is oscillators and filtered noise — a generated realistic dragon roar would sound *wrong* next to it. |
| Stable Audio Open | Free weights | Good at short one-shots and textures. |

**Honest recommendation: don't replace the SFX.** The README calls the audio "honestly
retro — this is chiptune, not an orchestra," and it's coherent. Thirteen hand-tuned
Web Audio effects that all belong to one palette will beat a mixed bag of generated
clips, and they cost zero bytes. If you want better audio, **spend the effort on the
music loops and leave the SFX synthesised.**

---

## Licensing, briefly

The pattern across essentially every tool here: **free tiers give you output, paid tiers
give you commercial rights.** Suno and ElevenLabs both work this way. If this stays a
personal project, free tiers are fine. If it ever ships anywhere with money attached,
either budget for one paid month to regenerate your finals, or use the open-weight
models (ACE-Step under Apache 2.0 is the cleanest answer) where the question doesn't
arise.

Read the licence on the vendor's own page before you rely on any of this. Secondary
sources — including this file — go stale.

---

## Where the work actually is

Generating a good dragon takes an afternoon. Making this game display one is the larger
task: it has no image loading, no async boot, no sprite atlas and no asset directory,
because everything is drawn as vectors at startup. That is what `ASSET-PIPELINE.md`
covers, and it is worth reading before you generate anything.
