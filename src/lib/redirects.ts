import "server-only";
import { eq, sql } from "drizzle-orm";
import { notFound, permanentRedirect } from "next/navigation";
import { db, schema } from "@/db";

/** Call when a page can't find its record: follows an admin-defined 301 or 404s. */
export async function redirectOrNotFound(path: string): Promise<never> {
  const r = await db.query.redirects.findFirst({ where: eq(schema.redirects.fromPath, path) });
  if (r) {
    await db.update(schema.redirects).set({ hits: sql`${schema.redirects.hits} + 1` }).where(eq(schema.redirects.id, r.id));
    permanentRedirect(r.toPath);
  }
  notFound();
}
