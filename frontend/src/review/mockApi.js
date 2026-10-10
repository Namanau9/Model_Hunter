// =====================================================================
// DEMO / REVIEW MODE ONLY — never imported by the production entry
// (src/main.jsx). Installs an in-browser stand-in for the FastAPI backend
// by swapping the axios adapter on the existing client and intercepting
// fetch() for report downloads. Response shapes mirror backend/app/api/*.
// Attack numbers come from the repo's real results (realResults.js);
// values the results files don't contain are estimated and labelled demo.
// =====================================================================

import client from "../api/client";
import { REAL_RESULTS } from "./realResults";
import { SAMPLES, renderSample } from "../lib/adversarial/samples";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const env = (data, message = "OK") => ({ success: true, message, data });
const naiveIso = (d) => d.toISOString().replace("Z", "");

const MODELS = {
  cnn: { description: "Custom 2-layer CNN (grayscale)", datasets: ["mnist"] },
  resnet18: { description: "ResNet18 (3-channel)", datasets: ["cifar10", "gtsrb"] },
  mobilenetv2: { description: "MobileNetV2 (3-channel)", datasets: ["cifar10", "gtsrb"] },
};
const DATASETS = {
  mnist: { description: "Handwritten digits 0-9", classes: 10, channels: 1 },
  cifar10: { description: "10 classes of small colour images", classes: 10, channels: 3 },
  gtsrb: { description: "German traffic signs", classes: 43, channels: 3 },
};
const ATTACK_DEFAULTS = {
  fgsm: { epsilon: 0.1 },
  pgd: { epsilon: 0.1, steps: 10, random_start: true },
  cw: { learning_rate: 0.01, max_iterations: 10, confidence: 0.0 },
  zoo: { learning_rate: 0.01, max_iterations: 10, confidence: 0.0 },
  hopskipjump: { max_iterations: 10, query_limit: 100 },
};
const DEFENSES = [
  { name: "adversarial_training", description: "Fine-tune model on adversarial examples", methods: [] },
  { name: "ensemble", description: "Majority vote across CNN + ResNet18 + MobileNetV2", methods: [] },
  { name: "input_preprocessing", description: "Preprocess inputs to remove perturbations", methods: ["none", "gaussian_blur", "jpeg", "feature_squeezing"] },
];

const INFO = {
  app: "ModelHunter",
  version: "1.0.0",
  models: Object.keys(MODELS),
  datasets: Object.keys(DATASETS),
  attacks: Object.keys(ATTACK_DEFAULTS),
  defenses: DEFENSES.map((d) => d.name),
  device: {
    preference: "auto",
    active: "cuda:0",
    type: "cuda",
    name: "Demo GPU (mock)",
    vram_gb: 24.0,
    cuda_version: "12.1",
    cudnn_version: 8902,
    torch_version: "2.3.1",
  },
  architecture: ["React Frontend", "FastAPI API", "Service Layer", "ML Engines", "Evaluation", "Database / Reports"],
};

// ---------------------------------------------------------------- metrics
function lookup(model, dataset, attack, eps) {
  const rows = REAL_RESULTS.filter((r) => r[0] === model && r[1] === dataset && r[2] === attack).sort((a, b) => a[3] - b[3]);
  if (!rows.length) return null;
  if (rows.length === 1 || eps <= rows[0][3]) return { row: rows[0], exact: rows[0][3] === eps };
  for (let i = 1; i < rows.length; i++) {
    if (eps <= rows[i][3]) {
      const a = rows[i - 1];
      const b = rows[i];
      const t = (eps - a[3]) / (b[3] - a[3]);
      const mix = a.map((v, k) => (typeof v === "number" && k > 3 ? v + (b[k] - v) * t : v));
      mix[3] = eps;
      return { row: mix, exact: t === 0 || t === 1 };
    }
  }
  return { row: rows[rows.length - 1], exact: false };
}

