import { CopyValue, Field, RazorpayTest, Section, Select, SettingsForm, ShiprocketTest, Status, TextArea, Toggle } from "@/components/admin/settings-forms";
import { requireOwner } from "@/lib/auth";
import { razorpayEnabled, razorpayMode, razorpayWebhookConfigured } from "@/lib/razorpay";
import { getSettings, PAYMENT_METHODS } from "@/lib/settings";
import { pickupLocations, shiprocketConfigured, walletBalance, type PickupLocation } from "@/lib/shiprocket";
import { inr } from "@/lib/utils";

export const metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

const rs = (paise: number | null) => (paise == null ? "" : String(paise / 100));

const NAV = [
  ["store", "Store details"],
  ["announcement", "Announcement bar"],
  ["razorpay", "Payments · Razorpay"],
  ["payments", "Prepaid discount"],
  ["cod", "Cash on delivery"],
  ["shipping", "Shipping & delivery"],
  ["shiprocket", "Shiprocket"],
  ["tax", "Taxes (GST)"],
  ["integrations", "Analytics & tracking"],
] as const;

/** Shiprocket account info for the settings page; never fails the page. */
async function shiprocketInfo(): Promise<{ wallet: number | null; pickups: PickupLocation[]; error?: string }> {
  if (!shiprocketConfigured()) return { wallet: null, pickups: [] };
  try {
    const [wallet, pickups] = await Promise.all([walletBalance(), pickupLocations()]);
    return { wallet, pickups };
  } catch (e) {
    return { wallet: null, pickups: [], error: e instanceof Error ? e.message : String(e) };
  }
}

