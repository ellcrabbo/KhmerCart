import { SignJWT, jwtVerify } from "jose";

const textEncoder = new TextEncoder();

export const AUTH_SESSION_COOKIE_NAME = "khmercart_session";
export const OTP_CODE_LENGTH = 6;
export const OTP_PURPOSE_LOGIN = "LOGIN" as const;
export const OTP_PROVIDER_DEV_STUB = "DEV_STUB" as const;
export const ROLE_VALUES = ["BUYER", "SELLER", "ADMIN"] as const;
export const OTP_CHANNEL_VALUES = ["EMAIL", "PHONE"] as const;

export type Role = (typeof ROLE_VALUES)[number];
export type OtpChannel = (typeof OTP_CHANNEL_VALUES)[number];
export type OtpPurpose = typeof OTP_PURPOSE_LOGIN;

export type SessionUser = {
  email: string | null;
  id: string;
  phone: string | null;
  primaryRole: Role | null;
  roles: Role[];
};

export type AuthSession = {
  expiresAt: string;
  issuedAt: string;
  user: SessionUser;
};

export type AuthConfig = {
  jwtSecret: string;
  otpProvider: string;
  otpRequestLimit: number;
  otpRateLimitWindowSeconds: number;
  otpTtlSeconds: number;
  otpVerifyLimit: number;
  sessionTtlSeconds: number;
};

export type OtpDeliveryRequest = {
  channel: OtpChannel;
  code: string;
  expiresAt: Date;
  identifier: string;
  purpose: OtpPurpose;
};

export type OtpDeliveryResult = {
  provider: string;
};

export interface OtpDeliveryService {
  deliverOtp(input: OtpDeliveryRequest): Promise<OtpDeliveryResult>;
}

export type OtpChallenge = {
  attempts: number;
  channel: OtpChannel;
  codeHash: string;
  consumedAt: Date | null;
  expiresAt: Date;
  id: string;
  identifier: string;
  maxAttempts: number;
  purpose: OtpPurpose;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfterSeconds: number;
};

export type RequestOtpInput = {
  identifier: string;
  now?: Date;
};

export type RequestOtpResult = {
  channel: OtpChannel;
  challengeId: string;
  devCode?: string;
  expiresAt: string;
  identifier: string;
  provider: string;
  rateLimit: RateLimitResult;
};

export type VerifyOtpInput = {
  code: string;
  identifier: string;
  now?: Date;
};

export type VerifyOtpResult = {
  session: AuthSession;
  token: string;
};

export interface AuthStore {
  consumeRateLimit(input: {
    key: string;
    limit: number;
    now: Date;
    windowSeconds: number;
  }): Promise<RateLimitResult>;
  consumeOtpChallenge(challengeId: string, consumedAt: Date): Promise<void>;
  findOtpChallenge(
    identifier: string,
    channel: OtpChannel,
    purpose: OtpPurpose
  ): Promise<OtpChallenge | null>;
  incrementOtpChallengeAttempts(challengeId: string, nextAttempts: number): Promise<void>;
  resolveIdentityForLogin(identifier: string, channel: OtpChannel): Promise<SessionUser>;
  touchUserLastLogin(userId: string, loggedInAt: Date): Promise<void>;
  upsertOtpChallenge(input: {
    channel: OtpChannel;
    codeHash: string;
    expiresAt: Date;
    identifier: string;
    maxAttempts: number;
    purpose: OtpPurpose;
    sentAt: Date;
  }): Promise<OtpChallenge>;
}

export class AuthError extends Error {
  code: string;
  retryAfterSeconds?: number;
  status: number;

  constructor(code: string, message: string, status: number, retryAfterSeconds?: number) {
    super(message);
    this.code = code;
    this.name = "AuthError";
    this.retryAfterSeconds = retryAfterSeconds;
    this.status = status;
  }
}

export function isRole(value: string): value is Role {
  return ROLE_VALUES.includes(value as Role);
}

export function getPrimaryRole(roles: Role[]): Role | null {
  const orderedRoles: Role[] = ["ADMIN", "SELLER", "BUYER"];

  for (const role of orderedRoles) {
    if (roles.includes(role)) {
      return role;
    }
  }

  return null;
}

