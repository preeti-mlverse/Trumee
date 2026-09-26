import { NextResponse, type NextRequest } from "next/server";
import { ingest, type CollectPayload } from "@/lib/analytics/server";

export async function POST(req: NextRequest) {
  let body: CollectPayload;
  try {
    const text = await req.text();
    if (text.length > 16_000) return new NextResponse(null, { status: 413 });
    body = JSON.parse(text);
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  try {
    await ingest(body, req.headers);
  } catch (e) {
    console.error("[collect]", e);
  }
  return new NextResponse(null, { status: 204 });
}
