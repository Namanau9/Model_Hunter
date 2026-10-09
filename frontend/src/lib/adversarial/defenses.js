// Real input-purification transforms (the same families the backend's
// InputPreprocessing defense uses), applied in-browser to demo images.

import { toImageData } from "./engine";

export function gaussianBlur(img, sigma = 1) {
  const { w, h, data, gray } = img;
  const r = Math.max(1, Math.ceil(sigma * 2.5));
  const k = [];
  let sum = 0;
  for (let i = -r; i <= r; i++) {
    const v = Math.exp(-(i * i) / (2 * sigma * sigma));
    k.push(v);
    sum += v;
  }
  for (let i = 0; i < k.length; i++) k[i] /= sum;
  const tmp = new Float32Array(data.length);
  const out = new Float32Array(data.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      for (let c = 0; c < 3; c++) {
        let s = 0;
        for (let i = -r; i <= r; i++) {
          const xx = Math.min(w - 1, Math.max(0, x + i));
          s += data[(y * w + xx) * 3 + c] * k[i + r];
        }
        tmp[(y * w + x) * 3 + c] = s;
      }
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      for (let c = 0; c < 3; c++) {
        let s = 0;
        for (let i = -r; i <= r; i++) {
          const yy = Math.min(h - 1, Math.max(0, y + i));
          s += tmp[(yy * w + x) * 3 + c] * k[i + r];
        }
        out[(y * w + x) * 3 + c] = s;
      }
    }
  }
  return { w, h, data: out, gray };
}

/** Feature squeezing: reduce colour bit depth. */
export function bitDepth(img, bits = 4) {
  const L = 2 ** bits - 1;
  const out = new Float32Array(img.data.length);
  for (let i = 0; i < out.length; i++) out[i] = Math.round(img.data[i] * L) / L;
  return { ...img, data: out };
}

/** JPEG round-trip through the browser's encoder. */
export async function jpeg(img, quality = 0.6) {
  const { w, h, gray } = img;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  c.getContext("2d").putImageData(toImageData(img), 0, 0);
  const url = c.toDataURL("image/jpeg", quality);
  const el = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = url;
  });
  const d = document.createElement("canvas");
  d.width = w;
  d.height = h;
  const ctx = d.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(el, 0, 0);
  const px = ctx.getImageData(0, 0, w, h).data;
  const out = new Float32Array(w * h * 3);
  for (let p = 0; p < w * h; p++) {
    out[p * 3] = px[p * 4] / 255;
    out[p * 3 + 1] = px[p * 4 + 1] / 255;
    out[p * 3 + 2] = px[p * 4 + 2] / 255;
  }
  return { w, h, data: out, gray };
}

export const PURIFIERS = {
  gaussian_blur: { label: "Gaussian blur", param: "σ", min: 0.4, max: 2.5, step: 0.1, def: 1.0, run: (img, v) => gaussianBlur(img, v) },
  jpeg: { label: "JPEG compression", param: "quality", min: 0.1, max: 0.95, step: 0.05, def: 0.5, run: (img, v) => jpeg(img, v) },
  feature_squeezing: { label: "Feature squeezing", param: "bits", min: 1, max: 7, step: 1, def: 3, run: (img, v) => bitDepth(img, v) },
};

/** ‖a − b‖₂ over all channels. */
export function l2(a, b) {
  let s = 0;
  for (let i = 0; i < a.data.length; i++) {
    const d = a.data[i] - b.data[i];
    s += d * d;
  }
  return Math.sqrt(s);
}
