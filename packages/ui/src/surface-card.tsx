import type { ReactNode } from "react";

type SurfaceCardProps = {
  children: ReactNode;
  eyebrow: string;
  title: string;
};

export function SurfaceCard({ children, eyebrow, title }: SurfaceCardProps) {
  return (
    <article className="rounded-[1.75rem] border border-black/10 bg-white/80 p-6 shadow-[0_18px_45px_rgba(41,24,8,0.07)] backdrop-blur">
      <div className="mb-5 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-stone-500">
          {eyebrow}
        </p>
        <h2 className="text-2xl font-semibold tracking-tight text-stone-950">{title}</h2>
      </div>

      {children}
    </article>
  );
}
