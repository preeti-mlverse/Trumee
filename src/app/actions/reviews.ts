"use server";

import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { getCustomer } from "@/lib/auth";

const schemaIn = z.object({
  productId: z.coerce.number().int().positive(),
  name: z.string().trim().min(1, "Please add your name").max(80),
  email: z.string().trim().email("Please enter a valid email"),
  rating: z.coerce.number().int().min(1, "Please choose a rating").max(5),
  title: z.string().trim().max(120).optional(),
  body: z.string().trim().min(10, "Tell us a little more (10+ characters)").max(3000),
});

export async function submitReview(_: unknown, form: FormData): Promise<{ ok: boolean; message: string }> {
  const parsed = schemaIn.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const d = parsed.data;
  const customer = await getCustomer();
  // "Verified buyer" when this email has a paid/COD order containing the product
  const bought = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.orderItems)
    .innerJoin(schema.orders, eq(schema.orders.id, schema.orderItems.orderId))
    .where(and(eq(schema.orderItems.productId, d.productId), sql`lower(${schema.orders.email}) = lower(${d.email})`, sql`${schema.orders.status} <> 'cancelled'`));
  await db.insert(schema.reviews).values({
    productId: d.productId,
    customerId: customer?.id ?? null,
    name: d.name,
    email: d.email,
    rating: d.rating,
    title: d.title || null,
    body: d.body,
    verified: bought[0].n > 0,
    status: "pending",
  });
  return { ok: true, message: "Thank you! Your review will appear once it’s approved." };
}
