"use client";

import type {
  AdminOtpAbuseOverview,
  AdminUserDirectoryEntry
} from "@khmercart/db";
import { formatKycStatus } from "@khmercart/core";
import { useState, useTransition } from "react";

const ROLE_OPTIONS = ["ADMIN", "SELLER", "BUYER"] as const;

type RoleOption = (typeof ROLE_OPTIONS)[number];

type AccessManagerProps = {
  overview: AdminOtpAbuseOverview;
  users: AdminUserDirectoryEntry[];
};

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { message?: string };

    return payload.message ?? `Request failed with status ${response.status}.`;
  } catch {
    return `Request failed with status ${response.status}.`;
  }
}

function formatTimestamp(value: string | null): string {
  if (!value) {
    return "Never";
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "Never" : date.toLocaleString();
}

function alertPalette(level: AccessManagerProps["overview"]["alertLevel"]) {
  switch (level) {
    case "HOT":
      return "border-rose-200 bg-rose-50 text-rose-800";
    case "ELEVATED":
      return "border-amber-200 bg-amber-50 text-amber-800";
    default:
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }
}

export function AccessManager({ overview, users }: AccessManagerProps) {
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [directory, setDirectory] = useState(users);
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [drafts, setDrafts] = useState<Record<string, { email: string; roles: RoleOption[] }>>(
    () =>
      Object.fromEntries(
        users.map((user) => [
          user.id,
          {
            email: user.email ?? "",
            roles: [...user.roles] as RoleOption[]
          }
        ])
      )
  );

  const query = search.trim().toLowerCase();
  const filteredUsers = directory.filter((user) => {
    if (!query) {
      return true;
    }

    return [user.fullName, user.email ?? "", user.phone ?? "", user.sellerProfile?.slug ?? ""]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });

  function updateDraft(userId: string, nextDraft: { email: string; roles: RoleOption[] }) {
    setDrafts((current) => ({
      ...current,
      [userId]: nextDraft
    }));
  }

  async function saveUser(userId: string) {
    const draft = drafts[userId];

    if (!draft) {
      return;
    }

    const response = await fetch(`/api/users/${userId}`, {
      body: JSON.stringify({
        email: draft.email,
        roles: draft.roles
      }),
      headers: {
        "content-type": "application/json"
      },
      method: "PATCH"
    });

    if (!response.ok) {
      throw new Error(await readErrorMessage(response));
    }

    const updatedUser = (await response.json()) as AdminUserDirectoryEntry;

    setDirectory((current) =>
      current.map((user) => (user.id === updatedUser.id ? updatedUser : user))
    );
    updateDraft(updatedUser.id, {
      email: updatedUser.email ?? "",
      roles: [...updatedUser.roles] as RoleOption[]
    });
    setMessages((current) => ({
      ...current,
      [userId]: "Account access updated."
    }));
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
      <article className="rounded-[1.75rem] border border-black/10 bg-white/85 p-6 shadow-[0_20px_50px_rgba(16,24,40,0.08)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-stone-500">
              User access
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-stone-950">
              Account directory
            </h2>
          </div>
          <span className="rounded-full bg-stone-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-stone-700">
            {directory.length} users
          </span>
        </div>

        <label className="mt-6 block space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
            Search accounts
          </span>
          <input
            className="w-full rounded-2xl border border-black/10 bg-stone-50 px-4 py-3 text-sm text-stone-950 outline-none transition focus:border-sky-500/60 focus:bg-white"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Filter by name, email, phone, or seller slug"
            value={search}
          />
        </label>

        <div className="mt-6 space-y-5">
          {filteredUsers.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-black/10 bg-stone-50/85 px-5 py-6 text-sm text-stone-600">
              No users matched your search.
            </div>
          ) : (
            filteredUsers.map((user) => {
              const draft = drafts[user.id] ?? {
                email: user.email ?? "",
                roles: [...user.roles] as RoleOption[]
              };
              const sellerRoleDisabled =
                !user.sellerProfile && !draft.roles.includes("SELLER");

              return (
                <section
                  key={user.id}
                  className="rounded-[1.5rem] border border-black/10 bg-stone-50/85 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold text-stone-950">{user.fullName}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.22em] text-stone-500">
                        {user.id}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {user.roles.map((role) => (
                        <span
                          key={`${user.id}-${role}`}
                          className="rounded-full bg-stone-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-stone-50"
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-stone-700">
                      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
                        Last login
                      </p>
                      <p className="mt-2 text-stone-950">{formatTimestamp(user.lastLoginAt)}</p>
                      <p className="mt-2 text-xs uppercase tracking-[0.22em] text-stone-500">
                        Created {formatTimestamp(user.createdAt)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-stone-700">
                      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
                        Seller profile
                      </p>
                      {user.sellerProfile ? (
                        <>
                          <p className="mt-2 text-stone-950">{user.sellerProfile.displayName}</p>
                          <p className="text-xs uppercase tracking-[0.22em] text-stone-500">
                            {user.sellerProfile.slug} •{" "}
                            {formatKycStatus(user.sellerProfile.kycStatus)}
                          </p>
                        </>
                      ) : (
                        <p className="mt-2 text-stone-600">No seller profile linked.</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
                    <label className="grid gap-2 text-sm text-stone-700">
                      Email address
                      <input
                        className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-stone-950 outline-none transition focus:border-sky-500/60"
                        onChange={(event) =>
                          updateDraft(user.id, {
                            ...draft,
                            email: event.target.value
                          })
                        }
                        value={draft.email}
                      />
                    </label>
                    <div className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-stone-700">
                      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
                        Phone
                      </p>
                      <p className="mt-2 text-stone-950">{user.phone ?? "No phone on file"}</p>
                    </div>
                  </div>

                  <fieldset className="mt-5 grid gap-3">
                    <legend className="text-sm font-medium text-stone-800">Role access</legend>
                    <div className="flex flex-wrap gap-3">
                      {ROLE_OPTIONS.map((role) => {
                        const checked = draft.roles.includes(role);
                        const disabled = role === "SELLER" && sellerRoleDisabled;

                        return (
                          <label
                            key={`${user.id}-draft-${role}`}
                            className={[
                              "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition",
                              checked
                                ? "border-stone-950 bg-stone-950 text-stone-50"
                                : "border-black/10 bg-white text-stone-700",
                              disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
                            ].join(" ")}
                          >
                            <input
                              checked={checked}
                              disabled={disabled}
                              onChange={(event) => {
                                updateDraft(user.id, {
                                  ...draft,
                                  roles: event.target.checked
                                    ? [...draft.roles, role]
                                    : draft.roles.filter((value) => value !== role)
                                });
                              }}
                              type="checkbox"
                            />
                            {role}
                          </label>
                        );
                      })}
                    </div>
                    {sellerRoleDisabled ? (
                      <p className="text-xs text-stone-500">
                        Seller access can only be granted after a seller profile exists.
                      </p>
                    ) : null}
                  </fieldset>

                  {messages[user.id] ? (
                    <p className="mt-3 text-sm font-medium text-emerald-700">{messages[user.id]}</p>
                  ) : null}

                  <div className="mt-4">
                    <button
                      className="rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-stone-50 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={
                        isPending || draft.email.trim().length === 0 || draft.roles.length === 0
                      }
                      onClick={() =>
                        startTransition(async () => {
                          try {
                            await saveUser(user.id);
                          } catch (error) {
                            setMessages((current) => ({
                              ...current,
                              [user.id]:
                                error instanceof Error
                                  ? error.message
                                  : "Unable to update account access."
                            }));
                          }
                        })
                      }
                      type="button"
                    >
                      Save access
                    </button>
                  </div>
                </section>
              );
            })
          )}
        </div>
      </article>

      <article className="rounded-[1.75rem] border border-black/10 bg-white/85 p-6 shadow-[0_20px_50px_rgba(16,24,40,0.08)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-stone-500">
              OTP observability
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-stone-950">
              Abuse signals
            </h2>
          </div>
          <span
            className={[
              "rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em]",
              alertPalette(overview.alertLevel)
            ].join(" ")}
          >
            {overview.alertLevel}
          </span>
        </div>

        <p
          className={[
            "mt-5 rounded-3xl border px-4 py-4 text-sm leading-7",
            alertPalette(overview.alertLevel)
          ].join(" ")}
        >
          {overview.alertMessage}
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-black/10 bg-stone-50/85 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
              OTP sent, last hour
            </p>
            <p className="mt-2 text-2xl font-semibold text-stone-950">{overview.sentLastHour}</p>
          </div>
          <div className="rounded-2xl border border-black/10 bg-stone-50/85 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
              OTP sent, last day
            </p>
            <p className="mt-2 text-2xl font-semibold text-stone-950">{overview.sentLastDay}</p>
          </div>
          <div className="rounded-2xl border border-black/10 bg-stone-50/85 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
              Active challenges
            </p>
            <p className="mt-2 text-2xl font-semibold text-stone-950">
              {overview.unresolvedChallenges}
            </p>
          </div>
          <div className="rounded-2xl border border-black/10 bg-stone-50/85 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
              Limited buckets
            </p>
            <p className="mt-2 text-2xl font-semibold text-stone-950">
              {overview.blockedBuckets.length}
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
              Hottest OTP buckets
            </p>
            <div className="mt-3 space-y-3">
              {overview.topBuckets.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-black/10 bg-stone-50/85 px-4 py-5 text-sm text-stone-600">
                  No active OTP buckets have been recorded recently.
                </div>
              ) : (
                overview.topBuckets.map((bucket) => (
                  <div
                    key={bucket.id}
                    className="rounded-3xl border border-black/10 bg-stone-50/85 px-4 py-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-stone-950">
                          {bucket.phase} • {bucket.scope}
                        </p>
                        <p className="mt-1 break-all text-sm text-stone-700">{bucket.target}</p>
                      </div>
                      <div className="text-right text-sm text-stone-700">
                        <p className="font-semibold text-stone-950">
                          {bucket.hits}/{bucket.limit}
                        </p>
                        <p>{formatTimestamp(bucket.lastSeenAt)}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
              Recent OTP challenges
            </p>
            <div className="mt-3 space-y-3">
              {overview.recentChallenges.map((challenge) => (
                <div
                  key={`${challenge.identifier}-${challenge.lastSentAt}`}
                  className="rounded-3xl border border-black/10 bg-stone-50/85 px-4 py-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="break-all text-sm font-semibold text-stone-950">
                        {challenge.identifier}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.22em] text-stone-500">
                        {challenge.channel} • attempts {challenge.attempts}
                        {challenge.locked ? " • locked" : ""}
                      </p>
                    </div>
                    <div className="text-right text-xs text-stone-500">
                      <p>Sent {formatTimestamp(challenge.lastSentAt)}</p>
                      <p>
                        {challenge.consumedAt
                          ? `Used ${formatTimestamp(challenge.consumedAt)}`
                          : `Expires ${formatTimestamp(challenge.expiresAt)}`}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
