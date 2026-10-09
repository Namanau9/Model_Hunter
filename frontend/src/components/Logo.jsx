import React from "react";

/** ModelHunter logo. Points to /logo.webp (public asset). */
export default function Logo({ size = 45, sx, className = "", ...rest }) {
  return (
    <span className={`mh-logo ${className}`} style={{ display: "inline-flex", width: size, height: size }}>
      <img
        src="/logo.webp"
        alt="ModelHunter logo"
        style={{
          width: "100%",
          height: "100%",
          display: "inline-block",
          verticalAlign: "middle",
          objectFit: "contain",
          ...sx,
        }}
        {...rest}
      />
    </span>
  );
}
