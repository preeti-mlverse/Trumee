import type { MetadataRoute } from "next";
import { SITE } from "@/lib/seo";

/** Private or near-duplicate URLs no crawler needs. */
const PRIVATE = ["/admin", "/api/", "/cart", "/checkout", "/account", "/orders/", "/wishlist", "/search", "/*?*sort=", "/*?*size=", "/*?*min="];

/**
 * AI search & assistant crawlers, named explicitly so the intent is unambiguous (and so a future
 * blanket rule can't silently shut them out). Being crawlable by these is what makes Trumee citable
 * in ChatGPT search, Perplexity, Claude, Gemini / AI Overviews, Copilot and Apple Intelligence.
 */
const AI_CRAWLERS = [
  "OAI-SearchBot", // ChatGPT search index
  "ChatGPT-User", // ChatGPT fetching a page for a user
  "GPTBot", // OpenAI model training
  "PerplexityBot",
  "Perplexity-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "Google-Extended", // Gemini / AI Overviews grounding opt-in
  "Applebot-Extended",
  "Bingbot", // also powers Copilot answers
  "CCBot", // Common Crawl, used by many open models
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE },
      // Each group must repeat the disallows: a crawler follows only the most specific group naming it.
      { userAgent: AI_CRAWLERS, allow: ["/", "/llms.txt", "/llms-full.txt"], disallow: PRIVATE },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
