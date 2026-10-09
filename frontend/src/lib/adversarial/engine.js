// =====================================================================
// In-browser adversarial perturbation *visualiser*.
//
// There is no model in the browser, so this cannot compute a true loss
// gradient. Instead it synthesises a structured pseudo-gradient (seeded
// multi-scale noise, weighted towards edges and texture where real
// gradients concentrate) and then applies each attack's *real* update
// rule and norm constraint to it:
//   FGSM  δ = ε·sign(g)                         (L∞, one step)
//   PGD   δ ← Π_ε(δ + α·sign(g_k)), random start (L∞, iterative)
//   C&W   minimal-energy, edge-concentrated      (L2-style)
//   ZOO   sparse coordinate-wise updates         (black-box, L2)
//   HSJ   smooth low-frequency boundary walk     (decision-based)
// Image statistics (L∞, L2, PSNR, SSIM) are computed exactly on the
// resulting images. Real attack metrics come from the backend.
// =====================================================================

export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (t) => t * t * (3 - 2 * t);

/** Bilinear value noise in [-1, 1] with cells of `cell` pixels. */
function valueNoise(w, h, cell, rand) {
  const gw = Math.ceil(w / cell) + 2;
  const gh = Math.ceil(h / cell) + 2;
  const grid = new Float32Array(gw * gh);
  for (let i = 0; i < grid.length; i++) grid[i] = rand() * 2 - 1;
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const gy = y / cell;
    const y0 = Math.floor(gy);
    const ty = smooth(gy - y0);
    for (let x = 0; x < w; x++) {
      const gx = x / cell;
      const x0 = Math.floor(gx);
      const tx = smooth(gx - x0);
      const a = grid[y0 * gw + x0];
      const b = grid[y0 * gw + x0 + 1];
      const c = grid[(y0 + 1) * gw + x0];
      const d = grid[(y0 + 1) * gw + x0 + 1];
      out[y * w + x] = a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
    }
  }
  return out;
}

/** Separable box blur (single channel), applied twice ≈ Gaussian. */
function blur(src, w, h, r) {
  if (r < 1) return src;
  let a = src;
  for (let pass = 0; pass < 2; pass++) {
    const tmp = new Float32Array(w * h);
    const out = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let s = 0;
        let n = 0;
        for (let k = -r; k <= r; k++) {
          const xx = x + k;
          if (xx >= 0 && xx < w) {
            s += a[y * w + xx];
            n++;
          }
        }
        tmp[y * w + x] = s / n;
      }
    }
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let s = 0;
        let n = 0;
        for (let k = -r; k <= r; k++) {
          const yy = y + k;
          if (yy >= 0 && yy < h) {
            s += tmp[yy * w + x];
            n++;
          }
        }
        out[y * w + x] = s / n;
      }
    }
    a = out;
  }
  return a;
}

function luminance(img) {
  const { w, h, data } = img;
  const out = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) out[i] = 0.299 * data[i * 3] + 0.587 * data[i * 3 + 1] + 0.114 * data[i * 3 + 2];
  return out;
}

function sobel(lum, w, h) {
  const out = new Float32Array(w * h);
  let max = 1e-6;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const gx =
        -lum[i - w - 1] - 2 * lum[i - 1] - lum[i + w - 1] + lum[i - w + 1] + 2 * lum[i + 1] + lum[i + w + 1];
      const gy =
        -lum[i - w - 1] - 2 * lum[i - w] - lum[i - w + 1] + lum[i + w - 1] + 2 * lum[i + w] + lum[i + w + 1];
      const m = Math.sqrt(gx * gx + gy * gy);
      out[i] = m;
      if (m > max) max = m;
    }
  }
  for (let i = 0; i < out.length; i++) out[i] /= max;
  return out;
}

