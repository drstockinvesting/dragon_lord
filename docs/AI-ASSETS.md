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

### The backdrop — already wired, drop your image in

**This one is built and waiting for art.** The game now renders a three-layer parallax
backdrop of ruined citadel spires. The tile currently shipping is a procedural placeholder;
replacing it with a generated image is one command and no code change:

```
# put your PNG at assets/backdrop.png, then:
node tools/inline-backdrop.mjs assets/backdrop.png
```

That base64-inlines it into `index.html`, so the game stays one double-clickable file.
`assets/backdrop.png` is the editable master; the inlined blob is the build output.

**Hard requirements for the replacement.** Get these wrong and it will look broken:

| | |
|---|---|
| Size | 540×960 portrait (matches the virtual resolution) |
| Budget | **≤150KB PNG.** The tool warns above this. It's a dim silhouette — it doesn't need detail. |
| Top edge | **The top ~25% must be empty black.** |
| Bottom edge | **Must fade to black over the last ~190px.** |
| Brightness | Very dark. The code caps it at `CFG.SKY.maxAlpha`, but a bright image will still look wrong. |

The edge rules are the important ones and they're not stylistic. The tile scrolls upward
forever and wraps, so **both edges have to meet in nothing** or a hard horizontal line
sweeps down the screen every 15 seconds. Fading only the top isn't enough — that leaves the
towers sliced off at their bases with empty sky underneath, which reads as floating rubble.
Both edges, every time.

The upside: because the tile is meant to sit on pure black, **Gemini's missing alpha channel
is a non-issue here.** Generate straight onto a black background and use it as-is. No green
screen, no difference matting. This is the easiest possible asset to hand this model.

#### The prompt

```
A distant ruined citadel of broken stone spires, drawn as glowing neon vector line art.
Portrait orientation, 540x960.

Style: stroke-only rendering — thin outlines and interior lines, NO solid fills,
NO shading, NO gradients, NO texture. Like a glowing CRT vector display.
Palette: amber #FFB000 for all outlines. Purple #B026FF used ONLY as tiny sparse
accents — a single lit window slit here and there. Pure black #000000 everywhere else.

Subject: collapsed towers of varying heights, snapped-off crowns with jagged broken
tops, shattered arches and fallen buttresses, a few intact crenellations. Three
receding depths: small faint towers far back, medium towers, and large towers in front.
No characters, no dragons, no creatures, no foreground detail, no ground plane.

CRITICAL COMPOSITION: the top 25% of the image must be completely empty pure black sky
with nothing in it. The towers must fade out into black at the very bottom edge too.
The ruin occupies only the middle band of the image.

Very dark and low contrast overall — this is a distant silhouette seen at night, not a
focal subject. Dim, receding, atmospheric.
```

Generate a few and pick the one with the cleanest empty top band. If the top isn't empty
enough, it's faster to paint it black in any editor than to reroll.

### The bosses — also wired, drop your images in

Like the backdrop, this is built and waiting for art. Unlike the backdrop, the
bosses are **not** inlined: ten of them at usable quality would be ~5MB of base64,
which ends the single-file story. They load from `assets/bosses/<slug>.png` at
runtime instead, and **the vector dragon is the fallback** — a missing, misnamed
or undecodable file just means that boss draws the way it always has. There is no
placeholder to maintain and no error state, so the set can be filled in one boss
at a time.

Filenames and per-file requirements are in
[`assets/bosses/README.md`](../assets/bosses/README.md). One image per boss — the
three-frame flap is replaced by a procedural hover bob and breathing scale, which
removes the hardest consistency problem in the job: getting a model to redraw the
same dragon with only the wings moved.

#### Alpha is mandatory here, and Gemini can't give it to you

The backdrop dodged the missing alpha channel by sitting on pure black. Boss
sprites draw **over** the game world, so they need real transparency.

Generate each boss **twice** — same prompt, same session, changing only the last
line — once on pure white and once on pure black. Then:

```
node tools/matte.mjs vurath-white.png vurath-black.png assets/bosses/vurath.png
```

`tools/matte.mjs` solves for alpha by comparing the pair:

```
on white:  Pw = C*a + 255*(1-a)
on black:  Pb = C*a
                              ->   a = 1 - (Pw - Pb)/255,   C = Pb/a
```

It solves per channel and averages, which absorbs the small colour drift between
two generations. Round-tripped against a known ground truth it is lossless — mean
alpha error 0.014/255, zero colour error on solid pixels. Critically it preserves
soft glow edges, which is the whole reason not to green-screen key here: keying
eats exactly the amber bloom this art style is built on.

The tool warns if almost nothing came out transparent (usually means both renders
had the same background) or if very little soft edge was recovered (usually means
the two generations drifted into different images).

#### The base prompt

```
A [BOSS DESCRIPTION], drawn as glowing neon vector line art.
Square image, centred, full body in frame with generous margin.

Style: stroke-only rendering — outlines and thin interior lines, NO solid fills,
NO shading, NO gradients, NO texture. Soft outer bloom on every stroke, like a
glowing CRT vector display.
Palette: amber #FFB000 for the body outline and wings. Purple #B026FF for the
eyes and a soul-core at the chest.

Pose: side-on symmetrical silhouette, NOSE POINTING UP toward the top of the
frame, wings spread wide, tail trailing down. The whole creature and its glow
must sit inside the frame with margin on all sides — nothing clipped.

Background: solid pure white #FFFFFF.
```

Then regenerate the identical image with the last line changed to
`Background: solid pure black #000000.` and matte the pair.

The nose-up rule is not stylistic: the boss banks into its movement by rotating
the image, and rotation 0 means facing up. Art drawn facing sideways will fly
sideways.

#### Per-boss direction

Each lord's name and attack pattern already imply a design. Feed both in, so the
silhouette telegraphs the fight:

| Boss | Pattern | Design cue |
|---|---|---|
| Vurath the Emberwing | radial | Enormous ember-lit wings, feathers of flame radiating outward |
| Skoll the Ashmaw | sweep | A vast hinged jaw, ash pouring from the mouth, low and wide |
| Merexis the Brooder | summon, radial | Bloated body hung with egg sacs; small forms clustered on the back |
| Tyrn the Swift Lance | volley, sweep | Narrow, streamlined, spear-headed; swept-back blade wings |
| Azkalor Ringbearer | rings, volley | Concentric stone rings orbiting the body; a halo behind the skull |
| Nyxheim the Coiled | spiral, radial | Long serpentine body coiled into a spiral, small wings |
| Draveth the Charger | charge, volley | Heavy armoured bulk, forward-leaning, horned battering skull |
| Solareth the Cross | cross, summon | Cruciform wing-and-tail silhouette, solar disc behind the head |
| Vorgaal Souleater | spiral, rings, volley | Gaunt and skeletal, ribs showing, trailing captured souls |
| **Eanu the Dragon King** | all six | The largest and most ornate. Crowned, ridged spine, regal. **Purple-dominant instead of amber** — he is the usurper, and the HUD already names him in purple. |

Eanu is worth the most effort: he is the climax, he is on screen longest, and he
is drawn 35% larger than the lords.

### Effects and landscape — think twice

Effects (particles, rings, the power attack) are the worst fit for generated raster art.
They're procedural, they scale and fade per-frame, and they're currently ~15 lines of
canvas code each. A sprite sheet would be larger, less flexible, and worse. **Keep the
effects procedural.**

Landscape/background was the opposite, and it's **done** — see the backdrop section above.
It confirmed the prediction: one image, four draw calls, no alpha problem, no animation
frames, and no measurable frame cost. Do the rest of the landscape work the same way.

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