export function hasRole(
  user: { role?: Role | null; roles?: Role[] | null },
  role: Role
): boolean {
  if (Array.isArray(user.roles)) {
    return user.roles.includes(role);
  }

  return user.role === role;
}

export function requireRole(
  user: { role?: Role | null; roles?: Role[] | null },
  role: Role
): void {
  if (!hasRole(user, role)) {
    throw new AuthError("FORBIDDEN", "FORBIDDEN", 403);
  }
}

export function readAuthConfig(env: NodeJS.ProcessEnv = process.env): AuthConfig {
  return {
    jwtSecret: env.AUTH_JWT_SECRET ?? "dev-auth-secret-change-me",
    otpProvider: env.OTP_PROVIDER?.trim() || OTP_PROVIDER_DEV_STUB,
    otpRequestLimit: parsePositiveInteger(env.AUTH_OTP_REQUEST_LIMIT, 5),
    otpRateLimitWindowSeconds: parsePositiveInteger(
      env.AUTH_OTP_RATE_LIMIT_WINDOW_SECONDS,
      300
    ),
    otpTtlSeconds: parsePositiveInteger(env.AUTH_OTP_TTL_SECONDS, 300),
    otpVerifyLimit: parsePositiveInteger(env.AUTH_OTP_VERIFY_LIMIT, 5),
    sessionTtlSeconds: parsePositiveInteger(env.AUTH_SESSION_TTL_SECONDS, 60 * 60 * 24 * 7)
  };
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

type OtpDeliveryServiceOptions = {
  fetch?: typeof fetch;
  userAgent?: string;
};

type TwilioSmsConfig = {
  accountSid: string;
  authToken: string;
  fromNumber: string | null;
  messagingServiceSid: string | null;
};

type ResendEmailConfig = {
  apiKey: string;
  fromEmail: string;
};

function readTwilioSmsConfig(env: NodeJS.ProcessEnv): TwilioSmsConfig | null {
  const accountSid = env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = env.TWILIO_AUTH_TOKEN?.trim();
  const messagingServiceSid = env.TWILIO_MESSAGING_SERVICE_SID?.trim() || null;
  const fromNumber = env.TWILIO_FROM_NUMBER?.trim() || null;

  if (!accountSid || !authToken) {
    return null;
  }

  if (!messagingServiceSid && !fromNumber) {
    return null;
  }

  return {
    accountSid,
    authToken,
    fromNumber,
    messagingServiceSid
  };
}

function readResendEmailConfig(env: NodeJS.ProcessEnv): ResendEmailConfig | null {
  const apiKey = env.RESEND_API_KEY?.trim();
  const fromEmail = env.RESEND_FROM_EMAIL?.trim();

  if (!apiKey || !fromEmail) {
    return null;
  }

  return {
    apiKey,
    fromEmail
  };
}

function formatOtpTtlMinutes(expiresAt: Date): number {
  return Math.max(Math.ceil((expiresAt.getTime() - Date.now()) / 60_000), 1);
}

function buildOtpMessage(input: OtpDeliveryRequest): string {
  const minutes = formatOtpTtlMinutes(input.expiresAt);

  return `Your KhmerCart verification code is ${input.code}. It expires in ${minutes} minute${
    minutes === 1 ? "" : "s"
  }.`;
}

async function readProviderErrorMessage(response: Response): Promise<string | null> {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    try {
      const payload = (await response.json()) as {
        error?: { message?: string };
        errors?: Array<{ message?: string }>;
        message?: string;
      };

      return (
        payload.message ??
        payload.error?.message ??
        payload.errors?.find((error) => typeof error.message === "string")?.message ??
        null
      );
    } catch {
      return null;
    }
  }

  try {
    const text = await response.text();

    return text.trim() || null;
  } catch {
    return null;
  }
}

