import "server-only";

/**
 * Shiprocket API client (https://apidocs.shiprocket.in).
 *
 * Credentials: create an API user in Shiprocket → Settings → API → Configure, then set
 *   SHIPROCKET_EMAIL / SHIPROCKET_PASSWORD   (that API user — not your main login)
 *   SHIPROCKET_WEBHOOK_TOKEN                 (any long random string; also pasted into Shiprocket's webhook settings)
 * Tokens last 10 days; we cache one in memory and refresh it on expiry or a 401.
 */

const BASE = "https://apiv2.shiprocket.in/v1/external";

export class ShiprocketError extends Error {
  constructor(
    message: string,
    public status?: number,
    public body?: unknown,
  ) {
    super(message);
  }
}

export const shiprocketConfigured = () => !!(process.env.SHIPROCKET_EMAIL && process.env.SHIPROCKET_PASSWORD);

let session: { token: string; expires: number } | null = null;

async function login() {
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: process.env.SHIPROCKET_EMAIL, password: process.env.SHIPROCKET_PASSWORD }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  const body = (await res.json().catch(() => ({}))) as { token?: string; message?: string };
  if (!res.ok || !body.token) throw new ShiprocketError(body.message || `Shiprocket login failed (${res.status})`, res.status, body);
  session = { token: body.token, expires: Date.now() + 9 * 86_400_000 }; // refresh a day early
  return body.token;
}

async function call<T>(path: string, init: RequestInit = {}, retried = false): Promise<T> {
  if (!shiprocketConfigured()) throw new ShiprocketError("Shiprocket isn’t configured (SHIPROCKET_EMAIL / SHIPROCKET_PASSWORD).");
  const token = session && session.expires > Date.now() ? session.token : await login();
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...init.headers },
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
  if (res.status === 401 && !retried) {
    session = null;
    return call<T>(path, init, true);
  }
  const text = await res.text();
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    body = { message: text };
  }
  if (!res.ok) {
    const b = body as { message?: string; errors?: Record<string, string[]> };
    const detail = b.errors ? Object.values(b.errors).flat().join(" ") : "";
    throw new ShiprocketError([b.message, detail].filter(Boolean).join(" — ") || `Shiprocket error ${res.status}`, res.status, body);
  }
  return body as T;
}

// ───────────────────────────── Serviceability & delivery dates

type Courier = {
  courier_company_id: number;
  courier_name: string;
  estimated_delivery_days: string | number;
  etd?: string;
  cod: number;
  rate: number;
  rating?: number;
};

export type Serviceability = {
  serviceable: boolean;
  codAvailable: boolean;
  /** Transit days of Shiprocket's recommended courier (else the fastest). */
  days: number | null;
  courier: string | null;
  checkedAt: number;
};

const cache = new Map<string, Serviceability>();
const TTL = 6 * 3600_000;

