import { Field, Section, SettingsForm, ShiprocketTest, Toggle } from "@/components/admin/settings-forms";
import { requireOwner } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { shiprocketConfigured } from "@/lib/shiprocket";

export const metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

const rs = (paise: number | null) => (paise == null ? "" : String(paise / 100));

export default async function SettingsPage() {
  await requireOwner();
  const [payments, shipping, sr] = await Promise.all([getSettings("payments"), getSettings("shipping"), getSettings("shiprocket")]);
  const connected = shiprocketConfigured();
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "https://trumee.in").replace(/\/$/, "");

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-semibold">Settings</h1>

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

      <Section id="shipping" title="Shipping charges & delivery promise" hint="Feeds the product pages, checkout, Google Shopping feed and structured data.">
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
          <>
            Status:{" "}
            <strong className={connected ? "text-admin-green" : "text-admin-yellow"}>{connected ? "connected" : "not connected"}</strong>
            {connected ? "" : " — add the API user’s email & password to the server environment (see docs/SHIPROCKET_SETUP.md)."}
          </>
        }
      >
        <div className="space-y-6">
          <ShiprocketTest />
          <SettingsForm section="shiprocket">
            <Toggle label="Live delivery dates" name="liveEstimates" defaultChecked={sr.liveEstimates} help="Product pages and checkout show the real courier date for the shopper’s pincode (falls back to the estimates above if Shiprocket is unreachable)." />
            <Toggle label="Send new orders to Shiprocket automatically" name="autoCreateOrders" defaultChecked={sr.autoCreateOrders} help="Confirmed COD orders and paid prepaid orders appear in Shiprocket as NEW. You still choose when to book the courier (Orders → Ship now)." />
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Pickup location nickname" name="pickupLocation" defaultValue={sr.pickupLocation} help="Exactly as in Shiprocket → Settings → Pickup Addresses" />
              <Field label="Pickup pincode" name="pickupPostcode" defaultValue={sr.pickupPostcode} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Field label="Weight per piece" name="weightKg" type="number" step="0.05" defaultValue={sr.weightKg} suffix="kg" />
              <Field label="Length" name="lengthCm" type="number" defaultValue={sr.lengthCm} suffix="cm" />
              <Field label="Breadth" name="breadthCm" type="number" defaultValue={sr.breadthCm} suffix="cm" />
              <Field label="Height" name="heightCm" type="number" step="0.5" defaultValue={sr.heightCm} suffix="cm" />
            </div>
            <p className="text-xs text-admin-muted">
              Tracking webhook for Shiprocket → Settings → API → Webhooks: <code className="bg-admin-bg px-1.5 py-0.5 rounded">{site}/api/webhooks/courier-updates</code> with your SHIPROCKET_WEBHOOK_TOKEN as the token.
            </p>
          </SettingsForm>
        </div>
      </Section>
    </div>
  );
}
