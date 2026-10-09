export const pct = (v, d = 1) => (v == null || Number.isNaN(Number(v)) ? "—" : `${Number(v).toFixed(d)}%`);

export const num = (v, d = 2) => (v == null || Number.isNaN(Number(v)) ? "—" : Number(v).toFixed(d));

export function seconds(v) {
  if (v == null) return "—";
  const s = Number(v);
  if (s < 1) return `${Math.round(s * 1000)} ms`;
  if (s < 60) return `${s.toFixed(s < 10 ? 2 : 1)} s`;
  const m = Math.floor(s / 60);
  return `${m}m ${Math.round(s % 60)}s`;
}

export function bytes(n) {
  if (n == null) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 ** 2).toFixed(1)} MB`;
}

export function timeAgo(iso) {
  if (!iso) return "—";
  // Backend stores naive UTC timestamps; treat suffix-less ISO strings as UTC.
  const t = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso}Z`).getTime();
  if (Number.isNaN(t)) return "—";
  const diff = (Date.now() - t) / 1000;
  if (diff < 45) return "just now";
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  if (diff < 86400 * 30) return `${Math.round(diff / 86400)}d ago`;
  return new Date(t).toLocaleDateString();
}

export function dateTime(iso) {
  if (!iso) return "—";
  const t = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso}Z`);
  if (Number.isNaN(t.getTime())) return "—";
  return t.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export const titleCase = (s) => String(s || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
