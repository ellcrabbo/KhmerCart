import {
  decideDispute,
  decideProductModeration,
  decideSellerApproval,
  prisma,
  updateUserAccess
} from "@khmercart/db";
import {
  Currency,
  DisputeReason,
  DisputeStatus,
  KycStatus,
  OrderState,
  ProductModerationStatus,
  ProductStatus,
  UserRole
} from "@khmercart/db/prisma-client";

async function createUserWithRole(input: {
  email: string;
  fullName: string;
  phone: string;
  role: UserRole;
}) {
  return prisma.user.create({
    data: {
      email: input.email,
      fullName: input.fullName,
      phone: input.phone,
      roleAssignments: {
        create: {
          role: input.role
        }
      }
    }
  });
}

async function createApprovedSellerFixture(suffix: string) {
  const sellerUser = await createUserWithRole({
    email: `seller-${suffix}@khmercart.local`,
    fullName: `Seller ${suffix}`,
    phone: `+85531${suffix.slice(0, 6).replace(/\D/g, "1")}`,
    role: UserRole.SELLER
  });

  const seller = await prisma.seller.create({
    data: {
      businessDescription: "Admin moderation test seller",
      defaultCurrency: Currency.KHR,
      displayName: `Seller ${suffix}`,
      kycApprovedAt: new Date(),
      kycNotes: "Approved test seller",
      kycStatus: KycStatus.APPROVED,
      legalName: `Seller Legal ${suffix}`,
      payoutAccountName: `Seller Treasury ${suffix}`,
      payoutAccountNumber: `ACC-${suffix}`,
      payoutBankName: "ABA Bank",
      payoutRoutingNumber: `ABA-${suffix}`,
      slug: `seller-${suffix}`,
      supportEmail: sellerUser.email,
      supportPhone: sellerUser.phone,
      userId: sellerUser.id
    }
  });

  return { seller, sellerUser };
}

async function cleanupRecords(suffix: string, startedAt: Date) {
  await prisma.auditLog.deleteMany({
    where: {
      createdAt: {
        gte: startedAt
      }
    }
  });

  await prisma.order.deleteMany({
    where: {
      orderNumber: {
        contains: suffix
      }
    }
  });

  await prisma.product.deleteMany({
    where: {
      slug: {
        contains: suffix
      }
    }
  });

  await prisma.seller.deleteMany({
    where: {
      slug: {
        contains: suffix
      }
    }
  });

  await prisma.user.deleteMany({
    where: {
      email: {
        contains: suffix
      }
    }
  });
}

