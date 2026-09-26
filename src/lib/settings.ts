import "server-only";
import { unstable_cache } from "next/cache";
import { db, schema } from "@/db";

export type NavLink = { label: string; href: string; children?: NavLink[] };

export type StoreSettings = {
  name: string;
  tagline: string;
  legalName: string;
  gstin: string;
  email: string;
  phone: string;
  whatsapp: string;
  address: string;
  supportHours: string;
  social: { instagram?: string; youtube?: string; facebook?: string; pinterest?: string };
  announcement: { enabled: boolean; text: string; href?: string };
};

export type ShippingSettings = {
  flatRate: number; // paise
  freeShippingThreshold: number | null; // paise; null = never free
  codEnabled: boolean;
  codFee: number; // paise
  codMaxOrder: number | null; // paise
  processingDays: string;
  deliveryEstimates: { label: string; days: string }[];
};

export type TaxSettings = {
  pricesIncludeTax: boolean;
  /** GST on apparel: lowRate up to the per-unit threshold, highRate above it. */
  threshold: number; // paise
  lowRate: number;
  highRate: number;
};

export type IntegrationSettings = {
  ga4MeasurementId: string;
  metaPixelId: string;
  googleSiteVerification: string;
  clarityId: string;
};

export type HomeSettings = {
  heroSlides: { image: string; eyebrow: string; title: string; cta: string; href: string }[];
  featuredCollections: string[]; // handles
  spotlight: { image: string; title: string; text: string; href: string }[];
  testimonials: { name: string; text: string }[];
};

export const DEFAULTS = {
  store: {
    name: "Trumee",
    tagline: "Effortless fashion for the free-spirited",
    legalName: "Nirantaa Clothing Private Limited",
    gstin: "",
    email: "contact@trumee.in",
    phone: "+91 99869 50695",
    whatsapp: "919986950695",
    address: "T-162, Ground Floor, Sector 109, New Palam Vihar, Carterpuri Road, Gurgaon 122017, Haryana",
    supportHours: "Mon–Sat, 10 AM – 6 PM IST",
    social: { instagram: "https://www.instagram.com/trumee.in/", youtube: "https://www.youtube.com/@trumeestudio", facebook: "https://www.facebook.com/trumee.in" },
    announcement: {
      enabled: true,
      text: "Flat ₹29 shipping across India · Easy 7-day returns",
      href: "/pages/shipping-policy",
    },
  } satisfies StoreSettings,
  shipping: {
    flatRate: 2900,
    freeShippingThreshold: null,
    codEnabled: true,
    codFee: 0,
    codMaxOrder: 500000,
    processingDays: "1–2 business days",
    deliveryEstimates: [
      { label: "Metro cities", days: "2–4 business days" },
      { label: "Tier 2 & 3 cities", days: "3–6 business days" },
      { label: "Remote areas", days: "5–8 business days" },
    ],
  } satisfies ShippingSettings,
  tax: { pricesIncludeTax: true, threshold: 250000, lowRate: 5, highRate: 18 } satisfies TaxSettings,
  integrations: {
    ga4MeasurementId: "",
    metaPixelId: "",
    googleSiteVerification: "",
    clarityId: "",
  } satisfies IntegrationSettings,
  navigation: [
    {
      label: "Shop",
      href: "/collections/all",
      children: [
        { label: "Dresses", href: "/collections/dresses" },
        { label: "Tops", href: "/collections/tops" },
        { label: "Skirts", href: "/collections/skirts" },
        { label: "Jumpsuits", href: "/collections/jumpsuit" },
        { label: "Shirts", href: "/collections/shirts" },
        { label: "Co-ord Sets", href: "/collections/co-ord-sets" },
      ],
    },
    {
      label: "Edits",
      href: "/collections",
      children: [
        { label: "Moodboard Essentials", href: "/collections/main-character-energy" },
        { label: "Nine to Thrive", href: "/collections/in-her-element" },
        { label: "Wander x Wear", href: "/collections/wander-x-wear" },
        { label: "After the Rain", href: "/collections/after-the-rain" },
        { label: "Free Spirited", href: "/collections/free-spirited" },
        { label: "Nomadic Escapes", href: "/collections/escape-edit" },
      ],
    },
    { label: "Bestsellers", href: "/collections/all?sort=best-selling" },
    { label: "Journal", href: "/blogs/news" },
    { label: "About", href: "/pages/about-us" },
  ] satisfies NavLink[],
  home: {
    heroSlides: [
      {
        image: "/images/lifestyle/hero-pink-wall.webp",
        eyebrow: "The Summer Edit",
        title: "Dressed for days that don’t follow a plan",
        cta: "Explore the collection",
        href: "/collections/all",
      },
      {
        image: "/images/lifestyle/lake-rust.webp",
        eyebrow: "Nomadic Escapes",
        title: "For your soul’s expedition",
        cta: "Escape in style",
        href: "/collections/escape-edit",
      },
      {
        image: "/images/lifestyle/forest-blue.webp",
        eyebrow: "Free Spirited",
        title: "Flowy silhouettes, earthy prints",
        cta: "Shop the edit",
        href: "/collections/free-spirited",
      },
    ],
    featuredCollections: ["main-character-energy", "in-her-element", "wander-x-wear", "after-the-rain", "free-spirited", "escape-edit"],
    spotlight: [
      {
        image: "/images/products/vibrant-embroidered-cotton-flex-skirt/1.webp",
        title: "Let the skirt do the talking",
        text: "Embroidered, timeless, effortless.",
        href: "/collections/skirts",
      },
      {
        image: "/images/products/mustard-artistic-print-cord-set-with-crochet-lace-accents/1.webp",
        title: "Not your basic co-ord",
        text: "Sketch it, lace it, flaunt it.",
        href: "/collections/co-ord-sets",
      },
      {
        image: "/images/products/misty-rose-pink-sleeveless-top-with-crochet-lace-and-schiffli-embroidery/1.webp",
        title: "Crochet meets Sanganeri",
        text: "The drama is in the details.",
        href: "/collections/tops",
      },
    ],
    testimonials: [
      { name: "Shreya", text: "OMG, these are the freshest and most amazing clothes I’ve seen. Absolutely in love with this collection!" },
      { name: "Shruti", text: "The clothes from Trumee are trendy and stylish! Both the top and dress fit beautifully and feel incredibly comfortable." },
      { name: "Monica", text: "As good as in the pictures. Very happy with the purchase — material is very good, stylish design." },
    ],
  } satisfies HomeSettings,
};

export type SettingsMap = {
  store: StoreSettings;
  shipping: ShippingSettings;
  tax: TaxSettings;
  integrations: IntegrationSettings;
  navigation: NavLink[];
  home: HomeSettings;
};
export type SettingKey = keyof SettingsMap;

const loadAll = unstable_cache(
  async () => {
    const rows = await db.select().from(schema.settings);
    return Object.fromEntries(rows.map((r) => [r.key, r.value])) as Partial<SettingsMap>;
  },
  ["settings"],
  { tags: ["settings"], revalidate: 300 },
);

export async function getSettings<K extends SettingKey>(key: K): Promise<SettingsMap[K]> {
  const all = await loadAll();
  const stored = all[key];
  const def = DEFAULTS[key] as SettingsMap[K];
  if (stored == null) return def;
  if (Array.isArray(def)) return stored as SettingsMap[K];
  return { ...(def as object), ...(stored as object) } as SettingsMap[K];
}

export async function saveSettings<K extends SettingKey>(key: K, value: SettingsMap[K]) {
  await db
    .insert(schema.settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: schema.settings.key, set: { value, updatedAt: new Date() } });
}
