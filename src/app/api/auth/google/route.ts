import crypto from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { googleAuthUrl, googleConfigured, siteUrl } from "@/lib/social-auth";

/** "Continue with Google": remembers where to return to, then hands over to Google. */
export async function GET(req: NextRequest) {
  if (!googleConfigured()) return NextResponse.redirect(`${siteUrl()}/account/login?error=google`);
  const next = req.nextUrl.searchParams.get("next") ?? "/account";
  const safe = next.startsWith("/") && !next.startsWith("//") ? next : "/account";
  const state = crypto.randomBytes(16).toString("hex");
  (await cookies()).set("tm_oauth", JSON.stringify({ state, next: safe }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
  return NextResponse.redirect(googleAuthUrl(state));
}
