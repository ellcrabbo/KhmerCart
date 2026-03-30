import { formatMoney } from "../apps/buyer/app/lib/format";
import {
  getBuyerDictionary,
  readDefaultBuyerLocale,
  readSupportedBuyerLocales,
  resolveBuyerLocale
} from "../apps/buyer/app/lib/i18n";

describe("buyer locale scaffolding", () => {
  it("parses supported locales and falls back to both storefront languages", () => {
    expect(
      readSupportedBuyerLocales({
        SUPPORTED_LOCALES: " km, en, km, invalid "
      } as NodeJS.ProcessEnv)
    ).toEqual(["km", "en"]);

    expect(readSupportedBuyerLocales({} as NodeJS.ProcessEnv)).toEqual(["en", "km"]);
  });

  it("resolves the default locale only when it is supported", () => {
    expect(
      readDefaultBuyerLocale({
        DEFAULT_LOCALE: "km",
        SUPPORTED_LOCALES: "en,km"
      } as NodeJS.ProcessEnv)
    ).toBe("km");

    expect(
      readDefaultBuyerLocale({
        DEFAULT_LOCALE: "km",
        SUPPORTED_LOCALES: "en"
      } as NodeJS.ProcessEnv)
    ).toBe("en");
  });

  it("returns translated buyer strings for both locales", () => {
    const english = getBuyerDictionary("en");
    const khmer = getBuyerDictionary("km");

    expect(english.localeLabel).toBe("Language");
    expect(english.heroTitle).toContain("Find goods");
    expect(english.returnPolicy).toBe("Return policy");
    expect(english.contactSeller).toBe("Seller contact");
    expect(english.viewTracking).toBe("View tracking");

    expect(khmer.localeLabel).toBe("ភាសា");
    expect(khmer.returnPolicy).toBe("គោលការណ៍ត្រឡប់ទំនិញ");
    expect(khmer.contactSeller).toBe("ទំនាក់ទំនងអ្នកលក់");
    expect(khmer.viewTracking).toBe("មើលការតាមដាន");
  });

  it("resolves a requested locale and formats money appropriately", () => {
    expect(resolveBuyerLocale("km", ["en", "km"], "en")).toBe("km");
    expect(resolveBuyerLocale("fr", ["en", "km"], "en")).toBe("en");

    expect(formatMoney("en", "USD", 2599)).toBe("$25.99");
    expect(formatMoney("km", "KHR", 2500)).toContain("៛");
  });
});
