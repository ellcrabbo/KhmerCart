type AppMeta = {
  description: string;
  href: string;
  highlights: string[];
  title: string;
};

export const appCatalog = {
  admin: {
    description:
      "Operations console for moderation, order oversight, catalog governance, and support workflows.",
    href: "http://localhost:3003",
    highlights: [
      "Monitor marketplace activity across buyer and seller surfaces.",
      "Review incidents, fraud flags, and catalog quality from one control plane.",
      "Expose machine-readable and human-readable health checks for the platform."
    ],
    title: "Admin control center"
  },
  api: {
    description:
      "Backend facade for readiness checks, internal workflows, and cross-surface service orchestration.",
    href: "http://localhost:3002",
    highlights: [
      "Serve JSON health checks for infrastructure-aware monitoring.",
      "Provide a dedicated app for future route handlers and background orchestration.",
      "Share the same workspace packages as the storefront and operations apps."
    ],
    title: "API gateway"
  },
  buyer: {
    description:
      "Customer storefront for discovery, conversion, and checkout flows tuned for KhmerCart buyers.",
    href: "http://localhost:3000",
    highlights: [
      "Render a branded buyer shell with shared UI primitives.",
      "Connect to shared core and database packages from the same workspace.",
      "Expose health endpoints that validate Postgres and Redis connectivity."
    ],
    title: "Buyer storefront"
  },
  seller: {
    description:
      "Merchant workspace for product onboarding, fulfillment readiness, and shop operations.",
    href: "http://localhost:3001",
    highlights: [
      "Reuse shared UI and core packages for consistent management surfaces.",
      "Keep seller-specific Next.js routing isolated inside its own app boundary.",
      "Validate infrastructure status through shared health route helpers."
    ],
    title: "Seller studio"
  }
} satisfies Record<string, AppMeta>;

export type AppId = keyof typeof appCatalog;
