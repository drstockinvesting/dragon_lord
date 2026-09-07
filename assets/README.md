# Assets

Editable masters. Two different things live here, and they reach the game two
different ways.

## Inlined — always on screen

Base64'd into `index.html` by a build step, so the game stays one file you can
double-click. The blobs in `index.html` are the build output; these files are the
source.

| File | Slot | Command |
|---|---|---|
| `backdrop.png` | `BACKDROP` | `node tools/inline-asset.mjs BACKDROP assets/backdrop.png` |
| `cindu-0.png`, `cindu-1.png`, `cindu-2.png` | `CINDU` | `node tools/inline-asset.mjs CINDU assets/cindu-0.png assets/cindu-1.png assets/cindu-2.png` |

`node tools/inline-asset.mjs <SLOT> --clear` reverts a slot to the vector renderer.

## Loaded at runtime — occasionally on screen

`bosses/*.png` are read from disk when a boss spawns, never inlined — ten of them
would be megabytes. See [`bosses/README.md`](bosses/README.md).

The rule: **inline what is always visible, load what is occasionally visible.**

## What's here now is placeholder

Everything in this directory is a stand-in, produced by the game's own vector
renderer. None of it is generated art. See
[`../docs/AI-ASSETS.md`](../docs/AI-ASSETS.md) for the prompts and the
white/black matting workflow that gets a real alpha channel out of an image model.

**`cindu-*.png` are deliberately NOT inlined.** They are vector renders, so they
look identical to what the code already draws — inlining them would add ~440KB to
`index.html` for no visual change at all. They are committed as a reference for the
format (512×512, real alpha) and, more usefully, for the frame ordering, which is
the easiest thing to get wrong:

| Frame | Wings |
|---|---|
| `cindu-0.png` | drawn in toward the body |
| `cindu-1.png` | mid sweep |
| `cindu-2.png` | fully spread |

Replace them with real art, then run the inline command.

`backdrop.png` **is** inlined, because it is procedurally generated and does look
different from the plain black background it replaces. Regenerate it with
`node tools/make-placeholder-backdrop.mjs`.
