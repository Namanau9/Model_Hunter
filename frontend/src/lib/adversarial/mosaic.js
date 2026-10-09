// Illustrative sample tiles for the Datasets page (vector renderings, not
// dataset images). Each returns a PNG data URL, memoised.

import { SAMPLES, sampleThumb } from "./samples";

const cache = new Map();
const FONT = `"Arial Black", "Helvetica Neue", Arial, sans-serif`;

function canvas(size) {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  ctx.scale(size / 100, size / 100);
  return [c, ctx];
}

function digit(d, k, size) {
  const [c, ctx] = canvas(size);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, 100, 100);
  ctx.translate(50, 54);
  ctx.rotate(((k * 37) % 21 - 10) * 0.018);
  ctx.scale(1 + ((k * 13) % 7 - 3) * 0.03, 1);
  if ("filter" in ctx) ctx.filter = `blur(${size / 70}px)`;
  ctx.fillStyle = "#fff";
  ctx.font = `700 74px "Segoe Print", "Bradley Hand", "Comic Sans MS", "Chalkboard SE", cursive`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(d), 0, 0);
  return c.toDataURL();
}

const BGS = [
  ["#7FB6E6", "#D9EAF6", "#3E6B3A"],
  ["#5F6FAE", "#F4B27C", "#2B2F4A"],
  ["#9BB7C9", "#E7EEF2", "#56705A"],
  ["#2C3550", "#59617F", "#151A28"],
];

function signBg(ctx, k) {
  const [a, b, t] = BGS[k % BGS.length];
  const g = ctx.createLinearGradient(0, 0, 0, 100);
  g.addColorStop(0, a);
  g.addColorStop(1, b);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 100, 100);
  ctx.fillStyle = t;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.ellipse(((i * 41 + k * 17) % 120) - 10, 88, 14, 16, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function sign(kind, k, size) {
  const [c, ctx] = canvas(size);
  signBg(ctx, k);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const cx = 50;
  const cy = 48;
  if (kind.startsWith("limit")) {
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(cx, cy, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#D2192F";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(cx, cy, 29, 0, Math.PI * 2);
    ctx.stroke();
    const n = kind.split(":")[1];
    ctx.fillStyle = "#111";
    ctx.font = `900 ${n.length > 2 ? 21 : 27}px ${FONT}`;
    ctx.fillText(n, cx, cy + 1.5);
  } else if (kind === "yield") {
    ctx.fillStyle = "#D2192F";
    ctx.beginPath();
    ctx.moveTo(14, 18);
    ctx.lineTo(86, 18);
    ctx.lineTo(50, 82);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.moveTo(27, 26);
    ctx.lineTo(73, 26);
    ctx.lineTo(50, 67);
    ctx.closePath();
    ctx.fill();
  } else if (kind === "caution") {
    ctx.fillStyle = "#D2192F";
    ctx.beginPath();
    ctx.moveTo(50, 14);
    ctx.lineTo(88, 80);
    ctx.lineTo(12, 80);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.moveTo(50, 28);
    ctx.lineTo(76, 73);
    ctx.lineTo(24, 73);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#111";
    ctx.font = `900 30px ${FONT}`;
    ctx.fillText("!", 50, 58);
  } else if (kind === "noentry") {
    ctx.fillStyle = "#D2192F";
    ctx.beginPath();
    ctx.arc(cx, cy, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.fillRect(28, cy - 6, 44, 12);
  } else if (kind === "priority") {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = "#fff";
    ctx.fillRect(-25, -25, 50, 50);
    ctx.fillStyle = "#F5C400";
    ctx.fillRect(-18, -18, 36, 36);
    ctx.restore();
  } else if (kind === "keepright" || kind === "roundabout" || kind === "ahead") {
    ctx.fillStyle = "#1F5FBF";
    ctx.beginPath();
    ctx.arc(cx, cy, 33, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.fillStyle = "#fff";
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    if (kind === "roundabout") {
      ctx.beginPath();
      ctx.arc(cx, cy, 15, 0.3, Math.PI * 1.7);
      ctx.stroke();
    } else {
      ctx.save();
      ctx.translate(cx, cy);
      if (kind === "keepright") ctx.rotate(Math.PI / 4);
      ctx.beginPath();
      ctx.moveTo(0, 18);
      ctx.lineTo(0, -10);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-10, -6);
      ctx.lineTo(0, -20);
      ctx.lineTo(10, -6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  } else {
    // stop
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = Math.PI / 8 + (i * Math.PI) / 4;
      ctx.lineTo(cx + 34 * Math.cos(a), cy + 34 * Math.sin(a));
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#C8102E";
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = Math.PI / 8 + (i * Math.PI) / 4;
      ctx.lineTo(cx + 30 * Math.cos(a), cy + 30 * Math.sin(a));
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = `900 16px ${FONT}`;
    ctx.fillText("STOP", cx, cy + 1);
  }
  return c.toDataURL();
}

const GTSRB_KINDS = ["limit:30", "stop", "yield", "limit:50", "caution", "keepright", "limit:70", "noentry", "priority", "limit:120", "roundabout", "ahead"];

/** Returns [{src, label}] — illustrative tiles for a dataset. */
export function datasetMosaic(dataset, count = 12, size = 64) {
  const key = `${dataset}:${count}:${size}`;
  if (cache.has(key)) return cache.get(key);
  let tiles;
  if (dataset === "mnist") {
    tiles = Array.from({ length: count }, (_, k) => ({ src: digit(k % 10, k, size), label: String(k % 10) }));
  } else if (dataset === "gtsrb") {
    tiles = Array.from({ length: count }, (_, k) => {
      const kind = GTSRB_KINDS[k % GTSRB_KINDS.length];
      return { src: sign(kind, k, size), label: kind.replace("limit:", "limit ") };
    });
  } else {
    const pool = SAMPLES.filter((s) => s.dataset === "cifar10");
    tiles = Array.from({ length: count }, (_, k) => {
      const s = pool[k % pool.length];
      return { src: sampleThumb(s, size), label: s.label.toLowerCase(), flip: k % 2 === 1, hue: ((k * 47) % 80) - 40 };
    });
  }
  cache.set(key, tiles);
  return tiles;
}
