"use client";

import type {
  SellerCatalogData,
  SellerDashboardData,
  SellerShippingQueueData
} from "@khmercart/db";
import { formatKycStatus } from "@khmercart/core";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ProductCatalog } from "./product-catalog";
import { ShippingDesk } from "./shipping-desk";

type SellerStudioProps = {
  initialCatalog: SellerCatalogData;
  initialData: SellerDashboardData;
  initialShipping: SellerShippingQueueData;
};

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { message?: string };

    return payload.message ?? `Request failed with status ${response.status}.`;
  } catch {
    return `Request failed with status ${response.status}.`;
  }
}

export function SellerStudio({
  initialCatalog,
  initialData,
  initialShipping
}: SellerStudioProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [selectedDocumentType, setSelectedDocumentType] = useState(
    initialData.kycDocumentTypes[0] ?? "GOVERNMENT_ID"
  );
  const [profile, setProfile] = useState(initialData.seller);

  async function submitOnboarding(submitForReview: boolean) {
    setProfileMessage(null);

    const response = await fetch("/api/onboarding", {
      body: JSON.stringify({
        ...profile,
        submitForReview
      }),
      headers: {
        "content-type": "application/json"
      },
      method: "POST"
    });

    if (!response.ok) {
      throw new Error(await readErrorMessage(response));
    }

    setProfileMessage(
      submitForReview ? "Seller onboarding submitted for admin review." : "Seller profile saved."
    );
    router.refresh();
  }

  async function handleUpload(file: File) {
    setUploadMessage(null);

    const requestResponse = await fetch("/api/kyc/upload-url", {
      body: JSON.stringify({
        contentType: file.type,
        documentType: selectedDocumentType,
        fileName: file.name,
        sizeBytes: file.size
      }),
      headers: {
        "content-type": "application/json"
      },
      method: "POST"
    });

    if (!requestResponse.ok) {
      throw new Error(await readErrorMessage(requestResponse));
    }

    const payload = (await requestResponse.json()) as {
      documentId: string;
      uploadUrl: string;
    };
    const uploadResponse = await fetch(payload.uploadUrl, {
      body: file,
      headers: {
        "content-type": file.type
      },
      method: "PUT"
    });

    if (!uploadResponse.ok) {
      throw new Error("The signed upload URL was created, but the object upload failed.");
    }

    const completeResponse = await fetch("/api/kyc/complete-upload", {
      body: JSON.stringify({
        documentId: payload.documentId
      }),
      headers: {
        "content-type": "application/json"
      },
      method: "POST"
    });

    if (!completeResponse.ok) {
      throw new Error(await readErrorMessage(completeResponse));
    }

    setUploadMessage(`${file.name} uploaded and attached to the seller KYC profile.`);
    router.refresh();
  }

  return (
    <div className="grid gap-6">
      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <article className="rounded-[1.75rem] border border-emerald-500/20 bg-white/85 p-6 shadow-[0_20px_50px_rgba(16,24,40,0.08)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-700">
                Seller status
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-stone-950">
                {formatKycStatus(profile.kycStatus)}
              </h2>
            </div>
            <span
              className={[
                "rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em]",
                initialData.canListProducts
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-800"
              ].join(" ")}
            >
              {initialData.canListProducts ? "Listings unlocked" : "Listings locked"}
            </span>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-black/10 bg-stone-50/85 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
                Seller slug
              </p>
              <p className="mt-2 font-mono text-sm text-stone-900">{profile.slug}</p>
            </div>
            <div className="rounded-2xl border border-black/10 bg-stone-50/85 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
                Missing before review
              </p>
              <p className="mt-2 text-sm text-stone-900">{initialData.missingRequirements.length}</p>
            </div>
          </div>

          <div className="mt-6 rounded-3xl border border-amber-500/20 bg-amber-50/70 p-5">
            <p className="text-sm font-semibold text-amber-900">Approval checklist</p>
            <ul className="mt-3 space-y-2 text-sm text-amber-950">
              {initialData.missingRequirements.length === 0 ? (
                <li>Profile, payout details, and at least one KYC document are in place.</li>
              ) : (
                initialData.missingRequirements.map((item) => <li key={item}>• {item}</li>)
              )}
            </ul>
          </div>

          {profile.kycNotes ? (
            <div className="mt-6 rounded-3xl border border-sky-500/20 bg-sky-50/70 p-5 text-sm text-sky-950">
              <p className="font-semibold">Admin notes</p>
              <p className="mt-2 leading-6">{profile.kycNotes}</p>
            </div>
          ) : null}
        </article>

        <article className="rounded-[1.75rem] border border-black/10 bg-white/85 p-6 shadow-[0_20px_50px_rgba(16,24,40,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-stone-500">
            Live documents
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-stone-950">
            KYC evidence
          </h2>

          <div className="mt-6 space-y-3">
            {initialData.documents.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-black/10 bg-stone-50/85 px-4 py-5 text-sm text-stone-600">
                No KYC documents uploaded yet.
              </div>
            ) : (
              initialData.documents.map((document) => (
                <div
                  key={document.id}
                  className="rounded-3xl border border-black/10 bg-stone-50/85 px-4 py-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-stone-900">{document.type}</p>
                      <p className="text-xs uppercase tracking-[0.22em] text-stone-500">
                        {document.fileName}
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-800">
                      {document.uploadedAt ? "Uploaded" : "Awaiting upload"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-[1.75rem] border border-black/10 bg-white/85 p-6 shadow-[0_20px_50px_rgba(16,24,40,0.08)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-stone-500">
                Onboarding
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-stone-950">
                Profile and payout bank
              </h2>
            </div>
            {profileMessage ? (
              <p className="text-sm font-medium text-emerald-700">{profileMessage}</p>
            ) : null}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm text-stone-700">
              Display name
              <input
                className="rounded-2xl border border-black/10 bg-stone-50 px-4 py-3 text-stone-950 outline-none transition focus:border-emerald-500/60"
                value={profile.displayName}
                onChange={(event) =>
                  setProfile((current) => ({ ...current, displayName: event.target.value }))
                }
              />
            </label>
            <label className="grid gap-2 text-sm text-stone-700">
              Store slug
              <input
                className="rounded-2xl border border-black/10 bg-stone-50 px-4 py-3 font-mono text-stone-950 outline-none transition focus:border-emerald-500/60"
                value={profile.slug}
                onChange={(event) =>
                  setProfile((current) => ({ ...current, slug: event.target.value }))
                }
              />
            </label>
            <label className="grid gap-2 text-sm text-stone-700">
              Legal name
              <input
                className="rounded-2xl border border-black/10 bg-stone-50 px-4 py-3 text-stone-950 outline-none transition focus:border-emerald-500/60"
                value={profile.legalName}
                onChange={(event) =>
                  setProfile((current) => ({ ...current, legalName: event.target.value }))
                }
              />
            </label>
            <label className="grid gap-2 text-sm text-stone-700">
              Settlement currency
              <select
                className="rounded-2xl border border-black/10 bg-stone-50 px-4 py-3 text-stone-950 outline-none transition focus:border-emerald-500/60"
                value={profile.defaultCurrency}
                onChange={(event) =>
                    setProfile((current) => ({
                      ...current,
                      defaultCurrency: event.target.value as "KHR" | "USD"
                    }))
                }
              >
                <option value="KHR">KHR</option>
                <option value="USD">USD</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm text-stone-700">
              Support email
              <input
                className="rounded-2xl border border-black/10 bg-stone-50 px-4 py-3 text-stone-950 outline-none transition focus:border-emerald-500/60"
                value={profile.supportEmail}
                onChange={(event) =>
                  setProfile((current) => ({ ...current, supportEmail: event.target.value }))
                }
              />
            </label>
            <label className="grid gap-2 text-sm text-stone-700">
              Support phone
              <input
                className="rounded-2xl border border-black/10 bg-stone-50 px-4 py-3 text-stone-950 outline-none transition focus:border-emerald-500/60"
                value={profile.supportPhone}
                onChange={(event) =>
                  setProfile((current) => ({ ...current, supportPhone: event.target.value }))
                }
              />
            </label>
            <label className="grid gap-2 text-sm text-stone-700 md:col-span-2">
              Business description
              <textarea
                className="min-h-28 rounded-2xl border border-black/10 bg-stone-50 px-4 py-3 text-stone-950 outline-none transition focus:border-emerald-500/60"
                value={profile.businessDescription}
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    businessDescription: event.target.value
                  }))
                }
              />
            </label>
          </div>

          <div className="mt-8 grid gap-4 rounded-[1.5rem] border border-black/10 bg-stone-50/80 p-5 md:grid-cols-2">
            <label className="grid gap-2 text-sm text-stone-700">
              Payout bank
              <input
                className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-stone-950 outline-none transition focus:border-emerald-500/60"
                value={profile.payoutBankName}
                onChange={(event) =>
                  setProfile((current) => ({ ...current, payoutBankName: event.target.value }))
                }
              />
            </label>
            <label className="grid gap-2 text-sm text-stone-700">
              Account holder
              <input
                className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-stone-950 outline-none transition focus:border-emerald-500/60"
                value={profile.payoutAccountName}
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    payoutAccountName: event.target.value
                  }))
                }
              />
            </label>
            <label className="grid gap-2 text-sm text-stone-700">
              Account number
              <input
                className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-stone-950 outline-none transition focus:border-emerald-500/60"
                value={profile.payoutAccountNumber}
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    payoutAccountNumber: event.target.value
                  }))
                }
              />
            </label>
            <label className="grid gap-2 text-sm text-stone-700">
              Routing or bank reference
              <input
                className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-stone-950 outline-none transition focus:border-emerald-500/60"
                value={profile.payoutRoutingNumber}
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    payoutRoutingNumber: event.target.value
                  }))
                }
              />
            </label>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              className="rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-stone-50 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  try {
                    await submitOnboarding(false);
                  } catch (error) {
                    setProfileMessage(error instanceof Error ? error.message : "Unable to save seller profile.");
                  }
                })
              }
              type="button"
            >
              Save draft
            </button>
            <button
              className="rounded-full border border-emerald-600/30 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-900 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  try {
                    await submitOnboarding(true);
                  } catch (error) {
                    setProfileMessage(
                      error instanceof Error ? error.message : "Unable to submit seller onboarding."
                    );
                  }
                })
              }
              type="button"
            >
              Submit for review
            </button>
          </div>
        </article>

        <div className="grid gap-6">
          <ShippingDesk initialShipping={initialShipping} />

          <article className="rounded-[1.75rem] border border-black/10 bg-white/85 p-6 shadow-[0_20px_50px_rgba(16,24,40,0.08)]">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-stone-500">
                  Uploads
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-stone-950">
                  Signed KYC uploads
                </h2>
              </div>
              {uploadMessage ? <p className="text-sm font-medium text-emerald-700">{uploadMessage}</p> : null}
            </div>

            <div className="mt-6 grid gap-4">
              <label className="grid gap-2 text-sm text-stone-700">
                Document type
                <select
                  className="rounded-2xl border border-black/10 bg-stone-50 px-4 py-3 text-stone-950 outline-none transition focus:border-emerald-500/60"
                  value={selectedDocumentType}
                  onChange={(event) => setSelectedDocumentType(event.target.value)}
                >
                  {initialData.kycDocumentTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm text-stone-700">
                Upload file
                <input
                  className="rounded-2xl border border-dashed border-black/15 bg-stone-50 px-4 py-4 text-sm text-stone-700"
                  onChange={(event) => {
                    const file = event.target.files?.[0];

                    if (!file) {
                      return;
                    }

                    startTransition(async () => {
                      try {
                        await handleUpload(file);
                        event.target.value = "";
                      } catch (error) {
                        setUploadMessage(
                          error instanceof Error ? error.message : "Unable to upload the selected file."
                        );
                      }
                    });
                  }}
                  type="file"
                />
              </label>
            </div>
          </article>

          <ProductCatalog
            canListProducts={initialData.canListProducts}
            defaultCurrency={initialData.seller.defaultCurrency}
            initialCatalog={initialCatalog}
          />
        </div>
      </section>
    </div>
  );
}
