import { createSellerProductListing, decideSellerApproval, markSellerDocumentUploaded, prisma, requestSellerDocumentUpload, saveSellerOnboarding } from "@khmercart/db";
import { Currency, KycStatus, UserRole } from "@prisma/client";

async function createUserWithRole(input: {
  email: string;
  fullName: string;
  phone: string;
  role: UserRole;
}) {
  const user = await prisma.user.create({
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

  return user;
}

describe("seller onboarding flow", () => {
  it("uses signed upload URLs, blocks listings before approval, and records admin approval", async () => {
    process.env.S3_ENDPOINT = "http://s3.localtest.me:9000";
    process.env.S3_BUCKET = "khmercart-test";
    process.env.S3_KEY = "test-key";
    process.env.S3_SECRET = "test-secret";
    process.env.S3_REGION = "us-east-1";

    const suffix = crypto.randomUUID().slice(0, 8);
    const sellerUser = await createUserWithRole({
      email: `seller-${suffix}@khmercart.local`,
      fullName: `Seller ${suffix}`,
      phone: `+85511${suffix.slice(0, 6).replace(/\D/g, "0")}`,
      role: UserRole.SELLER
    });
    const adminUser = await createUserWithRole({
      email: `admin-${suffix}@khmercart.local`,
      fullName: `Admin ${suffix}`,
      phone: `+85522${suffix.slice(0, 6).replace(/\D/g, "1")}`,
      role: UserRole.ADMIN
    });

    try {
      const savedDashboard = await saveSellerOnboarding({
        businessDescription: "Integration test seller profile",
        defaultCurrency: Currency.KHR,
        displayName: `Seller ${suffix}`,
        legalName: `Seller Legal ${suffix}`,
        payoutAccountName: `Seller Treasury ${suffix}`,
        payoutAccountNumber: `ACC-${suffix}`,
        payoutBankName: "ABA Bank",
        payoutRoutingNumber: `ABA-${suffix}`,
        slug: `seller-${suffix}`,
        supportEmail: sellerUser.email ?? undefined,
        supportPhone: sellerUser.phone ?? undefined,
        userId: sellerUser.id
      });
      const sellerId = savedDashboard.seller.id;

      expect(sellerId).not.toBeNull();

      const uploadRequest = await requestSellerDocumentUpload({
        contentType: "application/pdf",
        documentType: "BUSINESS_LICENSE",
        fileName: `license-${suffix}.pdf`,
        sizeBytes: 2048,
        userId: sellerUser.id
      });

      expect(uploadRequest.uploadUrl).toContain("X-Amz-Algorithm");
      expect(uploadRequest.uploadUrl).toContain("X-Amz-Signature");

      await markSellerDocumentUploaded({
        documentId: uploadRequest.documentId,
        userId: sellerUser.id
      });

      const submittedDashboard = await saveSellerOnboarding({
        businessDescription: "Integration test seller profile",
        defaultCurrency: Currency.KHR,
        displayName: `Seller ${suffix}`,
        legalName: `Seller Legal ${suffix}`,
        payoutAccountName: `Seller Treasury ${suffix}`,
        payoutAccountNumber: `ACC-${suffix}`,
        payoutBankName: "ABA Bank",
        payoutRoutingNumber: `ABA-${suffix}`,
        slug: `seller-${suffix}`,
        submitForReview: true,
        supportEmail: sellerUser.email ?? undefined,
        supportPhone: sellerUser.phone ?? undefined,
        userId: sellerUser.id
      });

      expect(submittedDashboard.seller.kycStatus).toBe(KycStatus.SUBMITTED);

      await expect(
        createSellerProductListing({
          currency: Currency.KHR,
          description: "Should fail before approval",
          inventoryQuantity: 5,
          name: `Blocked Listing ${suffix}`,
          priceMinor: 1500,
          returnPolicy: "No returns",
          sku: `BLK-${suffix}`,
          slug: `blocked-listing-${suffix}`,
          userId: sellerUser.id
        })
      ).rejects.toMatchObject({
        code: "SELLER_NOT_APPROVED",
        status: 403
      });

      await decideSellerApproval({
        actorUserId: adminUser.id,
        decision: "APPROVE",
        note: "Integration test approval",
        sellerId: sellerId!,
      });

      const approvedSeller = await prisma.seller.findUniqueOrThrow({
        where: {
          id: sellerId!
        }
      });

      expect(approvedSeller.kycStatus).toBe(KycStatus.APPROVED);

      const approvalAudit = await prisma.auditLog.findFirst({
        where: {
          action: "SELLER_APPROVED",
          actorUserId: adminUser.id,
          entityId: sellerId!,
          entityType: "Seller"
        }
      });

      expect(approvalAudit).not.toBeNull();

      const listing = await createSellerProductListing({
        currency: Currency.KHR,
        description: "Approved listing",
        inventoryQuantity: 5,
        name: `Approved Listing ${suffix}`,
        priceMinor: 2500,
        returnPolicy: "Returns within 7 days",
        sku: `APR-${suffix}`,
        slug: `approved-listing-${suffix}`,
        userId: sellerUser.id
      });

      expect(listing.slug).toContain(`approved-listing-${suffix}`);
    } finally {
      await prisma.auditLog.deleteMany({
        where: {
          OR: [
            { actorUserId: sellerUser.id },
            { actorUserId: adminUser.id },
            { entityId: { contains: suffix } }
          ]
        }
      });
      await prisma.product.deleteMany({
        where: {
          seller: {
            userId: sellerUser.id
          }
        }
      });
      await prisma.seller.deleteMany({
        where: {
          userId: sellerUser.id
        }
      });
      await prisma.user.deleteMany({
        where: {
          id: {
            in: [sellerUser.id, adminUser.id]
          }
        }
      });
    }
  });
});
