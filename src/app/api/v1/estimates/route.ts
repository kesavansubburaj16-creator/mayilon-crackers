import { revalidatePath } from "next/cache";
import { fail, ok } from "@/lib/api";
import { getAllOrders, saveOrder, type OrderRecord } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const orders = await getAllOrders();
  return ok(orders);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  if (!body.customerName || !body.customerPhone || !Array.isArray(body.items) || body.items.length === 0) {
    return fail("Customer name, phone number, and order items are required", [], 400);
  }

  const estimateNumber = `MYL-${Date.now().toString().slice(-4)}-${Math.floor(1000 + Math.random() * 9000)}`;

  const orderRecord: OrderRecord = {
    id: `ord-${Date.now()}`,
    estimateNumber,
    customerName: String(body.customerName).trim(),
    customerPhone: String(body.customerPhone).trim(),
    customerEmail: body.customerEmail ? String(body.customerEmail).trim() : undefined,
    city: String(body.city || "Sivakasi").trim(),
    state: String(body.state || "Tamil Nadu").trim(),
    pincode: String(body.pincode || "626123").trim(),
    address: String(body.address || "").trim(),
    totalMrp: Number(body.totalMrp) || 0,
    subtotal: Number(body.subtotal) || 0,
    discountAmount: Number(body.discountAmount) || 0,
    packingCharges: Number(body.packingCharges) || 0,
    transportCharges: Number(body.transportCharges) || 0,
    totalAmount: Number(body.totalAmount) || 0,
    items: body.items.map((it: any) => ({
      id: String(it.id || `item-${Date.now()}`),
      sku: String(it.sku || "MYL-PROD"),
      name: String(it.name || "Fireworks Item"),
      packing: String(it.packing || "1 Box"),
      mrp: Number(it.mrp) || 0,
      offerPrice: Number(it.offerPrice) || Number(it.price) || 0,
      quantity: Number(it.quantity) || 1,
      total: Number(it.total) || (Number(it.offerPrice || it.price || 0) * Number(it.quantity || 1)),
      imageUrl: it.imageUrl || "/images/placeholder.jpg",
    })),
    status: "PENDING",
    paymentStatus: body.paymentMethod === "COD" ? "UNPAID" : "PAID",
    paymentMethod: body.paymentMethod || "UPI",
    notes: body.notes || "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await saveOrder(orderRecord);

  // Trigger Real-Time Notification Webhook Payload Simulation (Email / WhatsApp / SMS Alert)
  console.log(`[REAL-TIME ALERT] 🚀 New Order #${estimateNumber} placed by ${orderRecord.customerName} (₹${orderRecord.totalAmount})`);

  try {
    revalidatePath("/", "layout");
    revalidatePath("/admin");
    revalidatePath("/track");
    revalidatePath("/my-orders");
  } catch (e) {}

  return ok({ order: orderRecord }, "Order placed successfully", 201);
}
