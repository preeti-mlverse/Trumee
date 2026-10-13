import "server-only";
import type { Address } from "@/db/schema";
import type { StoreSettings } from "./settings";

/**
 * GST tax invoice for an order. Prices are GST-inclusive, so each line's taxable value is backed
 * out of what the customer paid (after discounts and the prepaid discount). Intra-state supplies
 * (buyer in the seller's state) split tax into CGST + SGST; inter-state supplies charge IGST.
 */

/** HSN chapter codes for women's woven apparel, by product type. */
export const HSN_BY_TYPE: Record<string, string> = {
  Dresses: "6204",
  Skirts: "6204",
  "Co-ord Sets": "6204",
  Tops: "6206",
  Shirts: "6206",
  Jumpsuits: "6211",
};
export const hsnFor = (productType: string | null | undefined, own?: string | null) => own?.trim() || HSN_BY_TYPE[productType ?? ""] || "6204";

/** GST state codes (first two digits of a GSTIN). */
export const STATE_CODES: Record<string, string> = {
  "Jammu and Kashmir": "01", "Himachal Pradesh": "02", Punjab: "03", Chandigarh: "04", Uttarakhand: "05", Haryana: "06", Delhi: "07",
  Rajasthan: "08", "Uttar Pradesh": "09", Bihar: "10", Sikkim: "11", "Arunachal Pradesh": "12", Nagaland: "13", Manipur: "14",
  Mizoram: "15", Tripura: "16", Meghalaya: "17", Assam: "18", "West Bengal": "19", Jharkhand: "20", Odisha: "21", Chhattisgarh: "22",
  "Madhya Pradesh": "23", Gujarat: "24", "Dadra and Nagar Haveli and Daman and Diu": "26", Maharashtra: "27", Karnataka: "29", Goa: "30",
  Lakshadweep: "31", Kerala: "32", "Tamil Nadu": "33", Puducherry: "34", "Andaman and Nicobar Islands": "35", Telangana: "36",
  "Andhra Pradesh": "37", Ladakh: "38",
};

export type InvoiceLine = {
  description: string;
  hsn: string;
  qty: number;
  unitPrice: number; // paise, incl. GST
  discount: number; // paise
  taxable: number; // paise
  rate: number; // %
  cgst: number;
  sgst: number;
  igst: number;
  total: number; // paise, incl. GST
};

type OrderLike = {
  number: number;
  createdAt: Date;
  paidAt: Date | null;
  paymentMethod: string;
  financialStatus: string;
  email: string;
  phone: string | null;
  shippingAddress: Address;
  billingAddress: Address | null;
  shippingTotal: number;
  codFee: number;
  total: number;
  items: { title: string; variantTitle: string | null; sku: string | null; price: number; quantity: number; discount: number; taxRate: number; hsn: string | null }[];
};

const split = (gross: number, rate: number, intra: boolean) => {
  const taxable = Math.round((gross * 100) / (100 + rate));
  const tax = gross - taxable;
  const half = Math.round(tax / 2);
  return { taxable, cgst: intra ? half : 0, sgst: intra ? tax - half : 0, igst: intra ? 0 : tax };
};

/** Indian financial year label for a date, e.g. 2026-27. */
export function financialYear(d: Date) {
  const ist = new Date(d.getTime() + 330 * 60_000);
  const y = ist.getUTCFullYear();
  const start = ist.getUTCMonth() >= 3 ? y : y - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}

