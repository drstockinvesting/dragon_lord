# What it would take to load real assets

> **Update:** the backdrop has since been built, and it settled several of the open
> questions below. Where this doc guessed, it now records what actually happened —
> see **What the backdrop actually cost** at the end.

`index.html` loads exactly one thing: the base64-inlined backdrop tile. No sprite sheet, no
audio file, no font file, no `fetch`, no network request of any kind. Every dragon is still
a stroked vector path built at startup; every sound is still synthesised from oscillators
and filtered noise.

That is a deliberate property — "one HTML file, open it and play" — and swapping in
generated assets costs it unless you inline them. This file is the honest accounting of
what changes, so the decision is made with the price visible.

Companion doc: `AI-ASSETS.md` (which tools to generate with).

---

## The good news: there is exactly one choke point

Every image the game draws goes through one function:

```js
function blit(spr, x, y, rot, alpha, scale){        // index.html
  ctx.drawImage(spr, -spr.dim/2, -spr.dim/2, spr.dim, spr.dim);
}
```

`spr` is an offscreen `<canvas>` with a custom `.dim` property. `drawImage` accepts an
`HTMLImageElement` just as happily as a canvas. **So a raster sprite only needs to be an
object with a `.dim`** — the ~15 call sites in `drawEnemies`, `drawBoss` and `drawPlayer`
don't change at all.

That is genuinely the whole rendering story. The work is everywhere else.

---

## What actually has to change

### 1. Boot becomes asynchronous — *if* you load over the network

**This turned out to be avoidable, and the backdrop avoids it.** A base64 data URI needs no
network, so it decodes within a frame or two. The backdrop's draw call simply no-ops until
`SKY.ready`, which means no preload gate, no loading screen, no boot reordering, and no new
failure mode — a corrupt blob degrades to the plain black background rather than throwing.
Verified by booting with a deliberately corrupted blob.

The warning below still stands for anything loaded from an `assets/` directory, and for a
sprite set large enough that a two-frame gap becomes a visible pop.

Today the boot block is synchronous and immediate:

```js
buildSprites(); buildWind(); resize(); loadSave(); applyStats(false);
requestAnimationFrame(frame);
```

`buildSprites()` draws five dragons into offscreen canvases and returns. Images don't
work that way: `img.src = ...` returns instantly and the pixels arrive later. Start the
loop before they land and the first seconds of play draw nothing, or throw.

You need a preload gate — load every image, `Promise.all` their `onload`, *then* start
the loop — plus a loading state on screen, plus a decision about what happens when an
image fails (a phone on bad wifi, a corrupted cache). Right now failure is impossible;
after this change it isn't, and the game needs an answer.

**This is the change most likely to introduce bugs**, because it reorders startup and
touches `loadSave()` and `applyStats()` ordering.

### 2. Sprite sizing stops being derived

`spriteHalf(K)` currently computes the sprite box from the real vector geometry — widest
wingtip versus longest tail, plus glow padding. With a raster sprite there is no geometry
to measure; `.dim` comes from the image's own dimensions, and you have to decide the
scale relationship between the image's pixel size and the game's virtual units yourself.

Get this wrong and either the hitboxes stop matching the art (mobs use `e.r = 15`,
`18` for armored) or every dragon is subtly the wrong size. Expect to hand-tune a
per-kind scale factor.

Related: `makeSprite()` supersamples at `SS = 2` and pads 16px for glow. Generated art
needs to arrive at ≥2× the display size for parity, and needs its own glow baked in or
drawn with margin — because…

### 3. The glow has to be baked into the image

The comment above `buildSprites()` says it plainly: pre-rendering exists because running
`shadowBlur` per stroke per frame kills framerate on a phone. `glowStroke()` does three
passes — wide purple bloom, tight amber bloom, crisp amber line — once, at startup.

Generated sprites must carry that bloom **in the PNG**, with transparent margin around
it, or they'll look flat next to the HUD and the particle effects, which are still drawn
live with glow. This is why the difference-matting approach in `AI-ASSETS.md` matters
more than the green-screen one: green-screen keying eats soft glow edges.

### 4. Three flap frames, and they must actually match

Frame selection is `((flap|0) % 3 + 3) % 3` in three places (mobs, boss, player). Any
generated animation must be exactly three frames, and the body must be identical across
them — only the wing span changes, at phases `[0.15, 0.55, 0.95]`. Three independently
generated dragons will visibly jitter. Generate one master and ask for wing variants
*of that image*.

