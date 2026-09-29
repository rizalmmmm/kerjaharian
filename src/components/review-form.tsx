"use client";

import { useActionState, useState } from "react";
import { submitReview, type FormState } from "@/lib/actions";

const LABELS = ["", "Buruk", "Kurang", "Cukup", "Baik", "Sangat baik"];

export function ReviewForm({ dealId, otherName }: { dealId: number; otherName: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(submitReview, undefined);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const shown = hover || rating;

  if (state?.ok) return <p className="rounded-lg bg-brand-50 p-3 text-sm text-brand-700">{state.ok}</p>;

  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="deal_id" value={dealId} />
      <input type="hidden" name="rating" value={rating || ""} />
      <div>
        <p className="label">Bagaimana pengalaman Anda dengan {otherName}?</p>
        <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              aria-label={`${n} bintang`}
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              className={`text-3xl leading-none transition ${n <= shown ? "text-amber-400" : "text-slate-300"}`}
            >
              ★
            </button>
          ))}
          <span className="ml-2 text-sm text-slate-600">{LABELS[shown]}</span>
        </div>
      </div>
      <textarea
        name="comment"
        rows={3}
        maxLength={500}
        className="input"
        placeholder="Ceritakan pengalaman Anda (opsional)"
        aria-label="Komentar ulasan"
      />
      {state?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      <button className="btn-primary" disabled={pending || rating === 0}>
        {pending ? "Mengirim…" : "Kirim ulasan"}
      </button>
    </form>
  );
}
