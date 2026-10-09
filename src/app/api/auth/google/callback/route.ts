import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { startCustomerSession } from "@/lib/auth";
import { customerFromGoogle, googleProfile, siteUrl } from "@/lib/social-auth";

/** Google sends the shopper back here; we check the state, read their verified email and sign them in. */
export async function GET(req: NextRequest) {
  const jar = await cookies();
  const raw = jar.get("tm_oauth")?.value;
  jar.delete("tm_oauth");
  const fail = (reason: string) => NextResponse.redirect(`${siteUrl()}/account/login?error=${reason}`);

  let saved: { state: string; next: string };
  try {
    saved = JSON.parse(raw ?? "");
  } catch {
    return fail("google");
  }
  const code = req.nextUrl.searchParams.get("code");
  if (!code || req.nextUrl.searchParams.get("state") !== saved.state) return fail("google");

  try {
    const profile = await googleProfile(code);
    const c = await customerFromGoogle(profile);
    await startCustomerSession(c.id);
    return NextResponse.redirect(`${siteUrl()}${saved.next}${c.created ? (saved.next.includes("?") ? "&" : "?") + "welcome=1" : ""}`);
  } catch (e) {
    console.error("[google sign-in]", e instanceof Error ? e.message : e);
    return fail("google");
  }
}
