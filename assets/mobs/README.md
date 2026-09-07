# Minor mob art

One PNG per archetype, named after its key in `ARCHETYPES`. Drop one here and that
archetype stops sharing a sprite with its neighbours. Nothing else to change.

**The point of this is readability, not decoration.** Nine archetypes currently
share four vector sprites, so a diver, a strafer and a weaver all look identical
despite behaving completely differently. Distinct silhouettes let a player read a
threat before it acts.

| File | Behaviour | Falls back to | Design cue |
|---|---|---|---|
| `drifter.png` | straight down, the baseline | `minor` | plain, unremarkable, the common dragon |
| `strafer.png` | oscillates sideways, 1.25× speed | `swift` | swept-back wings, lean and angular |
| `weaver.png` | fast sine weave | `swift` | serpentine, ribbon-like, trailing |
| `spreader.png` | fires a 3-shot spread | `caster` | three-pronged crest, or three heads |
| `diver.png` | homes on you at 1.45× speed | `swift` | wings folded back, dart-shaped, arrowhead |
| `orbiter.png` | hangs high and shoots | `caster` | halo ring, splayed hovering posture |
| `armored.png` | 2.2× HP, 0.7× speed | `armored` | heavy plating, thick and blunt |
| `twin.png` | spawns in mirrored pairs | `minor` | doubled markings, mirrored wing pattern |
| `burster.png` | fires bursts of three | `caster` | charged, spiky, crackling with held energy |

Fallback is **per archetype**, so the set fills in one at a time: art for `diver`
does not affect `strafer`, even though both fall back to `swift` today.

## What the file has to be

- **Square PNG with a real alpha channel**, ~**256×256**. It is scaled to the same
  on-screen box as the vector sprite it replaces — 118px for `minor`-backed,
  134px `swift`, 120px `caster`, 114px `armored` — so 256 is crisp at 2× device
  pixel ratio and anything larger is wasted bytes. A quarter of Cindu's 512,
  which is what keeps nine of these affordable.
- **Nose pointing up.** Mobs bank into their movement by rotating the image, and
  rotation 0 means facing up. Art drawn side-on will fly side-on.
- **Centred, glow inside the frame.** Anything clipped at the edge clips in game.
- **One frame.** Unlike Cindu, mobs take a single image — they are small, numerous,
  fast, and already rotating, so the banking carries the motion. No bob is added
  either; their own movement provides it.
- **Match Cindu.** Generate her first and pass her in as a style reference; these
  should read as the same world, smaller and meaner.

`drifter.png` is an **example**, produced by running the game's own vector renderer
through `tools/matte.mjs`. Replace it.

## Notes

Art is preloaded at boot, not at spawn like the boss art — mobs appear about 2.2s
into a run, so waiting for a spawn would risk a visible pop.

An archetype with no PNG logs a `404 (Not Found)` in the console at startup. That
is expected and harmless: it is the fallback working. Eight of them right now.

See `../../docs/AI-ASSETS.md` for the prompt and the white/black matting workflow
that gets a real alpha channel out of an image model.