### 5. Bosses are built at spawn, not at boot

`buildBossSprites(b)` runs when a lord appears, sized `s:40` (lord) or `s:54` (Eanu).
With vectors that's a few milliseconds. With images it's either a mid-fight load stall
or ten more images in the boot preload — ten bosses at 2× of a 108px sprite is not
trivial, and it's paid on first load whether or not the player ever reaches Eanu.

Lazy-loading a boss sprite one phase ahead of its fight is probably the right compromise,
but it's new machinery that doesn't exist today.

### 6. Single-file distribution vs. file size

The README's headline promise is "One HTML file, no dependencies, no build step, no
downloaded assets." Keeping it means base64-inlining every PNG as a data URI, which
inflates by ~33% and turns an 84KB file into something in the megabytes. Base64 in an
HTML file also can't be cached separately, can't be lazy-loaded, and makes the source
unreadable.

The alternatives both cost something:

| Option | Cost |
|---|---|
| Inline base64 | Single file preserved; file balloons, source unreadable, no partial caching |
| `assets/` directory | Clean and cacheable. Widely assumed to break `file://` — **it does not, for images.** See the correction below. |
| Build step | Best of both (dev uses files, ship inlines them); introduces the build step the project explicitly avoids |

There is no free option here. Pick deliberately.

**What the backdrop does:** the third option, kept small. `assets/backdrop.png` is the
editable master and `tools/inline-asset.mjs` is a one-command build step that writes the
base64 into a marked slot in `index.html`. The game only ever reads the inlined copy, so
`file://` still works and `assets/` can be deleted without breaking anything. The "build
step" is a single script with no dependencies and no config, which is a long way from a
bundler.

### 7. Audio, if you go that way too

Same shape of problem. `Audio2` synthesises everything through `tone()` and `noise()`,
both of which bail instantly if `!ready || !opt.sfx`. Real audio files need decoding
into `AudioBuffer`s at load, which is more preload weight, and the music scheduler
currently sequences *notes* against `AudioContext.currentTime` with a 120ms lookahead —
that machinery does nothing useful for a pre-rendered loop and would be replaced by a
looping `AudioBufferSourceNode`.

You'd also lose the tempo-climbs-with-phase behaviour unless you generate one loop per
phase (ten loops), which multiplies the download.

---

## Recommended order

Ordered by improvement per unit of risk:

1. ~~**Background / parallax layer.**~~ **Done.** Three layers (two off one tile, plus the
   existing wind streaks). Predicted to be the cheapest win; it was.
2. **Music loops.** Self-contained, doesn't touch rendering, and the current chiptune
   is the weakest part of the presentation. Accept the fixed tempo or generate per phase.
3. ~~**Boss sprites.**~~ **Pipeline built.** Ten `assets/bosses/*.png` slots, loaded at
   spawn, with the vector dragon as the fallback for every one. Not inlined — see the
   size note below.
4. **Cindu.** One character, three frames, but she's on screen 100% of the time so any
   mismatch in style is maximally visible. Do her only after the bosses have established
   the look.
5. ~~**Minor mobs.**~~ **Pipeline built** — and the "payoff is small" call was half wrong.
   See below.
6. **Effects.** Don't. They're procedural, they scale and fade per-frame, and a sprite
   sheet would be bigger, less flexible and worse than the ~15 lines of canvas code
   each one costs now.

---

## A hybrid worth considering

You don't have to choose all-or-nothing. The renderer can hold raster and vector sprites
side by side, because `blit()` doesn't care which it gets.

Generate the bosses and the background as images; leave the mobs, Cindu, all effects and
all audio procedural. You get the visual lift exactly where it's visible, the file stays
small enough to inline, `file://` still works, and the boot gate only has to wait on
about a dozen images instead of everything.

**That's the version I'd build.**


---

## What the backdrop actually cost

The first raster asset is in. Measured, not estimated:

| | |
|---|---|
| Code | ~45 lines in `index.html` (config, loader, `drawBackdrop`, folding into `updateSky`/`drawSky`) |
| File size | 86.5KB → 229KB (a 107KB PNG at ~137KB base64) |
| Frame cost | 4 extra `drawImage` calls; **no measurable change** in median frame time vs. the previous build |
| Boot | Unchanged — still synchronous, no preload gate |
| New failure modes | None. A corrupt or missing blob renders the previous plain-black background. |

Two things the guesses above got wrong, worth carrying into the sprite work:

