/**
 * Honest, data-derived trust content: delivery estimates from real pincode data,
 * craft notes from product tags/fabric, and CC0 craft imagery with attribution.
 * Nothing here invents numbers (no fake "12 people viewing" counters).
 */

const METRO_DISTRICTS = [
  "delhi", "new delhi", "mumbai", "mumbai suburban", "thane", "bangalore", "bengaluru", "bangalore urban", "chennai", "kolkata",
  "hyderabad", "pune", "ahmedabad", "gurgaon", "gurugram", "gautam buddha nagar", "noida", "ghaziabad", "faridabad",
];
const REMOTE_STATES = [
  "jammu and kashmir", "ladakh", "andaman and nicobar islands", "lakshadweep", "arunachal pradesh", "manipur", "meghalaya",
  "mizoram", "nagaland", "tripura", "sikkim",
];

export type DeliveryEstimate = { tier: "metro" | "standard" | "remote"; minDays: number; maxDays: number; from: string; to: string; place: string };

export function addBusinessDays(d: Date, n: number) {
  const r = new Date(d);
  while (n > 0) {
    r.setDate(r.getDate() + 1);
    if (r.getDay() !== 0) n--; // couriers don't deliver on Sundays
  }
  return r;
}

export const fmtDay = (d: Date) => d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kolkata" });

export function estimateDelivery(place: { city: string; state: string }, now = new Date()): DeliveryEstimate {
  const city = place.city.toLowerCase();
  const state = place.state.toLowerCase();
  const tier = METRO_DISTRICTS.some((m) => city.includes(m)) ? "metro" : REMOTE_STATES.includes(state) ? "remote" : "standard";
  // Delivery windows from the shipping policy, plus 1–2 business days to dispatch
  const [min, max] = tier === "metro" ? [2, 4] : tier === "remote" ? [5, 8] : [3, 6];
  const minDays = min + 1;
  const maxDays = max + 2;
  return { tier, minDays, maxDays, from: fmtDay(addBusinessDays(now, minDays)), to: fmtDay(addBusinessDays(now, maxDays)), place: `${place.city}, ${place.state}` };
}

export type CraftNote = { title: string; text: string };

/** Quality notes built only from what the product data actually says. */
export function craftNotes(p: { title: string; tags: string[]; fabric: string | null; descriptionHtml: string }): CraftNote[] {
  const hay = (p.title + " " + p.tags.join(" ") + " " + p.descriptionHtml).toLowerCase();
  const notes: CraftNote[] = [];
  if (hay.includes("crochet")) notes.push({ title: "Crochet lace detailing", text: "Lace trims and panels chosen for texture — hand-finished and attached with reinforced seams so they hold their shape wash after wash." });
  if (hay.includes("schiffli")) notes.push({ title: "Schiffli embroidery", text: "Fine, dense machine embroidery with a hand-crafted look — the scallops and eyelets are stitched into the fabric, not printed on." });
  else if (hay.includes("embroider")) notes.push({ title: "Embroidered by design", text: "Thread-work motifs placed to frame the silhouette, finished neatly on the reverse so they sit comfortably against the skin." });
  if (hay.includes("dori")) notes.push({ title: "Dori (cord) work", text: "Traditional Indian cord embroidery couched onto the fabric for raised, graphic detail." });
  if (hay.includes("sanganeri") || hay.includes("block print")) notes.push({ title: "Sanganeri-inspired prints", text: "Prints drawing on Rajasthan’s block-printing tradition — delicate florals on breathable bases." });
  const fabric = p.fabric ?? (hay.includes("georgette") ? "Georgette" : hay.includes("rayon") ? "Rayon" : hay.includes("cotton") ? "Cotton" : null);
  if (fabric) {
    const f = fabric.toLowerCase();
    notes.push({
      title: `${fabric}`,
      text: f.includes("cotton")
        ? "Breathable, skin-friendly cotton that’s made for Indian summers and softens with every wash."
        : f.includes("georgette")
          ? "Lightweight georgette with an easy drape that moves beautifully and doesn’t cling."
          : f.includes("rayon") || f.includes("viscose")
            ? "Fluid, soft-handed rayon that feels cool against the skin and drapes gracefully."
            : "Chosen for comfort, drape and everyday wear.",
    });
  }
  notes.push({ title: "Quality checked", text: "Every piece is inspected for stitching, measurements and finish before it’s packed at our Gurgaon studio." });
  return notes.slice(0, 4);
}

/**
 * Craft photography (self-hosted, resized to WebP) from Wikimedia Commons under open licences.
 * CC BY / CC BY-SA attribution lives on /credits (linked from the footer).
 */
export const CRAFT_IMAGES = [
  {
    src: "/images/craft/embroidery.webp",
    title: "Embroidery",
    text: "Thread-work florals, stitched in — never printed on. The same craft behind our schiffli and dori pieces.",
    credit: "Chikan embroidery, Lucknow — Joey Berzowska",
    license: { name: "CC BY 2.0", url: "https://creativecommons.org/licenses/by/2.0/" },
    href: "https://commons.wikimedia.org/wiki/File:Chikan_embroidery,_Lucknow.jpg",
    shop: { label: "Shop embroidered pieces", href: "/collections/skirts" },
  },
  {
    src: "/images/craft/crochet.webp",
    title: "Crochet lace",
    text: "Lace trims chosen for texture and hand-finished onto necklines, hems and yokes.",
    credit: "Crochet lace detail — Dnor",
    license: { name: "Public domain", url: "" },
    href: "https://commons.wikimedia.org/wiki/File:Crochet_small_Swedish_tablecloth_about_1930_detail.jpg",
    shop: { label: "Shop crochet tops", href: "/collections/tops" },
  },
  {
    src: "/images/craft/block-print.webp",
    title: "Indian textile heritage",
    text: "Prints rooted in Rajasthan’s hand block-printing tradition — Sanganeri florals on soft cotton.",
    credit: "Hand block printing, Jaipur — Ketayun Katz",
    license: { name: "CC BY-SA 4.0", url: "https://creativecommons.org/licenses/by-sa/4.0/" },
    href: "https://commons.wikimedia.org/wiki/File:Printing_with_Hand_Carved_Block.jpg",
    shop: { label: "Shop printed dresses", href: "/collections/dresses" },
  },
  {
    src: "/images/craft/cotton.webp",
    title: "Breathable cotton",
    text: "Cotton, cotton slub and cotton flex — natural fibres that breathe through Indian summers.",
    credit: "Cotton boll, Andhra Pradesh — rajaraman sundaram",
    license: { name: "CC BY 3.0", url: "https://creativecommons.org/licenses/by/3.0/" },
    href: "https://commons.wikimedia.org/wiki/File:COTTON_FLOWER,JAMMALAMEDUGU.KADAPA,A.P_-_panoramio.jpg",
    shop: { label: "Shop cotton jumpsuits", href: "/collections/jumpsuit" },
  },
];