function robustness(adv, asr, conf) {
  const s = Math.max(0, Math.min(100, 0.4 * adv + 0.3 * (100 - asr) + 0.3 * Math.max(100 - conf, 0)));
  return [Math.round(s * 100) / 100, s <= 30 ? "Weak" : s <= 60 ? "Moderate" : "Strong"];
}

const DEFENSE_GAIN = { adversarial_training: 0.42, ensemble: 0.22, input_preprocessing: 0.16 };

function computeMetrics({ model, dataset, attack, epsilon, defense, samples }) {
  const hit = lookup(model, dataset, attack, epsilon);
  const [, , , , clean0, adv0, asr0, runtime, n0] = hit ? hit.row : [0, 0, 0, 0, 90, 40, 55, 20, 10000];
  const gain = DEFENSE_GAIN[defense] || 0;
  const clean = clean0 * (defense === "input_preprocessing" ? 0.985 : 1);
  const adv = Math.min(clean, adv0 + (clean - adv0) * gain);
  const asr = Math.max(0, asr0 * (1 - gain));
  const drop = clean - adv;
  const conf = drop * 0.86; // estimated: not present in results files
  const transfer = MODELS[model] && dataset !== "mnist" && (!defense || defense === "none") ? asr * 0.62 : 0;
  const n = Math.min(samples || 100, n0);
  const [score, klass] = robustness(adv, asr, conf);
  return {
    clean_accuracy: +clean.toFixed(2),
    adversarial_accuracy: +adv.toFixed(2),
    accuracy_drop: +drop.toFixed(2),
    attack_success_rate: +asr.toFixed(2),
    confidence_shift: +conf.toFixed(2),
    transferability_index: +transfer.toFixed(2),
    execution_time: +Math.max(0.35, (runtime * n) / n0).toFixed(3),
    robustness_score: score,
    robustness_class: klass,
    n_samples: n,
  };
}

// ---------------------------------------------------------------- state
const state = {
  checkpoints: { cnn: ["mnist"], resnet18: ["cifar10", "gtsrb"], mobilenetv2: ["cifar10"] },
  uploads: [{ name: "upload_resnet18_robust", file: "models/upload_resnet18_robust.pth", size_bytes: 44786331 }],
  history: [],
  nextId: 1,
};

function record(cfg, metrics, when) {
  const ts = naiveIso(when);
  const name = `${cfg.model}_${cfg.dataset}_${cfg.attack}_${ts.replace(/:/g, "-")}`;
  const h = {
    id: state.nextId++,
    model: cfg.model,
    dataset: cfg.dataset,
    attack: cfg.attack,
    defense: cfg.defense || "none",
    clean_accuracy: metrics.clean_accuracy,
    adversarial_accuracy: metrics.adversarial_accuracy,
    attack_success_rate: metrics.attack_success_rate,
    robustness_score: metrics.robustness_score,
    robustness_class: metrics.robustness_class,
    execution_time: metrics.execution_time,
    created_at: ts,
    report_path: `reports/${name}.html`,
    _name: name,
    _metrics: metrics,
    _epsilon: cfg.epsilon,
  };
  state.history.unshift(h);
  return h;
}

(function seed() {
  const runs = [
    ["cnn", "mnist", "fgsm", 0.05],
    ["resnet18", "cifar10", "zoo", 0.1],
    ["cnn", "mnist", "fgsm", 0.1],
    ["mobilenetv2", "gtsrb", "hopskipjump", 0.1],
    ["resnet18", "gtsrb", "fgsm", 0.1],
    ["cnn", "mnist", "pgd", 0.1, "adversarial_training"],
    ["mobilenetv2", "cifar10", "cw", 0.1],
    ["cnn", "mnist", "fgsm", 0.2],
    ["resnet18", "cifar10", "hopskipjump", 0.1],
    ["resnet18", "cifar10", "fgsm", 0.1, "ensemble"],
    ["mobilenetv2", "gtsrb", "pgd", 0.1],
    ["cnn", "mnist", "hopskipjump", 0.1],
    ["resnet18", "gtsrb", "pgd", 0.1, "input_preprocessing"],
    ["cnn", "mnist", "cw", 0.1],
  ];
  const now = Date.now();
  runs.forEach(([model, dataset, attack, epsilon, defense], i) => {
    const cfg = { model, dataset, attack, epsilon, defense: defense || "none", samples: 500 };
    record(cfg, computeMetrics(cfg), new Date(now - (runs.length - i) * 5.5 * 3600 * 1000));
  });
})();

