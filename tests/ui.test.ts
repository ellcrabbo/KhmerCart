import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppShell, SurfaceCard } from "../packages/ui/src";

describe("shared UI primitives", () => {
  it("renders the app shell with the current app highlighted", () => {
    const html = renderToStaticMarkup(
      React.createElement(
        AppShell,
        { app: "web" },
        React.createElement("p", null, "Web content")
      )
    );

    expect(html).toContain("KhmerCart Monorepo");
    expect(html).toContain("Web storefront");
    expect(html).toContain("Web content");
    expect(html).toContain('aria-current="page"');
    expect(html).toContain("http://localhost:3003");
  });

  it("renders surface cards with the provided heading content", () => {
    const html = renderToStaticMarkup(
      React.createElement(
        SurfaceCard,
        {
          eyebrow: "Operations",
          title: "Audit log"
        },
        React.createElement("p", null, "Privileged activity")
      )
    );

    expect(html).toContain("Operations");
    expect(html).toContain("Audit log");
    expect(html).toContain("Privileged activity");
  });
});
