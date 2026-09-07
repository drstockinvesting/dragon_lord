/* Renders assets/backdrop.png -- the parallax backdrop tile.
 *
 * This is a PLACEHOLDER. It exists so the parallax system ships working art
 * today; the intent is to replace it with a generated image. See
 * docs/AI-ASSETS.md for the prompt, then:
 *
 *     node tools/inline-asset.mjs BACKDROP assets/backdrop.png
 *
 * Run this with:  node tools/make-placeholder-backdrop.mjs
 *
 * Deterministic: a fixed seed means re-running produces the same tile.
 *
 * The one rule any replacement must follow: spires are rooted at the BOTTOM
 * edge and the top ~40% is empty black sky. The backdrop wraps vertically
 * forever, so the seam has to land in black or it shows.
 */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const W = 540, H = 960;
const OUT = resolve(process.argv[2] || 'assets/backdrop.png');

const page = `<!doctype html><meta charset="utf-8">
<style>html,body{margin:0;background:#000}</style>
<canvas id="c" width="${W}" height="${H}"></canvas>
<script>
const W=${W}, H=${H};
const ctx = document.getElementById('c').getContext('2d');
const AMBER='#FFB000', PURPLE='#B026FF';

// mulberry32 -- small deterministic PRNG, so the tile never drifts between runs
let _s = 0x9E3779B9 >>> 0;
function rnd(a=1,b=0){
  _s |= 0; _s = _s + 0x6D2B79F5 | 0;
  let t = Math.imul(_s ^ _s>>>15, 1 | _s);
  t = t + Math.imul(t ^ t>>>7, 61 | t) ^ t;
  return b + (((t ^ t>>>14) >>> 0) / 4294967296) * (a-b);
}

ctx.fillStyle = '#000'; ctx.fillRect(0,0,W,H);
ctx.lineJoin = 'round'; ctx.lineCap = 'round';

/* Everything is stroke-only, matching the vector dragons. A ruined tower:
   a tapering shaft, a broken-off crown, and a few window slits. */
function tower(x, baseY, h, w, alpha, broken){
  const topY = baseY - h, tw = w * 0.55;
  ctx.strokeStyle = 'rgba(255,176,0,' + alpha.toFixed(3) + ')';
  ctx.lineWidth = 1.6;

  ctx.beginPath();
  ctx.moveTo(x - w/2, baseY);
  ctx.lineTo(x - tw/2, topY);
  if (broken){
    // a snapped-off crown: a jagged run across the top instead of a flat cap
    let px = x - tw/2;
    const steps = 3 + (rnd(3)|0);
    for (let i=1;i<=steps;i++){
      const nx = x - tw/2 + (tw*i/steps);
      ctx.lineTo(px, topY + rnd(16,-8));
      ctx.lineTo(nx, topY + rnd(14,-6));
      px = nx;
    }
  } else {
    ctx.lineTo(x + tw/2, topY);              // intact crenellation
    for (let i=0;i<4;i++){
      const cx = x - tw/2 + tw*(i+0.5)/4;
      ctx.moveTo(cx - tw*0.08, topY);
      ctx.lineTo(cx - tw*0.08, topY - 7);
      ctx.lineTo(cx + tw*0.08, topY - 7);
      ctx.lineTo(cx + tw*0.08, topY);
    }
    ctx.moveTo(x + tw/2, topY);
  }
  ctx.lineTo(x + w/2, baseY);
  ctx.stroke();

  // horizontal course lines -- reads as masonry without drawing masonry
  ctx.strokeStyle = 'rgba(255,176,0,' + (alpha*0.45).toFixed(3) + ')';
  ctx.lineWidth = 1;
  const courses = Math.max(2, (h/46)|0);
  for (let i=1;i<courses;i++){
    const t = i/courses, y = baseY - h*t, hw = (w + (tw-w)*t)/2;
    ctx.beginPath(); ctx.moveTo(x-hw, y); ctx.lineTo(x+hw, y); ctx.stroke();
  }

  // a lit window or two -- the only purple in the tile
  if (rnd() < 0.45){
    const wy = baseY - h*rnd(0.82, 0.35);
    ctx.strokeStyle = 'rgba(176,38,255,' + (alpha*1.5).toFixed(3) + ')';
    ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(x, wy); ctx.lineTo(x, wy - 9); ctx.stroke();
  }
}

/* A broken arch spanning two towers: a true semicircle with a bite taken out
   of the crown, plus the springing stubs on both piers. */
function arch(x0, x1, y, alpha){
  const mid = (x0+x1)/2, r = (x1-x0)/2;
  if (r < 18) return;
  ctx.strokeStyle = 'rgba(255,176,0,' + alpha.toFixed(3) + ')';
  ctx.lineWidth = 1.5;
  const gap0 = rnd(0.30, 0.10), gap1 = rnd(0.62, 0.42);   // the collapsed span
  ctx.beginPath();                                        // left haunch
  ctx.arc(mid, y, r, Math.PI, Math.PI + Math.PI*gap0);
  ctx.stroke();
  ctx.beginPath();                                        // right haunch
  ctx.arc(mid, y, r, Math.PI + Math.PI*gap1, 0);
  ctx.stroke();
  ctx.lineWidth = 1.2;                                    // the piers it springs from
  ctx.beginPath();
  ctx.moveTo(mid - r, y); ctx.lineTo(mid - r, y + rnd(26,10));
  ctx.moveTo(mid + r, y); ctx.lineTo(mid + r, y + rnd(26,10));
  ctx.stroke();
}

/* Three bands of ruin, receding. Content stops at SKY_FLOOR and fades out
   above it, so the top quarter of the tile is empty black -- that is what
   makes the vertical wrap seamless. */
const SKY_FLOOR = H*0.26;

// distant band: small, dim, high up
let x = -20;
while (x < W + 20){
  const w = rnd(34, 16), h = rnd(210, 90);
  const baseY = H*rnd(0.66, 0.50);
  tower(x + w/2, baseY, h, w, rnd(0.20, 0.10), rnd() < 0.8);
  x += w + rnd(40, 8);
}

// middle band
const mids = [];
x = -30;
while (x < W + 30){
  const w = rnd(56, 26), h = rnd(330, 150);
  const baseY = H*rnd(0.86, 0.72);
  tower(x + w/2, baseY, h, w, rnd(0.38, 0.22), rnd() < 0.75);
  mids.push({ x: x + w/2, baseY, w });
  x += w + rnd(56, 14);
}
for (let i=0;i<mids.length-1;i++){
  const a = mids[i], b = mids[i+1];
  if (b.x - a.x < 200 && rnd() < 0.55)
    arch(a.x, b.x, Math.min(a.baseY, b.baseY) - rnd(90, 30), rnd(0.26, 0.14));
}

// near band, rooted on the bottom edge -- the silhouette that carries the tile
const bases = [];
x = -40;
while (x < W + 40){
  const w = rnd(84, 40), h = rnd(520, 260);
  const baseY = H - rnd(60);
  tower(x + w/2, baseY, h, w, rnd(0.66, 0.40), rnd() < 0.75);
  bases.push({ x: x + w/2, top: baseY - h, w });
  x += w + rnd(64, 16);
}
for (let i=0;i<bases.length-1;i++){
  const a = bases[i], b = bases[i+1];
  if (b.x - a.x < 210 && rnd() < 0.5)
    arch(a.x, b.x, H - rnd(230, 90), rnd(0.36, 0.20));
}

// rubble along the base, so the towers sit in something
for (let i=0;i<70;i++){
  const rx = rnd(W), ry = H - rnd(70);
  ctx.strokeStyle = 'rgba(255,176,0,' + rnd(0.22,0.06).toFixed(3) + ')';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx + rnd(9,-9), ry + rnd(4,-4)); ctx.stroke();
}

/* The seam guarantee. The tile wraps forever, so BOTH edges have to meet in
   nothing -- fade the top out above SKY_FLOOR, and fade the bottom out too.
   Fading only the top leaves the near towers sliced off at their bases with
   empty sky beneath them, which reads as floating rubble. With both faded the
   tile becomes a band of ruin that drifts past, and the seam disappears. */
ctx.globalCompositeOperation = 'destination-out';

const gTop = ctx.createLinearGradient(0, SKY_FLOOR - 40, 0, SKY_FLOOR + 180);
gTop.addColorStop(0, 'rgba(0,0,0,1)'); gTop.addColorStop(1, 'rgba(0,0,0,0)');
ctx.fillStyle = gTop; ctx.fillRect(0, 0, W, SKY_FLOOR + 180);
ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, SKY_FLOOR - 40);   // hard-clear the top

const FADE = 190;
const gBot = ctx.createLinearGradient(0, H - FADE, 0, H - 12);
gBot.addColorStop(0, 'rgba(0,0,0,0)'); gBot.addColorStop(1, 'rgba(0,0,0,1)');
ctx.fillStyle = gBot; ctx.fillRect(0, H - FADE, W, FADE);
ctx.fillStyle = '#000'; ctx.fillRect(0, H - 12, W, 12);          // hard-clear the bottom

ctx.globalCompositeOperation = 'source-over';

window.__PNG = document.getElementById('c').toDataURL('image/png');
</script>`;

const browser = await chromium.launch();
const pg = await browser.newPage();
await pg.setContent(page);
await pg.waitForFunction(() => window.__PNG);
const dataUrl = await pg.evaluate(() => window.__PNG);
await browser.close();

const buf = Buffer.from(dataUrl.split(',')[1], 'base64');
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, buf);
console.log(`wrote ${OUT}  ${W}x${H}  ${(buf.length/1024).toFixed(1)}KB`);
