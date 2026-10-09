/**
 * Set (or create) the owner login from ADMIN_EMAIL / ADMIN_PASSWORD in .env.
 * Use after copying the database to a new server, or to reset a forgotten password.
 *
 *   npm run admin:set
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/db/schema";

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase() ?? "";
const password = process.env.ADMIN_PASSWORD;
if (!email || !password) {
  console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD in .env first.");
  process.exit(1);
}
if (password.length < 10) {
  console.error("ADMIN_PASSWORD must be at least 10 characters.");
  process.exit(1);
}

const client = postgres(process.env.DATABASE_URL!, { max: 1 });
const db = drizzle(client, { schema });

async function main() {
  const passwordHash = await bcrypt.hash(password, 11);
  const existing = await db.query.staff.findFirst({ where: (s, { eq }) => eq(s.email, email) });
  if (existing) {
    await db.update(schema.staff).set({ passwordHash }).where(eq(schema.staff.id, existing.id));
    console.log(`Password updated for ${email}.`);
  } else {
    await db.insert(schema.staff).values({ email, name: "Store Owner", role: "owner", passwordHash });
    console.log(`Created owner account ${email}.`);
  }
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
