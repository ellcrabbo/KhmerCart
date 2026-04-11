"use client";

import type { VideoPostModerationQueueEntry } from "@khmercart/db";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { readErrorMessage } from "./client-helpers";

type VideoPostModerationQueueProps = {
  queue: VideoPostModerationQueueEntry[];
};

export function VideoPostModerationQueue({ queue }: VideoPostModerationQueueProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [messages, setMessages] = useState<Record<string, string>>({});

  async function submitDecision(videoPostId: string, decision: "APPROVE" | "REJECT" | "HIDE") {
    const response = await fetch(`/api/video-posts/${videoPostId}/decision`, {
      body: JSON.stringify({
        decision,
        note: notes[videoPostId] ?? ""
      }),
      headers: {
        "content-type": "application/json"
      },
      method: "POST"
    });

    if (!response.ok) {
      throw new Error(await readErrorMessage(response));
    }

    setMessages((current) => ({
      ...current,
      [videoPostId]:
        decision === "APPROVE"
          ? "Video post approved."
          : decision === "HIDE"
            ? "Video post hidden."
            : "Video post rejected."
    }));
    router.refresh();
  }

  return (
    <article className="rounded-[1.75rem] border border-black/10 bg-white/85 p-6 shadow-[0_20px_50px_rgba(16,24,40,0.08)]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-stone-500">
            Post moderation
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-stone-950">
            Shoppable video decisions
          </h2>
        </div>
        <span className="rounded-full bg-sky-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-sky-800">
          {queue.length} open
        </span>
      </div>

      <div className="mt-6 space-y-5">
        {queue.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-black/10 bg-stone-50/85 px-5 py-6 text-sm text-stone-600">
            No video posts currently waiting on moderation.
          </div>
        ) : (
          queue.map((post) => (
            <section key={post.id} className="rounded-[1.5rem] border border-black/10 bg-stone-50/85 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-lg font-semibold text-stone-950">{post.product.name}</p>
                  <p className="text-xs uppercase tracking-[0.22em] text-stone-500">
                    {post.seller.displayName} • {post.seller.slug}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-stone-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-stone-50">
                    {post.status}
                  </span>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-amber-800">
                    {post.moderationStatus}
                  </span>
                </div>
              </div>

              <p className="mt-4 text-sm leading-7 text-stone-700">{post.caption}</p>

              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-stone-700">
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">Impressions</p>
                  <p className="mt-2 font-medium text-stone-950">{post.impressions}</p>
                </div>
                <div className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-stone-700">
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">Add to carts</p>
                  <p className="mt-2 font-medium text-stone-950">{post.addToCarts}</p>
                </div>
                <div className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-stone-700">
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">Updated</p>
                  <p className="mt-2 font-medium text-stone-950">{new Date(post.updatedAt).toLocaleString()}</p>
                </div>
              </div>

              <label className="mt-5 grid gap-2 text-sm text-stone-700">
                Moderation note
                <textarea
                  className="min-h-24 rounded-2xl border border-black/10 bg-white px-4 py-3 text-stone-950 outline-none transition focus:border-sky-500/60"
                  value={notes[post.id] ?? post.moderationNotes}
                  onChange={(event) =>
                    setNotes((current) => ({
                      ...current,
                      [post.id]: event.target.value
                    }))
                  }
                />
              </label>

              {messages[post.id] ? (
                <p className="mt-3 text-sm font-medium text-emerald-700">{messages[post.id]}</p>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-3">
                {(["APPROVE", "REJECT", "HIDE"] as const).map((decision) => (
                  <button
                    key={decision}
                    className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-stone-900 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        try {
                          await submitDecision(post.id, decision);
                        } catch (error) {
                          setMessages((current) => ({
                            ...current,
                            [post.id]:
                              error instanceof Error ? error.message : "Unable to update video post moderation."
                          }));
                        }
                      })
                    }
                    type="button"
                  >
                    {decision === "APPROVE"
                      ? "Approve post"
                      : decision === "HIDE"
                        ? "Hide post"
                        : "Reject post"}
                  </button>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </article>
  );
}
