import { appCatalog } from "@khmercart/core";
import type { ReactNode } from "react";
import { LocaleSwitch } from "./locale-switch";
import { BuyerActionDock } from "./buyer-action-dock";
import { getBuyerDictionary, type BuyerLocale } from "./lib/i18n";

type BuyerShellProps = {
  children: ReactNode;
  locale: BuyerLocale;
  supportedLocales: BuyerLocale[];
};

export function BuyerShell({ children, locale, supportedLocales }: BuyerShellProps) {
  const web = appCatalog.web;
  const dictionary = getBuyerDictionary(locale);

  return (
    <main className="min-h-screen px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6">
        <header className="overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,#1d3a31_0%,#0e1b1b_52%,#071112_100%)] text-white shadow-[0_30px_80px_rgba(7,17,18,0.32)]">
          <div className="grid gap-8 px-5 py-6 sm:px-7 sm:py-8 lg:grid-cols-[1.1fr_0.9fr] lg:px-10">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/8 px-4 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.34em] text-white/75">
                <span className="h-2.5 w-2.5 rounded-full bg-[#f2b55e]" />
                {dictionary.heroEyebrow}
              </div>

              <div className="space-y-3">
                <a className="inline-flex items-center gap-3" href="/">
                  <span className="text-2xl font-semibold tracking-tight sm:text-3xl">
                    KhmerCart
                  </span>
                  <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-white/70">
                    {locale}
                  </span>
                </a>
                <p className="max-w-2xl text-sm leading-7 text-white/70 sm:text-base">
                  {web.description}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-start justify-between gap-6 lg:items-end">
              <LocaleSwitch
                currentLocale={locale}
                label={dictionary.localeLabel}
                supportedLocales={supportedLocales}
              />
              <p className="max-w-md text-sm leading-7 text-white/65 lg:text-right">
                {dictionary.storefrontNote}
              </p>
            </div>
          </div>
        </header>

        <BuyerActionDock locale={locale} />

        {children}
      </div>
    </main>
  );
}
