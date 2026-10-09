import Link from "next/link";
import { ProductEditor } from "@/components/admin/product-editor";
import { emptyProduct, editorOptions } from "@/lib/admin-catalog";
import { requireStaff } from "@/lib/auth";

export const metadata = { title: "Add product" };
export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  await requireStaff("products");
  const { collections, types } = await editorOptions();
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/products" className="text-sm text-admin-muted hover:text-admin-text">← Products</Link>
        <h1 className="text-2xl font-semibold">Add product</h1>
      </div>
      <p className="text-sm text-admin-muted">Fill in the details and sizes, then create it as a Draft — you can add photos on the next screen and switch it to Active when it’s ready.</p>
      <ProductEditor p={emptyProduct()} collections={collections} types={types} />
    </div>
  );
}
