"use server";

import { z } from "zod";
import { db, schema } from "@/db";
import { sendEmail } from "@/lib/email";
import { getSettings } from "@/lib/settings";

const email = z.string().trim().toLowerCase().email();

export async function subscribe(_: unknown, form: FormData): Promise<{ ok: boolean; message: string }> {
  const parsed = email.safeParse(form.get("email"));
  if (!parsed.success) return { ok: false, message: "Please enter a valid email address." };
  await db
    .insert(schema.subscribers)
    .values({ email: parsed.data, source: String(form.get("source") || "footer") })
    .onConflictDoUpdate({ target: schema.subscribers.email, set: { unsubscribed: false } });
  return { ok: true, message: "You’re on the list — watch your inbox for new drops." };
}

const contactSchema = z.object({
  name: z.string().trim().min(1, "Please tell us your name").max(120),
  email,
  phone: z.string().trim().max(20).optional(),
  message: z.string().trim().min(5, "Please write a short message").max(4000),
});

export async function sendContact(_: unknown, form: FormData): Promise<{ ok: boolean; message: string }> {
  const parsed = contactSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  await db.insert(schema.contactMessages).values(parsed.data);
  const store = await getSettings("store");
  await sendEmail({
    to: store.email,
    subject: `New message from ${parsed.data.name}`,
    html: `<p><b>${parsed.data.name}</b> (${parsed.data.email}${parsed.data.phone ? ", " + parsed.data.phone : ""}) wrote:</p><p>${parsed.data.message.replace(/</g, "&lt;").replace(/\n/g, "<br>")}</p>`,
    replyTo: parsed.data.email,
  });
  return { ok: true, message: "Thanks for writing to us! We’ll get back within one business day." };
}
