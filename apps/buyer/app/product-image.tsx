"use client";

import { useState } from "react";

type ProductImageProps = {
  alt: string;
  className?: string;
  label?: string;
  src: string | null;
};

export function ProductImage({ alt, className = "", label, src }: ProductImageProps) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div
        aria-label={alt}
        className={[
          "relative overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(255,213,128,0.85),transparent_35%),linear-gradient(160deg,#1f3a33_0%,#10221e_58%,#0b1513_100%)]",
          className
        ].join(" ")}
        role="img"
      >
        <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.12)_100%)]" />
        {label ? (
          <span className="absolute left-4 top-4 rounded-full border border-white/20 bg-black/20 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-white/90 backdrop-blur">
            {label}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div className={["relative overflow-hidden bg-stone-100", className].join(" ")}>
      <img
        alt={alt}
        className="h-full w-full object-cover"
        onError={() => setHasError(true)}
        src={src}
      />
      {label ? (
        <span className="absolute left-4 top-4 rounded-full border border-white/40 bg-black/35 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-white backdrop-blur">
          {label}
        </span>
      ) : null}
    </div>
  );
}
