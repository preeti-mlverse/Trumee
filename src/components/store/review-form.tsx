"use client";

import { Star } from "lucide-react";
import { useActionState, useState } from "react";
import { submitReview } from "@/app/actions/reviews";
import { cn } from "@/lib/utils";

export function ReviewForm({ productId }: { productId: number }) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [state, action, pending] = useActionState(submitReview, null);

  if (state?.ok) return <p className="text-sm text-sage py-4">{state.message}</p>;
  if (!open)
    return (
      <button onClick={() => setOpen(true)} className="rounded-full border border-ink px-6 py-3 text-xs tracking-[0.18em] uppercase hover:bg-ink hover:text-cream">
        Write a review
      </button>
    );

  const input = "w-full rounded-xl border border-line bg-[#fffdf8] px-4 py-3 text-sm outline-none focus:border-ink";
  return (
    <form action={action} className="max-w-xl space-y-4 rounded-3xl bg-[#fffdf8]/70 p-6">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="rating" value={rating} />
      <div className="flex gap-1" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button type="button" key={n} onClick={() => setRating(n)} aria-label={`${n} star${n > 1 ? "s" : ""}`} role="radio" aria-checked={rating === n}>
            <Star className={cn("size-6", n <= rating ? "fill-plum text-plum" : "text-muted")} strokeWidth={1.3} />
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input name="name" placeholder="Name" required className={input} />
        <input name="email" type="email" placeholder="Email (not published)" required className={input} />
      </div>
      <input name="title" placeholder="Headline (optional)" className={input} />
      <textarea name="body" rows={4} placeholder="How was the fit, fabric and feel?" required className={input} />
      {state && !state.ok && <p className="text-sm text-sale">{state.message}</p>}
      <button disabled={pending} className="rounded-full bg-ink text-cream px-7 py-3 text-xs tracking-[0.18em] uppercase disabled:opacity-50">
        {pending ? "Sending…" : "Submit review"}
      </button>
    </form>
  );
}
