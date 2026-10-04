import type { ShippingSettings, TaxSettings } from "./settings";

/**
 * Pure pricing engine shared by the cart, checkout and admin order creation.
 * All amounts are paise. Prices are GST-inclusive (Indian retail convention).
 */

export type PricingLine = {
  variantId: number;
  productId: number;
  unitPrice: number;
  quantity: number;
  collectionIds: number[];
};

export type PricingDiscount = {
  code: string;
  kind: string; // percentage | fixed | free_shipping | bxgy
  value: number;
  buyQty: number | null;
  getQty: number | null;
  minSubtotal: number;
  appliesTo: string; // all | collections | products
  targetIds: number[];
};

/** Online-payment incentive (Admin → Settings → Payments). */
export type PrepaidRule = { percent: number; max: number | null; minOrder: number };

/** Saving for paying online on `base` paise (after code discounts, before shipping). */
export function prepaidSaving(base: number, rule: PrepaidRule | null | undefined) {
  if (!rule || rule.percent <= 0 || base <= 0 || base < rule.minOrder) return 0;
  const v = Math.round((base * Math.min(rule.percent, 100)) / 100);
  return rule.max != null && rule.max > 0 ? Math.min(v, rule.max) : v;
}

export type PricedLine = PricingLine & {
  lineTotal: number;
  discount: number;
  taxRate: number;
  tax: number;
};

export type Totals = {
  lines: PricedLine[];
  subtotal: number;
  discountTotal: number;
  /** Prepaid saving actually applied (only when paymentMethod is "razorpay"). */
  prepaidDiscount: number;
  /** What paying online would save on this cart, whatever method is selected. */
  prepaidAvailable: number;
  /** Grand total if the shopper pays online. */
  onlineTotal: number;
  shipping: number;
  codFee: number;
  tax: number;
  total: number;
  discountApplied: string | null;
  discountError: string | null;
  freeShippingRemaining: number | null;
};

function eligible(line: PricingLine, d: PricingDiscount) {
  if (d.appliesTo === "products") return d.targetIds.includes(line.productId);
  if (d.appliesTo === "collections") return line.collectionIds.some((c) => d.targetIds.includes(c));
  return true;
}

export function gstRate(unitPrice: number, tax: TaxSettings) {
  return unitPrice <= tax.threshold ? tax.lowRate : tax.highRate;
}

export function priceCart(
  input: PricingLine[],
  opts: {
    discount?: PricingDiscount | null;
    shipping: ShippingSettings;
    tax: TaxSettings;
    paymentMethod?: "razorpay" | "cod";
    prepaid?: PrepaidRule | null;
  },
): Totals {
  const lines: PricedLine[] = input.map((l) => ({
    ...l,
    lineTotal: l.unitPrice * l.quantity,
    discount: 0,
    taxRate: 0,
    tax: 0,
  }));
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);

  let discountApplied: string | null = null;
  let discountError: string | null = null;
  let freeShipping = false;
  const d = opts.discount;

  if (d) {
    const elig = lines.filter((l) => eligible(l, d));
    const eligSubtotal = elig.reduce((s, l) => s + l.lineTotal, 0);
    if (subtotal < d.minSubtotal) {
      discountError = `Add ₹${Math.ceil((d.minSubtotal - subtotal) / 100)} more to use ${d.code}`;
    } else if (!elig.length) {
      discountError = `${d.code} doesn't apply to the items in your bag`;
    } else {
      discountApplied = d.code;
      let amount = 0;
      if (d.kind === "percentage") amount = Math.round((eligSubtotal * Math.min(d.value, 100)) / 100);
      else if (d.kind === "fixed") amount = Math.min(d.value, eligSubtotal);
      else if (d.kind === "free_shipping") freeShipping = true;
      else if (d.kind === "bxgy" && d.buyQty && d.getQty) {
        const units = elig.flatMap((l) => Array(l.quantity).fill(l.unitPrice) as number[]).sort((a, b) => a - b);
        const free = Math.floor(units.length / (d.buyQty + d.getQty)) * d.getQty;
        amount = units.slice(0, free).reduce((s, v) => s + v, 0);
        if (!free) {
          discountApplied = null;
          discountError = `Add ${d.buyQty + d.getQty - units.length} more eligible item(s) to use ${d.code}`;
        }
      }
      // Allocate proportionally so per-line tax is computed on what the customer actually pays.
      let remaining = amount;
      elig.forEach((l, i) => {
        const share = i === elig.length - 1 ? remaining : Math.round((amount * l.lineTotal) / eligSubtotal);
        l.discount = Math.min(share, l.lineTotal);
        remaining -= l.discount;
      });
    }
  }

  const discountTotal = lines.reduce((s, l) => s + l.discount, 0);
  const afterDiscount = subtotal - discountTotal;

  // Prepaid saving: on the discounted goods value, spread across lines so per-line GST stays exact.
  const prepaidAvailable = prepaidSaving(afterDiscount, opts.prepaid);
  const prepaidDiscount = opts.paymentMethod === "razorpay" ? prepaidAvailable : 0;
  if (prepaidDiscount) {
    let left = prepaidDiscount;
    const payable = lines.filter((l) => l.lineTotal - l.discount > 0);
    payable.forEach((l, i) => {
      const net = l.lineTotal - l.discount;
      const share = i === payable.length - 1 ? left : Math.round((prepaidDiscount * net) / afterDiscount);
      const take = Math.min(share, net);
      l.discount += take;
      left -= take;
    });
  }

  for (const l of lines) {
    l.taxRate = gstRate(l.unitPrice, opts.tax);
    const net = l.lineTotal - l.discount;
    l.tax = opts.tax.pricesIncludeTax
      ? Math.round((net * l.taxRate) / (100 + l.taxRate))
      : Math.round((net * l.taxRate) / 100);
  }
  const tax = lines.reduce((s, l) => s + l.tax, 0);

  const s = opts.shipping;
  const meetsFree = s.freeShippingThreshold != null && afterDiscount >= s.freeShippingThreshold;
  const shipping = !lines.length || freeShipping || meetsFree ? 0 : s.flatRate;
  const codFee = opts.paymentMethod === "cod" ? s.codFee : 0;
  const total = afterDiscount - prepaidDiscount + shipping + codFee + (opts.tax.pricesIncludeTax ? 0 : tax);
  const onlineTotal =
    opts.paymentMethod === "razorpay" || !prepaidAvailable ? (opts.paymentMethod === "cod" ? total - codFee : total) : priceCart(input, { ...opts, paymentMethod: "razorpay" }).total;

  return {
    lines,
    subtotal,
    discountTotal,
    prepaidDiscount,
    prepaidAvailable,
    onlineTotal,
    shipping,
    codFee,
    tax,
    total,
    discountApplied,
    discountError,
    freeShippingRemaining:
      s.freeShippingThreshold != null && !meetsFree ? s.freeShippingThreshold - afterDiscount : null,
  };
}
