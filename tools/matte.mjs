/* Recovers a true alpha channel from a pair of opaque renders.
 *
 *     node tools/matte.mjs <on-white.png> <on-black.png> <out.png>
 *
 * Gemini's image models emit flat RGB with no alpha -- ask for a transparent
 * background and you get white, black, or a painted picture of a checkerboard.
 * Boss sprites draw over the game world, so they need real transparency.
 *
 * The fix: generate the SAME subject twice, once on pure white and once on
 * pure black, and solve for alpha. For a pixel with true colour C and alpha a:
 *
 *     on white:  Pw = C*a + 255*(1-a)
 *     on black:  Pb = C*a
 *     Pw - Pb    = 255*(1-a)      ->   a = 1 - (Pw - Pb)/255
 *     C          = Pb / a
 *
 * Alpha is solved per channel and averaged, which is robust to the small
 * colour drift between two generations. Where a is ~0 the colour is
 * unrecoverable and the pixel is written fully transparent.
 *
 * This preserves soft glow edges, which green-screen keying destroys -- and
 * glow is the entire look of this game.
 *
 * Both inputs must be the same size and must be the same subject. Generate
 * them in one session with the same seed/prompt, changing only the background.
 */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const [whiteArg, blackArg, outArg] = process.argv.slice(2);
if (!whiteArg || !blackArg || !outArg){
  console.error('usage: node tools/matte.mjs <on-white.png> <on-black.png> <out.png>');
  process.exit(1);
}
const toDataUrl = f => 'data:image/png;base64,' + readFileSync(resolve(f)).toString('base64');

const browser = await chromium.launch();
const pg = await browser.newPage();
await pg.setContent('<!doctype html><meta charset="utf-8">');

const result = await pg.evaluate(async ([wUrl, bUrl]) => {
  const load = src => new Promise((res, rej) => {
    const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('decode failed'));
    i.src = src;
  });
  const [W, B] = await Promise.all([load(wUrl), load(bUrl)]);
  if (W.naturalWidth !== B.naturalWidth || W.naturalHeight !== B.naturalHeight)
    return { error: `size mismatch: ${W.naturalWidth}x${W.naturalHeight} vs ${B.naturalWidth}x${B.naturalHeight}` };

  const w = W.naturalWidth, h = W.naturalHeight;
  const grab = img => {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(img, 0, 0);
    return x.getImageData(0, 0, w, h).data;
  };
  const dw = grab(W), db = grab(B);

  const out = document.createElement('canvas'); out.width = w; out.height = h;
  const octx = out.getContext('2d');
  const od = octx.createImageData(w, h);
  let opaque = 0, partial = 0;

  for (let i = 0; i < dw.length; i += 4){
    // average the per-channel alpha estimate; drift between the two
    // generations shows up as channel disagreement, and the mean absorbs it
    let a = 0;
    for (let k = 0; k < 3; k++) a += 1 - (dw[i+k] - db[i+k]) / 255;
    a /= 3;
    a = Math.min(1, Math.max(0, a));

    if (a < 0.004){ od.data[i+3] = 0; continue; }     // nothing recoverable here
    for (let k = 0; k < 3; k++)
      od.data[i+k] = Math.min(255, Math.max(0, Math.round(db[i+k] / a)));
    od.data[i+3] = Math.round(a * 255);
    if (a > 0.996) opaque++; else partial++;
  }
  octx.putImageData(od, 0, 0);
  return { url: out.toDataURL('image/png'), w, h, opaque, partial,
           total: (dw.length/4) };
}, [toDataUrl(whiteArg), toDataUrl(blackArg)]);

await browser.close();

if (result.error){ console.error('error: ' + result.error); process.exit(1); }

const buf = Buffer.from(result.url.split(',')[1], 'base64');
writeFileSync(resolve(outArg), buf);

const covered = result.opaque + result.partial;
console.log(`wrote ${outArg}  ${result.w}x${result.h}  ${(buf.length/1024).toFixed(1)}KB`);
console.log(`  opaque pixels   ${result.opaque}`);
console.log(`  soft edge       ${result.partial}`);
console.log(`  transparent     ${result.total - covered}  (${(100*(result.total-covered)/result.total).toFixed(1)}%)`);
if (covered / result.total > 0.85){
  console.warn('\nwarning: almost nothing came out transparent.');
  console.warn('The two renders are probably too similar -- check that one really');
  console.warn('has a WHITE background and the other a BLACK one.');
}
if (result.partial < result.opaque * 0.02){
  console.warn('\nwarning: very little soft edge recovered. If the source art has glow,');
  console.warn('the two generations may not be the same image.');
}