export default async function SettingsPage() {
  await requireOwner();
  const [store, payments, shipping, sr, tax, integrations, srInfo] = await Promise.all([
    getSettings("store"),
    getSettings("payments"),
    getSettings("shipping"),
    getSettings("shiprocket"),
    getSettings("tax"),
    getSettings("integrations"),
    shiprocketInfo(),
  ]);
  const connected = shiprocketConfigured();
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "https://trumee.in").replace(/\/$/, "");
  const mode = razorpayMode();
  const knownPickup = srInfo.pickups.some((p) => p.name === sr.pickupLocation);

  return (
    <div className="lg:grid lg:grid-cols-[200px_minmax(0,1fr)] gap-8">
      <aside className="hidden lg:block">
        <nav className="sticky top-20 space-y-0.5 text-sm">
          <p className="px-3 pb-2 text-xs font-medium uppercase tracking-wide text-admin-muted">Settings</p>
          {NAV.map(([id, label]) => (
            <a key={id} href={`#${id}`} className="block rounded-lg px-3 py-1.5 hover:bg-admin-card">
              {label}
            </a>
          ))}
        </nav>
      </aside>

      <div className="space-y-6 max-w-3xl">
        <h1 className="text-2xl font-semibold">Settings</h1>

        {/* ───────────── Store */}
        <Section id="store" title="Store details" hint="Shown in the footer, contact page, invoices, emails and Google’s business info.">
          <SettingsForm section="store">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Store name" name="name" defaultValue={store.name} />
              <Field label="Tagline" name="tagline" defaultValue={store.tagline} />
              <Field label="Legal business name" name="legalName" defaultValue={store.legalName} help="Printed on invoices" />
              <Field label="GSTIN" name="gstin" defaultValue={store.gstin} help="15 characters; blank if not registered" />
              <Field label="Support email" name="email" type="email" defaultValue={store.email} />
              <Field label="Support phone" name="phone" defaultValue={store.phone} />
              <Field label="WhatsApp number" name="whatsapp" defaultValue={store.whatsapp} help="Digits with country code, e.g. 919986950695" />
              <Field label="Support hours" name="supportHours" defaultValue={store.supportHours} />
            </div>
            <TextArea label="Business address" name="address" defaultValue={store.address} rows={2} />
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Instagram" name="instagram" defaultValue={store.social.instagram} help="Full link, or blank" />
              <Field label="YouTube" name="youtube" defaultValue={store.social.youtube} />
              <Field label="Facebook" name="facebook" defaultValue={store.social.facebook} />
              <Field label="Pinterest" name="pinterest" defaultValue={store.social.pinterest} />
            </div>
          </SettingsForm>
        </Section>

        <Section id="announcement" title="Announcement bar" hint="The strip at the very top of every page.">
          <SettingsForm section="announcement">
            <Toggle label="Show the announcement bar" name="enabled" defaultChecked={store.announcement.enabled} />
            <div className="grid sm:grid-cols-[2fr_1fr] gap-4">
              <Field label="Message" name="text" defaultValue={store.announcement.text} help="Keep it short — it’s one line on phones" />
              <Field label="Link (optional)" name="href" defaultValue={store.announcement.href} help="e.g. /pages/shipping-policy" />
            </div>
          </SettingsForm>
        </Section>

        {/* ───────────── Payments */}
        <Section
          id="razorpay"
          title="Payments · Razorpay"
          hint={
            <span className="flex flex-wrap items-center gap-2">
              {mode === "live" ? <Status ok>Live mode — real payments</Status> : mode === "test" ? <Status ok="warn">Test mode — no real money</Status> : <Status ok={false}>Not connected</Status>}
              {razorpayEnabled() && (razorpayWebhookConfigured() ? <Status ok>Webhook secret set</Status> : <Status ok="warn">Webhook secret missing</Status>)}
            </span>
          }
        >
          <div className="space-y-5">
            {!razorpayEnabled() && (
              <p className="text-sm text-admin-muted">
                Checkout runs in a simulated payment mode until RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are added to the server’s .env (Razorpay Dashboard → Account &amp; Settings → API Keys), followed by a restart.
              </p>
            )}
            <RazorpayTest />
            <CopyValue label="Webhook URL (Razorpay → Webhooks; events: payment.captured, order.paid, payment.failed, refund.processed, refund.failed)" value={`${site}/api/razorpay/webhook`} />
            <SettingsForm section="checkout">
              <Field label="Name in the payment window" name="checkoutName" defaultValue={payments.checkoutName} />
              <div>
                <span className="block text-sm font-medium mb-2">Payment methods offered</span>
                <div className="grid sm:grid-cols-2 gap-3">
                  {PAYMENT_METHODS.map((m) => (
                    <Toggle key={m.key} label={m.label} name={`m_${m.key}`} defaultChecked={payments.methods?.[m.key] !== false} help={m.hint} />
                  ))}
                </div>
                <p className="text-xs text-admin-muted mt-2">A method also has to be activated on your Razorpay account to appear. Switching one off here hides it at checkout.</p>
              </div>
              <Select
                label="Default refund speed"
                name="refundSpeed"
                defaultValue={payments.refundSpeed}
                options={[
                  { value: "normal", label: "Normal — 5–7 working days, no fee" },
                  { value: "optimum", label: "Instant where possible — small Razorpay fee" },
                ]}
                help="You can still choose per refund on the order page."
              />
            </SettingsForm>
          </div>
        </Section>

        <Section id="payments" title="Prepaid discount" hint="Reward shoppers who pay online (UPI, cards, netbanking). Shown on product pages, the bag and checkout; applied automatically when they choose online payment.">
          <SettingsForm section="payments">
            <div className="grid sm:grid-cols-3 gap-4">
              <Field label="Discount" name="prepaidDiscountPercent" type="number" step="0.5" defaultValue={payments.prepaidDiscountPercent} suffix="%" help="0 turns it off. Max 50%." />
              <Field label="Maximum saving" name="prepaidDiscountMax" type="number" prefix="₹" defaultValue={rs(payments.prepaidDiscountMax)} help="Blank = no cap" />
              <Field label="Minimum order" name="prepaidDiscountMinOrder" type="number" prefix="₹" defaultValue={rs(payments.prepaidDiscountMinOrder)} help="0 = any order" />
            </div>
            <p className="text-xs text-admin-muted">Applied after discount codes and before shipping. Example: 5% on a ₹1,499 bag saves ₹75.</p>
          </SettingsForm>
        </Section>

        <Section id="cod" title="Cash on delivery">
          <SettingsForm section="cod">
            <Toggle label="Offer cash on delivery" name="codEnabled" defaultChecked={shipping.codEnabled} help="When Shiprocket is connected, COD is also hidden for pincodes no courier can collect cash in." />
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="COD fee" name="codFee" type="number" prefix="₹" defaultValue={rs(shipping.codFee)} help="Added to COD orders; 0 = free" />
              <Field label="COD order limit" name="codMaxOrder" type="number" prefix="₹" defaultValue={rs(shipping.codMaxOrder)} help="Blank = no limit" />
            </div>
          </SettingsForm>
        </Section>

        {/* ───────────── Shipping */}
        <Section id="shipping" title="Shipping & delivery" hint="Feeds the product pages, checkout, Google Shopping feed and structured data.">
          <SettingsForm section="shipping">
            <div className="grid sm:grid-cols-3 gap-4">
              <Field label="Flat shipping" name="flatRate" type="number" prefix="₹" defaultValue={rs(shipping.flatRate)} />
              <Field label="Free shipping over" name="freeShippingThreshold" type="number" prefix="₹" defaultValue={rs(shipping.freeShippingThreshold)} help="Blank = never free" />
              <Field label="Dispatch time" name="processingDays" defaultValue={shipping.processingDays} help="e.g. 1–2 business days" />
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              {shipping.deliveryEstimates.slice(0, 3).map((e, i) => (
                <Field key={i} label={e.label} name={`est${i}`} defaultValue={e.days} help="Fallback when live dates are off" />
              ))}
            </div>
          </SettingsForm>
        </Section>

        <Section
          id="shiprocket"
          title="Shiprocket"
          hint={
            <span className="flex flex-wrap items-center gap-2">
              {connected ? <Status ok>Connected</Status> : <Status ok={false}>Not connected</Status>}
              {srInfo.wallet != null && <Status ok={srInfo.wallet > 200 ? true : "warn"}>Wallet {inr(Math.round(srInfo.wallet * 100))}</Status>}
              {srInfo.error && <span className="text-admin-red">Shiprocket said: {srInfo.error}</span>}
            </span>
          }
        >
          <div className="space-y-6">
            {!connected && <p className="text-sm text-admin-muted">Add the API user’s SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD to the server’s .env and restart (Shiprocket → Settings → API Users).</p>}
            <ShiprocketTest />
            <SettingsForm section="shiprocket">
              <Toggle label="Live delivery dates" name="liveEstimates" defaultChecked={sr.liveEstimates} help="Product pages and checkout show the real courier date for the shopper’s pincode (falls back to the estimates above if Shiprocket is unreachable)." />
              <Toggle label="Send new orders to Shiprocket automatically" name="autoCreateOrders" defaultChecked={sr.autoCreateOrders} help="Confirmed COD orders and paid online orders appear in Shiprocket as NEW. You still choose when to book the courier (Ship now)." />
              <Toggle label="Request pickup automatically when booking the courier" name="autoPickup" defaultChecked={sr.autoPickup} help="Off = book the AWB now and request the pickup later from the order page." />
              <div className="grid sm:grid-cols-2 gap-4">
                {srInfo.pickups.length ? (
                  <Select
                    label="Pickup location"
                    name="pickupLocation"
                    defaultValue={knownPickup ? sr.pickupLocation : srInfo.pickups[0].name}
                    options={srInfo.pickups.map((p) => ({ value: p.name, label: `${p.name} — ${p.city} ${p.pincode}${p.verified ? "" : " (phone not verified)"}` }))}
                    help="From Shiprocket → Settings → Pickup Addresses"
                  />
                ) : (
                  <Field label="Pickup location nickname" name="pickupLocation" defaultValue={sr.pickupLocation} help="Exactly as in Shiprocket → Settings → Pickup Addresses" />
                )}
                <Field label="Pickup pincode" name="pickupPostcode" defaultValue={sr.pickupPostcode} help="Used for delivery dates and courier rates" />
              </div>
              <Select
                label="Courier to book on “Ship now”"
                name="courierPreference"
                defaultValue={sr.courierPreference}
                options={[
                  { value: "recommended", label: "Shiprocket’s recommendation (balances rating, speed and cost)" },
                  { value: "cheapest", label: "Cheapest courier" },
                  { value: "fastest", label: "Fastest courier" },
                ]}
              />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Field label="Weight per piece" name="weightKg" type="number" step="0.05" defaultValue={sr.weightKg} suffix="kg" />
                <Field label="Length" name="lengthCm" type="number" defaultValue={sr.lengthCm} suffix="cm" />
                <Field label="Breadth" name="breadthCm" type="number" defaultValue={sr.breadthCm} suffix="cm" />
                <Field label="Height" name="heightCm" type="number" step="0.5" defaultValue={sr.heightCm} suffix="cm" />
              </div>
            </SettingsForm>
            <CopyValue label="Tracking webhook URL (Shiprocket → Settings → Webhooks; token = SHIPROCKET_WEBHOOK_TOKEN)" value={`${site}/api/webhooks/courier-updates`} />
          </div>
        </Section>

        {/* ───────────── Tax & tracking */}
        <Section id="tax" title="Taxes (GST)" hint="Apparel GST: the lower rate up to the per-piece threshold, the higher rate above it.">
          <SettingsForm section="tax">
            <Toggle label="Prices include GST" name="pricesIncludeTax" defaultChecked={tax.pricesIncludeTax} help="On: the price shoppers see already includes GST (usual in India)." />
            <div className="grid sm:grid-cols-3 gap-4">
              <Field label="Threshold per piece" name="threshold" type="number" prefix="₹" defaultValue={rs(tax.threshold)} />
              <Field label="Rate up to threshold" name="lowRate" type="number" step="0.5" defaultValue={tax.lowRate} suffix="%" />
              <Field label="Rate above threshold" name="highRate" type="number" step="0.5" defaultValue={tax.highRate} suffix="%" />
            </div>
          </SettingsForm>
        </Section>

        <Section id="integrations" title="Analytics & tracking" hint="Tags load only after the shopper accepts cookies. Leave blank to switch one off.">
          <SettingsForm section="integrations">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Google Analytics 4 — Measurement ID" name="ga4MeasurementId" defaultValue={integrations.ga4MeasurementId} help="G-XXXXXXXXXX" />
              <Field label="Meta Pixel ID" name="metaPixelId" defaultValue={integrations.metaPixelId} help="Numbers only" />
              <Field label="Microsoft Clarity project ID" name="clarityId" defaultValue={integrations.clarityId} />
              <Field label="Google Search Console verification" name="googleSiteVerification" defaultValue={integrations.googleSiteVerification} help="The content=“…” value from the HTML-tag method" />
            </div>
          </SettingsForm>
        </Section>
      </div>
    </div>
  );
}