// ---------------------------------------------------------------- explainability image
const JET = [
  [0, [0, 0, 131]], [0.125, [0, 60, 170]], [0.375, [5, 255, 255]], [0.625, [255, 255, 0]], [0.875, [250, 0, 0]], [1, [128, 0, 0]],
];
function jet(t) {
  for (let i = 1; i < JET.length; i++) {
    if (t <= JET[i][0]) {
      const [t0, a] = JET[i - 1];
      const [t1, b] = JET[i];
      const u = (t - t0) / (t1 - t0);
      return a.map((v, k) => Math.round(v + (b[k] - v) * u));
    }
  }
  return JET[JET.length - 1][1];
}

function explainImage(dataset, technique, index) {
  const pool = SAMPLES.filter((s) => s.dataset === dataset);
  const sample = pool[index % pool.length] || SAMPLES[0];
  const N = 120;
  const img = renderSample(sample, N);
  const W = 600;
  const H = 300;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#000";
  ctx.font = "15px DejaVu Sans, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Original", 150, 32);
  ctx.fillText(`${technique.toUpperCase()} Map`, 450, 32);

  const base = ctx.createImageData(N, N);
  const heat = ctx.createImageData(N, N);
  // heat: gaussian focus on the object + texture for SHAP
  const cx = N * (0.45 + ((index * 7) % 10) / 100);
  const cy = N * (0.42 + ((index * 3) % 10) / 100);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const p = y * N + x;
      const r = img.data[p * 3];
      const g = img.data[p * 3 + 1];
      const b = img.data[p * 3 + 2];
      base.data.set([r * 255, g * 255, b * 255, 255], p * 4);
      let h = Math.exp(-((x - cx) ** 2 + (y - cy) ** 2) / (2 * (N * 0.2) ** 2));
      if (technique === "shap") h = Math.max(0, Math.min(1, h * (0.6 + 0.8 * Math.abs(Math.sin(x * 0.7) * Math.cos(y * 0.6)))));
      const [hr, hg, hb] = jet(h);
      const mix = (v, hv) => Math.round(v * 255 * 0.6 + hv * 0.5);
      heat.data.set([Math.min(255, mix(r, hr)), Math.min(255, mix(g, hg)), Math.min(255, mix(b, hb)), 255], p * 4);
    }
  }
  const tmp = document.createElement("canvas");
  tmp.width = N;
  tmp.height = N;
  const tctx = tmp.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  tctx.putImageData(base, 0, 0);
  ctx.drawImage(tmp, 45, 50, 210, 210);
  tctx.putImageData(heat, 0, 0);
  ctx.drawImage(tmp, 345, 50, 210, 210);
  const correct = (index * 2654435761) % 100 > 18;
  const predicted = correct ? sample.classIdx : (sample.classIdx + 1 + (index % 3)) % DATASETS[dataset].classes;
  return {
    technique,
    sample_index: index,
    true_label: sample.classIdx,
    predicted_label: predicted,
    target_class: predicted,
    confidence: correct ? 0.82 + ((index * 13) % 17) / 100 : 0.48 + ((index * 7) % 20) / 100,
    shape: [N, N],
    image_base64: c.toDataURL("image/png").split(",")[1],
  };
}

