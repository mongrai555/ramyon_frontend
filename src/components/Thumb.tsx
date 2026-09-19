import React from "react";

/**
 * A dish, shown as the square it is photographed into. Falls back to the food
 * glyph the menu carries when a photo was never uploaded, so a row never
 * collapses into an empty box.
 */
export function Thumb({
  src,
  emoji,
  size = "h-12 w-12",
  text = "text-xl",
  tone = "light",
}: {
  src?: string;
  emoji?: string;
  size?: string;
  text?: string;
  tone?: "light" | "dark";
}) {
  return (
    <span
      className={`relative flex ${size} ${text} shrink-0 items-center justify-center overflow-hidden rounded-tile border ${
        tone === "dark"
          ? "border-kds-edge bg-kds-raise"
          : "border-edge bg-shell"
      }`}
    >
      {src ? (
        // backend-hosted upload, outside next/image's optimiser
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <span aria-hidden="true">{emoji}</span>
      )}
    </span>
  );
}

export default Thumb;