1. **Async boot was avoidable.** Base64 sidesteps it entirely. Only reach for a preload
   gate when loading from `assets/` over a real network.
2. **The vertical wrap seam was the actual hard part**, and it isn't mentioned anywhere
   above. A tile that scrolls forever must fade to nothing at *both* edges. Fading only the
   leading edge leaves content sliced off against black at the other. This is a constraint
   on the *art*, not the code, which makes it easy to miss when briefing an image model —
   so it's stated loudly in `AI-ASSETS.md`.

The file-size number is the one to watch. One backdrop took `index.html` from 86KB to
229KB. Ten boss sprites at similar weight would put it past 1.5MB, at which point the
single-file property stops being worth defending and an `assets/` directory plus a tiny
local server is the better trade.


---

## What the boss pipeline actually cost

The second raster asset path is in. It went differently from the backdrop in ways
worth recording.

| | |
|---|---|
| Code | ~35 lines in `index.html` (config, `loadBossArt`, a branch in `drawBoss`, `art` slugs on the tables) |
| File size | **Zero.** Nothing is inlined. |
| Frame cost | One `drawImage` per frame, same as the vector path it replaces |
| Boot | Unchanged |
| New failure modes | None. Missing, misnamed or undecodable art draws the vector dragon. |

### Why these are not inlined

Ten bosses at usable quality is roughly 5MB of base64. The backdrop's 143KB was
affordable; this is not. This is the threshold the backdrop note predicted, reached
one asset later.

So the bosses invert the model: **the vector renderer stops being the thing being
replaced and becomes the fallback.** That turns out to be strictly better than a
committed placeholder — there is no second copy of the art to keep in sync, no
error state, and a half-finished set is a perfectly valid state where some bosses
are drawn and some aren't.

### Correction: `file://` does not block this

The distribution table above claimed an `assets/` directory "breaks `file://`
opening in most browsers due to CORS". **That is wrong, and it was worth testing
rather than assuming.** Boss art loads fine from `file://` in Chromium.

The distinction is that `<img src>` pointing at a sibling file is permitted; what
CORS blocks is `fetch()` and *reading pixels back* from a canvas the image has
tainted. `blit()` only ever calls `drawImage` and never `getImageData`, and a
grep confirms the game never reads pixels back anywhere. So tainting is harmless
here.