describe("admin audit logging", () => {
  it.each([
    {
      action: "SELLER_APPROVED",
      decision: "APPROVE" as const,
      expectedStatus: KycStatus.APPROVED,
      note: "Ready for launch."
    },
    {
      action: "SELLER_REJECTED",
      decision: "REJECT" as const,
      expectedStatus: KycStatus.REJECTED,
      note: "Missing clearer business paperwork."
    }
  ])("writes an audit log for seller $decision", async ({ action, decision, expectedStatus, note }) => {
    const startedAt = new Date();
    const suffix = crypto.randomUUID().slice(0, 8);
    const sellerUser = await createUserWithRole({
      email: `seller-review-${suffix}@khmercart.local`,
      fullName: `Seller Review ${suffix}`,
      phone: `+85541${suffix.slice(0, 6).replace(/\D/g, "2")}`,
      role: UserRole.SELLER
    });
    const adminUser = await createUserWithRole({
      email: `admin-review-${suffix}@khmercart.local`,
      fullName: `Admin Review ${suffix}`,
      phone: `+85542${suffix.slice(0, 6).replace(/\D/g, "3")}`,
      role: UserRole.ADMIN
    });

    const seller = await prisma.seller.create({
      data: {
        businessDescription: "Submitted seller for approval tests",
        defaultCurrency: Currency.KHR,
        displayName: `Seller Review ${suffix}`,
        kycNotes: "Awaiting decision",
        kycStatus: KycStatus.SUBMITTED,
        kycSubmittedAt: new Date(),
        legalName: `Seller Review ${suffix} Co., Ltd.`,
        payoutAccountName: `Treasury ${suffix}`,
        payoutAccountNumber: `ACC-${suffix}`,
        payoutBankName: "ABA Bank",
        payoutRoutingNumber: `ABA-${suffix}`,
        slug: `seller-review-${suffix}`,
        supportEmail: sellerUser.email,
        supportPhone: sellerUser.phone,
        userId: sellerUser.id,
        documents: {
          create: {
            contentType: "application/pdf",
            fileName: `license-${suffix}.pdf`,
            s3Key: `kyc/${suffix}/license.pdf`,
            type: "BUSINESS_LICENSE",
            uploadedAt: new Date()
          }
        }
      }
    });

    try {
      const result = await decideSellerApproval({
        actorUserId: adminUser.id,
        decision,
        note,
        sellerId: seller.id
      });

      expect(result.kycStatus).toBe(expectedStatus);

      const auditLog = await prisma.auditLog.findFirst({
        where: {
          action,
          actorUserId: adminUser.id,
          entityId: seller.id,
          entityType: "Seller"
        }
      });

      expect(auditLog).not.toBeNull();
    } finally {
      await cleanupRecords(suffix, startedAt);
    }
  });

  it.each([
    {
      action: "PRODUCT_APPROVED",
      decision: "APPROVE" as const,
      expectedStatus: ProductModerationStatus.APPROVED,
      note: "Looks ready for the buyer app."
    },
    {
      action: "PRODUCT_REJECTED",
      decision: "REJECT" as const,
      expectedStatus: ProductModerationStatus.REJECTED,
      note: "Needs stronger imagery and clearer details."
    }
  ])(
    "writes an audit log for product moderation $decision",
    async ({ action, decision, expectedStatus, note }) => {
      const startedAt = new Date();
      const suffix = crypto.randomUUID().slice(0, 8);
      const adminUser = await createUserWithRole({
        email: `admin-moderation-${suffix}@khmercart.local`,
        fullName: `Admin Moderation ${suffix}`,
        phone: `+85551${suffix.slice(0, 6).replace(/\D/g, "4")}`,
        role: UserRole.ADMIN
      });
      const { seller } = await createApprovedSellerFixture(suffix);

      const product = await prisma.product.create({
        data: {
          defaultCurrency: Currency.KHR,
          description: "Pending moderation product",
          moderationStatus: ProductModerationStatus.PENDING,
          name: `Pending Product ${suffix}`,
          returnPolicy: "Returns within 7 days",
          sellerAddress: "Phnom Penh, Cambodia",
          sellerContact: "seller-support",
          sellerId: seller.id,
          slug: `pending-product-${suffix}`,
          status: ProductStatus.ACTIVE,
          variants: {
            create: {
              isDefault: true,
              name: "Default",
              priceMinor: 1200,
              sku: `SKU-${suffix}`
            }
          }
        }
      });

      try {
        const result = await decideProductModeration({
          actorUserId: adminUser.id,
          decision,
          note,
          productId: product.id
        });

        expect(result.moderationStatus).toBe(expectedStatus);

        const auditLog = await prisma.auditLog.findFirst({
          where: {
            action,
            actorUserId: adminUser.id,
            entityId: product.id,
            entityType: "Product"
          }
        });

        expect(auditLog).not.toBeNull();
      } finally {
        await cleanupRecords(suffix, startedAt);
      }
    }
  );

  it.each([
    {
      action: "DISPUTE_UNDER_REVIEW",
      resolvedRefundMinor: undefined,
      resolutionNote: undefined,
      status: DisputeStatus.UNDER_REVIEW
    },
    {
      action: "DISPUTE_REFUND_APPROVED",
      resolvedRefundMinor: 4200,
      resolutionNote: "Approved full refund after damage confirmation.",
      status: DisputeStatus.REFUND_APPROVED
    },
    {
      action: "DISPUTE_REJECTED",
      resolvedRefundMinor: undefined,
      resolutionNote: "Rejected after confirming the item arrived as described.",
      status: DisputeStatus.REJECTED
    },
    {
      action: "DISPUTE_CLOSED",
      resolvedRefundMinor: undefined,
      resolutionNote: "Closed after both parties confirmed the case was resolved offline.",
      status: DisputeStatus.CLOSED
    }
  ])("writes an audit log for dispute status $status", async ({ action, resolvedRefundMinor, resolutionNote, status }) => {
    const startedAt = new Date();
    const suffix = crypto.randomUUID().slice(0, 8);
    const adminUser = await createUserWithRole({
      email: `admin-dispute-${suffix}@khmercart.local`,
      fullName: `Admin Dispute ${suffix}`,
      phone: `+85561${suffix.slice(0, 6).replace(/\D/g, "5")}`,
      role: UserRole.ADMIN
    });
    const buyerUser = await createUserWithRole({
      email: `buyer-dispute-${suffix}@khmercart.local`,
      fullName: `Buyer Dispute ${suffix}`,
      phone: `+85562${suffix.slice(0, 6).replace(/\D/g, "6")}`,
      role: UserRole.BUYER
    });
    const { seller } = await createApprovedSellerFixture(suffix);
    const product = await prisma.product.create({
      data: {
        defaultCurrency: Currency.KHR,
        description: "Dispute test product",
        moderationStatus: ProductModerationStatus.APPROVED,
        name: `Dispute Product ${suffix}`,
        publishedAt: new Date(),
        returnPolicy: "Returns within 7 days",
        sellerAddress: "Phnom Penh, Cambodia",
        sellerContact: "seller-support",
        sellerId: seller.id,
        slug: `dispute-product-${suffix}`,
        status: ProductStatus.ACTIVE,
        variants: {
          create: {
            isDefault: true,
            name: "Default",
            priceMinor: 4200,
            sku: `DSP-${suffix}`
          }
        }
      },
      include: {
        variants: true
      }
    });

    const variant = product.variants[0];

    if (!variant) {
      throw new Error("Expected a default variant for dispute test product.");
    }

    const order = await prisma.order.create({
      data: {
        buyerId: buyerUser.id,
        currency: Currency.KHR,
        orderNumber: `ORD-${suffix}`,
        placedAt: new Date(),
        sellerId: seller.id,
        state: OrderState.DELIVERED,
        subtotalMinor: 4200,
        totalMinor: 4200,
        items: {
          create: {
            currency: Currency.KHR,
            productId: product.id,
            productName: product.name,
            quantity: 1,
            sku: variant.sku,
            subtotalMinor: 4200,
            unitPriceMinor: 4200,
            variantId: variant.id,
            variantName: variant.name
          }
        }
      }
    });

    const dispute = await prisma.dispute.create({
      data: {
        adminNote: null,
        buyerMessage: "Item arrived damaged on delivery.",
        orderId: order.id,
        reason: DisputeReason.DAMAGED,
        requestedRefundMinor: 4200,
        status: DisputeStatus.OPEN
      }
    });

    try {
      const updatedDispute = await decideDispute({
        actorUserId: adminUser.id,
        adminNote: "Photo evidence reviewed.",
        disputeId: dispute.id,
        resolvedRefundMinor,
        resolutionNote,
        status
      });

      expect(updatedDispute.status).toBe(status);

      const auditLog = await prisma.auditLog.findFirst({
        where: {
          action,
          actorUserId: adminUser.id,
          entityId: dispute.id,
          entityType: "Dispute"
        }
      });

      expect(auditLog).not.toBeNull();
    } finally {
      await cleanupRecords(suffix, startedAt);
    }
  });

  it("writes an audit log for user access updates", async () => {
    const startedAt = new Date();
    const suffix = crypto.randomUUID().slice(0, 8);
    const adminUser = await createUserWithRole({
      email: `admin-access-${suffix}@khmercart.local`,
      fullName: `Admin Access ${suffix}`,
      phone: `+85571${suffix.slice(0, 6).replace(/\D/g, "7")}`,
      role: UserRole.ADMIN
    });
    const managedUser = await createUserWithRole({
      email: `buyer-access-${suffix}@khmercart.local`,
      fullName: `Buyer Access ${suffix}`,
      phone: `+85572${suffix.slice(0, 6).replace(/\D/g, "8")}`,
      role: UserRole.BUYER
    });

    try {
      const updatedUser = await updateUserAccess({
        actorUserId: adminUser.id,
        email: `buyer-access-updated-${suffix}@khmercart.local`,
        roles: [UserRole.BUYER, UserRole.ADMIN],
        userId: managedUser.id
      });

      expect(updatedUser.email).toBe(`buyer-access-updated-${suffix}@khmercart.local`);
      expect(updatedUser.roles).toEqual([UserRole.ADMIN, UserRole.BUYER]);

      const auditLog = await prisma.auditLog.findFirst({
        where: {
          action: "USER_ACCESS_UPDATED",
          actorUserId: adminUser.id,
          entityId: managedUser.id,
          entityType: "User"
        }
      });

      expect(auditLog).not.toBeNull();
    } finally {
      await cleanupRecords(suffix, startedAt);
    }
  });
});
