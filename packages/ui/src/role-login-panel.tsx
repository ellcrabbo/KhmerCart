"use client";

import type { FormEvent } from "react";
import { useMemo, useState } from "react";

type RoleLoginPanelProps = {
  appName: string;
  errorCode?: string | null;
  nextPath: string;
  requestOtpUrl: string;
  roleLabel: string;
  verifyOtpUrl: string;
};

type RequestOtpResponse = {
  channel: string;
  devCode?: string;
  expiresAt: string;
  identifier: string;
  provider: string;
};

type VerifyOtpResponse = {
  session: {
    user: {
      primaryRole: string | null;
      roles: string[];
    };
  };
};

function getErrorMessage(errorCode: string | null | undefined, roleLabel: string): string | null {
  if (errorCode === "forbidden") {
    return `This account does not have ${roleLabel.toLowerCase()} access. Sign in with a different account.`;
  }

  if (errorCode === "session") {
    return "Your session is missing or expired. Sign in again to continue.";
  }

  return null;
}

export function RoleLoginPanel({
  appName,
  errorCode,
  nextPath,
  requestOtpUrl,
  roleLabel,
  verifyOtpUrl
}: RoleLoginPanelProps) {
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [channel, setChannel] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [provider, setProvider] = useState<string | null>(null);
  const [requestedIdentifier, setRequestedIdentifier] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    getErrorMessage(errorCode, roleLabel)
  );

  const expiresLabel = useMemo(() => {
    if (!expiresAt) {
      return null;
    }

    const date = new Date(expiresAt);

    return Number.isNaN(date.getTime()) ? null : date.toLocaleTimeString();
  }, [expiresAt]);

  async function requestOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsRequesting(true);
    setErrorMessage(null);
    setMessage(null);

    try {
      const response = await fetch(requestOtpUrl, {
        body: JSON.stringify({ identifier }),
        credentials: "same-origin",
        headers: {
          "content-type": "application/json"
        },
        method: "POST"
      });
      const payload = (await response.json()) as RequestOtpResponse & {
        error?: string;
        message?: string;
      };

      if (!response.ok) {
        throw new Error(payload.message || payload.error || "Unable to request OTP.");
      }

      setChannel(payload.channel);
      setDevCode(payload.devCode ?? null);
      setExpiresAt(payload.expiresAt);
      setProvider(payload.provider);
      setRequestedIdentifier(payload.identifier);
      setMessage(`Verification code sent for ${payload.channel.toLowerCase()} login.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to request OTP.");
    } finally {
      setIsRequesting(false);
    }
  }

  async function verifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsVerifying(true);
    setErrorMessage(null);
    setMessage(null);

    try {
      const response = await fetch(verifyOtpUrl, {
        body: JSON.stringify({
          code,
          identifier: requestedIdentifier ?? identifier
        }),
        credentials: "same-origin",
        headers: {
          "content-type": "application/json"
        },
        method: "POST"
      });
      const payload = (await response.json()) as VerifyOtpResponse & {
        error?: string;
        message?: string;
      };

      if (!response.ok) {
        throw new Error(payload.message || payload.error || "Unable to verify OTP.");
      }

      const roleName = payload.session.user.primaryRole ?? roleLabel;

      setMessage(`Signed in as ${roleName.toLowerCase()}. Redirecting...`);
      window.location.assign(nextPath);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to verify OTP.");
    } finally {
      setIsVerifying(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      <section className="rounded-[1.75rem] border border-black/10 bg-white/80 p-6 shadow-[0_18px_45px_rgba(41,24,8,0.07)] backdrop-blur">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-stone-500">
            Sign In
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-stone-950">
            Access the {appName}
          </h2>
          <p className="text-sm leading-7 text-stone-700 md:text-base">
            Use the email address or phone number attached to your {roleLabel.toLowerCase()} account.
            OTP verification happens on this domain so the session cookie stays attached to the app
            you are opening.
          </p>
        </div>

        <form className="mt-6 space-y-4" onSubmit={requestOtp}>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-stone-800">Email or phone</span>
            <input
              autoComplete="username"
              className="w-full rounded-2xl border border-black/10 bg-stone-50 px-4 py-3 text-sm text-stone-950 outline-none transition focus:border-amber-500/60 focus:bg-white"
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder="admin@khmercart.local or +855..."
              value={identifier}
            />
          </label>

          <button
            className="inline-flex w-full items-center justify-center rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-stone-50 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isRequesting || identifier.trim().length === 0}
            type="submit"
          >
            {isRequesting ? "Sending code..." : "Request OTP"}
          </button>
        </form>

        <form className="mt-6 space-y-4 border-t border-black/10 pt-6" onSubmit={verifyOtp}>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-stone-800">Verification code</span>
            <input
              autoComplete="one-time-code"
              className="w-full rounded-2xl border border-black/10 bg-stone-50 px-4 py-3 text-sm text-stone-950 outline-none transition focus:border-amber-500/60 focus:bg-white"
              inputMode="numeric"
              onChange={(event) => setCode(event.target.value)}
              placeholder="6-digit code"
              value={code}
            />
          </label>

          <button
            className="inline-flex w-full items-center justify-center rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-stone-950 transition hover:-translate-y-0.5 hover:border-amber-500/40 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isVerifying || code.trim().length === 0 || !requestedIdentifier}
            type="submit"
          >
            {isVerifying ? "Signing in..." : "Verify and continue"}
          </button>
        </form>

        {errorMessage ? (
          <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </p>
        ) : null}

        {message ? (
          <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {message}
          </p>
        ) : null}
      </section>

      <section className="rounded-[1.75rem] border border-black/10 bg-white/80 p-6 shadow-[0_18px_45px_rgba(41,24,8,0.07)] backdrop-blur">
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-stone-500">
            Session details
          </p>
          <div className="rounded-2xl border border-black/10 bg-stone-50/90 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
              Required role
            </p>
            <p className="mt-2 text-sm font-medium text-stone-900">{roleLabel}</p>
          </div>
          <div className="rounded-2xl border border-black/10 bg-stone-50/90 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
              Return path
            </p>
            <p className="mt-2 font-mono text-sm text-stone-900">{nextPath}</p>
          </div>
          {channel ? (
            <div className="rounded-2xl border border-black/10 bg-stone-50/90 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
                OTP delivery
              </p>
              <p className="mt-2 text-sm text-stone-900">
                {channel} via {provider ?? "configured provider"}
                {expiresLabel ? `, expires around ${expiresLabel}` : ""}
              </p>
            </div>
          ) : null}
          {devCode ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-700">
                Development OTP
              </p>
              <p className="mt-2 font-mono text-lg text-amber-900">{devCode}</p>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
