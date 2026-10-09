// =====================================================================
// ModelHunter design tokens — the single source of truth.
// Every colour exists in a light and a dark variant; at runtime the
// active palette is written to CSS custom properties (--bg, --ink, …)
// so components style themselves with var(--token) and switch instantly.
// Text tokens are checked at ≥ 4.5:1 against bg, raised and sunken.
// =====================================================================

export const FONT_UI = `'IBM Plex Sans', system-ui, -apple-system, 'Segoe UI', sans-serif`;
// DIN-style condensed grotesque: instrument readouts and road-sign lettering.
export const FONT_DISPLAY = `'Barlow Semi Condensed', 'Arial Narrow', 'IBM Plex Sans', sans-serif`;
export const FONT_MONO = `'IBM Plex Mono', 'SFMono-Regular', 'Cascadia Code', Consolas, monospace`;

// "Instrument" palette: test-equipment housing greys with graphite ink.
// Colour is reserved for meaning — magenta = attack / adversarial,
// teal-green = defense, blue = links & info — like a scope's channel colours.
export const palettes = {
  light: {
    bg: "#E8EAE6", // housing grey, slight green bias
    raised: "#F8F9F7", // panels
    sunken: "#DEE1DC", // wells, tracks
    hover: "#E1E4DF",
    side: "#E0E3DE", // sidebar
    line: "#CDD2CB",
    lineStrong: "#AEB5AC",
    ink: "#141817", // graphite
    ink2: "#434A47",
    ink3: "#59615E",
    accent: "#A8235C", // signal magenta — attack, adversarial, brand mark
    accentInk: "#FFFFFF",
    green: "#1A6B59", // defense
    blue: "#2A58B8", // links, info, focus
    ochre: "#80590C", // warnings
    plum: "#674B9C", // explainability
    inverse: "#141817", // primary buttons: graphite keys
    inverseInk: "#F8F9F7",
    shadow: "0 1px 0 rgba(20,24,23,0.04), 0 1px 3px rgba(20,24,23,0.05)",
    shadowPop: "0 14px 34px -14px rgba(20,24,23,0.35), 0 2px 6px rgba(20,24,23,0.08)",
    grid: "rgba(20,24,23,0.08)",
    // dataviz — validated light slots (surface #F8F9F7)
    series: ["#2A78D6", "#EB6834", "#1BAF7A"],
    status: {
      Strong: { fill: "#0CA30C", text: "#0A6E0A" },
      Moderate: { fill: "#FAB219", text: "#7A5100" },
      Weak: { fill: "#D03B3B", text: "#A82020" },
    },
  },
  dark: {
    bg: "#161918", // scope bezel graphite
    raised: "#1E2221",
    sunken: "#131615",
    hover: "#262B29",
    side: "#1A1D1C",
    line: "#2C3230",
    lineStrong: "#414946",
    ink: "#E5E8E6",
    ink2: "#AAB2AE",
    ink3: "#8A938F",
    accent: "#EE6FA9",
    accentInk: "#1A0610",
    green: "#5CC5A7",
    blue: "#86A9F0",
    ochre: "#D9AC55",
    plum: "#BBA4E8",
    inverse: "#E5E8E6",
    inverseInk: "#141716",
    shadow: "0 1px 0 rgba(0,0,0,0.35)",
    shadowPop: "0 16px 40px -12px rgba(0,0,0,0.75)",
    grid: "rgba(229,232,230,0.06)",
    // dataviz — validated dark slots (surface #1E2221)
    series: ["#3987E5", "#D95926", "#199E70"],
    status: {
      Strong: { fill: "#0CA30C", text: "#4FCB4F" },
      Moderate: { fill: "#FAB219", text: "#FAB219" },
      Weak: { fill: "#D03B3B", text: "#F07A7A" },
    },
  },
};

const kebab = (s) => s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`).replace(/([a-z])(\d)/g, "$1-$2");

/** Write a palette to CSS custom properties on <html>. */
export function applyCssVars(mode) {
  const p = palettes[mode] || palettes.light;
  const root = document.documentElement;
  Object.entries(p).forEach(([k, v]) => {
    if (typeof v === "string") root.style.setProperty(`--${kebab(k)}`, v);
  });
  p.series.forEach((c, i) => root.style.setProperty(`--series-${i + 1}`, c));
  Object.entries(p.status).forEach(([k, v]) => {
    root.style.setProperty(`--status-${k.toLowerCase()}`, v.fill);
    root.style.setProperty(`--status-${k.toLowerCase()}-text`, v.text);
  });
  root.dataset.theme = mode;
  root.style.colorScheme = mode;
}

/** Translucent tint of any CSS colour (hex or var()). */
export const tint = (c, pct = 12) => `color-mix(in srgb, ${c} ${pct}%, transparent)`;

// Motion tokens — micro 150–300ms, complex ≤ 400ms, exits faster than enters.
export const motion = {
  fast: 0.16,
  base: 0.24,
  slow: 0.36,
  ease: [0.22, 1, 0.36, 1],
  easeIn: [0.4, 0, 1, 1],
  spring: { type: "spring", stiffness: 420, damping: 36, mass: 0.8 },
};

// Domain accents as CSS vars — used for small markers, never large fills.
export const domain = {
  attack: "var(--accent)",
  defense: "var(--green)",
  eval: "var(--blue)",
  xai: "var(--plum)",
  data: "var(--ochre)",
  neutral: "var(--ink-3)",
};

export const statusVar = (k) => (k ? `var(--status-${k.toLowerCase()})` : "var(--ink-3)");
export const statusTextVar = (k) => (k ? `var(--status-${k.toLowerCase()}-text)` : "var(--ink-2)");
