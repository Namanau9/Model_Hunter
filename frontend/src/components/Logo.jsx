import React from "react";

/** ModelHunter mark: a reticle inside a square frame. Ink + one accent dot. */
export default function Logo({ size = 32, title = "ModelHunter" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" role="img" aria-label={title}>
      <rect x="1" y="1" width="30" height="30" rx="6" style={{ fill: "var(--inverse)" }} />
      <circle cx="16" cy="16" r="7.5" style={{ stroke: "var(--inverse-ink)" }} strokeWidth="1.6" />
      <path d="M16 4.5v5M16 22.5v5M4.5 16h5M22.5 16h5" style={{ stroke: "var(--inverse-ink)" }} strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="16" cy="16" r="2.4" style={{ fill: "var(--accent)" }} />
    </svg>
  );
}
