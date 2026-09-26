import { redirectOrNotFound } from "@/lib/redirects";

/** Any unknown URL: follow an admin-defined redirect if one exists, else 404. */
export default async function CatchAll({ params }: PageProps<"/[...slug]">) {
  const { slug } = await params;
  return redirectOrNotFound("/" + slug.map(decodeURIComponent).join("/"));
}