export function buildInvoice(o: OrderLike, store: StoreSettings) {
  const sellerState = "Haryana";
  const sellerCode = store.gstin?.slice(0, 2) || STATE_CODES[sellerState];
  const buyer = o.billingAddress ?? o.shippingAddress;
  const supplyState = o.shippingAddress.state;
  const supplyCode = STATE_CODES[supplyState] ?? "";
  const intra = supplyCode === sellerCode;

  const lines: InvoiceLine[] = o.items.map((i) => {
    const gross = i.price * i.quantity - i.discount;
    const t = split(gross, i.taxRate, intra);
    return {
      description: `${i.title}${i.variantTitle ? ` — ${i.variantTitle}` : ""}`,
      hsn: i.hsn || "6204",
      qty: i.quantity,
      unitPrice: i.price,
      discount: i.discount,
      rate: i.taxRate,
      total: gross,
      ...t,
    };
  });
  // Delivery / COD charges follow the goods' rate (composite supply)
  const chargeRate = Math.max(5, ...o.items.map((i) => i.taxRate));
  const charges = [
    o.shippingTotal ? ["Shipping charges", o.shippingTotal] : null,
    o.codFee ? ["Cash on delivery charges", o.codFee] : null,
  ].filter((x): x is [string, number] => !!x);
  for (const [label, amount] of charges) {
    lines.push({ description: label, hsn: "9968", qty: 1, unitPrice: amount, discount: 0, rate: chargeRate, total: amount, ...split(amount, chargeRate, intra) });
  }

  const sum = (k: keyof InvoiceLine) => lines.reduce((s, l) => s + (l[k] as number), 0);
  const totals = { taxable: sum("taxable"), cgst: sum("cgst"), sgst: sum("sgst"), igst: sum("igst"), discount: sum("discount"), total: sum("total") };
  const rates = [...new Set(lines.map((l) => l.rate))].sort((a, b) => a - b);
  const byRate = rates.map((r) => {
    const ls = lines.filter((l) => l.rate === r);
    const s = (k: keyof InvoiceLine) => ls.reduce((x, l) => x + (l[k] as number), 0);
    return { rate: r, taxable: s("taxable"), cgst: s("cgst"), sgst: s("sgst"), igst: s("igst") };
  });

  return {
    number: `TRM/${financialYear(o.createdAt)}/${o.number}`,
    date: o.paidAt ?? o.createdAt,
    orderNumber: o.number,
    seller: { name: store.legalName, brand: store.name, address: store.address, gstin: store.gstin, state: sellerState, stateCode: sellerCode, email: store.email, phone: store.phone },
    buyer: { name: buyer.name, address: [buyer.line1, buyer.line2, `${buyer.city}, ${buyer.state} ${buyer.pincode}`].filter(Boolean).join(", "), phone: buyer.phone || o.phone, email: o.email },
    shipTo: { name: o.shippingAddress.name, address: [o.shippingAddress.line1, o.shippingAddress.line2, `${o.shippingAddress.city}, ${o.shippingAddress.state} ${o.shippingAddress.pincode}`].filter(Boolean).join(", ") },
    placeOfSupply: `${supplyState}${supplyCode ? ` (${supplyCode})` : ""}`,
    intra,
    payment: o.paymentMethod === "cod" ? "Cash on delivery" : `Prepaid online${o.financialStatus === "paid" ? " (paid)" : ""}`,
    lines,
    byRate,
    totals,
    grandTotal: o.total,
    words: amountInWords(o.total),
  };
}

export type Invoice = ReturnType<typeof buildInvoice>;

/** Invoices exist once an order is real: COD placed, or prepaid and paid. */
export const invoiceAvailable = (o: { paymentMethod: string; financialStatus: string; status: string }) =>
  o.status !== "cancelled" && (o.paymentMethod === "cod" || ["paid", "partially_refunded", "refunded"].includes(o.financialStatus));

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
function twoDigits(n: number) {
  return n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? " " + ONES[n % 10] : ""}`;
}
function threeDigits(n: number) {
  const h = Math.floor(n / 100);
  const r = n % 100;
  return [h ? `${ONES[h]} Hundred` : "", r ? twoDigits(r) : ""].filter(Boolean).join(" ");
}
/** Indian numbering: crore, lakh, thousand. */
export function amountInWords(paise: number) {
  const rupees = Math.floor(paise / 100);
  const p = paise % 100;
  const parts: string[] = [];
  const crore = Math.floor(rupees / 10_000_000);
  const lakh = Math.floor((rupees % 10_000_000) / 100_000);
  const thousand = Math.floor((rupees % 100_000) / 1000);
  const rest = rupees % 1000;
  if (crore) parts.push(`${threeDigits(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (rest) parts.push(threeDigits(rest));
  const r = parts.join(" ") || "Zero";
  return `Rupees ${r}${p ? ` and ${twoDigits(p)} Paise` : ""} Only`;
}
