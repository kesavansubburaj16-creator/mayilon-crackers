import { fail, ok, requireAdmin } from "@/lib/api";
import { saveProductReorder } from "@/lib/products-store";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;

  const body = await req.json().catch(() => ({}));
  const orderIds = Array.isArray(body.orderIds)
    ? body.orderIds
    : Array.isArray(body.productIds)
    ? body.productIds
    : [];

  if (orderIds.length === 0) {
    return fail("Product order IDs list required", [], 400);
  }

  saveProductReorder(orderIds);
  return ok({ total: orderIds.length }, "Product sequence updated successfully");
}