// ---------------------------------------------------------------- reports
function tinyPdf(lines) {
  const esc = (s) => s.replace(/[\\()]/g, (m) => `\\${m}`).replace(/[^\x20-\x7e]/g, "?");
  const content = `BT /F1 12 Tf 56 780 Td 18 TL ${lines.map((l) => `(${esc(l)}) Tj T*`).join(" ")} ET`;
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offs = [];
  objs.forEach((o, i) => {
    offs.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offs.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return pdf;
}

function reportFile(h, fmt) {
  const m = h._metrics;
  const rows = Object.entries(m);
  if (fmt === "csv") return ["metric,value", ...rows.map(([k, v]) => `${k},${v}`)].join("\n");
  const lines = [
    "ModelHunter Evaluation Report (DEMO MODE - mock data)",
    `Model: ${h.model}`,
    `Dataset: ${h.dataset}`,
    `Attack: ${h.attack}`,
    `Defense: ${h.defense}`,
    `Timestamp: ${h.created_at}`,
    "",
    ...rows.map(([k, v]) => `${k}: ${typeof v === "number" ? v.toFixed(2) : v}`),
  ];
  if (fmt === "pdf") return tinyPdf(lines);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${h._name}</title></head><body style="font-family:sans-serif"><h1>ModelHunter Evaluation Report</h1><p><em>Demo mode — mock data</em></p><table border="1" cellpadding="6">${rows
    .map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`)
    .join("")}</table></body></html>`;
}

// ---------------------------------------------------------------- router
async function route(method, path, body) {
  const p = path.replace(/\?.*$/, "");
  // Realistic network latency so loading states are exercised.
  if (method === "get") await sleep(250 + Math.random() * 250);
  if (method === "get" && p === "/info") return [200, env(INFO)];
  if (method === "get" && p === "/health") return [200, env({ status: "ok", app: "ModelHunter", database: "connected" })];
  if (method === "get" && p === "/models") {
    const models = Object.entries(MODELS).map(([name, m]) => ({
      name,
      description: m.description,
      datasets: m.datasets,
      checkpoints: state.checkpoints[name] || [],
      available: !!state.checkpoints[name]?.length,
      source: "builtin",
    }));
    return [200, env({ models, uploads: state.uploads })];
  }
  if (method === "get" && p === "/datasets") {
    const datasets = Object.entries(DATASETS).map(([name, d]) => ({
      name,
      ...d,
      compatible_models: Object.keys(MODELS).filter((m) => MODELS[m].datasets.includes(name)),
    }));
    return [200, env({ datasets })];
  }
  if (method === "get" && p === "/attacks") {
    return [200, env({ attacks: Object.entries(ATTACK_DEFAULTS).map(([name, defaults]) => ({ name, label: name.toUpperCase(), defaults })) })];
  }
  if (method === "get" && p === "/defenses") return [200, env({ defenses: DEFENSES })];
  if (method === "get" && p === "/evaluation/history") {
    return [200, env({ history: state.history.map(({ _name, _metrics, _epsilon, ...h }) => h) })];
  }
  if (method === "get" && p === "/reports") {
    const reports = [...state.history]
      .sort((a, b) => a._name.localeCompare(b._name))
      .map((h) => ({
        name: h._name,
        evaluation_id: h.id,
        html: `reports/${h._name}.html`,
        csv: `reports/${h._name}.csv`,
        pdf: `reports/${h._name}.pdf`,
        size_bytes: reportFile(h, "html").length,
      }));
    return [200, env({ reports })];
  }
  if (method === "post" && p === "/evaluation/run") {
    const cfg = {
      model: body.model_name,
      dataset: body.dataset_name,
      attack: body.attack_name,
      defense: body.defense_name || "none",
      epsilon: Number(body.attack_params?.epsilon ?? 0.1),
      samples: body.sample_limit,
    };
    if (!MODELS[cfg.model]?.datasets.includes(cfg.dataset)) {
      return [400, { success: false, message: `Model '${cfg.model}' incompatible with '${cfg.dataset}'.`, data: null }];
    }
    const t0 = performance.now();
    await sleep(1800 + Math.min(2200, (cfg.samples || 100) * 1.2) + (cfg.attack === "zoo" || cfg.attack === "hopskipjump" ? 900 : 0));
    const metrics = computeMetrics(cfg);
    const when = new Date();
    const h = record(cfg, metrics, when);
    return [
      200,
      env(
        {
          model: cfg.model,
          dataset: cfg.dataset,
          attack: cfg.attack,
          defense: cfg.defense,
          timestamp: when.toISOString(),
          metrics,
          parameters: { attack: cfg.attack, epsilon: cfg.epsilon, n_samples: metrics.n_samples, model: cfg.model, dataset: cfg.dataset, defense: cfg.defense },
          reports: { csv: `reports/${h._name}.csv`, html: `reports/${h._name}.html`, pdf: `reports/${h._name}.pdf` },
          evaluation_id: h.id,
          total_time: +((performance.now() - t0) / 1000).toFixed(3),
        },
        "Evaluation complete"
      ),
    ];
  }
  if (method === "post" && p === "/models/train") {
    const { model_name: m, dataset_name: d, epochs = 1 } = body;
    if (!MODELS[m]?.datasets.includes(d)) return [400, { detail: `Model '${m}' is not compatible with dataset '${d}'.` }];
    await sleep(1600 + epochs * 450);
    state.checkpoints[m] = [...new Set([...(state.checkpoints[m] || []), d])];
    const base = { mnist: 97.5, cifar10: 61, gtsrb: 78 }[d] || 70;
    return [200, env({ model: m, dataset: d, epochs, steps: epochs * 938, test_accuracy: +(Math.min(99.4, base + Math.log2(epochs + 1) * 3.1)).toFixed(2), checkpoint: `models/${m}_${d}.pth` }, "Model trained")];
  }
  if (method === "post" && p === "/models/upload") {
    const file = body instanceof FormData ? body.get("file") : null;
    const name = file?.name || "model.pth";
    if (!/\.(pth|pt|ckpt)$/i.test(name)) return [400, { detail: "Unsupported file extension" }];
    await sleep(900);
    const rec = { name: `upload_${name.replace(/\.[^.]+$/, "")}`, file: `models/upload_${name}`, size_bytes: file?.size || 0 };
    state.uploads = [...state.uploads.filter((u) => u.name !== rec.name), rec];
    return [200, env(rec, "Model uploaded")];
  }
  if (method === "post" && p === "/explainability") {
    await sleep(1300);
    if (!MODELS[body.model_name]?.datasets.includes(body.dataset_name)) return [400, { success: false, message: "Incompatible model/dataset", data: null }];
    return [200, env(explainImage(body.dataset_name, body.technique, Number(body.sample_index) || 0), "Explanation generated")];
  }
  return [404, { success: false, message: `Demo mock has no handler for ${method.toUpperCase()} ${p}`, data: null }];
}

export function installMockApi() {
  client.defaults.adapter = async (config) => {
    const method = (config.method || "get").toLowerCase();
    let body = config.data;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        /* leave as-is */
      }
    }
    const [status, data] = await route(method, config.url || "/", body);
    const response = { data, status, statusText: status < 400 ? "OK" : "Error", headers: {}, config, request: {} };
    if (status >= 400) {
      const err = new Error(`Request failed with status code ${status}`);
      err.isAxiosError = true;
      err.config = config;
      err.response = response;
      throw err;
    }
    return response;
  };

  const realFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input?.url || "";
    const m = url.match(/\/api\/reports\/(\d+)\/download\/(html|csv|pdf)$/);
    if (!m) return realFetch(input, init);
    await sleep(250);
    const h = state.history.find((x) => x.id === Number(m[1]));
    if (!h) return new Response(JSON.stringify({ detail: "Not found" }), { status: 404 });
    const fmt = m[2];
    const type = { html: "text/html", csv: "text/csv", pdf: "application/pdf" }[fmt];
    return new Response(new Blob([reportFile(h, fmt)], { type }), {
      status: 200,
      headers: { "Content-Type": type, "Content-Disposition": `attachment; filename="${h._name}.${fmt}"` },
    });
  };
}
