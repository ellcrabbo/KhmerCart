import { appCatalog, type AppId } from "@khmercart/core";
import type { ReactNode } from "react";

const navOrder: AppId[] = ["buyer", "seller", "admin", "api"];

type AppShellProps = {
  app: AppId;
  children: ReactNode;
};

export function AppShell({ app, children }: AppShellProps) {
  const currentApp = appCatalog[app];

  return (
    <main className="min-h-screen px-6 py-8 md:px-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="rounded-[2rem] border border-black/10 bg-white/75 p-6 shadow-[0_24px_60px_rgba(41,24,8,0.08)] backdrop-blur md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-700/90">
                KhmerCart Monorepo
              </p>
              <div className="space-y-2">
                <h1 className="text-4xl font-semibold tracking-tight text-stone-950 md:text-5xl">
                  {currentApp.title}
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-stone-700 md:text-base">
                  {currentApp.description}
                </p>
              </div>
            </div>

            <nav className="grid gap-2 sm:grid-cols-2">
              {navOrder.map((appId) => {
                const targetApp = appCatalog[appId];
                const isCurrentApp = appId === app;

                return (
                  <a
                    key={appId}
                    aria-current={isCurrentApp ? "page" : undefined}
                    className={[
                      "rounded-2xl border px-4 py-3 text-sm transition",
                      isCurrentApp
                        ? "border-stone-950 bg-stone-950 text-stone-50 shadow-lg shadow-stone-950/20"
                        : "border-black/10 bg-stone-50/85 text-stone-700 hover:-translate-y-0.5 hover:border-amber-500/40 hover:text-stone-950"
                    ].join(" ")}
                    href={targetApp.href}
                  >
                    <span className="block font-semibold">{targetApp.title}</span>
                    <span className="mt-1 block text-xs uppercase tracking-[0.2em] opacity-70">
                      {appId}
                    </span>
                  </a>
                );
              })}
            </nav>
          </div>
        </header>

        {children}
      </div>
    </main>
  );
}
