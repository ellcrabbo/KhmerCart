import {
  OTP_PROVIDER_DEV_STUB,
  requestOtpLogin,
  verifyOtpLogin,
  type AuthConfig
} from "@khmercart/core/auth";
import { createAuthStore } from "@khmercart/db/auth-store";
import { prisma } from "@khmercart/db";
import { UserRole } from "@khmercart/db/prisma-client";

const dbAuthConfig: AuthConfig = {
  jwtSecret: "db-auth-test-secret",
  otpProvider: OTP_PROVIDER_DEV_STUB,
  otpRequestIpLimit: 20,
  otpRequestLimit: 5,
  otpRateLimitWindowSeconds: 300,
  otpTtlSeconds: 300,
  otpVerifyIpLimit: 20,
  otpVerifyLimit: 5,
  sessionTtlSeconds: 3600
};

describe("database auth store", () => {
  it("reissues OTP for an existing identifier and preserves a single active challenge", async () => {
    const suffix = crypto.randomUUID().replace(/\D/g, "").slice(0, 8).padEnd(8, "7");
    const phone = `+85577${suffix}`;
    const user = await prisma.user.create({
      data: {
        fullName: `Existing Buyer ${suffix}`,
        phone
      }
    });

    try {
      const store = createAuthStore();
      const firstRequest = await requestOtpLogin(store, dbAuthConfig, {
        identifier: phone,
        now: new Date("2099-03-29T14:00:00.000Z")
      });
      const secondRequest = await requestOtpLogin(store, dbAuthConfig, {
        identifier: phone,
        now: new Date("2099-03-29T14:01:00.000Z")
      });
      const verified = await verifyOtpLogin(store, dbAuthConfig, {
        code: secondRequest.devCode!,
        identifier: phone,
        now: new Date("2099-03-29T14:02:00.000Z")
      });

      const [challenges, roleAssignments] = await Promise.all([
        prisma.otpChallenge.findMany({
          where: {
            identifier: phone
          }
        }),
        prisma.userRoleAssignment.findMany({
          where: {
            userId: user.id
          }
        })
      ]);

      expect(firstRequest.challengeId).toBe(secondRequest.challengeId);
      expect(challenges).toHaveLength(1);
      expect(verified.session.user.id).toBe(user.id);
      expect(verified.session.user.roles).toContain("BUYER");
      expect(roleAssignments.map((assignment) => assignment.role)).toContain(UserRole.BUYER);
    } finally {
      await prisma.otpChallenge.deleteMany({
        where: {
          identifier: phone
        }
      });
      await prisma.rateLimitBucket.deleteMany({
        where: {
          key: {
            contains: phone
          }
        }
      });
      await prisma.user.delete({
        where: {
          id: user.id
        }
      });
    }
  });
});