async function deliverOtpByTwilio(
  fetchImpl: typeof fetch,
  config: TwilioSmsConfig,
  input: OtpDeliveryRequest
): Promise<OtpDeliveryResult> {
  const body = new URLSearchParams({
    Body: buildOtpMessage(input),
    To: input.identifier
  });

  if (config.messagingServiceSid) {
    body.set("MessagingServiceSid", config.messagingServiceSid);
  } else if (config.fromNumber) {
    body.set("From", config.fromNumber);
  }

  const response = await fetchImpl(
    `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`,
    {
      body: body.toString(),
      headers: {
        authorization: `Basic ${Buffer.from(
          `${config.accountSid}:${config.authToken}`
        ).toString("base64")}`,
        "content-type": "application/x-www-form-urlencoded"
      },
      method: "POST"
    }
  );

  if (!response.ok) {
    const message = await readProviderErrorMessage(response);

    throw new AuthError(
      "OTP_DELIVERY_FAILED",
      message ?? "Unable to send an SMS verification code right now.",
      502
    );
  }

  return {
    provider: "Twilio SMS"
  };
}

async function deliverOtpByResend(
  fetchImpl: typeof fetch,
  config: ResendEmailConfig,
  input: OtpDeliveryRequest,
  userAgent: string
): Promise<OtpDeliveryResult> {
  const response = await fetchImpl("https://api.resend.com/emails", {
    body: JSON.stringify({
      from: config.fromEmail,
      html: `<p>${buildOtpMessage(input)}</p>`,
      subject: "Your KhmerCart verification code",
      text: buildOtpMessage(input),
      to: [input.identifier]
    }),
    headers: {
      authorization: `Bearer ${config.apiKey}`,
      "content-type": "application/json",
      "user-agent": userAgent
    },
    method: "POST"
  });

  if (!response.ok) {
    const message = await readProviderErrorMessage(response);

    throw new AuthError(
      "OTP_DELIVERY_FAILED",
      message ?? "Unable to send an email verification code right now.",
      502
    );
  }

  return {
    provider: "Resend Email"
  };
}

export function createOtpDeliveryService(
  env: NodeJS.ProcessEnv = process.env,
  options: OtpDeliveryServiceOptions = {}
): OtpDeliveryService | null {
  const provider = env.OTP_PROVIDER?.trim() || OTP_PROVIDER_DEV_STUB;

  if (provider === OTP_PROVIDER_DEV_STUB) {
    return null;
  }

  const fetchImpl = options.fetch ?? fetch;
  const userAgent = options.userAgent ?? "KhmerCart/1.0";
  const twilioSms = readTwilioSmsConfig(env);
  const resendEmail = readResendEmailConfig(env);

  return {
    async deliverOtp(input) {
      if (input.channel === "PHONE") {
        if (!twilioSms) {
          throw new AuthError(
            "OTP_DELIVERY_UNAVAILABLE",
            "Phone OTP delivery is not configured. Sign in with email instead.",
            503
          );
        }

        return deliverOtpByTwilio(fetchImpl, twilioSms, input);
      }

      if (!resendEmail) {
        throw new AuthError(
          "OTP_DELIVERY_UNAVAILABLE",
          "Email OTP delivery is not configured.",
          503
        );
      }

      return deliverOtpByResend(fetchImpl, resendEmail, input, userAgent);
    }
  };
}

export function detectOtpChannel(identifier: string): OtpChannel {
  return identifier.includes("@") ? "EMAIL" : "PHONE";
}

export function normalizeIdentifier(rawIdentifier: string): string {
  const trimmedIdentifier = rawIdentifier.trim();

  if (trimmedIdentifier.length === 0) {
    throw new AuthError("BAD_REQUEST", "Identifier is required.", 400);
  }

  if (trimmedIdentifier.includes("@")) {
    return trimmedIdentifier.toLowerCase();
  }

  const normalizedPhone = normalizePhone(trimmedIdentifier);

  if (normalizedPhone.length < 8) {
    throw new AuthError("BAD_REQUEST", "Phone number is invalid.", 400);
  }

  return normalizedPhone;
}

function normalizePhone(rawPhone: string): string {
  const digitsOnly = rawPhone.replace(/[^\d+]/g, "");

  if (digitsOnly.startsWith("+")) {
    return `+${digitsOnly.slice(1).replace(/\D/g, "")}`;
  }

  return digitsOnly.replace(/\D/g, "");
}

