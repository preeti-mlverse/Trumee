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

/** Online-payment incentive, editable in Admin → Settings → Payments. */
export type PaymentSettings = {
  /** % off the order (after other discounts, before shipping) when paying online. 0 = off. */
  prepaidDiscountPercent: number;
  /** Cap on the prepaid saving, in paise; null = no cap. */
  prepaidDiscountMax: number | null;
  /** Orders below this subtotal (paise) don't get it; 0 = any order. */
  prepaidDiscountMinOrder: number;
  /** Payment methods offered in the Razorpay window (hidden ones aren't shown). */
  methods: Record<PaymentMethodKey, boolean>;
  /** Business name at the top of the Razorpay window. */
  checkoutName: string;
  /** Default refund speed: normal (5–7 working days, free) or optimum (instant where possible, small fee). */
  refundSpeed: "normal" | "optimum";
};

export const PAYMENT_METHODS = [
  { key: "upi", label: "UPI", hint: "GPay, PhonePe, Paytm, any UPI app" },
  { key: "card", label: "Cards", hint: "Debit and credit cards" },
  { key: "netbanking", label: "Netbanking", hint: "All major banks" },
  { key: "wallet", label: "Wallets", hint: "Paytm, PhonePe, Amazon Pay wallets" },
  { key: "emi", label: "EMI", hint: "Card and cardless EMI" },
  { key: "paylater", label: "Pay later", hint: "Simpl, LazyPay, ICICI PayLater…" },
] as const;
export type PaymentMethodKey = (typeof PAYMENT_METHODS)[number]["key"];

/**
 * Shiprocket logistics. Login credentials live in env (SHIPROCKET_EMAIL / SHIPROCKET_PASSWORD),
 * never in the database; everything else is editable in Admin → Settings → Shipping.
 */
