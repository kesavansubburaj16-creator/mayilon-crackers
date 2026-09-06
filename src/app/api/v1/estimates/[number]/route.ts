import { revalidatePath } from "next/cache";
import { fail, ok } from "@/lib/api";
import { getOrder, updateOrderStatus } from "@/lib/db";

export const dynamic = "force-dynamic";

type Params = Promise<{ number: string }>;

export async function GET(req: Request, { params }: { params: Params }) {
  const { number } = await params;
  const order = await getOrder(number);
  if (!order) return fail(`Order #${number} not found`, [], 404);
  return ok({ estimate: order, items: order.items });
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
