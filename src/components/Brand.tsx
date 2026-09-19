import React from "react";
import Image from "next/image";

/**
 * The shop mark: the bowl photo cropped into a square chip, the Korean name
 * set small above the Thai one. Used on every piece of chrome so customer,
 * counter and kitchen screens all read as the same restaurant.
 */
export function Brand({
  size = "md",
  tone = "light",
  subtitle,
}: {
  size?: "sm" | "md" | "lg";
  tone?: "light" | "dark";
  subtitle?: string;
}) {
  const chip = size === "lg" ? 52 : size === "md" ? 40 : 32;
  const name =
    size === "lg" ? "text-2xl" : size === "md" ? "text-lg" : "text-base";

  return (
    <span className="flex items-center gap-2.5">
      <span
        className="relative overflow-hidden rounded-tile border"
        style={{
          width: chip,
          height: chip,
          borderColor: tone === "dark" ? "#4a2f26" : "var(--color-edge)",
        }}
      >
        <Image
          src="/ramyone.jpg"
          alt=""
          fill
          sizes="52px"
          className="object-cover"
        />
      </span>
      <span className="flex flex-col leading-none">
        <span
          className={
            tone === "dark"
              ? "text-[0.6875rem] font-medium text-accent"
              : "text-[0.6875rem] font-medium text-primary"
          }
        >
          라면 언니
        </span>
        <span
          className={`font-display font-bold ${name} mt-1 tracking-tight ${
            tone === "dark" ? "text-white" : "text-ink"
          }`}
        >
          รามยอนออนนี่
        </span>
        {subtitle && (
          <span
            className={`mt-1 text-xs ${
              tone === "dark" ? "text-kds-mute" : "text-ink-soft"
            }`}
          >
            {subtitle}
          </span>
        )}
      </span>
    </span>
  );
}

export default Brand;
