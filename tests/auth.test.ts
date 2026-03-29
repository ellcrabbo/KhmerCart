import type {
  AuthConfig,
  AuthStore,
  OtpChannel,
  OtpChallenge,
  OtpPurpose,
  RateLimitResult,
  SessionUser
} from "@khmercart/core/auth";
import {
  AuthError,
  OTP_PROVIDER_DEV_STUB,
  requestOtpLogin,
  verifyOtpLogin,
  verifySessionToken
} from "@khmercart/core/auth";

const baseConfig: AuthConfig = {
  jwtSecret: "test-secret",
  otpProvider: OTP_PROVIDER_DEV_STUB,
  otpRequestLimit: 5,
  otpRateLimitWindowSeconds: 300,
  otpTtlSeconds: 300,
  otpVerifyLimit: 5,
  sessionTtlSeconds: 3600
};

type StoredChallenge = OtpChallenge & {
  updatedAt: Date;
};

class MemoryAuthStore implements AuthStore {
  private readonly identities = new Map<string, SessionUser>();
  private readonly otpChallenges = new Map<string, StoredChallenge>();
  private readonly rateLimitBuckets = new Map<
    string,
    { hits: number; windowStartedAt: Date }
  >();

  seedIdentity(identifier: string, identity: SessionUser) {
    this.identities.set(identifier, identity);
  }

  async consumeOtpChallenge(challengeId: string, consumedAt: Date): Promise<void> {
    const challenge = this.otpChallenges.get(challengeId);

    if (!challenge) {
      throw new Error(`Unknown OTP challenge ${challengeId}`);
    }

    challenge.consumedAt = consumedAt;
    challenge.updatedAt = consumedAt;
  }

  async consumeRateLimit(input: {
    key: string;
    limit: number;
    now: Date;
    windowSeconds: number;
  }): Promise<RateLimitResult> {
    const current = this.rateLimitBuckets.get(input.key);

    if (
      !current ||
      current.windowStartedAt.getTime() + input.windowSeconds * 1000 <= input.now.getTime()
    ) {
      const resetAt = new Date(input.now.getTime() + input.windowSeconds * 1000);

      this.rateLimitBuckets.set(input.key, {
        hits: 1,
        windowStartedAt: input.now
      });

      return {
        allowed: true,
        remaining: Math.max(input.limit - 1, 0),
        resetAt,
        retryAfterSeconds: input.windowSeconds
      };
    }

    current.hits += 1;

    const resetAt = new Date(current.windowStartedAt.getTime() + input.windowSeconds * 1000);

    return {
      allowed: current.hits <= input.limit,
      remaining: Math.max(input.limit - current.hits, 0),
      resetAt,
      retryAfterSeconds: Math.max(
        Math.ceil((resetAt.getTime() - input.now.getTime()) / 1000),
        0
      )
    };
  }

  async findOtpChallenge(
    identifier: string,
    channel: OtpChannel,
    purpose: OtpPurpose
  ): Promise<OtpChallenge | null> {
    for (const challenge of this.otpChallenges.values()) {
      if (
        challenge.identifier === identifier &&
        challenge.channel === channel &&
        challenge.purpose === purpose
      ) {
        return { ...challenge };
      }
    }

    return null;
  }

  async incrementOtpChallengeAttempts(challengeId: string, nextAttempts: number): Promise<void> {
    const challenge = this.otpChallenges.get(challengeId);

    if (!challenge) {
      throw new Error(`Unknown OTP challenge ${challengeId}`);
    }

    challenge.attempts = nextAttempts;
    challenge.updatedAt = new Date();
  }

  async resolveIdentityForLogin(identifier: string, channel: OtpChannel): Promise<SessionUser> {
    const existing = this.identities.get(identifier);

    if (existing) {
      return existing;
    }

    const created: SessionUser = {
      email: channel === "EMAIL" ? identifier : null,
      id: `user_${this.identities.size + 1}`,
      phone: channel === "PHONE" ? identifier : null,
      primaryRole: "BUYER",
      roles: ["BUYER"]
    };

    this.identities.set(identifier, created);

    return created;
  }

  async touchUserLastLogin(_userId: string, _loggedInAt: Date): Promise<void> {
    return;
  }

