"use client";

import type {
  SellerCatalogData,
  SellerDashboardData,
  SellerShippingQueueData
} from "@khmercart/db";
import { formatKycStatus } from "@khmercart/core";
import { useMemo, useState, useTransition } from "react";
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
  const [analyticsRange, setAnalyticsRange] = useState<7 | 30>(7);
  const [selectedDocumentType, setSelectedDocumentType] = useState(
    initialData.kycDocumentTypes[0] ?? "GOVERNMENT_ID"
  );
  const [profile, setProfile] = useState(initialData.seller);
  const filteredAnalytics = useMemo(() => {
    const daily = initialData.analytics.daily.slice(-analyticsRange);

    return daily.reduce(
      (summary, day) => ({
        addToCarts: summary.addToCarts + day.addToCarts,
        conversions: summary.conversions + day.conversions,
        impressions: summary.impressions + day.impressions,
        productOpens: summary.productOpens + day.productOpens,
        viewerOpens: summary.viewerOpens + day.viewerOpens
      }),
      {
        addToCarts: 0,
        conversions: 0,
        impressions: 0,
        productOpens: 0,
        viewerOpens: 0
      }
    );
  }, [analyticsRange, initialData.analytics.daily]);
  const viewerOpenRate =
    filteredAnalytics.impressions > 0
      ? (filteredAnalytics.viewerOpens / filteredAnalytics.impressions) * 100
      : 0;
  const conversionRate =
    filteredAnalytics.impressions > 0
      ? (filteredAnalytics.conversions / filteredAnalytics.impressions) * 100
      : 0;
  const dateRangeLabel = analyticsRange === 7 ? "Last 7 days" : "Last 30 days";

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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-stone-500">
                Performance
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-stone-950">
                Seller analytics
              </h2>
            </div>
            <div className="flex rounded-full border border-black/10 bg-stone-50 p-1">
              {[7, 30].map((range) => (
                <button
                  key={range}
                  className={[
                    "rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] transition",
                    analyticsRange === range
                      ? "bg-stone-950 text-stone-50"
                      : "text-stone-500 hover:text-stone-900"
                  ].join(" ")}
                  onClick={() => setAnalyticsRange(range as 7 | 30)}
                  type="button"
                >
                  {range}d
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-black/10 bg-stone-50/85 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
                {dateRangeLabel} impressions
              </p>
              <p className="mt-2 text-2xl font-semibold text-stone-950">
                {filteredAnalytics.impressions}
              </p>
            </div>
            <div className="rounded-2xl border border-black/10 bg-stone-50/85 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
                Viewer open rate
              </p>
              <p className="mt-2 text-2xl font-semibold text-stone-950">
                {viewerOpenRate.toFixed(1)}%
              </p>
            </div>
            <div className="rounded-2xl border border-black/10 bg-stone-50/85 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
                Adds to cart
              </p>
              <p className="mt-2 text-2xl font-semibold text-stone-950">
                {filteredAnalytics.addToCarts}
              </p>
            </div>
            <div className="rounded-2xl border border-black/10 bg-stone-50/85 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
                Conversion rate
              </p>
              <p className="mt-2 text-2xl font-semibold text-stone-950">
                {conversionRate.toFixed(1)}%
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-3xl border border-black/10 bg-stone-50/85 p-5">
            <p className="text-sm font-semibold text-stone-900">Daily trend</p>
            <div className="mt-4 flex items-end gap-2 overflow-x-auto pb-2">
              {initialData.analytics.daily.slice(-analyticsRange).map((day) => {
                const maxImpressions = Math.max(
                  1,
                  ...initialData.analytics.daily.slice(-analyticsRange).map((entry) => entry.impressions)
                );
                const height = Math.max(12, Math.round((day.impressions / maxImpressions) * 96));

                return (
                  <div key={day.date} className="flex min-w-10 flex-col items-center gap-2">
                    <div
                      className="w-7 rounded-full bg-emerald-500/80"
                      style={{ height }}
                      title={`${day.date}: ${day.impressions} impressions`}
                    />
                    <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-stone-500">
                      {day.date.slice(5)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 rounded-3xl border border-black/10 bg-stone-50/85 p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-stone-900">Top products</p>
              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">
                By orders
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {initialData.analytics.topProducts.length === 0 ? (
                <p className="text-sm text-stone-600">
                  No product performance data yet. Publish posts and drive the first buyer sessions.
                </p>
              ) : (
                initialData.analytics.topProducts.map((product) => (
                  <div
                    key={product.productId}
                    className="rounded-2xl border border-black/10 bg-white px-4 py-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-stone-950">{product.productName}</p>
                        <p className="text-xs uppercase tracking-[0.22em] text-stone-500">
                          {product.impressions} impressions
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-stone-950">
                          {product.conversions} orders
                        </p>
                        <p className="text-xs uppercase tracking-[0.22em] text-emerald-700">
                          {product.conversionRate.toFixed(1)}% conversion
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
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
