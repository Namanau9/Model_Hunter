// Procedurally drawn demo inputs (vector art rendered to a canvas), so the
// lab works offline with no dataset files. All drawing uses a 100×100 unit
// space and is rasterised at whatever resolution is requested.

const FONT = `"Arial Black", "Helvetica Neue", Arial, sans-serif`;

function octagon(ctx, cx, cy, r) {
  ctx.beginPath();
  for (let k = 0; k < 8; k++) {
    const a = Math.PI / 8 + (k * Math.PI) / 4;
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);
    if (k === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function trees(ctx, y, color, seed = 1) {
  ctx.fillStyle = color;
  for (let i = 0; i < 9; i++) {
    const x = ((i * 37 + seed * 13) % 110) - 5;
    const r = 9 + ((i * 7 + seed) % 6);
    ctx.beginPath();
    ctx.ellipse(x, y - r * 0.4, r, r * 1.05, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawStop(ctx) {
  const sky = ctx.createLinearGradient(0, 0, 0, 70);
  sky.addColorStop(0, "#7FB6E6");
  sky.addColorStop(1, "#D9EAF6");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 100, 100);
  const sun = ctx.createRadialGradient(18, 14, 1, 18, 14, 30);
  sun.addColorStop(0, "rgba(255,247,220,0.9)");
  sun.addColorStop(1, "rgba(255,247,220,0)");
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, 100, 100);
  trees(ctx, 74, "#3E6B3A", 2);
  trees(ctx, 80, "#2C5530", 5);
  ctx.fillStyle = "#6E7F5E";
  ctx.fillRect(0, 82, 100, 18);
  ctx.fillStyle = "#8A939E";
  ctx.fillRect(47.5, 60, 5, 40);
  ctx.fillStyle = "#F4F4F4";
  octagon(ctx, 50, 41, 31);
  ctx.fill();
  const red = ctx.createLinearGradient(0, 14, 0, 70);
  red.addColorStop(0, "#E0283F");
  red.addColorStop(1, "#A50D22");
  ctx.fillStyle = red;
  octagon(ctx, 50, 41, 27.5);
  ctx.fill();
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `900 15px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("STOP", 50, 42);
}

function drawSpeed30(ctx) {
  const sky = ctx.createLinearGradient(0, 0, 0, 80);
  sky.addColorStop(0, "#5F6FAE");
  sky.addColorStop(0.6, "#C98C8F");
  sky.addColorStop(1, "#F4B27C");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 100, 100);
  trees(ctx, 80, "#2B2F4A", 3);
  ctx.fillStyle = "#3A3A46";
  ctx.fillRect(0, 84, 100, 16);
  ctx.fillStyle = "#7C838C";
  ctx.fillRect(47.5, 62, 5, 40);
  ctx.fillStyle = "#FFFFFF";
  ctx.beginPath();
  ctx.arc(50, 40, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#D2192F";
  ctx.lineWidth = 6.5;
  ctx.beginPath();
  ctx.arc(50, 40, 25.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "#111111";
  ctx.font = `900 24px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("30", 50, 41.5);
}

function drawDigit7(ctx, size) {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, 100, 100);
  if ("filter" in ctx) ctx.filter = `blur(${Math.max(0.4, size / 90)}px)`;
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 11;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(25, 25);
  ctx.quadraticCurveTo(50, 19, 73, 22);
  ctx.quadraticCurveTo(60, 46, 45, 82);
  ctx.stroke();
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(42, 52);
  ctx.lineTo(66, 50);
  ctx.stroke();
  if ("filter" in ctx) ctx.filter = "none";
}

function drawPlane(ctx) {
  const sky = ctx.createLinearGradient(0, 0, 0, 100);
  sky.addColorStop(0, "#3F78C4");
  sky.addColorStop(1, "#B5D3EF");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 100, 100);
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  [[18, 80, 10], [28, 78, 13], [40, 82, 9], [76, 22, 8], [86, 20, 11], [94, 25, 7]].forEach(([x, y, r]) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.save();
  ctx.translate(50, 50);
  ctx.rotate(-0.16);
  ctx.translate(-50, -50);
  // far wing
  ctx.fillStyle = "#AEB8C6";
  ctx.beginPath();
  ctx.moveTo(50, 47);
  ctx.lineTo(42, 30);
  ctx.lineTo(48, 30);
  ctx.lineTo(60, 47);
  ctx.closePath();
  ctx.fill();
  // tail
  ctx.fillStyle = "#C4CCD7";
  ctx.beginPath();
  ctx.moveTo(22, 49);
  ctx.lineTo(13, 33);
  ctx.lineTo(19, 33);
  ctx.lineTo(30, 48);
  ctx.closePath();
  ctx.fill();
  // fuselage
  const body = ctx.createLinearGradient(0, 44, 0, 56);
  body.addColorStop(0, "#FFFFFF");
  body.addColorStop(1, "#B9C2CE");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(51, 50, 35, 5.8, 0, 0, Math.PI * 2);
  ctx.fill();
  // near wing
  ctx.fillStyle = "#D7DDE6";
  ctx.beginPath();
  ctx.moveTo(46, 51);
  ctx.lineTo(32, 74);
  ctx.lineTo(40, 74);
  ctx.lineTo(60, 52);
  ctx.closePath();
  ctx.fill();
  // stripe + windows
  ctx.fillStyle = "#1D4ED8";
  ctx.fillRect(22, 50.5, 58, 1.4);
  ctx.fillStyle = "#24364F";
  for (let x = 30; x < 78; x += 4) {
    ctx.beginPath();
    ctx.arc(x, 48.2, 0.9, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.ellipse(82, 48.6, 3, 1.6, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawShip(ctx) {
  const sky = ctx.createLinearGradient(0, 0, 0, 62);
  sky.addColorStop(0, "#4B3F8C");
  sky.addColorStop(0.55, "#C8648A");
  sky.addColorStop(1, "#FFB36B");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 100, 62);
  ctx.fillStyle = "#FFD99A";
  ctx.beginPath();
  ctx.arc(72, 56, 11, 0, Math.PI * 2);
  ctx.fill();
  const sea = ctx.createLinearGradient(0, 62, 0, 100);
  sea.addColorStop(0, "#2B4C7E");
  sea.addColorStop(1, "#0E1E3A");
  ctx.fillStyle = sea;
  ctx.fillRect(0, 62, 100, 38);
  ctx.strokeStyle = "rgba(255,210,160,0.45)";
  ctx.lineWidth = 0.9;
  for (let y = 66; y < 100; y += 5) {
    ctx.beginPath();
    for (let x = 0; x <= 100; x += 5) ctx.lineTo(x, y + Math.sin(x * 0.4 + y) * 0.8);
    ctx.stroke();
  }
  // hull
  ctx.fillStyle = "#3B2416";
  ctx.beginPath();
  ctx.moveTo(24, 63);
  ctx.lineTo(80, 63);
  ctx.lineTo(71, 73);
  ctx.lineTo(32, 73);
  ctx.closePath();
  ctx.fill();
  // mast + sails
  ctx.strokeStyle = "#2A1A10";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(52, 63);
  ctx.lineTo(52, 18);
  ctx.stroke();
  ctx.fillStyle = "#F8F4EA";
  ctx.beginPath();
  ctx.moveTo(53.5, 20);
  ctx.lineTo(53.5, 60);
  ctx.lineTo(77, 60);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#E3DDD0";
  ctx.beginPath();
  ctx.moveTo(50.5, 25);
  ctx.lineTo(50.5, 60);
  ctx.lineTo(31, 60);
  ctx.closePath();
  ctx.fill();
}

function drawCar(ctx) {
  const sky = ctx.createLinearGradient(0, 0, 0, 60);
  sky.addColorStop(0, "#A9C4DE");
  sky.addColorStop(1, "#E3ECF4");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 100, 100);
  [[0, 18, 22, "#7D8796"], [20, 30, 18, "#9AA3AF"], [36, 10, 24, "#6B7483"], [60, 26, 18, "#8C95A3"], [78, 14, 22, "#727C8B"]].forEach(
    ([x, y, wdt, c]) => {
      ctx.fillStyle = c;
      ctx.fillRect(x, y, wdt, 62 - y);
      ctx.fillStyle = "rgba(255,240,190,0.55)";
      for (let wy = y + 4; wy < 58; wy += 7) for (let wx = x + 3; wx < x + wdt - 3; wx += 6) ctx.fillRect(wx, wy, 2.4, 3);
    }
  );
  ctx.fillStyle = "#2F3237";
  ctx.fillRect(0, 62, 100, 38);
  ctx.fillStyle = "#E8E2B0";
  for (let x = 4; x < 100; x += 16) ctx.fillRect(x, 88, 8, 1.6);
  // body
  const paint = ctx.createLinearGradient(0, 44, 0, 74);
  paint.addColorStop(0, "#F0384F");
  paint.addColorStop(1, "#A1112A");
  ctx.fillStyle = paint;
  ctx.beginPath();
  ctx.moveTo(14, 70);
  ctx.lineTo(14, 60);
  ctx.quadraticCurveTo(16, 54, 26, 53);
  ctx.lineTo(34, 42);
  ctx.quadraticCurveTo(36, 40, 40, 40);
  ctx.lineTo(62, 40);
  ctx.quadraticCurveTo(66, 40, 69, 44);
  ctx.lineTo(76, 53);
  ctx.quadraticCurveTo(87, 54, 88, 61);
  ctx.lineTo(88, 70);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#BFE0F5";
  ctx.beginPath();
  ctx.moveTo(37, 44);
  ctx.lineTo(49, 44);
  ctx.lineTo(49, 53);
  ctx.lineTo(30, 53);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(52, 44);
  ctx.lineTo(65, 44);
  ctx.lineTo(71, 53);
  ctx.lineTo(52, 53);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#FFE08A";
  ctx.fillRect(84, 58, 4, 3);
  [[31, 71], [71, 71]].forEach(([x, y]) => {
    ctx.fillStyle = "#121315";
    ctx.beginPath();
    ctx.arc(x, y, 7.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#9AA1AB";
    ctx.beginPath();
    ctx.arc(x, y, 3.3, 0, Math.PI * 2);
    ctx.fill();
  });
}

export const SAMPLES = [
  { id: "stop", label: "Stop sign", dataset: "gtsrb", classIdx: 14, draw: drawStop },
  { id: "speed30", label: "Speed limit 30", dataset: "gtsrb", classIdx: 1, draw: drawSpeed30 },
  { id: "digit7", label: "Handwritten 7", dataset: "mnist", classIdx: 7, gray: true, draw: drawDigit7 },
  { id: "plane", label: "Airplane", dataset: "cifar10", classIdx: 0, draw: drawPlane },
  { id: "ship", label: "Ship", dataset: "cifar10", classIdx: 8, draw: drawShip },
  { id: "car", label: "Automobile", dataset: "cifar10", classIdx: 1, draw: drawCar },
];

export const DATASET_SAMPLE = { gtsrb: "stop", mnist: "digit7", cifar10: "plane" };
export const NATIVE_SIZE = { mnist: 28, cifar10: 32, gtsrb: 32 };

export const sampleById = (id) => SAMPLES.find((s) => s.id === id) || SAMPLES[0];

function canvasOf(size) {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  return c;
}

function readFloat(ctx, size, gray) {
  const px = ctx.getImageData(0, 0, size, size).data;
  const data = new Float32Array(size * size * 3);
  for (let p = 0; p < size * size; p++) {
    if (gray) {
      const l = (0.299 * px[p * 4] + 0.587 * px[p * 4 + 1] + 0.114 * px[p * 4 + 2]) / 255;
      data[p * 3] = data[p * 3 + 1] = data[p * 3 + 2] = l;
    } else {
      data[p * 3] = px[p * 4] / 255;
      data[p * 3 + 1] = px[p * 4 + 1] / 255;
      data[p * 3 + 2] = px[p * 4 + 2] / 255;
    }
  }
  return { w: size, h: size, data, gray: !!gray };
}

const cache = new Map();

/** Rasterise a demo sample at `size`×`size`. Memoised so identity is stable. */
export function renderSample(sample, size) {
  const key = `${sample.id}@${size}`;
  if (cache.has(key)) return cache.get(key);
  // Draw at ≥ 128px then downsample for crisp small renders.
  const big = Math.max(size, 128);
  const c = canvasOf(big);
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.save();
  ctx.scale(big / 100, big / 100);
  sample.draw(ctx, big);
  ctx.restore();
  let out;
  if (big !== size) {
    const s = canvasOf(size);
    const sctx = s.getContext("2d", { willReadFrequently: true });
    sctx.imageSmoothingQuality = "high";
    sctx.drawImage(c, 0, 0, size, size);
    out = readFloat(sctx, size, sample.gray);
  } else {
    out = readFloat(ctx, size, sample.gray);
  }
  cache.set(key, out);
  return out;
}

/** Load a user-chosen image file (never uploaded anywhere) as a centre-cropped square. */
export async function imageFromFile(file, size, gray = false) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Unsupported image"));
      el.src = url;
    });
    const c = canvasOf(size);
    const ctx = c.getContext("2d", { willReadFrequently: true });
    const s = Math.min(img.naturalWidth, img.naturalHeight);
    const sx = (img.naturalWidth - s) / 2;
    const sy = (img.naturalHeight - s) / 2;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, sx, sy, s, s, 0, 0, size, size);
    return readFloat(ctx, size, gray);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Small data-URL thumbnail of a sample (for pickers and mosaics). */
const thumbCache = new Map();
export function sampleThumb(sample, size = 64) {
  const key = `${sample.id}@${size}`;
  if (thumbCache.has(key)) return thumbCache.get(key);
  const c = canvasOf(size);
  const ctx = c.getContext("2d");
  ctx.scale(size / 100, size / 100);
  sample.draw(ctx, size);
  const url = c.toDataURL("image/png");
  thumbCache.set(key, url);
  return url;
}
