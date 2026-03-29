"use client";

import type { BuyerLocale } from "./lib/i18n";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

type LocaleSwitchProps = {
  currentLocale: BuyerLocale;
  label: string;
  supportedLocales: BuyerLocale[];
};

export function LocaleSwitch({
  currentLocale,
  label,
  supportedLocales
}: LocaleSwitchProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <span className="text-[0.7rem] font-semibold uppercase tracking-[0.32em] text-white/70">
        {label}
      </span>
      <div className="inline-flex rounded-full border border-white/15 bg-white/10 p-1 backdrop-blur">
        {supportedLocales.map((locale) => {
          const isActive = locale === currentLocale;

          return (
            <button
              key={locale}
              className={[
                "rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] transition",
                isActive
                  ? "bg-white text-stone-950"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              ].join(" ")}
              disabled={isPending || isActive}
              onClick={() =>
                startTransition(() => {
                  const nextParams = new URLSearchParams(searchParams.toString());

                  nextParams.set("locale", locale);
                  router.push(`${pathname}?${nextParams.toString()}`);
                })
              }
              type="button"
            >
              {locale}
            </button>
          );
        })}
      </div>
    </div>
  );
}
