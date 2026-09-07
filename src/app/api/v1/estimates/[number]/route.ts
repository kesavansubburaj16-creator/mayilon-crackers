import { revalidatePath } from "next/cache";
import { fail, ok } from "@/lib/api";
import { getOrder, updateOrderStatus } from "@/lib/db";

export const dynamic = "force-dynamic";

type Params = Promise<{ number: string }>;

export async function GET(req: Request, { params }: { params: Params }) {
  const { number } = await params;
  const order = await getOrder(number);
  if (!order) return fail(`Order #${number} not found`, [], 404);

  const items = Array.isArray(order.items) ? order.items : [];
  const computedGrossMrp = items.reduce((sum: number, it: any) => {
    const mrp = Number(it.mrp || 0) || (Number(it.offerPrice ?? it.price ?? 0) * 2);
    const qty = Math.max(1, Number(it.quantity || 1));
    return sum + mrp * qty;
  }, 0);
  const computedSubtotal = items.reduce((sum: number, it: any) => {
    const offer = Number(it.offerPrice ?? it.price ?? 0);
    const qty = Math.max(1, Number(it.quantity || 1));
    return sum + (Number(it.lineTotal ?? it.total) || (offer * qty));
  }, 0);

  const totalMrp = Number(order.totalMrp) || computedGrossMrp;
  const subtotal = Number(order.subtotal) || computedSubtotal;
  const totalAmount = Number(order.totalAmount) || subtotal;
  const savings = Number(order.discountAmount) || Math.max(0, totalMrp - subtotal);

  const normalizedOrder = {
    ...order,
    mobile: order.customerPhone || (order as any).mobile,
    totalMrp,
    mrpTotal: totalMrp,
    subtotal,
    totalAmount,
    grandTotal: totalAmount,
    savings,
    discount: Number(order.discountAmount || 0),
  };

  return ok({ estimate: normalizedOrder, items });
}

export async function PATCH(req: Request, { params }: { params: Params }) {
  const { number } = await params;
  const body = await req.json().catch(() => ({}));

  const existing = await getOrder(number);
  if (!existing) return fail(`Order #${number} not found`, [], 404);

  const updates: any = {};
  if (body.status) updates.status = body.status;
  if (body.paymentStatus) updates.paymentStatus = body.paymentStatus;
  if (body.courierName) updates.courierName = body.courierName;
  if (body.trackingNumber) updates.trackingNumber = body.trackingNumber;

  const updated = await updateOrderStatus(number, updates);

  try {
    revalidatePath("/", "layout");
    revalidatePath("/admin");
    revalidatePath(`/estimate/${number}`);
    revalidatePath("/track");
  } catch (e) {}

  return ok({ order: updated }, "Order status updated successfully");
}
