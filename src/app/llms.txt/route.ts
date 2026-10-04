import { llmsIndex } from "@/lib/llms";

export const revalidate = 3600;

/** /llms.txt — a plain-language map of the store for AI assistants and answer engines. */
export async function GET() {
  return new Response(await llmsIndex(), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
