import { revalidatePath } from "next/cache";
import { fail, ok, requireAdmin } from "@/lib/api";
import { getProducts } from "@/lib/data";
import { saveProductReorder } from "@/lib/products-store";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;

  const body = await req.json().catch(() => ({}));
  const items = Array.isArray(body.items)
    ? body.items
    : Array.isArray(body.orderIds)
    ? body.orderIds
    : Array.isArray(body.productIds)
    ? body.productIds
    : [];

  if (items.length === 0) {
    return fail("Product items or order IDs list required", [], 400);
  }

  await saveProductReorder(items);

  try {
    revalidatePath("/", "layout");
    revalidatePath("/pricelist");
    revalidatePath("/products");
  } catch (e) {}

  const { items: sortedProducts } = await getProducts({ limit: 250 });

  return ok({ total: items.length, items: sortedProducts }, "Product sequence updated successfully");
}
