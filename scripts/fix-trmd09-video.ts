/**
 * Points the Schiffli tiered midi dress (and anything else using it) at the trimmed try-on clip.
 * The old trmd09 clip opened with 5 seconds of a different dress; trmd09-v2 starts on this dress.
 * New file names so browsers that cached the old clip (1-year cache) fetch the new one.
 *
 *   npx tsx scripts/fix-trmd09-video.ts
 */
import "dotenv/config";
import postgres from "postgres";

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { max: 1, onnotice: () => {} });
  try {
    const products = await sql`
      update products set video_url = '/videos/trmd09-v2.mp4', video_poster = '/videos/trmd09-v2.webp', updated_at = now()
      where video_url = '/videos/trmd09.mp4' returning handle`;
    console.log(`✓ products updated: ${products.map((p) => p.handle).join(", ") || "none"}`);
    const settings = await sql`
      update settings set value = replace(value::text, '/videos/trmd09.', '/videos/trmd09-v2.')::jsonb
      where value::text like '%/videos/trmd09.%' returning key`;
    console.log(`✓ settings updated: ${settings.map((s) => s.key).join(", ") || "none"}`);
  } finally {
    await sql.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