/** Structured pseudo-gradient, shape (h, w, 3). Cached per image + seed. */
const gradCache = new WeakMap();
function pseudoGradient(img, seed) {
  let perImg = gradCache.get(img);
  if (!perImg) {
    perImg = new Map();
    gradCache.set(img, perImg);
  }
  if (perImg.has(seed)) return perImg.get(seed);

  const { w, h, gray } = img;
  const rand = rng(seed * 9973 + w);
  const edges = sobel(luminance(img), w, h);
  const edgeSoft = blur(edges, w, h, Math.max(1, Math.round(w / 48)));
  let em = 1e-6;
  for (let i = 0; i < edgeSoft.length; i++) em = Math.max(em, edgeSoft[i]);

  const hfCell = Math.max(1, w / 40);
  const mfCell = Math.max(2, w / 11);
  const g = new Float32Array(w * h * 3);
  const channels = gray ? 1 : 3;
  for (let c = 0; c < channels; c++) {
    const hf = valueNoise(w, h, hfCell, rand);
    const mf = valueNoise(w, h, mfCell, rand);
    const theta = rand() * Math.PI;
    const freq = (Math.PI * 2) / Math.max(3, w / (8 + rand() * 6));
    const phase = rand() * Math.PI * 2;
    const ct = Math.cos(theta);
    const st = Math.sin(theta);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const stripes = Math.sin((x * ct + y * st) * freq + phase);
        const e = edgeSoft[i] / em;
        g[i * 3 + c] = (0.62 * hf[i] + 0.22 * stripes + 0.36 * mf[i]) * (0.32 + 1.15 * e);
      }
    }
  }
  if (gray) for (let i = 0; i < w * h; i++) g[i * 3 + 1] = g[i * 3 + 2] = g[i * 3];

  const res = { g, edgeSoft, em };
  perImg.set(seed, res);
  return res;
}

const sign = (v) => (v > 0 ? 1 : v < 0 ? -1 : 0);

/**
 * Apply an attack-shaped perturbation to `img` within budget `epsilon`.
 * Returns { adv, delta, stats } where delta = adv − img (after [0,1] clipping).
 */
