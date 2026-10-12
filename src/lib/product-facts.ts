/**
 * Normalised product facts shared by Product JSON-LD, the Merchant Center feed and /llms-full.txt,
 * so Google, Bing and AI assistants all see the same colour / pattern / category for a piece.
 */

// Most variants carry only a size, so colour is read from the product name when no option is set.
const COLORS: [RegExp, string][] = [
  [/\b(multi-?colou?r|vibrant|patchwork|rainbow)\b/i, "Multicolor"],
  [/\bombre\b/i, "Multicolor"],
  [/\bmustard\b/i, "Mustard"],
  [/\b(scarlet|red)\b/i, "Red"],
  [/\brust\b/i, "Rust"],
  [/\bmauve\b/i, "Mauve"],
  [/\b(misty rose|pink|rose)\b/i, "Pink"],
  [/\bpeach\b/i, "Peach"],
  [/\bolive\b/i, "Olive"],
  [/\b(sea blue|blue|denim)\b/i, "Blue"],
  [/\bblack\b/i, "Black"],
  [/\bmonochrome\b/i, "Black/White"],
  [/\b(vanilla|cream|ivory|off-white)\b/i, "Cream"],
  [/\bwhite\b/i, "White"],
  [/\bpastel\b/i, "Pastel"],
];

const PATTERNS: [RegExp, string][] = [
  [/\bfloral\b/i, "Floral"],
  [/\bpaisley\b/i, "Paisley"],
  [/\b(check|checkered|checked|plaid)\b/i, "Checked"],
  [/\b(swiss dot|polka)\b/i, "Dotted"],
  [/\bgeometric\b/i, "Geometric"],
  [/\babstract\b/i, "Abstract"],
  [/\bombre\b/i, "Ombre"],
  [/\b(print|printed)\b/i, "Printed"],
];

/** Variant option first, then a `colour:<Name>` product tag, then a colour word in the name. */
export function colorOf(title: string, option?: string | null, tags: string[] = []) {
  if (option) return option;
  const tag = tags.find((t) => t.toLowerCase().startsWith("colour:"));
  if (tag) return tag.slice(7).trim();
  return COLORS.find(([re]) => re.test(title))?.[1];
}

export function patternOf(title: string, tags: string[] = []) {
  const text = `${title} ${tags.join(" ")}`;
  return PATTERNS.find(([re]) => re.test(text))?.[1];
}

/** Google product taxonomy path for our product types. */
export const GOOGLE_CATEGORY: Record<string, string> = {
  Dresses: "Apparel & Accessories > Clothing > Dresses",
  Tops: "Apparel & Accessories > Clothing > Shirts & Tops",
  Shirts: "Apparel & Accessories > Clothing > Shirts & Tops",
  Skirts: "Apparel & Accessories > Clothing > Skirts",
  Jumpsuits: "Apparel & Accessories > Clothing > One-Pieces > Jumpsuits & Rompers",
  "Co-ord Sets": "Apparel & Accessories > Clothing > Outfit Sets",
};

/** Craft details worth stating plainly to search engines and assistants. */
export function craftOf(title: string, tags: string[] = []) {
  const text = `${title} ${tags.join(" ")}`.toLowerCase();
  return [
    /crochet/.test(text) && "Crochet lace",
    /schiffli/.test(text) && "Schiffli embroidery",
    /embroider|dori/.test(text) && !/schiffli/.test(text) && "Embroidery",
    /scallop/.test(text) && "Scalloped hem",
  ].filter(Boolean) as string[];
}

/** Parses "2–4 business days" style ranges; falls back to the given default. */
export function dayRange(text: string | undefined, fallback: [number, number]): [number, number] {
  const m = text?.match(/(\d+)\s*[–-]\s*(\d+)/);
  return m ? [Number(m[1]), Number(m[2])] : fallback;
}

/**
 * Colour families for "Shop by colour" and the colour filter. Each product is tagged
 * `colour-<key>` (see scripts/tag-colour-families.ts); the URL uses ?colour=<key>.
 */
export const COLOUR_FAMILIES = [
  { key: "red", label: "Red & maroon", swatch: "#b3262e", names: ["Red", "Maroon", "Scarlet", "Wine"] },
  { key: "pink", label: "Pink & peach", swatch: "#e48aa0", names: ["Pink", "Peach", "Rose", "Blush", "Coral"] },
  { key: "yellow", label: "Mustard & yellow", swatch: "#d9a21b", names: ["Mustard", "Yellow"] },
  { key: "rust", label: "Rust & earth", swatch: "#a8502f", names: ["Rust", "Brown", "Tan"] },
  { key: "blue", label: "Blue & navy", swatch: "#24507a", names: ["Blue", "Navy", "Denim"] },
  { key: "green", label: "Green & olive", swatch: "#6b7a3a", names: ["Green", "Olive", "Sage"] },
  { key: "purple", label: "Purple & mauve", swatch: "#8b6aa8", names: ["Purple", "Mauve", "Lavender", "Lilac"] },
  { key: "white", label: "White & cream", swatch: "#efe8da", names: ["White", "Cream", "Ivory"] },
  { key: "black", label: "Black & monochrome", swatch: "#161616", names: ["Black", "Black/White"] },
  { key: "multi", label: "Multicolour", swatch: "conic-gradient(#b3262e, #d9a21b, #6b7a3a, #24507a, #8b6aa8, #e48aa0, #b3262e)", names: ["Multicolor", "Pastel"] },
] as const;

export type ColourKey = (typeof COLOUR_FAMILIES)[number]["key"];
export const colourTag = (key: string) => `colour-${key}`;

/** Family for a colour name ("Navy" → blue), or null when unknown. */
export function colourFamily(name: string | undefined | null) {
  if (!name) return null;
  const n = name.trim().toLowerCase();
  return COLOUR_FAMILIES.find((f) => f.names.some((x) => x.toLowerCase() === n)) ?? null;
}
