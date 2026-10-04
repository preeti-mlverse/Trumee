import "server-only";
import { serviceability, shiprocketConfigured } from "./shiprocket";
import { getSettings } from "./settings";
import { addBusinessDays, estimateDelivery, fmtDay } from "./trust";
import { dayRange } from "./product-facts";

export type DeliveryQuote = {
  serviceable: boolean;
  codAvailable: boolean;
  from: string;
  to: string;
  place: string | null;
  /** "live" = Shiprocket courier data; "estimate" = policy windows by city tier. */
  source: "live" | "estimate";
};

/** City/state for a pincode from India Post's public directory (cached 30 days). */
export async function lookupPincode(pin: string): Promise<{ city: string; state: string } | null> {
  if (!/^[1-9]\d{5}$/.test(pin)) return null;
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`, { next: { revalidate: 86400 * 30 }, signal: AbortSignal.timeout(4000) });
    const [data] = (await res.json()) as { Status: string; PostOffice: { District: string; State: string }[] | null }[];
    const po = data?.Status === "Success" ? data.PostOffice?.[0] : null;
    return po ? { city: po.District, state: po.State } : null;
  } catch {
    return null;
  }
}

/**
 * Delivery date range + COD availability for a pincode. Uses live Shiprocket courier data when
 * configured (dispatch days from settings + the recommended courier's transit days), otherwise
 * the shipping-policy windows. Never throws: a Shiprocket outage falls back to the estimate.
 */
export async function deliveryQuote(pin: string): Promise<DeliveryQuote | null> {
  if (!/^[1-9]\d{5}$/.test(pin)) return null;
  const [place, shipping, sr] = await Promise.all([lookupPincode(pin), getSettings("shipping"), getSettings("shiprocket")]);
  const placeName = place ? `${place.city}, ${place.state}` : null;

  if (shiprocketConfigured() && sr.liveEstimates) {
    try {
      const s = await serviceability(sr.pickupPostcode, pin, { weightKg: sr.weightKg, cod: false });
      if (!s.serviceable) return { serviceable: false, codAvailable: false, from: "", to: "", place: placeName, source: "live" };
      const [hMin, hMax] = dayRange(shipping.processingDays, [1, 2]);
      const transit = s.days ?? 4;
      const now = new Date();
      return {
        serviceable: true,
        codAvailable: shipping.codEnabled && s.codAvailable,
        from: fmtDay(addBusinessDays(now, hMin + transit)),
        to: fmtDay(addBusinessDays(now, hMax + transit + 1)),
        place: placeName,
        source: "live",
      };
    } catch (e) {
      console.error("[shiprocket] serviceability failed, using estimate:", e instanceof Error ? e.message : e);
    }
  }

  if (!place) return null;
  const est = estimateDelivery(place);
  return { serviceable: true, codAvailable: shipping.codEnabled, from: est.from, to: est.to, place: placeName, source: "estimate" };
}
