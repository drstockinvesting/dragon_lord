# Boss art

Drop a PNG here named after the boss's `art` slug and it replaces that boss's
vector dragon. Nothing else to change — no code, no rebuild, no inlining.

| File | Boss | Attack patterns |
|---|---|---|
| `vurath.png` | Vurath the Emberwing | radial |
| `skoll.png` | Skoll the Ashmaw | sweep |
| `merexis.png` | Merexis the Brooder | summon, radial |
| `tyrn.png` | Tyrn the Swift Lance | volley, sweep |
| `azkalor.png` | Azkalor Ringbearer | rings, volley |
| `nyxheim.png` | Nyxheim the Coiled | spiral, radial |
| `draveth.png` | Draveth the Charger | charge, volley |
| `solareth.png` | Solareth the Cross | cross, summon |
| `vorgaal.png` | Vorgaal Souleater | spiral, rings, volley |
| `eanu.png` | Eanu the Dragon King | all six |

Any file that is missing, misnamed or fails to decode falls back to the vector
dragon the game has always drawn. There is no error state — a half-finished set
just means some bosses are drawn and some aren't.

One cosmetic consequence: a boss with no PNG logs a `404 (Not Found)` in the
browser console when it spawns. That is expected and harmless — it is the
fallback working, not a bug. It goes away as the set fills in.

## What the file has to be

- **Square PNG with a real alpha channel.** Any resolution; it is scaled to the
  same on-screen box as the vector sprite it replaces (238px for a lord, 294px
  for Eanu), so ~500px square is plenty and anything larger is wasted bytes.
- **Nose pointing up.** The boss banks into its movement by rotating the image,
  and rotation 0 means facing up.
- **Centred, with the glow inside the frame.** The image is drawn centred on the
  boss's position; anything clipped at the edge will visibly clip in game.
- **One frame, not three.** The flap is replaced by a procedural hover bob and
  breathing scale (`CFG.BOSS_ART`), so a single still image is all that's needed.

`vurath.png` is currently an **example**, produced by running the game's own
vector renderer through `tools/matte.mjs` to prove the pipeline. Replace it.

## Getting alpha out of an image model

Gemini cannot emit an alpha channel. Generate each boss **twice** — identical
prompt, once on pure white and once on pure black — then:

```
node tools/matte.mjs vurath-white.png vurath-black.png assets/bosses/vurath.png
```

That recovers a true alpha channel by comparing the pair, which keeps the soft
glow edges that green-screen keying destroys. Round-tripped against a known
ground truth it is lossless (mean alpha error 0.014/255).

See `docs/AI-ASSETS.md` for the prompts.