function addSeconds(date: Date, seconds: number): Date {
  return new Date(date.getTime() + seconds * 1000);
}

export function generateOtpCode(): string {
  const randomBytes = new Uint32Array(1);
  crypto.getRandomValues(randomBytes);

  return String(randomBytes[0] % 1_000_000).padStart(OTP_CODE_LENGTH, "0");
}

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

export async function hashOtpCode(
  code: string,
  identifier: string,
  secret: string
): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    textEncoder.encode(`${secret}:${identifier}:${code}`)
  );

  return bufferToHex(digest);
}

function getSessionSecret(secret: string): Uint8Array {
  return textEncoder.encode(secret);
}

export async function issueSessionToken(
  user: SessionUser,
  secret: string,
  issuedAt: Date,
  expiresAt: Date
): Promise<string> {
  return new SignJWT({
    email: user.email,
    phone: user.phone,
    primaryRole: user.primaryRole,
    roles: user.roles,
    type: "session"
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(Math.floor(issuedAt.getTime() / 1000))
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .setSubject(user.id)
    .sign(getSessionSecret(secret));
}

export async function verifySessionToken(
  token: string,
  secret: string
): Promise<AuthSession | null> {
  try {
    const { payload } = await jwtVerify(token, getSessionSecret(secret));

    if (
      payload.type !== "session" ||
      typeof payload.sub !== "string" ||
      !Array.isArray(payload.roles)
    ) {
      return null;
    }

    const roles = payload.roles.filter(
      (role): role is Role => typeof role === "string" && isRole(role)
    );
    const primaryRole =
      typeof payload.primaryRole === "string" && isRole(payload.primaryRole)
        ? payload.primaryRole
        : getPrimaryRole(roles);
    const issuedAt =
      typeof payload.iat === "number"
        ? new Date(payload.iat * 1000).toISOString()
        : new Date().toISOString();
    const expiresAt =
      typeof payload.exp === "number"
        ? new Date(payload.exp * 1000).toISOString()
        : new Date().toISOString();

    return {
      expiresAt,
      issuedAt,
      user: {
        email: typeof payload.email === "string" ? payload.email : null,
        id: payload.sub,
        phone: typeof payload.phone === "string" ? payload.phone : null,
        primaryRole,
        roles
      }
    };
  } catch {
    return null;
  }
}

export function extractSessionToken(headers: Headers): string | null {
  const authorizationHeader = headers.get("authorization");

  if (authorizationHeader?.toLowerCase().startsWith("bearer ")) {
    return authorizationHeader.slice("bearer ".length).trim();
  }

  const cookieHeader = headers.get("cookie");

  if (!cookieHeader) {
    return null;
  }

  for (const cookie of cookieHeader.split(";")) {
    const [name, ...valueParts] = cookie.trim().split("=");

    if (name === AUTH_SESSION_COOKIE_NAME) {
      return decodeURIComponent(valueParts.join("="));
    }
  }

  return null;
}

export async function readSessionFromHeaders(
  headers: Headers,
  secret: string
): Promise<AuthSession | null> {
  const token = extractSessionToken(headers);

  if (!token) {
    return null;
  }

  return verifySessionToken(token, secret);
}

export async function requireSessionFromHeaders(
  headers: Headers,
  secret: string
): Promise<AuthSession> {
  const session = await readSessionFromHeaders(headers, secret);

  if (!session) {
    throw new AuthError("UNAUTHORIZED", "UNAUTHORIZED", 401);
  }

  return session;
}

export async function requireRoleFromHeaders(
  headers: Headers,
  secret: string,
  role: Role
): Promise<AuthSession> {
  const session = await requireSessionFromHeaders(headers, secret);
  requireRole(session.user, role);

  return session;
}

export function createSessionCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    maxAge: maxAgeSeconds,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production"
  };
}

