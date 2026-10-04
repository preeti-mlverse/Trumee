import { Check, MessageCircle, Package, Truck } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EventOnMount } from "@/components/store/list-tracker";
import { Container } from "@/components/store/ui";
import { getOrderByToken } from "@/lib/orders";
import { getSettings } from "@/lib/settings";
import { cn, formatDate, inr } from "@/lib/utils";

export const metadata: Metadata = { title: "Your order", robots: { index: false, follow: false } };

export default async function OrderStatusPage({ params, searchParams }: PageProps<"/orders/[token]">) {
  const { token } = await params;
  const isNew = (await searchParams).new === "1";
  const [o, store] = await Promise.all([getOrderByToken(token), getSettings("store")]);
  if (!o) notFound();

  const shipped = o.fulfillments.length > 0;
  const delivered = o.fulfillments.some((f) => f.status === "delivered");
  const confirmed = o.paymentMethod === "cod" || o.financialStatus === "paid";
  const steps = [
    { label: "Order placed", done: true, at: o.createdAt },
    { label: o.paymentMethod === "cod" ? "Confirmed (pay on delivery)" : "Payment received", done: confirmed, at: o.paidAt },
    { label: "Shipped", done: shipped, at: o.fulfillments[0]?.createdAt },
    { label: "Delivered", done: delivered, at: o.fulfillments.find((f) => f.deliveredAt)?.deliveredAt },
  ];
  const tracking = o.fulfillments.find((f) => f.trackingNumber);

  return (
    <Container className="pt-12 sm:pt-16 max-w-4xl">
      {isNew && confirmed && (
        <EventOnMount
          name="purchase"
          thirdPartyOnly
          params={{
            transaction_id: String(o.number),
            value: o.total / 100,
            shipping: o.shippingTotal / 100,
            tax: o.taxTotal / 100,
            coupon: o.discountCode ?? undefined,
            items: o.items.map((i) => ({ item_id: i.productId ?? i.id, item_name: i.title, item_variant: i.variantTitle ?? undefined, price: i.price / 100, quantity: i.quantity })),
          }}
        />
      )}
      <p className="text-[11px] tracking-[0.3em] uppercase text-plum">Order #{o.number}</p>
      <h1 className="font-display text-5xl sm:text-6xl mt-3 leading-[1]">
        {o.status === "cancelled" ? "This order was cancelled" : isNew ? `Thank you, ${o.shippingAddress.name.split(" ")[0]}!` : "Your order"}
      </h1>
      {isNew && o.status !== "cancelled" && (
        <p className="text-ink-soft mt-4 max-w-xl">
          We’ve emailed a confirmation to <strong>{o.email}</strong>. Your pieces are being packed with care — we’ll send tracking details as soon as they ship.
        </p>
      )}
      {!confirmed && o.status !== "cancelled" && (
        <p className="mt-4 text-sm bg-marigold/15 border border-marigold/50 px-4 py-3">
          We haven’t received the payment for this order yet. If money was deducted, it will be confirmed automatically within a few minutes.
        </p>
      )}

      {o.status !== "cancelled" && (
        <ol className="mt-12 grid grid-cols-4 gap-2">
          {steps.map((s, i) => (
            <li key={s.label} className="relative">
              <div className={cn("h-[3px]", s.done ? "bg-ink" : "bg-line")} />
              <span className={cn("mt-3 size-7 rounded-full grid place-items-center text-xs", s.done ? "bg-ink text-cream" : "bg-sand text-muted")}>
                {s.done ? <Check className="size-3.5" /> : i + 1}
              </span>
              <p className={cn("mt-2 text-xs sm:text-sm", !s.done && "text-muted")}>{s.label}</p>
              {s.done && s.at && <p className="text-[11px] text-muted">{formatDate(s.at)}</p>}
            </li>
          ))}
        </ol>
      )}

      {tracking && (
        <div className="mt-10 flex flex-wrap items-center gap-4 rounded-3xl bg-[#fffdf8]/80 border border-line/70 p-5">
          <Truck className="size-5" strokeWidth={1.5} />
          <p className="text-sm flex-1">
            Shipped{tracking.carrier ? ` with ${tracking.carrier}` : ""} · Tracking <strong>{tracking.trackingNumber}</strong>
            {o.shippingMeta?.status && (
              <span className="block text-xs text-muted mt-1">
                Latest: {o.shippingMeta.status.toLowerCase()}
                {o.shippingMeta.etd && !delivered ? ` · expected by ${o.shippingMeta.etd.slice(0, 10)}` : ""}
              </span>
            )}
          </p>
          {tracking.trackingUrl && (
            <a href={tracking.trackingUrl} target="_blank" rel="noopener" className="rounded-full bg-ink text-cream px-5 py-2.5 text-[11px] tracking-[0.2em] uppercase">
              Track package
            </a>
          )}
        </div>
      )}

      <div className="mt-12 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_300px] gap-10">
        <div>
          <h2 className="font-display text-2xl mb-4">Items</h2>
          <ul className="divide-y divide-line border-y border-line">
            {o.items.map((i) => (
              <li key={i.id} className="flex gap-4 py-4">
                <div className="relative w-16 aspect-[2/3] bg-sand shrink-0">{i.imageUrl && <Image src={i.imageUrl} alt="" fill sizes="64px" className="object-cover" />}</div>
                <div className="flex-1 text-sm">
                  <p>{i.title}</p>
                  <p className="text-xs text-muted mt-0.5">
                    {i.variantTitle} · Qty {i.quantity}
                  </p>
                </div>
                <p className="text-sm tabular-nums">{inr(i.price * i.quantity)}</p>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-1.5 text-sm max-w-xs ml-auto">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{inr(o.subtotal)}</dd></div>
            {o.discountTotal > 0 && <div className="flex justify-between text-sage"><dt>Discount ({o.discountCode})</dt><dd>−{inr(o.discountTotal)}</dd></div>}
            {o.prepaidDiscount > 0 && <div className="flex justify-between text-sage"><dt>Prepaid discount</dt><dd>−{inr(o.prepaidDiscount)}</dd></div>}
            <div className="flex justify-between"><dt>Shipping</dt><dd>{o.shippingTotal ? inr(o.shippingTotal) : "Free"}</dd></div>
            {o.codFee > 0 && <div className="flex justify-between"><dt>COD fee</dt><dd>{inr(o.codFee)}</dd></div>}
            <div className="flex justify-between font-medium text-base border-t border-line pt-2"><dt>Total</dt><dd>{inr(o.total)}</dd></div>
            <p className="text-[11px] text-muted text-right">Includes {inr(o.taxTotal)} GST</p>
          </dl>
        </div>
        <aside className="space-y-6 text-sm">
          <div>
            <p className="text-[11px] tracking-[0.2em] uppercase text-muted mb-2">Delivering to</p>
            <p>{o.shippingAddress.name}</p>
            <p className="text-ink-soft">
              {o.shippingAddress.line1}
              {o.shippingAddress.line2 ? `, ${o.shippingAddress.line2}` : ""}
              <br />
              {o.shippingAddress.city}, {o.shippingAddress.state} {o.shippingAddress.pincode}
            </p>
          </div>
          <div>
            <p className="text-[11px] tracking-[0.2em] uppercase text-muted mb-2">Payment</p>
            <p>{o.paymentMethod === "cod" ? "Cash on delivery" : "Paid online"}</p>
          </div>
          <div className="bg-sand p-5 space-y-3">
            <p className="flex items-center gap-2 font-medium"><Package className="size-4" strokeWidth={1.5} /> Need help with this order?</p>
            <a href={`https://wa.me/${store.whatsapp}?text=${encodeURIComponent(`Hi Trumee, about order #${o.number}`)}`} target="_blank" rel="noopener" className="flex items-center gap-2 underline">
              <MessageCircle className="size-4" strokeWidth={1.5} /> WhatsApp us
            </a>
            <Link href="/pages/returns-policy" className="block underline">Returns & exchanges</Link>
          </div>
        </aside>
      </div>
      <Link href="/collections/all" className="inline-block mt-14 border border-ink px-7 py-3.5 text-[11px] tracking-[0.22em] uppercase hover:bg-ink hover:text-cream">
        Continue shopping
      </Link>
    </Container>
  );
}