  async upsertOtpChallenge(input: {
    channel: OtpChannel;
    codeHash: string;
    expiresAt: Date;
    identifier: string;
    maxAttempts: number;
    purpose: OtpPurpose;
    sentAt: Date;
  }): Promise<OtpChallenge> {
    let existingId: string | null = null;

    for (const [challengeId, challenge] of this.otpChallenges.entries()) {
      if (
        challenge.identifier === input.identifier &&
        challenge.channel === input.channel &&
        challenge.purpose === input.purpose
      ) {
        existingId = challengeId;
        break;
      }
    }

    const challenge: StoredChallenge = {
      attempts: 0,
      channel: input.channel,
      codeHash: input.codeHash,
      consumedAt: null,
      expiresAt: input.expiresAt,
      id: existingId ?? `otp_${this.otpChallenges.size + 1}`,
      identifier: input.identifier,
      maxAttempts: input.maxAttempts,
      purpose: input.purpose,
      updatedAt: input.sentAt
    };

    this.otpChallenges.set(challenge.id, challenge);

    return { ...challenge };
  }
}

describe("OTP auth flow", () => {
  it("issues a session token after OTP verification", async () => {
    const store = new MemoryAuthStore();
    const now = new Date("2099-03-29T10:00:00.000Z");
    const requestResult = await requestOtpLogin(store, baseConfig, {
      identifier: "Buyer@KhmerCart.local",
      now
    });

    expect(requestResult.identifier).toBe("buyer@khmercart.local");
    expect(requestResult.channel).toBe("EMAIL");
    expect(requestResult.devCode).toMatch(/^\d{6}$/);

    const verifyResult = await verifyOtpLogin(store, baseConfig, {
      code: requestResult.devCode!,
      identifier: "buyer@khmercart.local",
      now: new Date("2099-03-29T10:01:00.000Z")
    });

    expect(verifyResult.session.user.roles).toEqual(["BUYER"]);
    expect(verifyResult.session.user.primaryRole).toBe("BUYER");

    const decodedSession = await verifySessionToken(verifyResult.token, baseConfig.jwtSecret);

    expect(decodedSession).not.toBeNull();
    expect(decodedSession?.user.id).toBe(verifyResult.session.user.id);
    expect(decodedSession?.user.roles).toEqual(["BUYER"]);
  });

  it("enforces OTP request rate limits", async () => {
    const store = new MemoryAuthStore();
    const config: AuthConfig = {
      ...baseConfig,
      otpRequestLimit: 1
    };
    const now = new Date("2099-03-29T11:00:00.000Z");

    await requestOtpLogin(store, config, {
      identifier: "+85512345678",
      now
    });

    await expect(
      requestOtpLogin(store, config, {
        identifier: "+85512345678",
        now: new Date("2099-03-29T11:00:01.000Z")
      })
    ).rejects.toMatchObject<AuthError>({
      code: "RATE_LIMITED",
      status: 429
    });
  });

  it("rejects invalid OTP codes", async () => {
    const store = new MemoryAuthStore();
    const now = new Date("2099-03-29T12:00:00.000Z");

    await requestOtpLogin(store, baseConfig, {
      identifier: "seller@khmercart.local",
      now
    });

    await expect(
      verifyOtpLogin(store, baseConfig, {
        code: "000000",
        identifier: "seller@khmercart.local",
        now: new Date("2099-03-29T12:00:30.000Z")
      })
    ).rejects.toMatchObject<AuthError>({
      code: "OTP_INVALID",
      status: 400
    });
  });

  it("preserves seeded roles in issued sessions", async () => {
    const store = new MemoryAuthStore();

    store.seedIdentity("+85510000011", {
      email: "mekong-crafts@khmercart.local",
      id: "seller_1",
      phone: "+85510000011",
      primaryRole: "SELLER",
      roles: ["BUYER", "SELLER"]
    });

    const requestResult = await requestOtpLogin(store, baseConfig, {
      identifier: "+85510000011",
      now: new Date("2099-03-29T13:00:00.000Z")
    });
    const verifyResult = await verifyOtpLogin(store, baseConfig, {
      code: requestResult.devCode!,
      identifier: "+85510000011",
      now: new Date("2099-03-29T13:01:00.000Z")
    });

    expect(verifyResult.session.user.primaryRole).toBe("SELLER");
    expect(verifyResult.session.user.roles).toEqual(["BUYER", "SELLER"]);
  });
});
