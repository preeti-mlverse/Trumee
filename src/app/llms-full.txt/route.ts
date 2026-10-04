import { llmsFull } from "@/lib/llms";

export const revalidate = 3600;

/** /llms-full.txt — every live product with price, sizes, fabric and colour, for AI shopping answers. */
export async function GET() {
  return new Response(await llmsFull(), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