Two caveats worth keeping: this is browser-dependent (Chromium is permissive;
don't assume every browser matches), and it would stop being true the moment any
code wanted to read the main canvas back. The vector fallback covers both cases,
which is the real reason the design is safe rather than lucky.

### The flap convention did not survive

`buildSprites` and `drawEnemies`/`drawPlayer` all assume three flap frames. Boss
art uses **one**, because asking an image model for the same dragon three times
with only the wings moved is the hardest consistency problem in the whole job.

The motion is put back procedurally instead — a hover bob and a breathing scale
from `CFG.BOSS_ART`, on top of the banking the boss already did. Both are applied
inside `drawBoss` only; `b.y` and `b.r` stay untouched, so collision is unaffected
(verified: 240 draw calls across a full bob cycle leave `b.y` byte-identical).

If the mobs ever get raster art, they should follow this pattern rather than the
three-frame one.

### Alpha, finally

The backdrop dodged Gemini's missing alpha channel by sitting on pure black. The
bosses cannot — they draw over the world. `tools/matte.mjs` recovers alpha from a
white/black render pair and is lossless against a known ground truth (mean alpha
error 0.014/255). Any future sprite work should reuse it rather than reinventing
green-screen keying, which destroys the soft glow this art style is built on.

---

## What the Cindu pass cost

Third asset pass. She is the interesting case because she breaks the pattern the bosses
set, in both directions.

| | |
|---|---|
| Code | ~25 lines (slot, `CINDU_ART` loader, `cinduFrame()`, three call sites) plus ~5 for banking |
| File size | **Zero as shipped** — the slots go out empty. Real art costs ~440KB of base64. |
| Frame cost | Unchanged. Same one `drawImage` per frame either way. |
| Boot | Still synchronous. `loadCinduArt()` runs after `buildSprites()` and gates nothing. |
| New failure modes | None. No art, a partial set, or a corrupt frame all draw the vector dragon. |

### She is inlined; the bosses are not

Opposite calls, same reasoning applied to different facts. Ten bosses at usable quality is
megabytes, and any one of them is on screen for a couple of minutes per run — loading from
`assets/` with a vector fallback is the right trade. Cindu is one asset on screen 100% of
the time, where even two frames of fallback flicker at every game start would be the most
visible artefact in the game. Guaranteeing she is present beats a uniform mental model.

The rule that falls out: **inline what is always visible, load what is occasionally
visible.**

### All three frames or none

`CINDU_ART.ready` only flips true once every frame has decoded. A partial set falls back
to vectors *entirely* rather than mixing sources, because `drawPlayer` cycles frames at
roughly 2.5 flaps a second — one raster frame among two vector frames would strobe. This
is the difference between a graceful fallback and a worse-than-nothing one, and it is worth
copying anywhere a multi-frame asset gets the same treatment.

Empty slots are also never requested. An empty `src` fires `onerror`, so `loadCinduArt`
returns early unless all three slots are non-empty (verified: zero image requests in the
shipping configuration).

### The three-frame convention survived here

The bosses dropped it; Cindu keeps it. Thirty images was the problem, not three — and the
player character is the one thing in the game that genuinely must animate. Where a future
asset needs multiple frames, generate the middle one as a master and use the image model's
edit-from-reference mode for the rest; three independent generations drift, and drift at
flap speed is unmissable.

### Banking

Cindu was the only thing left in the game drawn at a fixed rotation. She now eases toward
`±CFG.PLAYER.bankMax` from horizontal input, reusing the `angTo` helper the mobs already
use. It is a draw-time angle only — `P.x`, `P.y` and `CFG.PLAYER.r` never see it, verified
by confirming movement still measures exactly `CFG.PLAYER.speed` while banked.

The overlays that sit on top of her — the power-ready core, the level-up burst, the hurt
ring — stay at rotation 0. They are concentric, so rotating them would be invisible but
wrong; the `0` is passed explicitly with a comment so a later reader does not "fix" it.

---

## What the mob pass cost

Fourth and final asset path.

| | |
|---|---|
| Code | ~20 lines (`CFG.MOB_ART`, `loadMobArt`, one branch in `drawEnemies`, one boot call) |
| File size | **Zero.** Loaded, not inlined. |
| Frame cost | One `drawImage` per mob, same as the vector path it replaces. Median frame time unchanged with a full screen. |
| Boot | Still synchronous. `loadMobArt()` fires nine requests and gates nothing. |
| New failure modes | None. A missing PNG draws that archetype's vector kind. |

### The "low payoff" call was half wrong

Ranked last, twice, on the grounds that mobs are small and fast so generated art would
look much like the vector art. That holds — as *decoration*.

What it missed: nine archetypes share four sprites. Three different threats are drawn
identically, so behaviour is not readable from the sprite. Framed as **readability rather
than prettiness**, mob art is worth more than the ordering implied. The lesson generalises:
when ranking asset work, ask what the art would *tell* the player, not just how it would
look.

### Preloaded, not loaded at spawn

Bosses fetch at spawn — there is one, and it announces itself with a card. Mobs appear
about 2.2s into a run (`G.spawnTimer` starts at 2.2), so they are all fetched during boot
instead. Nine 28KB images resolve long before the first spawn, and there is no pop.

### The slug already existed

No new config field. `spawnEnemy()` already stored `e.type`, so the archetype key names
the PNG while `art:` keeps its existing job of naming the vector fallback. One key, two
jobs, cleanly separated — worth looking for before adding a field.

Each archetype boxes to **its own** fallback kind's dimension (`SPR[ARCHETYPES[t].art][0].dim`),
so a `swift`-backed diver lands at 134px and a `caster`-backed orbiter at 120px. Verified
per kind rather than assumed.

---

## The completed rule

Four passes, three delivery mechanisms, one rule:

| Asset | On screen | Delivery | Frames |
|---|---|---|---|
| Backdrop | always | inlined | 1, wrapping |
| Cindu | always | inlined | 3 |
| Minor mobs | most of the time | loaded, preloaded at boot | 1 |
| Bosses | occasionally | loaded, fetched at spawn | 1 |

**Inline what is always visible; load what is not.** Fetch at boot when the asset is
needed within seconds, at spawn when it is needed in minutes.

And on frames: three only where the animation is legible and the subject is singular
(Cindu). Everywhere else one frame plus motion the engine already provides — banking for
mobs, banking plus a bob for bosses. The three-frame convention is a cost paid per asset
in generation difficulty, not just bytes, and it is only worth it once.
