import {
  Currency,
  KycStatus,
  LedgerAccountType,
  ProductModerationStatus,
  ProductStatus,
  UserRole
} from "@prisma/client";
import { prisma } from "../packages/db/src/prisma";

const defaultCurrencies = [Currency.KHR, Currency.USD];

function getSupportedCurrencies(): Currency[] {
  const raw = process.env.SUPPORTED_CURRENCIES ?? defaultCurrencies.join(",");
  const parsed = raw
    .split(",")
    .map((value) => value.trim().toUpperCase())
    .filter((value): value is Currency => value === Currency.KHR || value === Currency.USD);

  return parsed.length > 0 ? Array.from(new Set(parsed)) : defaultCurrencies;
}

async function ensureRole(userId: string, role: UserRole) {
  await prisma.userRoleAssignment.upsert({
    create: {
      role,
      userId
    },
    update: {},
    where: {
      userId_role: {
        role,
        userId
      }
    }
  });
}

async function ensureLedgerAccount(input: {
  code: string;
  currency: Currency;
  name: string;
  sellerId?: string;
  type: LedgerAccountType;
}) {
  return prisma.ledgerAccount.upsert({
    create: input,
    update: {
      currency: input.currency,
      name: input.name,
      sellerId: input.sellerId,
      type: input.type
    },
    where: {
      code: input.code
    }
  });
}

async function upsertAdmin() {
  const admin = await prisma.user.upsert({
    create: {
      email: "admin@khmercart.local",
      fullName: "KhmerCart Admin",
      phone: "+85510000001"
    },
    update: {
      fullName: "KhmerCart Admin",
      isActive: true,
      phone: "+85510000001"
    },
    where: {
      email: "admin@khmercart.local"
    }
  });

  await ensureRole(admin.id, UserRole.ADMIN);

  return admin;
}

