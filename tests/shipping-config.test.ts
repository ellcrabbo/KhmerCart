import { readShippingConfig } from "@khmercart/core";

describe("shipping config", () => {
  it("defaults to manual delivery only when carriers are not configured", () => {
    expect(readShippingConfig({}).carriers).toEqual(["OTHER"]);
  });

  it("keeps explicit carrier overrides when provided", () => {
    expect(
      readShippingConfig({
        CARRIERS: "OTHER,JNT,GRABEXPRESS"
      }).carriers
    ).toEqual(["OTHER", "JNT", "GRABEXPRESS"]);
  });
});
