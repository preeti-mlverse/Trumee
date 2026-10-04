"use client";

import { BadgeCheck, CircleAlert, Loader2, MapPin, Percent, RotateCcw, Ruler, ShieldCheck, Truck, Wallet, X } from "lucide-react";
import { useEffect, useState } from "react";
import { checkDelivery } from "@/app/actions/checkout";
import { cn } from "@/lib/utils";

/** Pincode → delivery window + COD (live Shiprocket courier data when connected, else policy estimates). */
export function DeliveryChecker({ prepaidPercent = 0 }: { prepaidPercent?: number }) {
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Awaited<ReturnType<typeof checkDelivery>> | "invalid" | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("tm_pin");
      if (saved) setPin(saved);
    } catch {}
  }, []);

  const check = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!/^[1-9]\d{5}$/.test(pin)) return setRes("invalid");
    setBusy(true);
    const r = await checkDelivery(pin);
    setBusy(false);
    setRes(r ?? "invalid");
    try {
      if (r) localStorage.setItem("tm_pin", pin);
    } catch {}
  };

  return (
    <div className="rounded-3xl bg-[#fffdf8]/70 border border-line/70 p-5">
      <p className="flex items-center gap-2 text-sm font-medium">
        <MapPin className="size-4" strokeWidth={1.5} /> Check delivery date
      </p>
      <form onSubmit={check} className="mt-3 flex gap-2">
        <input
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric"
          placeholder="Enter pincode"
          aria-label="Pincode"
          className="flex-1 rounded-full border border-line bg-[#fffdf8] px-4 py-2.5 text-sm outline-none focus:border-ink tabular-nums"
        />
        <button disabled={busy} className="rounded-full bg-ink text-cream px-5 text-[12px] tracking-[0.12em] uppercase hover:bg-plum transition-colors disabled:opacity-50">
          {busy ? <Loader2 className="size-4 animate-spin" /> : "Check"}
        </button>
      </form>
      {res === "invalid" && <p className="text-xs text-sale mt-2">Please enter a valid 6-digit pincode.</p>}
      {res && res !== "invalid" && !res.serviceable && (
        <p className="mt-3 flex items-start gap-2 text-sm text-sale">
          <CircleAlert className="size-4 mt-0.5 shrink-0" strokeWidth={1.5} /> Our couriers don’t reach {res.place ?? "this pincode"} yet — WhatsApp us and we’ll try to help.
        </p>
      )}
      {res && res !== "invalid" && res.serviceable && (
        <ul className="mt-3 space-y-1.5 text-sm">
          <li className="flex items-start gap-2">
            <Truck className="size-4 mt-0.5 text-sage shrink-0" strokeWidth={1.5} />
            <span>
              {res.source === "live" ? "Get it by" : "Delivery by"} <strong>{res.from} – {res.to}</strong>
              {res.place ? ` to ${res.place}` : ""}
            </span>
          </li>
          <li className="flex items-center gap-2">
            <Wallet className={cn("size-4", res.codAvailable ? "text-sage" : "text-muted")} strokeWidth={1.5} />
            {res.codAvailable ? "Cash on delivery available" : "Cash on delivery isn’t available here — pay online"}
          </li>
          {prepaidPercent > 0 && (
            <li className="flex items-center gap-2">
              <Percent className="size-4 text-sage" strokeWidth={1.5} /> Extra {prepaidPercent}% off when you pay online
            </li>
          )}
          <li className="flex items-center gap-2">
            <RotateCcw className="size-4 text-sage" strokeWidth={1.5} /> 7-day easy returns & exchanges
          </li>
        </ul>
      )}
    </div>
  );
}

const SIZES = [
  ["XS", "32", "30–32", "23–24", "35–36", "14.5–15"],
  ["S", "34", "33–34", "25–26", "37–38", "15–15.5"],
  ["M", "36", "35–36", "27–28", "39–40", "15.5–16"],
  ["L", "38", "37–38", "29–30", "41–42", "16–16.5"],
  ["XL", "40", "39–40", "31–32", "43–44", "16.5–17"],
  ["2XL", "42", "41–42", "33–34", "45–46", "17–17.5"],
];

/** Size guide in a dialog (inches/cm), so shoppers never leave the product page. */
export function SizeGuideButton() {
  const [open, setOpen] = useState(false);
  const [cm, setCm] = useState(false);
  const conv = (v: string) => (cm ? v.split("–").map((x) => Math.round(parseFloat(x) * 2.54)).join("–") : v);
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open]);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="flex items-center gap-1.5 py-2 -my-2 text-xs underline underline-offset-4">
        <Ruler className="size-3.5" strokeWidth={1.5} /> Size guide
      </button>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-label="Size guide">
          <div className="absolute inset-0 bg-ink/50" onClick={() => setOpen(false)} />
          <div className="relative bg-[#fffdf8] rounded-3xl w-full max-w-xl max-h-[90vh] overflow-auto p-6 sm:p-8 animate-fade-in">
            <button onClick={() => setOpen(false)} aria-label="Close size guide" className="absolute top-4 right-4 p-1">
              <X className="size-5" />
            </button>
            <h2 className="font-display text-3xl">Size guide</h2>
            <p className="text-sm text-muted mt-2">Body measurements. Between sizes? Size up for a relaxed fit, or WhatsApp us for advice.</p>
            <div className="mt-5 inline-flex rounded-full border border-line text-xs overflow-hidden">
              {["in", "cm"].map((u) => (
                <button key={u} onClick={() => setCm(u === "cm")} className={cn("px-4 py-1.5 uppercase tracking-wider", (u === "cm") === cm && "bg-ink text-cream")}>
                  {u}
                </button>
              ))}
            </div>
            <table className="mt-4 w-full text-sm tabular-nums">
              <thead>
                <tr className="bg-sand text-left">
                  {["Size", "Indian", "Bust", "Waist", "Hips", "Shoulder"].map((h) => (
                    <th key={h} className="px-2.5 py-2 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SIZES.map(([s, ind, ...m]) => (
                  <tr key={s} className="border-b border-line">
                    <td className="px-2.5 py-2 font-medium">{s}</td>
                    <td className="px-2.5 py-2">{ind}</td>
                    {m.map((v, i) => (
                      <td key={i} className="px-2.5 py-2">{conv(v)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-muted mt-4">How to measure: bust at the fullest point, waist at the narrowest, hips at the widest — keep the tape snug, not tight.</p>
          </div>
        </div>
      )}
    </>
  );
}

export function TrustBadges({ className, codEnabled = true }: { className?: string; codEnabled?: boolean }) {
  const items = [
    { icon: ShieldCheck, t: "Secure payments", s: "Razorpay · PCI-DSS" },
    { icon: RotateCcw, t: "7-day returns", s: "Easy exchanges too" },
    codEnabled ? { icon: Wallet, t: "Cash on delivery", s: "Pan-India" } : { icon: Truck, t: "Ships in 1–2 days", s: "Pan-India delivery" },
    { icon: BadgeCheck, t: "GST invoice", s: "With every order" },
  ];
  return (
    <ul className={cn("grid grid-cols-2 gap-3", className)}>
      {items.map(({ icon: I, t, s }) => (
        <li key={t} className="flex items-start gap-2.5">
          <I className="size-5 text-plum shrink-0" strokeWidth={1.4} />
          <span className="text-xs leading-snug">
            <span className="block font-medium text-ink">{t}</span>
            <span className="text-muted">{s}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