export function synthesize(img, { attack = "fgsm", epsilon = 0.08, steps = 10, seed = 7 } = {}) {
  const { w, h, data, gray } = img;
  const n = w * h;
  const eps = Math.max(0, epsilon);
  const { g, edgeSoft, em } = pseudoGradient(img, seed);
  const d = new Float32Array(n * 3);
  const rand = rng(seed * 31 + 5);

  if (attack === "fgsm") {
    for (let i = 0; i < d.length; i++) d[i] = eps * sign(g[i]);
  } else if (attack === "pgd") {
    const k = Math.max(1, Math.min(40, steps | 0));
    const alpha = (2.5 * eps) / k;
    for (let i = 0; i < d.length; i++) d[i] = eps * (rand() * 2 - 1); // random start
    const hfCell = Math.max(1, w / 36);
    for (let s = 0; s < k; s++) {
      const jitter = valueNoise(w, h, hfCell, rng(seed * 101 + s));
      for (let p = 0; p < n; p++) {
        for (let c = 0; c < 3; c++) {
          const i = p * 3 + c;
          const gi = g[i] + 0.75 * jitter[p] * (gray ? 1 : c === 0 ? 1 : c === 1 ? -0.6 : 0.4);
          let v = d[i] + alpha * sign(gi);
          v = v > eps ? eps : v < -eps ? -eps : v;
          d[i] = v;
        }
      }
    }
  } else if (attack === "cw") {
    let max = 1e-6;
    for (let p = 0; p < n; p++) {
      const e = Math.pow(edgeSoft[p] / em, 1.3);
      for (let c = 0; c < 3; c++) {
        const v = g[p * 3 + c] * e;
        d[p * 3 + c] = v;
        if (Math.abs(v) > max) max = Math.abs(v);
      }
    }
    for (let i = 0; i < d.length; i++) d[i] = (d[i] / max) * eps * 0.9;
  } else if (attack === "zoo") {
    const block = Math.max(1, Math.round(w / 32));
    const bw = Math.ceil(w / block);
    const bh = Math.ceil(h / block);
    const picks = Math.round(bw * bh * 0.09);
    for (let k = 0; k < picks; k++) {
      const bx = Math.floor(rand() * bw);
      const by = Math.floor(rand() * bh);
      const mag = eps * (0.55 + 0.45 * rand());
      const chan = gray ? -1 : Math.floor(rand() * 4); // 3 = all channels
      for (let y = by * block; y < Math.min(h, (by + 1) * block); y++) {
        for (let x = bx * block; x < Math.min(w, (bx + 1) * block); x++) {
          const p = y * w + x;
          for (let c = 0; c < 3; c++) {
            if (chan >= 0 && chan < 3 && c !== chan) continue;
            d[p * 3 + c] = mag * (sign(g[p * 3 + c]) || 1);
          }
        }
      }
    }
  } else {
    // hopskipjump — smooth, low-frequency boundary-walk perturbation
    const cell = Math.max(3, w / 5);
    for (let c = 0; c < (gray ? 1 : 3); c++) {
      const low = blur(valueNoise(w, h, cell, rng(seed * 7 + c)), w, h, Math.max(1, Math.round(w / 24)));
      let max = 1e-6;
      for (let p = 0; p < n; p++) max = Math.max(max, Math.abs(low[p]));
      for (let p = 0; p < n; p++) {
        const e = edgeSoft[p] / em;
        d[p * 3 + c] = eps * 0.92 * Math.tanh((2.2 * low[p]) / max) * (0.55 + 0.45 * e);
      }
    }
    if (gray) for (let p = 0; p < n; p++) d[p * 3 + 1] = d[p * 3 + 2] = d[p * 3];
  }

  if (gray) for (let p = 0; p < n; p++) d[p * 3 + 1] = d[p * 3 + 2] = d[p * 3];

  const adv = new Float32Array(n * 3);
  const delta = new Float32Array(n * 3);
  for (let i = 0; i < adv.length; i++) {
    adv[i] = clamp01(data[i] + d[i]);
    delta[i] = adv[i] - data[i];
  }
  const advImg = { w, h, data: adv, gray };
  return { adv: advImg, delta, stats: imageStats(img, advImg) };
}

/** Exact distortion statistics between two images of the same shape. */
export function imageStats(a, b) {
  const { w, h, gray } = a;
  const n = w * h;
  let linf = 0;
  let sq = 0;
  let sqDataset = 0;
  let changed = 0;
  for (let p = 0; p < n; p++) {
    let pm = 0;
    for (let c = 0; c < 3; c++) {
      const dv = b.data[p * 3 + c] - a.data[p * 3 + c];
      const ad = Math.abs(dv);
      if (ad > linf) linf = ad;
      if (ad > pm) pm = ad;
      sq += dv * dv;
      if (!gray || c === 0) sqDataset += dv * dv;
    }
    if (pm > 0.5 / 255) changed++;
  }
  const mse = sq / (n * 3);
  return {
    linf,
    l2: Math.sqrt(sqDataset),
    rms: Math.sqrt(mse),
    psnr: mse > 0 ? 10 * Math.log10(1 / mse) : Infinity,
    ssim: ssim(a, b),
    changed: changed / n,
  };
}

