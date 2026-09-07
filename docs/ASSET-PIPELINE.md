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
| `assets/` directory | Clean and cacheable; **breaks `file://` opening** in most browsers due to CORS, so "double-click to play" dies and you need a local server |
| Build step | Best of both (dev uses files, ship inlines them); introduces the build step the project explicitly avoids |

There is no free option here. Pick deliberately.

**What the backdrop does:** the third option, kept small. `assets/backdrop.png` is the
editable master and `tools/inline-backdrop.mjs` is a one-command build step that writes the
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
3. **Boss sprites.** Large on screen, long time on screen, ten distinct named characters
   the vector renderer genuinely cannot express. Do these before the mobs.
4. **Cindu.** One character, three frames, but she's on screen 100% of the time so any
   mismatch in style is maximally visible. Do her only after the bosses have established
   the look.
5. **Minor mobs.** Last. They're 32–40px and moving fast; the payoff is small.
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