async function upsertSeller(input: {
  currency: Currency;
  description: string;
  displayName: string;
  email: string;
  legalName: string;
  phone: string;
  payoutAccountName?: string;
  payoutAccountNumber?: string;
  payoutBankName?: string;
  payoutRoutingNumber?: string;
  products: Array<{
    category?: string;
    description: string;
    imageUrls: string[];
    name: string;
    returnPolicy: string;
    sellerAddress?: string;
    sellerContact?: string;
    slug: string;
    variants: Array<{
      attributes: Record<string, string>;
      compareAtPriceMinor?: number;
      isDefault?: boolean;
      name: string;
      onHandQuantity: number;
      priceMinor: number;
      sku: string;
    }>;
  }>;
  slug: string;
}) {
  const user = await prisma.user.upsert({
    create: {
      email: input.email,
      fullName: input.displayName,
      phone: input.phone
    },
    update: {
      fullName: input.displayName,
      isActive: true,
      phone: input.phone
    },
    where: {
      email: input.email
    }
  });

  await ensureRole(user.id, UserRole.SELLER);

  const seller = await prisma.seller.upsert({
    create: {
      businessDescription: input.description,
      defaultCurrency: input.currency,
      displayName: input.displayName,
      isActive: true,
      kycApprovedAt: new Date(),
      kycNotes: "Seeded seller profile.",
      kycStatus: KycStatus.APPROVED,
      legalName: input.legalName,
      payoutAccountName: input.payoutAccountName ?? `${input.displayName} Treasury`,
      payoutAccountNumber: input.payoutAccountNumber ?? `ACC-${input.slug.toUpperCase()}`,
      payoutBankName: input.payoutBankName ?? "Acleda Bank",
      payoutRoutingNumber: input.payoutRoutingNumber ?? `BANK-${input.slug.toUpperCase()}`,
      slug: input.slug,
      supportEmail: input.email,
      supportPhone: input.phone,
      userId: user.id
    },
    update: {
      businessDescription: input.description,
      defaultCurrency: input.currency,
      displayName: input.displayName,
      isActive: true,
      kycApprovedAt: new Date(),
      kycNotes: "Seeded seller profile.",
      kycStatus: KycStatus.APPROVED,
      legalName: input.legalName,
      payoutAccountName: input.payoutAccountName ?? `${input.displayName} Treasury`,
      payoutAccountNumber: input.payoutAccountNumber ?? `ACC-${input.slug.toUpperCase()}`,
      payoutBankName: input.payoutBankName ?? "Acleda Bank",
      payoutRoutingNumber: input.payoutRoutingNumber ?? `BANK-${input.slug.toUpperCase()}`,
      supportPhone: input.phone,
      supportEmail: input.email,
      userId: user.id
    },
    where: {
      slug: input.slug
    }
  });

  await ensureLedgerAccount({
    code: `${input.slug.toUpperCase()}_CASH`,
    currency: input.currency,
    name: `${input.displayName} Cash`,
    sellerId: seller.id,
    type: LedgerAccountType.ASSET
  });

  await ensureLedgerAccount({
    code: `${input.slug.toUpperCase()}_PAYABLE`,
    currency: input.currency,
    name: `${input.displayName} Seller Payable`,
    sellerId: seller.id,
    type: LedgerAccountType.LIABILITY
  });

  for (const productInput of input.products) {
    const product = await prisma.product.upsert({
      create: {
        category: productInput.category ?? null,
        defaultCurrency: input.currency,
        description: productInput.description,
        moderationStatus: ProductModerationStatus.APPROVED,
        name: productInput.name,
        publishedAt: new Date(),
        returnPolicy: productInput.returnPolicy,
        sellerAddress:
          productInput.sellerAddress ?? "Phnom Penh, Cambodia",
        sellerContact:
          productInput.sellerContact ?? `${input.email} • ${input.phone}`,
        sellerId: seller.id,
        slug: productInput.slug,
        status: ProductStatus.ACTIVE
      },
      update: {
        category: productInput.category ?? null,
        defaultCurrency: input.currency,
        description: productInput.description,
        moderationStatus: ProductModerationStatus.APPROVED,
        name: productInput.name,
        publishedAt: new Date(),
        returnPolicy: productInput.returnPolicy,
        sellerAddress:
          productInput.sellerAddress ?? "Phnom Penh, Cambodia",
        sellerContact:
          productInput.sellerContact ?? `${input.email} • ${input.phone}`,
        status: ProductStatus.ACTIVE
      },
      where: {
        sellerId_slug: {
          sellerId: seller.id,
          slug: productInput.slug
        }
      }
    });

    await prisma.productImage.deleteMany({
      where: {
        productId: product.id
      }
    });

    await prisma.productImage.createMany({
      data: productInput.imageUrls.map((url, index) => ({
        altText: `${productInput.name} image ${index + 1}`,
        isPrimary: index === 0,
        position: index,
        productId: product.id,
        url
      }))
    });

    for (const [index, variantInput] of productInput.variants.entries()) {
      const variant = await prisma.productVariant.upsert({
        create: {
          attributes: variantInput.attributes,
          compareAtPriceMinor: variantInput.compareAtPriceMinor,
          currency: input.currency,
          isActive: true,
          isDefault: variantInput.isDefault ?? false,
          name: variantInput.name,
          position: index,
          priceMinor: variantInput.priceMinor,
          productId: product.id,
          sku: variantInput.sku
        },
        update: {
          attributes: variantInput.attributes,
          compareAtPriceMinor: variantInput.compareAtPriceMinor,
          currency: input.currency,
          isActive: true,
          isDefault: variantInput.isDefault ?? false,
          name: variantInput.name,
          position: index,
          priceMinor: variantInput.priceMinor
        },
        where: {
          sku: variantInput.sku
        }
      });

      await prisma.inventory.upsert({
        create: {
          availableQuantity: variantInput.onHandQuantity,
          onHandQuantity: variantInput.onHandQuantity,
          reorderPoint: Math.min(variantInput.onHandQuantity, 4),
          reservedQuantity: 0,
          sellerId: seller.id,
          variantId: variant.id
        },
        update: {
          availableQuantity: variantInput.onHandQuantity,
          onHandQuantity: variantInput.onHandQuantity,
          reorderPoint: Math.min(variantInput.onHandQuantity, 4),
          reservedQuantity: 0,
          sellerId: seller.id
        },
        where: {
          variantId: variant.id
        }
      });
    }
  }

  return seller;
}