/** Mean SSIM over non-overlapping windows on luminance. */
export function ssim(a, b) {
  const { w, h } = a;
  const la = luminance(a);
  const lb = luminance(b);
  const win = w >= 64 ? 8 : 4;
  const C1 = 0.01 ** 2;
  const C2 = 0.03 ** 2;
  let total = 0;
  let count = 0;
  for (let y0 = 0; y0 + win <= h; y0 += win) {
    for (let x0 = 0; x0 + win <= w; x0 += win) {
      let ma = 0;
      let mb = 0;
      const k = win * win;
      for (let y = y0; y < y0 + win; y++) for (let x = x0; x < x0 + win; x++) {
        ma += la[y * w + x];
        mb += lb[y * w + x];
      }
      ma /= k;
      mb /= k;
      let va = 0;
      let vb = 0;
      let cov = 0;
      for (let y = y0; y < y0 + win; y++) for (let x = x0; x < x0 + win; x++) {
        const da = la[y * w + x] - ma;
        const db = lb[y * w + x] - mb;
        va += da * da;
        vb += db * db;
        cov += da * db;
      }
      va /= k - 1;
      vb /= k - 1;
      cov /= k - 1;
      total += ((2 * ma * mb + C1) * (2 * cov + C2)) / ((ma * ma + mb * mb + C1) * (va + vb + C2));
      count++;
    }
  }
  return count ? total / count : 1;
}

// ---------------------------------------------------------------------
// Rendering helpers
// ---------------------------------------------------------------------

export function toImageData(img) {
  const { w, h, data } = img;
  const out = new ImageData(w, h);
  for (let p = 0; p < w * h; p++) {
    out.data[p * 4] = Math.round(clamp01(data[p * 3]) * 255);
    out.data[p * 4 + 1] = Math.round(clamp01(data[p * 3 + 1]) * 255);
    out.data[p * 4 + 2] = Math.round(clamp01(data[p * 3 + 2]) * 255);
    out.data[p * 4 + 3] = 255;
  }
  return out;
}

const INFERNO = [
  [0, [0, 0, 4]],
  [0.25, [66, 10, 104]],
  [0.5, [147, 38, 103]],
  [0.75, [221, 81, 58]],
  [1, [252, 255, 164]],
];
function inferno(t) {
  const v = clamp01(t);
  for (let i = 1; i < INFERNO.length; i++) {
    const [t1, c1] = INFERNO[i];
    const [t0, c0] = INFERNO[i - 1];
    if (v <= t1) {
      const u = (v - t0) / (t1 - t0);
      return [c0[0] + (c1[0] - c0[0]) * u, c0[1] + (c1[1] - c0[1]) * u, c0[2] + (c1[2] - c0[2]) * u];
    }
  }
  return INFERNO[INFERNO.length - 1][1];
}

/**
 * Visualise δ. mode "signed": maps [−ε, +ε] → [0, 1] per channel (grey = 0).
 * mode "magnitude": max-channel |δ|/ε through an inferno colormap.
 */
export function perturbationImageData(delta, w, h, epsilon, mode = "signed") {
  const out = new ImageData(w, h);
  const eps = Math.max(epsilon, 1e-6);
  for (let p = 0; p < w * h; p++) {
    if (mode === "magnitude") {
      const m = Math.max(Math.abs(delta[p * 3]), Math.abs(delta[p * 3 + 1]), Math.abs(delta[p * 3 + 2])) / eps;
      const [r, g, b] = inferno(m);
      out.data[p * 4] = r;
      out.data[p * 4 + 1] = g;
      out.data[p * 4 + 2] = b;
    } else {
      for (let c = 0; c < 3; c++) out.data[p * 4 + c] = Math.round(clamp01(0.5 + (delta[p * 3 + c] / eps) * 0.5) * 255);
    }
    out.data[p * 4 + 3] = 255;
  }
  return out;
}

export function paint(canvas, imageData) {
  if (!canvas || !imageData) return;
  if (canvas.width !== imageData.width) canvas.width = imageData.width;
  if (canvas.height !== imageData.height) canvas.height = imageData.height;
  canvas.getContext("2d").putImageData(imageData, 0, 0);
}

export const INFERNO_CSS = `linear-gradient(90deg, ${INFERNO.map(([t, c]) => `rgb(${c.join(",")}) ${t * 100}%`).join(", ")})`;
