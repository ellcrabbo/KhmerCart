import { expect, test, type Page } from "@playwright/test";

const buyerIdentifier =
  process.env.PLAYWRIGHT_BUYER_IDENTIFIER ?? "buyer@khmercart.local";

async function signInWithDevOtp(page: Page) {
  await page.goto("/");
  await expect(
    page.getByRole("region", { name: "Mobile checkout" }),
  ).toBeVisible();

  const emailInput = page.getByLabel("Buyer email or phone");
  await emailInput.fill(buyerIdentifier);
  await page.getByRole("button", { name: "Send OTP" }).click();

  const otpStatus = page.getByText(/Dev OTP ready: \d+/);
  await expect(otpStatus).toBeVisible();
  const statusText = (await otpStatus.textContent()) ?? "";
  const code = statusText.match(/Dev OTP ready: (?<code>\d+)/)?.groups?.code;

  expect(
    code,
    "dev OTP code should be rendered for local smoke runs",
  ).toBeTruthy();

  await page.getByLabel("OTP code").fill(code!);
  await page.getByRole("button", { name: "Verify" }).click();
  await expect(
    page.getByText("Signed in. Cart and account data are ready."),
  ).toBeVisible();
}

test.describe("mobile-first web demo", () => {
  test("renders the buyer storefront at a phone viewport", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("region", { name: "Mobile checkout" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Send OTP" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Discovery feed" }),
    ).toBeVisible();
    await expect(page.getByText("Browse by category")).toBeVisible();
  });

  test("signs in, adds Krama Scarf to cart, and creates a pending PayWay handoff", async ({
    page,
  }) => {
    await signInWithDevOtp(page);

    await page.goto("/products/krama-scarf");
    await expect(page.getByText("Mobile web actions")).toBeVisible();

    const addToCartButton = page.getByRole("button", { name: "Add to cart" });
    await expect(addToCartButton).toBeEnabled();
    await addToCartButton.click();
    await expect(
      page.getByText(
        "Added to cart. Open the checkout dock above to continue.",
      ),
    ).toBeVisible();

    await page.getByRole("button", { name: /^checkout$/i }).click();
    await expect(page.getByLabel("Payment method")).toHaveValue("PAYWAY");

    const placeOrderButton = page.getByRole("button", { name: "Place order" });
    await expect(placeOrderButton).toBeEnabled();
    await placeOrderButton.click();

    await expect(
      page.getByText(
        "Checkout created. Open PayWay to generate or complete the provider QR.",
      ),
    ).toBeVisible();
    await expect(
      page.getByText(/KC-[A-Z0-9]+ · payment pending · pending/i),
    ).toBeVisible();

    const paywayLink = page.getByRole("link", { name: "Open PayWay" });
    await expect(paywayLink).toBeVisible();
    await expect(paywayLink).toHaveAttribute(
      "href",
      /\/payments\/payway\/checkout\/[a-z0-9]+/i,
    );
    await expect(
      page.getByText(
        "PayWay QR generation is not payment confirmation. The order stays pending until ABA sends a callback or reconciliation confirms payment.",
      ),
    ).toBeVisible();
  });
});
