import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductEditor, ProductImages } from "@/components/admin/product-editor";
import { editorOptions, loadEditorProduct } from "@/lib/admin-catalog";
import { requireStaff } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit product" };

export default async function EditProductPage({ params, searchParams }: PageProps<"/admin/products/[id]">) {
  await requireStaff("products");
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const [data, opts, sp] = await Promise.all([loadEditorProduct(id), editorOptions(), searchParams]);
  if (!data) notFound();
  const { product, images } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/products" className="text-sm text-admin-muted hover:text-admin-text">← Products</Link>
        <h1 className="text-2xl font-semibold">{product.title}</h1>
        <Link href={`/products/${product.handle}`} target="_blank" className="ml-auto text-sm underline">
          {product.status === "active" ? "View on store ↗" : "Preview ↗"}
        </Link>
      </div>
      {sp.created === "1" && <p className="rounded-xl bg-admin-green-bg text-admin-green px-4 py-3 text-sm">Product created. Now add photos below, then set it to Active.</p>}
      <ProductImages productId={id} images={images} />
      <ProductEditor key={product.id} p={product} collections={opts.collections} types={opts.types} />
    </div>
  );
}
