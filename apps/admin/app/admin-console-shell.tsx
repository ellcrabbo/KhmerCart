import { AppShell } from "@khmercart/ui";
import Link from "next/link";
import type { ReactNode } from "react";

const sections = [
  {
    description: "Seller onboarding decisions and review notes.",
    href: "/approvals",
    key: "approvals",
    label: "Approvals"
  },
  {
    description: "Pending product decisions and moderation notes.",
    href: "/moderation",
    key: "moderation",
    label: "Moderation"
  },
  {
    description: "Open cases, dispute decisions, and refund outcomes.",
    href: "/disputes",
    key: "disputes",
    label: "Disputes"
  },
  {
    description: "Privileged activity across approvals, moderation, and support.",
    href: "/audit",
    key: "audit",
    label: "Audit logs"
  },
  {
    description: "Manage account emails, role access, and live OTP risk signals.",
    href: "/accounts",
    key: "accounts",
    label: "Accounts"
  }
] as const;

type AdminConsoleShellProps = {
  children: ReactNode;
  current: (typeof sections)[number]["key"];
  description: string;
  title: string;
};

export function AdminConsoleShell({
  children,
  current,
  description,
  title
}: AdminConsoleShellProps) {
  return (
    <AppShell app="admin">
      <section className="grid gap-6">
        <header className="rounded-[1.75rem] border border-black/10 bg-white/85 p-6 shadow-[0_20px_50px_rgba(16,24,40,0.08)]">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-stone-500">
                Admin console
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-stone-950 md:text-4xl">
                {title}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-700 md:text-base">
                {description}
              </p>
            </div>

            <nav className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4" aria-label="Admin sections">
              {sections.map((section) => {
                const isCurrent = section.key === current;

                return (
                  <Link
                    key={section.key}
                    aria-current={isCurrent ? "page" : undefined}
                    className={[
                      "rounded-2xl border px-4 py-3 text-left transition",
                      isCurrent
                        ? "border-stone-950 bg-stone-950 text-stone-50 shadow-lg shadow-stone-950/15"
                        : "border-black/10 bg-stone-50/85 text-stone-700 hover:-translate-y-0.5 hover:border-sky-500/40 hover:text-stone-950"
                    ].join(" ")}
                    href={section.href}
                  >
                    <span className="block font-semibold">{section.label}</span>
                    <span className="mt-1 block text-xs leading-5 opacity-70">
                      {section.description}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </header>

        {children}
      </section>
    </AppShell>
  );
}
