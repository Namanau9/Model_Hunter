import React from "react";

/**
 * HUD targeting brackets rendered at a panel's four corners.
 * Parent must be position:relative (Panel / Card set this).
 */
export default function Corners({ size = 14, color }) {
  const style = size ? { width: size, height: size } : undefined;
  const colorVar = color ? { "--mh-cyan": color } : undefined;
  return (
    <span aria-hidden style={{ display: "contents", ...colorVar }}>
      <span className="mh-corner tl" style={style} />
      <span className="mh-corner tr" style={style} />
      <span className="mh-corner bl" style={style} />
      <span className="mh-corner br" style={style} />
    </span>
  );
}
