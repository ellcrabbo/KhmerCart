import {
  createSellerProduct,
  getBuyerProductBySlug,
  getBuyerProductFeed,
  prisma
} from "@khmercart/db";
import { KycStatus, ProductModerationStatus, UserRole } from "@khmercart/db/prisma-client";

async function createApprovedSellerFixture(suffix: string) {
  const user = await prisma.user.create({
    data: {
      email: `buyer-feed-${suffix}@khmercart.local`,
      fullName: `Buyer Feed Seller ${suffix}`,
      phone: `+85566${suffix.slice(0, 6).replace(/\D/g, "5")}`,
      roleAssignments: {
        create: {
          role: UserRole.SELLER
        }
      }
    }
  });

  await prisma.seller.create({
    data: {
      businessDescription: "Buyer feed fixture seller",
      defaultCurrency: "KHR",
      displayName: `Buyer Feed Seller ${suffix}`,
      kycApprovedAt: new Date(),
      kycStatus: KycStatus.APPROVED,
      legalName: `Buyer Feed Seller ${suffix} Co., Ltd.`,
      payoutAccountName: `Buyer Feed Treasury ${suffix}`,
      payoutAccountNumber: `ACC-${suffix}`,
      payoutBankName: "ABA Bank",
      payoutRoutingNumber: `ABA-${suffix}`,
      slug: `buyer-feed-seller-${suffix}`,
      supportEmail: user.email,
      supportPhone: user.phone,
      userId: user.id
    }
  });

  return user;
}

describe("buyer catalog", () => {
  it("only exposes active approved products in the buyer feed", async () => {
    const suffix = crypto.randomUUID().slice(0, 8);
    const user = await createApprovedSellerFixture(suffix);

    try {
      const approved = await createSellerProduct({
        description: "Approved buyer-facing product",
        images: [
          {
            altText: "Approved product image",
            isPrimary: true,
            url: `https://images.khmercart.local/test/buyer-approved-${suffix}.jpg`
          }
        ],
        name: `Buyer Visible ${suffix}`,
        returnPolicy: "Returns accepted within ten days if unused and resellable.",
        sellerAddress: "Phnom Penh, Cambodia",
        sellerContact: user.email ?? user.phone ?? "seller-support",
        slug: `buyer-visible-${suffix}`,
        status: "ACTIVE",
        userId: user.id,
        variants: [
          {
            currency: "KHR",
            inventoryQuantity: 7,
            isActive: true,
            isDefault: true,
            name: "Default",
            priceMinor: 3400,
            sku: `BUYER-VIS-${suffix}`
          }
        ]
      });

      await createSellerProduct({
        description: "Still pending moderation",
        images: [
          {
            altText: "Pending product image",
            isPrimary: true,
            url: `https://images.khmercart.local/test/buyer-pending-${suffix}.jpg`
          }
        ],
        name: `Buyer Hidden ${suffix}`,
        returnPolicy: "Returns accepted within ten days if unused and resellable.",
        sellerAddress: "Phnom Penh, Cambodia",
        sellerContact: user.email ?? user.phone ?? "seller-support",
        slug: `buyer-hidden-${suffix}`,
        status: "ACTIVE",
        userId: user.id,
        variants: [
          {
            currency: "KHR",
            inventoryQuantity: 7,
            isActive: true,
            isDefault: true,
            name: "Default",
            priceMinor: 3600,
            sku: `BUYER-HID-${suffix}`
          }
        ]
      });

      await prisma.product.update({
        data: {
          moderationStatus: ProductModerationStatus.APPROVED
        },
        where: {
          id: approved.id
        }
      });

      const feed = await getBuyerProductFeed();
      const visible = feed.items.find((item) => item.slug === `buyer-visible-${suffix}`);

      expect(visible).toBeDefined();
      expect(visible?.leadVariant.id).toBeDefined();
      expect(visible?.leadVariant.priceMinor).toBe(3400);
      expect(visible?.leadVariant.sku).toBe(`BUYER-VIS-${suffix}`);
      expect(visible?.leadVariant.availableQuantity).toBe(7);
      expect(feed.items.some((item) => item.slug === `buyer-hidden-${suffix}`)).toBe(false);
    } finally {
      await prisma.user.delete({
        where: {
          id: user.id
        }
      });
    }
  });

  it("returns seller disclosures and variants for the buyer product page", async () => {
    const suffix = crypto.randomUUID().slice(0, 8);
    const user = await createApprovedSellerFixture(suffix);

    try {
      const product = await createSellerProduct({
        description: "Buyer detail product",
        images: [
          {
            altText: "Buyer detail image",
            isPrimary: true,
            url: `https://images.khmercart.local/test/buyer-detail-${suffix}.jpg`
          }
        ],
        name: `Buyer Detail ${suffix}`,
        returnPolicy: "Returns accepted within fourteen days if unused and resellable.",
        sellerAddress: "Siem Reap, Cambodia",
        sellerContact: user.email ?? user.phone ?? "seller-support",
        slug: `buyer-detail-${suffix}`,
        status: "ACTIVE",
        userId: user.id,
        variants: [
          {
            currency: "USD",
            inventoryQuantity: 4,
            isActive: true,
            isDefault: true,
            name: "Default",
            priceMinor: 1599,
            sku: `BUYER-DTL-${suffix}`
          }
        ]
      });

      await prisma.product.update({
        data: {
          moderationStatus: ProductModerationStatus.APPROVED
        },
        where: {
          id: product.id
        }
      });

      const detail = await getBuyerProductBySlug(`buyer-detail-${suffix}`);

      expect(detail.disclosures.returnPolicy).toContain("fourteen days");
      expect(detail.disclosures.sellerContact).toBe(user.email);
      expect(detail.disclosures.sellerAddress).toBe("Siem Reap, Cambodia");
      expect(detail.variants).toHaveLength(1);
      expect(detail.leadVariant.id).toBe(detail.variants[0]?.id);
      expect(detail.variants[0]?.priceMinor).toBe(1599);
      expect(detail.seller.displayName).toContain("Buyer Feed Seller");
    } finally {
      await prisma.user.delete({
        where: {
          id: user.id
        }
      });
    }
  });
});
