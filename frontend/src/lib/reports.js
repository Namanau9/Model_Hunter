/**
 * Filename from a Content-Disposition header. Starlette's FileResponse sends
 * the RFC 5987 form (filename*=utf-8''…) whenever the name needs escaping,
 * which the backend's timestamped report names always do.
 */
function dispositionFilename(disposition) {
  const star = disposition.match(/filename\*\s*=\s*(?:[\w-]+'[^']*')?([^;]+)/i);
  if (star) {
    try {
      return decodeURIComponent(star[1].trim().replace(/^"|"$/g, ""));
    } catch {
      /* fall through to the plain form */
    }
  }
  const plain = disposition.match(/filename\s*=\s*"?([^";]+)"?/i);
  return plain ? plain[1] : null;
}

/** Download an evaluation report (html | csv | pdf) from the backend. */
export async function downloadReport(evaluationId, fmt, fallbackName) {
  if (!evaluationId) return null;
  const res = await fetch(`/api/reports/${evaluationId}/download/${fmt}`, {
    headers: { Accept: "*/*" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  const filename = dispositionFilename(res.headers.get("Content-Disposition") || "") || `${fallbackName || "report"}.${fmt}`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return filename;
}
