import React from "react";

/** ModelHunter placeholder logo. Points to /logo.svg (public asset). */
export default function Logo({ size = 30, sx, className = "", ...rest }) {
  return (
    <span className={`mh-logo ${className}`} style={{ display: "inline-flex" }}>
      <img
        src="/logo.svg"
        alt="ModelHunter logo"
        width={size}
        height={size}
        style={{ display: "inline-block", verticalAlign: "middle", ...sx }}
        {...rest}
      />
    </span>
  );
}