export type ShiprocketSettings = {
  /** Live delivery dates from Shiprocket on product pages and checkout (falls back to estimates). */
  liveEstimates: boolean;
  /** Push every confirmed order to Shiprocket automatically. */
  autoCreateOrders: boolean;
  /** Pickup address nickname exactly as set in Shiprocket → Settings → Pickup Addresses. */
  pickupLocation: string;
  pickupPostcode: string;
  /** Default parcel used when a product has no weight of its own. */
  weightKg: number;
  lengthCm: number;
  breadthCm: number;
  heightCm: number;
  /** Which courier "Ship now" books: Shiprocket's recommendation, the cheapest, or the fastest. */
  courierPreference: "recommended" | "cheapest" | "fastest";
  /** Request the courier pickup right after the AWB is assigned. Off = schedule it in Shiprocket yourself. */
  autoPickup: boolean;
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

/**
 * One hero slide. `layout` picks the composition:
 * motion = full-bleed campaign video · banner = a finished wide artwork shown whole + shoppable strip · scenic = full-bleed landscape photo ·
 * runway = catwalk loops side by side · split = photo beside a cream copy panel ·
 * duo = a brand-coloured copy panel beside two tall media panes (catwalk loops or photos).
 */
export type HeroSlide = {
  layout?: "motion" | "banner" | "duo" | "scenic" | "runway" | "split";
  /** banner: collection whose pieces are shown in the shoppable strip; `featured` handles lead it */
  collection?: string;
  featured?: string[];
  /** motion: landscape video (desktop) and portrait crop (phones); `image`/`mobileImage` are their posters */
  video?: string;
  mobileVideo?: string;
  /** How long the slide stays up, in ms (defaults to 7000) */
  duration?: number;
  image: string;
  /** Portrait crop used on phones */
  mobileImage?: string;
  /** CSS object-position for the phone image, e.g. "20% 0%" */
  mobileFocus?: string;
  eyebrow: string;
  title: string;
  /** Italic words appended to the title */
  accent?: string;
  text?: string;
  cta: string;
  href: string;
  secondary?: { label: string; href: string };
  /** split: small detail tiles beside the copy */
  details?: { image: string; label: string; href: string }[];
  /** duo: the two panes (video loops play while the slide is up) */
  media?: { image: string; video?: string; href: string; label: string }[];
  /** duo: panel colour — sea (umbrella blue) or sun (mustard) */
  tone?: "sea" | "sun";
  /** Short name on the slide tab */
  tab?: string;
};

export type HomeSettings = {
  heroSlides: HeroSlide[];
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
  payments: {
    prepaidDiscountPercent: 0,
    prepaidDiscountMax: null,
    prepaidDiscountMinOrder: 0,
    methods: { upi: true, card: true, netbanking: true, wallet: true, emi: true, paylater: true },
    checkoutName: "Trumee",
    refundSpeed: "normal",
  } satisfies PaymentSettings,
  shiprocket: {
    liveEstimates: true,
    autoCreateOrders: false,
    pickupLocation: "Primary",
    pickupPostcode: "122017",
    weightKg: 0.4,
    lengthCm: 30,
    breadthCm: 25,
    heightCm: 4,
    courierPreference: "recommended",
    autoPickup: true,
  } satisfies ShiprocketSettings,
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
        layout: "motion",
        tab: "In full bloom",
        video: "/videos/hero-motion.mp4",
        mobileVideo: "/videos/hero-motion-portrait.mp4",
        image: "/videos/hero-motion.webp",
        mobileImage: "/videos/hero-motion-portrait.webp",
        eyebrow: "The new season",
        title: "Bloom, wander,",
        accent: "repeat",
        text: "Florals, crochet and schiffli made for sunlit days — our new season, in full bloom.",
        cta: "Shop the collection",
        href: "/collections/all",
        secondary: { label: "New in", href: "/collections/all?sort=newest" },
      },
      {
        layout: "duo",
        tone: "sea",
        tab: "Crisp & casual",
        image: "/videos/trmsh02.webp",
        eyebrow: "The shirt edit",
        title: "Crisp & casual,",
        accent: "made to wander",
        text: "Denim yokes, checks and schiffli-trimmed cotton — throw on, tie up, head out.",
        cta: "Shop shirts",
        href: "/collections/shirts",
        collection: "shirts",
        featured: ["checkered-yoke-denim-shirt-with-roll-up-sleeves"],
        media: [
          { image: "/videos/trmsh02.webp", video: "/videos/trmsh02.mp4", href: "/products/checkered-yoke-denim-shirt-with-roll-up-sleeves", label: "Checkered yoke denim shirt" },
          { image: "/videos/trmsh01.webp", video: "/videos/trmsh01.mp4", href: "/products/red-cotton-check-shirt-with-schiffli-embroidery-and-hood", label: "Red check schiffli shirt" },
        ],
      },
      {
        layout: "duo",
        tone: "sun",
        tab: "One-piece wonder",
        image: "/images/products/ombre-cotton-schiffli-dungaree-style-jumpsuit/1.webp",
        eyebrow: "Jumpsuits & dungarees",
        title: "One-piece",
        accent: "wonder",
        text: "Schiffli cotton with scalloped hems and button straps — one piece, zero effort, all day.",
        cta: "Shop jumpsuits",
        href: "/collections/jumpsuit",
        collection: "jumpsuit",
        featured: ["ombre-cotton-schiffli-dungaree-style-jumpsuit"],
        media: [
          { image: "/images/products/ombre-cotton-schiffli-dungaree-style-jumpsuit/1.webp", href: "/products/ombre-cotton-schiffli-dungaree-style-jumpsuit", label: "Ombre schiffli dungaree" },
          { image: "/images/products/scalloped-schiffli-cotton-jumpsuit-with-button-details/1.webp", href: "/products/scalloped-schiffli-cotton-jumpsuit-with-button-details", label: "Scalloped schiffli jumpsuit" },
        ],
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
  payments: PaymentSettings;
  shiprocket: ShiprocketSettings;
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