async function upsertPendingSellerApplication() {
  const user = await prisma.user.upsert({
    create: {
      email: "pending-seller@khmercart.local",
      fullName: "River Market Pantry",
      phone: "+85510000013"
    },
    update: {
      fullName: "River Market Pantry",
      isActive: true,
      phone: "+85510000013"
    },
    where: {
      email: "pending-seller@khmercart.local"
    }
  });

  await ensureRole(user.id, UserRole.SELLER);

  const seller = await prisma.seller.upsert({
    create: {
      businessDescription: "Small-batch pantry seller waiting on marketplace approval.",
      defaultCurrency: Currency.KHR,
      displayName: "River Market Pantry",
      kycNotes: "Seeded submission awaiting admin review.",
      kycStatus: KycStatus.SUBMITTED,
      kycSubmittedAt: new Date(),
      legalName: "River Market Pantry Co., Ltd.",
      payoutAccountName: "River Market Pantry Treasury",
      payoutAccountNumber: "ACC-RIVER-001",
      payoutBankName: "ABA Bank",
      payoutRoutingNumber: "ABA-RIVER-001",
      slug: "river-market-pantry",
      supportEmail: "pending-seller@khmercart.local",
      supportPhone: "+85510000013",
      userId: user.id
    },
    update: {
      businessDescription: "Small-batch pantry seller waiting on marketplace approval.",
      defaultCurrency: Currency.KHR,
      displayName: "River Market Pantry",
      kycNotes: "Seeded submission awaiting admin review.",
      kycStatus: KycStatus.SUBMITTED,
      kycSubmittedAt: new Date(),
      legalName: "River Market Pantry Co., Ltd.",
      payoutAccountName: "River Market Pantry Treasury",
      payoutAccountNumber: "ACC-RIVER-001",
      payoutBankName: "ABA Bank",
      payoutRoutingNumber: "ABA-RIVER-001",
      supportEmail: "pending-seller@khmercart.local",
      supportPhone: "+85510000013",
      userId: user.id
    },
    where: {
      slug: "river-market-pantry"
    }
  });

  await prisma.sellerDocument.upsert({
    create: {
      contentType: "application/pdf",
      fileName: "river-market-business-license.pdf",
      s3Key: "seed/river-market/business-license.pdf",
      sellerId: seller.id,
      type: "BUSINESS_LICENSE",
      uploadedAt: new Date()
    },
    update: {
      contentType: "application/pdf",
      fileName: "river-market-business-license.pdf",
      sellerId: seller.id,
      type: "BUSINESS_LICENSE",
      uploadedAt: new Date()
    },
    where: {
      s3Key: "seed/river-market/business-license.pdf"
    }
  });

  await prisma.sellerDocument.upsert({
    create: {
      contentType: "image/jpeg",
      fileName: "river-market-owner-id.jpg",
      s3Key: "seed/river-market/owner-id.jpg",
      sellerId: seller.id,
      type: "GOVERNMENT_ID",
      uploadedAt: new Date()
    },
    update: {
      contentType: "image/jpeg",
      fileName: "river-market-owner-id.jpg",
      sellerId: seller.id,
      type: "GOVERNMENT_ID",
      uploadedAt: new Date()
    },
    where: {
      s3Key: "seed/river-market/owner-id.jpg"
    }
  });

  return seller;
}

