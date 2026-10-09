/**
 * Human-readable message from an axios/fetch error. The backend replies with
 * `{detail}` for HTTPException and `{message}` for its envelope handlers.
 */
export function errorMessage(e) {
  const data = e?.response?.data;
  const detail = data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return detail.map((d) => d.msg).join("; ");
  if (typeof data?.message === "string" && data.message) return data.message;
  if (e?.code === "ERR_NETWORK") return "Backend unreachable — is the API running on :8000?";
  return e?.message || "Unknown error";
}
