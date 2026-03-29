import {
  adjustVariantInventory,
  createSellerProduct,
  prisma,
  updateSellerProduct,
  updateSellerProductVariant
} from "@khmercart/db";
import { KycStatus, UserRole } from "@prisma/client";

async function createSellerFixture(input: {
  kycStatus?: KycStatus;
  suffix: string;
}) {
  const user = await prisma.user.create({
    data: {
      email: `catalog-${input.suffix}@khmercart.local`,
      fullName: `Catalog Seller ${input.suffix}`,
      phone: `+85555${input.suffix.slice(0, 6).replace(/\D/g, "4")}`,
      roleAssignments: {
        create: {
          role: UserRole.SELLER
        }
      }
    }
  });

  const seller = await prisma.seller.create({
    data: {
      businessDescription: "Catalog test seller",
      defaultCurrency: "KHR",
      displayName: `Catalog Seller ${input.suffix}`,
      kycStatus: input.kycStatus ?? KycStatus.APPROVED,
      legalName: `Catalog Seller ${input.suffix} Co., Ltd.`,
      payoutAccountName: `Catalog Treasury ${input.suffix}`,
      payoutAccountNumber: `ACC-${input.suffix}`,
      payoutBankName: "ABA Bank",
      payoutRoutingNumber: `ABA-${input.suffix}`,
      slug: `catalog-seller-${input.suffix}`,
      supportEmail: user.email,
      supportPhone: user.phone,
      userId: user.id,
      ...(input.kycStatus === KycStatus.APPROVED || input.kycStatus === undefined
        ? {
            kycApprovedAt: new Date()
          }
        : {})
    }
  });

  return { seller, user };
}

describe("catalog service", () => {
  it("allows draft creation but rejects activation when mandatory fields are missing", async () => {
    const suffix = crypto.randomUUID().slice(0, 8);
    const { user } = await createSellerFixture({ suffix });

    try {
      const draft = await createSellerProduct({
        name: `Draft Product ${suffix}`,
        slug: `draft-product-${suffix}`,
        status: "DRAFT",
        userId: user.id,
        variants: [
          {
            inventoryQuantity: 5,
            name: "Base variant",
            sku: `DRFT-${suffix}`
          }
        ]
      });

      expect(draft.status).toBe("DRAFT");

      await expect(
        updateSellerProduct({
          productId: draft.id,
          status: "ACTIVE",
          userId: user.id
        })
      ).rejects.toMatchObject({
        code: "PRODUCT_VALIDATION_FAILED",
        status: 400
      });
    } finally {
      await prisma.user.delete({
        where: {
          id: user.id
        }
      });
    }
  });

  it("activates a product after product and variant requirements are satisfied", async () => {
    const suffix = crypto.randomUUID().slice(0, 8);
    const { user } = await createSellerFixture({ suffix });

    try {
      const draft = await createSellerProduct({
        name: `Activation Product ${suffix}`,
        slug: `activation-product-${suffix}`,
        status: "DRAFT",
        userId: user.id,
        variants: [
          {
            inventoryQuantity: 3,
            name: "Default variant",
            sku: `ACT-${suffix}`
          }
        ]
      });

      const variantId = draft.variants[0]?.id;

      expect(variantId).toBeTruthy();

      await updateSellerProductVariant({
        currency: "KHR",
        name: "Default variant",
        priceMinor: 2500,
        sku: `ACT-${suffix}`,
        userId: user.id,
        variantId: variantId!
      });

      const activated = await updateSellerProduct({
        description: "A catalog product with enough detail to be activated.",
        images: [
          {
            altText: "Front product image",
            isPrimary: true,
            url: `https://images.khmercart.local/test/${suffix}.jpg`
          }
        ],
        productId: draft.id,
        returnPolicy: "Returns accepted within ten days if unused and resellable.",
        sellerAddress: "Phnom Penh, Cambodia",
        sellerContact: user.email ?? user.phone ?? "seller-support",
        status: "ACTIVE",
        userId: user.id
      });

      expect(activated.status).toBe("ACTIVE");
      expect(activated.validationIssues).toHaveLength(0);
      expect(activated.images).toHaveLength(1);
      expect(activated.variants[0]?.priceMinor).toBe(2500);
    } finally {
      await prisma.user.delete({
        where: {
          id: user.id
        }
      });
    }
  });

  it("prevents concurrent inventory decrements from driving stock negative", async () => {
    const suffix = crypto.randomUUID().slice(0, 8);
    const { user } = await createSellerFixture({ suffix });

    try {
      const product = await createSellerProduct({
        description: "Concurrent inventory product",
        images: [
          {
            altText: "Inventory image",
            isPrimary: true,
            url: `https://images.khmercart.local/test/inventory-${suffix}.jpg`
          }
        ],
        name: `Inventory Product ${suffix}`,
        returnPolicy: "Returns accepted within ten days if unused and resellable.",
        sellerContact: user.email ?? user.phone ?? "seller-support",
        slug: `inventory-product-${suffix}`,
        status: "ACTIVE",
        userId: user.id,
        variants: [
          {
            currency: "KHR",
            inventoryQuantity: 5,
            isActive: true,
            isDefault: true,
            name: "Inventory variant",
            priceMinor: 4200,
            sku: `INV-${suffix}`
          }
        ]
      });

      const variantId = product.variants[0]?.id;

      expect(variantId).toBeTruthy();

      const results = await Promise.allSettled([
        adjustVariantInventory({
          delta: -4,
          userId: user.id,
          variantId: variantId!
        }),
        adjustVariantInventory({
          delta: -4,
          userId: user.id,
          variantId: variantId!
        })
      ]);

      const fulfilledCount = results.filter((result) => result.status === "fulfilled").length;
      const rejectedResults = results.filter(
        (result): result is PromiseRejectedResult => result.status === "rejected"
      );

      expect(fulfilledCount).toBe(1);
      expect(rejectedResults).toHaveLength(1);
      expect(rejectedResults[0].reason).toMatchObject({
        code: "INSUFFICIENT_INVENTORY",
        status: 409
      });

      const inventory = await prisma.inventory.findUniqueOrThrow({
        where: {
          variantId: variantId!
        }
      });

      expect(inventory.onHandQuantity).toBe(1);
      expect(inventory.availableQuantity).toBe(1);
      expect(inventory.onHandQuantity).toBeGreaterThanOrEqual(0);
      expect(inventory.availableQuantity).toBeGreaterThanOrEqual(0);
    } finally {
      await prisma.user.delete({
        where: {
          id: user.id
        }
      });
    }
  });
});