export async function requestOtpLogin(
  store: AuthStore,
  config: AuthConfig,
  input: RequestOtpInput,
  deliveryService?: OtpDeliveryService | null
): Promise<RequestOtpResult> {
  const now = input.now ?? new Date();
  const identifier = normalizeIdentifier(input.identifier);
  const channel = detectOtpChannel(identifier);
  const rateLimit = await store.consumeRateLimit({
    key: `otp:request:${channel}:${identifier}`,
    limit: config.otpRequestLimit,
    now,
    windowSeconds: config.otpRateLimitWindowSeconds
  });

  if (!rateLimit.allowed) {
    throw new AuthError(
      "RATE_LIMITED",
      "Too many OTP requests. Please try again later.",
      429,
      rateLimit.retryAfterSeconds
    );
  }

  const code = generateOtpCode();
  const challenge = await store.upsertOtpChallenge({
    channel,
    codeHash: await hashOtpCode(code, identifier, config.jwtSecret),
    expiresAt: addSeconds(now, config.otpTtlSeconds),
    identifier,
    maxAttempts: config.otpVerifyLimit,
    purpose: OTP_PURPOSE_LOGIN,
    sentAt: now
  });

  let provider = config.otpProvider;

  if (config.otpProvider !== OTP_PROVIDER_DEV_STUB) {
    if (!deliveryService) {
      throw new AuthError(
        "OTP_DELIVERY_UNAVAILABLE",
        "OTP delivery is not configured.",
        503
      );
    }

    try {
      provider = (
        await deliveryService.deliverOtp({
          channel,
          code,
          expiresAt: challenge.expiresAt,
          identifier,
          purpose: OTP_PURPOSE_LOGIN
        })
      ).provider;
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }

      throw new AuthError(
        "OTP_DELIVERY_FAILED",
        "Unable to send a verification code right now.",
        502
      );
    }
  }

  return {
    channel,
    challengeId: challenge.id,
    devCode: config.otpProvider === OTP_PROVIDER_DEV_STUB ? code : undefined,
    expiresAt: challenge.expiresAt.toISOString(),
    identifier,
    provider,
    rateLimit
  };
}

export async function verifyOtpLogin(
  store: AuthStore,
  config: AuthConfig,
  input: VerifyOtpInput
): Promise<VerifyOtpResult> {
  const now = input.now ?? new Date();
  const identifier = normalizeIdentifier(input.identifier);
  const channel = detectOtpChannel(identifier);
  const rateLimit = await store.consumeRateLimit({
    key: `otp:verify:${channel}:${identifier}`,
    limit: config.otpVerifyLimit,
    now,
    windowSeconds: config.otpRateLimitWindowSeconds
  });

  if (!rateLimit.allowed) {
    throw new AuthError(
      "RATE_LIMITED",
      "Too many OTP verification attempts. Please try again later.",
      429,
      rateLimit.retryAfterSeconds
    );
  }

  const challenge = await store.findOtpChallenge(identifier, channel, OTP_PURPOSE_LOGIN);

  if (!challenge || challenge.consumedAt) {
    throw new AuthError("OTP_INVALID", "OTP challenge not found.", 400);
  }

  if (challenge.expiresAt.getTime() <= now.getTime()) {
    throw new AuthError("OTP_EXPIRED", "OTP has expired.", 400);
  }

  if (challenge.attempts >= challenge.maxAttempts) {
    throw new AuthError("FORBIDDEN", "OTP challenge is locked.", 403);
  }

  const submittedHash = await hashOtpCode(input.code.trim(), identifier, config.jwtSecret);

  if (submittedHash !== challenge.codeHash) {
    await store.incrementOtpChallengeAttempts(challenge.id, challenge.attempts + 1);
    throw new AuthError("OTP_INVALID", "OTP code is invalid.", 400);
  }

  await store.consumeOtpChallenge(challenge.id, now);

  const user = await store.resolveIdentityForLogin(identifier, channel);
  const issuedAt = now;
  const expiresAt = addSeconds(issuedAt, config.sessionTtlSeconds);

  await store.touchUserLastLogin(user.id, issuedAt);

  return {
    session: {
      expiresAt: expiresAt.toISOString(),
      issuedAt: issuedAt.toISOString(),
      user
    },
    token: await issueSessionToken(user, config.jwtSecret, issuedAt, expiresAt)
  };
}