async function main() {
  const currencies = getSupportedCurrencies();
  const primaryCurrency = currencies[0] ?? Currency.KHR;
  const secondaryCurrency = currencies[1] ?? primaryCurrency;

  await ensureLedgerAccount({
    code: "PLATFORM_CASH",
    currency: primaryCurrency,
    name: "Platform Cash",
    type: LedgerAccountType.ASSET
  });

  await ensureLedgerAccount({
    code: "PLATFORM_SETTLEMENT_CLEARING",
    currency: primaryCurrency,
    name: "Settlement Clearing",
    type: LedgerAccountType.LIABILITY
  });

  const admin = await upsertAdmin();

  const buyer = await prisma.user.upsert({
    create: {
      email: "buyer@khmercart.local",
      fullName: "Sample Buyer",
      phone: "+85510000002"
    },
    update: {
      fullName: "Sample Buyer",
      isActive: true,
      phone: "+85510000002"
    },
    where: {
      email: "buyer@khmercart.local"
    }
  });

  await ensureRole(buyer.id, UserRole.BUYER);

  await upsertSeller({
    currency: primaryCurrency,
    description: "Home and craft merchant seeded for local catalog demos.",
    displayName: "Mekong Crafts",
    email: "mekong-crafts@khmercart.local",
    legalName: "Mekong Crafts Co., Ltd.",
    phone: "+85510000011",
    products: [
      {
        category: "Accessories",
        description: "Handwoven krama scarves in lightweight cotton.",
        imageUrls: [
          "https://images.khmercart.local/seed/krama-scarf-1.jpg",
          "https://images.khmercart.local/seed/krama-scarf-2.jpg"
        ],
        name: "Krama Scarf",
        returnPolicy: "Returns accepted within seven days if unused and in original condition.",
        sellerAddress: "Sisowath Quay, Phnom Penh",
        sellerContact: "mekong-crafts@khmercart.local",
        slug: "krama-scarf",
        variants: [
          {
            attributes: { color: "Red", material: "Cotton" },
            compareAtPriceMinor: 28000,
            isDefault: true,
            name: "Red / Standard",
            onHandQuantity: 24,
            priceMinor: 25000,
            sku: "MKC-KRAMA-RED-STD"
          },
          {
            attributes: { color: "Blue", material: "Cotton" },
            name: "Blue / Standard",
            onHandQuantity: 16,
            priceMinor: 25000,
            sku: "MKC-KRAMA-BLU-STD"
          }
        ]
      }
    ],
    slug: "mekong-crafts"
  });

  await upsertSeller({
    currency: secondaryCurrency,
    description: "Premium pantry merchant seeded for USD-priced imports.",
    displayName: "Tonle Gourmet",
    email: "tonle-gourmet@khmercart.local",
    legalName: "Tonle Gourmet Trading",
    phone: "+85510000012",
    products: [
      {
        category: "Pantry",
        description: "Single-origin Kampot pepper gift tins.",
        imageUrls: [
          "https://images.khmercart.local/seed/kampot-pepper-1.jpg",
          "https://images.khmercart.local/seed/kampot-pepper-2.jpg"
        ],
        name: "Kampot Pepper Gift Set",
        returnPolicy: "Non-perishable items may be returned within fourteen days.",
        sellerAddress: "Russian Market, Phnom Penh",
        sellerContact: "tonle-gourmet@khmercart.local",
        slug: "kampot-pepper-gift-set",
        variants: [
          {
            attributes: { finish: "Black Pepper", size: "3 Tin Box" },
            compareAtPriceMinor: 1899,
            isDefault: true,
            name: "Black Pepper / 3 Tin Box",
            onHandQuantity: 12,
            priceMinor: 1599,
            sku: "TLG-PEPPER-BLK-3TIN"
          },
          {
            attributes: { finish: "Mixed Selection", size: "6 Tin Box" },
            name: "Mixed Selection / 6 Tin Box",
            onHandQuantity: 8,
            priceMinor: 2899,
            sku: "TLG-PEPPER-MIX-6TIN"
          }
        ]
      }
    ],
    slug: "tonle-gourmet"
  });

  await upsertPendingSellerApplication();

  console.log(
    `Seed complete. Admin: ${admin.email}. Buyer: ${buyer.email}. Supported currencies: ${currencies.join(", ")}`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
