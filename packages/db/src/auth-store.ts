import type {
  AuthStore,
  OtpChannel as CoreOtpChannel,
  OtpChallenge,
  RateLimitResult,
  Role,
  SessionUser
} from "@khmercart/core/auth";
import { getPrimaryRole } from "@khmercart/core/auth";
import type { Prisma } from "./prisma-client";
import { OtpChannel, OtpPurpose as PrismaOtpPurpose, UserRole } from "./prisma-client";
import { prisma } from "./prisma";

function mapOtpChannel(channel: CoreOtpChannel): OtpChannel {
  return channel === "EMAIL" ? OtpChannel.EMAIL : OtpChannel.PHONE;
}

function mapRole(role: UserRole): Role {
  return role;
}

function mapChallenge(challenge: {
  attempts: number;
  channel: OtpChannel;
  codeHash: string;
  consumedAt: Date | null;
  expiresAt: Date;
  id: string;
  identifier: string;
  maxAttempts: number;
  purpose: PrismaOtpPurpose;
}): OtpChallenge {
  return {
    attempts: challenge.attempts,
    channel: challenge.channel === OtpChannel.EMAIL ? "EMAIL" : "PHONE",
    codeHash: challenge.codeHash,
    consumedAt: challenge.consumedAt,
    expiresAt: challenge.expiresAt,
    id: challenge.id,
    identifier: challenge.identifier,
    maxAttempts: challenge.maxAttempts,
    purpose: challenge.purpose
  };
}

function addSeconds(date: Date, seconds: number): Date {
  return new Date(date.getTime() + seconds * 1000);
}

function defaultNameForIdentifier(identifier: string, channel: CoreOtpChannel): string {
  if (channel === "EMAIL") {
    return identifier.split("@")[0]?.replace(/[._-]+/g, " ").trim() || "KhmerCart User";
  }

  const suffix = identifier.slice(-4);

  return `KhmerCart User ${suffix}`;
}

function uniqueUserWhere(identifier: string, channel: CoreOtpChannel) {
  return channel === "EMAIL"
    ? ({ email: identifier } satisfies Prisma.UserWhereUniqueInput)
    : ({ phone: identifier } satisfies Prisma.UserWhereUniqueInput);
}

async function ensureBuyerRole(tx: Prisma.TransactionClient, userId: string): Promise<void> {
  const existingRole = await tx.userRoleAssignment.findUnique({
    where: {
      userId_role: {
        role: UserRole.BUYER,
        userId
      }
    }
  });

  if (!existingRole) {
    await tx.userRoleAssignment.create({
      data: {
        role: UserRole.BUYER,
        userId
      }
    });
  }
}

async function getUserSession(tx: Prisma.TransactionClient, userId: string): Promise<SessionUser> {
  const user = await tx.user.findUniqueOrThrow({
    include: {
      roleAssignments: true
    },
    where: {
      id: userId
    }
  });
  const roles = user.roleAssignments.map((assignment) => mapRole(assignment.role));

  return {
    email: user.email,
    id: user.id,
    phone: user.phone,
    primaryRole: getPrimaryRole(roles),
    roles
  };
}

export function createAuthStore(): AuthStore {
  return {
    async consumeOtpChallenge(challengeId, consumedAt) {
      await prisma.otpChallenge.update({
        data: {
          consumedAt
        },
        where: {
          id: challengeId
        }
      });
    },

    async consumeRateLimit({ key, limit, now, windowSeconds }) {
      return prisma.$transaction(async (tx) => {
        const bucket = await tx.rateLimitBucket.findUnique({
          where: {
            key
          }
        });

        if (
          !bucket ||
          bucket.windowStartedAt.getTime() + windowSeconds * 1000 <= now.getTime()
        ) {
          const resetAt = addSeconds(now, windowSeconds);

          await tx.rateLimitBucket.upsert({
            create: {
              hits: 1,
              key,
              windowStartedAt: now
            },
            update: {
              hits: 1,
              windowStartedAt: now
            },
            where: {
              key
            }
          });

          return {
            allowed: true,
            remaining: Math.max(limit - 1, 0),
            resetAt,
            retryAfterSeconds: windowSeconds
          } satisfies RateLimitResult;
        }

        const nextHits = bucket.hits + 1;
        const allowed = nextHits <= limit;
        const resetAt = addSeconds(bucket.windowStartedAt, windowSeconds);

        await tx.rateLimitBucket.update({
          data: {
            hits: nextHits
          },
          where: {
            key
          }
        });

        return {
          allowed,
          remaining: Math.max(limit - nextHits, 0),
          resetAt,
          retryAfterSeconds: Math.max(
            Math.ceil((resetAt.getTime() - now.getTime()) / 1000),
            0
          )
        } satisfies RateLimitResult;
      });
    },

    async findOtpChallenge(identifier, channel, purpose) {
      const challenge = await prisma.otpChallenge.findUnique({
        where: {
          identifier_channel_purpose: {
            channel: mapOtpChannel(channel),
            identifier,
            purpose: purpose === "LOGIN" ? PrismaOtpPurpose.LOGIN : PrismaOtpPurpose.LOGIN
          }
        }
      });

      return challenge ? mapChallenge(challenge) : null;
    },

    async incrementOtpChallengeAttempts(challengeId, nextAttempts) {
      await prisma.otpChallenge.update({
        data: {
          attempts: nextAttempts
        },
        where: {
          id: challengeId
        }
      });
    },

    async resolveIdentityForLogin(identifier, channel) {
      return prisma.$transaction(async (tx) => {
        let user = await tx.user.findUnique({
          include: {
            roleAssignments: true
          },
          where: uniqueUserWhere(identifier, channel)
        });

        if (!user) {
          user = await tx.user.create({
            data: {
              email: channel === "EMAIL" ? identifier : null,
              fullName: defaultNameForIdentifier(identifier, channel),
              phone: channel === "PHONE" ? identifier : null
            },
            include: {
              roleAssignments: true
            }
          });
        }

        if (user.roleAssignments.length === 0) {
          await ensureBuyerRole(tx, user.id);
        }

        return getUserSession(tx, user.id);
      });
    },

    async touchUserLastLogin(userId, loggedInAt) {
      await prisma.user.update({
        data: {
          lastLoginAt: loggedInAt
        },
        where: {
          id: userId
        }
      });
    },

    async upsertOtpChallenge({
      channel,
      codeHash,
      expiresAt,
      identifier,
      maxAttempts,
      purpose,
      sentAt
    }) {
      const challenge = await prisma.otpChallenge.upsert({
        create: {
          attempts: 0,
          channel: mapOtpChannel(channel),
          codeHash,
          expiresAt,
          identifier,
          lastSentAt: sentAt,
          maxAttempts,
          purpose: purpose === "LOGIN" ? PrismaOtpPurpose.LOGIN : PrismaOtpPurpose.LOGIN
        },
        update: {
          attempts: 0,
          codeHash,
          consumedAt: null,
          expiresAt,
          lastSentAt: sentAt,
          maxAttempts
        },
        where: {
          identifier_channel_purpose: {
            channel: mapOtpChannel(channel),
            identifier,
            purpose: purpose === "LOGIN" ? PrismaOtpPurpose.LOGIN : PrismaOtpPurpose.LOGIN
          }
        }
      });

      return mapChallenge(challenge);
    }
  };
}