/** Couriers that can deliver from our pickup pincode to `pincode`, with transit days and COD support. */
export async function serviceability(pickup: string, pincode: string, opts: { weightKg: number; cod: boolean }): Promise<Serviceability> {
  const key = `${pickup}:${pincode}:${opts.cod ? 1 : 0}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.checkedAt < TTL) return hit;

  const qs = new URLSearchParams({ pickup_postcode: pickup, delivery_postcode: pincode, weight: String(opts.weightKg), cod: opts.cod ? "1" : "0" });
  let result: Serviceability;
  try {
    const r = await call<{ status?: number; data?: { available_courier_companies?: Courier[]; recommended_courier_company_id?: number } }>(`/courier/serviceability/?${qs}`);
    const list = r.data?.available_courier_companies ?? [];
    const rec = list.find((c) => c.courier_company_id === r.data?.recommended_courier_company_id);
    const fastest = [...list].sort((a, b) => Number(a.estimated_delivery_days) - Number(b.estimated_delivery_days))[0];
    const pick = rec ?? fastest;
    result = {
      serviceable: list.length > 0,
      codAvailable: list.some((c) => c.cod === 1),
      days: pick ? Number(pick.estimated_delivery_days) || null : null,
      courier: pick?.courier_name ?? null,
      checkedAt: Date.now(),
    };
  } catch (e) {
    // Shiprocket answers 404 for pincodes no courier serves
    if (e instanceof ShiprocketError && e.status === 404) result = { serviceable: false, codAvailable: false, days: null, courier: null, checkedAt: Date.now() };
    else throw e;
  }
  cache.set(key, result);
  return result;
}

// ───────────────────────────── Orders, AWB, pickup, tracking

export type AdhocOrder = {
  order_id: string;
  order_date: string;
  pickup_location: string;
  billing_customer_name: string;
  billing_last_name: string;
  billing_address: string;
  billing_address_2?: string;
  billing_city: string;
  billing_pincode: string;
  billing_state: string;
  billing_country: string;
  billing_email: string;
  billing_phone: string;
  shipping_is_billing: boolean;
  order_items: { name: string; sku: string; units: number; selling_price: number; discount?: number; hsn?: string }[];
  payment_method: "Prepaid" | "COD";
  shipping_charges: number;
  transaction_charges: number;
  total_discount: number;
  sub_total: number;
  length: number;
  breadth: number;
  height: number;
  weight: number;
};

export async function createOrder(o: AdhocOrder) {
  return call<{ order_id: number; shipment_id: number; status: string; awb_code?: string; courier_name?: string }>(`/orders/create/adhoc`, {
    method: "POST",
    body: JSON.stringify(o),
  });
}

/** Books the courier (Shiprocket's recommended one unless `courierId` is given) and returns the AWB. */
export async function assignAwb(shipmentId: number, courierId?: number) {
  const r = await call<{ awb_assign_status?: number; response?: { data?: { awb_code?: string; courier_name?: string } }; message?: string }>(`/courier/assign/awb`, {
    method: "POST",
    body: JSON.stringify({ shipment_id: shipmentId, ...(courierId ? { courier_id: courierId } : {}) }),
  });
  const data = r.response?.data;
  if (!data?.awb_code) throw new ShiprocketError(r.message || "Couldn’t assign an AWB — check your Shiprocket wallet balance and pickup address.");
  return { awb: data.awb_code, courier: data.courier_name ?? null };
}

export async function schedulePickup(shipmentId: number) {
  return call<{ pickup_status?: number; response?: { pickup_scheduled_date?: string } }>(`/courier/generate/pickup`, {
    method: "POST",
    body: JSON.stringify({ shipment_id: [shipmentId] }),
  });
}

export type Tracking = { status: string | null; etd: string | null; courier: string | null; delivered: boolean; activities: { date: string; activity: string; location: string }[] };

export async function trackAwb(awb: string): Promise<Tracking> {
  const r = await call<{
    tracking_data?: {
      shipment_track?: { current_status?: string; edd?: string; courier_name?: string; delivered_date?: string }[];
      shipment_track_activities?: { date: string; activity: string; location: string }[];
      etd?: string;
    };
  }>(`/courier/track/awb/${encodeURIComponent(awb)}`);
  const t = r.tracking_data?.shipment_track?.[0];
  return {
    status: t?.current_status ?? null,
    etd: t?.edd || r.tracking_data?.etd || null,
    courier: t?.courier_name ?? null,
    delivered: !!t?.delivered_date || /delivered/i.test(t?.current_status ?? ""),
    activities: r.tracking_data?.shipment_track_activities ?? [],
  };
}

export async function cancelOrders(srOrderIds: number[]) {
  return call(`/orders/cancel`, { method: "POST", body: JSON.stringify({ ids: srOrderIds }) });
}

/** Cancels booked shipments by AWB (the order itself stays in Shiprocket and can be re-shipped). */
export async function cancelShipments(awbs: string[]) {
  return call<{ message?: string }>(`/orders/cancel/shipment/awbs`, { method: "POST", body: JSON.stringify({ awbs }) });
}

// ───────────────────────────── Documents

/** Shipping label PDF for a booked shipment (needs an AWB). */
export async function labelUrl(shipmentId: number) {
  const r = await call<{ label_created?: number; label_url?: string; response?: string; not_created?: unknown[] }>(`/courier/generate/label`, {
    method: "POST",
    body: JSON.stringify({ shipment_id: [shipmentId] }),
  });
  if (!r.label_url) throw new ShiprocketError(r.response || "Shiprocket couldn’t create the label — book the courier (Ship now) first.");
  return r.label_url;
}

/** Tax invoice PDF generated by Shiprocket for a Shiprocket order id. */
export async function invoiceUrl(srOrderId: number) {
  const r = await call<{ is_invoice_created?: boolean; invoice_url?: string; not_created?: unknown[] }>(`/orders/print/invoice`, {
    method: "POST",
    body: JSON.stringify({ ids: [srOrderId] }),
  });
  if (!r.invoice_url) throw new ShiprocketError("Shiprocket couldn’t create the invoice for this order.");
  return r.invoice_url;
}

// ───────────────────────────── Account

export async function walletBalance() {
  const r = await call<{ data?: { balance_amount?: string | number } }>(`/account/details/wallet-balance`);
  const n = Number(r.data?.balance_amount);
  return Number.isFinite(n) ? n : null;
}

export type PickupLocation = { name: string; pincode: string; city: string; address: string; verified: boolean };

/** Pickup addresses saved in Shiprocket (Settings → Pickup Addresses). */
export async function pickupLocations(): Promise<PickupLocation[]> {
  const r = await call<{
    data?: { shipping_address?: { pickup_location: string; pin_code: string; city: string; address: string; status?: number; phone_verified?: number }[] };
  }>(`/settings/company/pickup`);
  return (r.data?.shipping_address ?? []).map((p) => ({
    name: p.pickup_location,
    pincode: String(p.pin_code),
    city: p.city,
    address: p.address,
    verified: p.phone_verified === 1,
  }));
}

export type CourierPreference = "recommended" | "cheapest" | "fastest";

/**
 * Picks a courier for a shipment by preference. `recommended` returns undefined so Shiprocket
 * applies its own recommendation (rating, cost and speed) when the AWB is assigned.
 */
export async function chooseCourier(pickup: string, pincode: string, opts: { weightKg: number; cod: boolean; preference: CourierPreference }) {
  if (opts.preference === "recommended") return undefined;
  const qs = new URLSearchParams({ pickup_postcode: pickup, delivery_postcode: pincode, weight: String(opts.weightKg), cod: opts.cod ? "1" : "0" });
  const r = await call<{ data?: { available_courier_companies?: Courier[] } }>(`/courier/serviceability/?${qs}`);
  const list = r.data?.available_courier_companies ?? [];
  if (!list.length) throw new ShiprocketError(`No courier serves ${pincode} from ${pickup}.`);
  const key = opts.preference === "cheapest" ? (c: Courier) => Number(c.rate) : (c: Courier) => Number(c.estimated_delivery_days) || 99;
  return [...list].sort((a, b) => key(a) - key(b))[0].courier_company_id;
}

/** Public tracking page shoppers can open. */
export const trackingUrl = (awb: string) => `https://shiprocket.co/tracking/${encodeURIComponent(awb)}`;
