import { revalidatePath } from "next/cache";
import { fail, ok } from "@/lib/api";
import { getAllOrders, saveOrder, type OrderRecord } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const orders = await getAllOrders();
  return ok({ items: orders, total: orders.length });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  const customerObj = body.customer || {};
  const customerName = String(body.customerName || customerObj.name || "Valued Customer").trim();
  const customerPhone = String(body.customerPhone || customerObj.mobile || customerObj.phone || "9876543210").trim();
  const customerEmail = String(body.customerEmail || customerObj.email || "").trim() || undefined;

  const itemsArray = Array.isArray(body.items) ? body.items : [];

  if (!itemsArray.length) {
    return fail("Order items list is required", [], 400);
  }

  const estimateNumber = String(
    body.estimateNumber ||
    `MYL-${Date.now().toString().slice(-4)}-${Math.floor(1000 + Math.random() * 9000)}`
  ).trim();

  const formattedItems = itemsArray.map((it: any) => {
    const offer = Number(it.offerPrice || it.price) || 0;
    const mrpVal = Number(it.mrp) || offer;
    const qtyVal = Number(it.quantity) || 1;
    const lineTot = Number(it.lineTotal || it.total) || (offer * qtyVal);
    return {
      id: String(it.id || `item-${Date.now()}`),
      sku: String(it.sku || "MYL-PROD"),
      name: String(it.name || "Fireworks Item"),
      packing: String(it.packing || "1 Box"),
      mrp: mrpVal,
      offerPrice: offer,
      quantity: qtyVal,
      total: lineTot,
      imageUrl: it.imageUrl || "/images/placeholder.jpg",
    };
  });

  const subtotalVal = Number(body.subtotal || body.totals?.subtotal) ||
    formattedItems.reduce((sum, item) => sum + item.total, 0);

  const mrpTotalVal = Number(body.totalMrp || body.mrpTotal || body.totals?.mrpTotal) ||
    formattedItems.reduce((sum, item) => sum + (item.mrp * item.quantity), 0);

  const discountVal = Number(body.discountAmount || body.discount || body.totals?.discount) || (mrpTotalVal - subtotalVal);
  const totalAmountVal = Number(body.totalAmount || body.grandTotal || body.totals?.grandTotal) || subtotalVal;

  const orderRecord: OrderRecord = {
    id: String(body.id || `ord-${Date.now()}`),
    estimateNumber,
    customerName,
    customerPhone,
    customerEmail,
    city: String(body.city || customerObj.city || "Sivakasi").trim(),
    state: String(body.state || customerObj.state || "Tamil Nadu").trim(),
    pincode: String(body.pincode || customerObj.pincode || "626123").trim(),
    address: String(body.address || customerObj.address || "").trim(),
    totalMrp: mrpTotalVal,
    subtotal: subtotalVal,
    discountAmount: Math.max(0, discountVal),
    packingCharges: Number(body.packingCharges) || 0,
    transportCharges: Number(body.transportCharges) || 0,
    totalAmount: totalAmountVal,
    items: formattedItems,
    status: body.status || "PENDING",
    paymentStatus: body.paymentStatus || (body.paymentMethod === "COD" ? "UNPAID" : "PAID"),
    paymentMethod: body.paymentMethod || "UPI",
    notes: body.notes || "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await saveOrder(orderRecord);

  console.log(`[REAL-TIME ALERT] 🚀 New Order #${estimateNumber} placed by ${customerName} (+91 ${customerPhone}) - Total: ₹${totalAmountVal}`);

  try {
    revalidatePath("/", "layout");
    revalidatePath("/admin");
    revalidatePath("/track");
    revalidatePath("/my-orders");
    revalidatePath(`/estimate/${estimateNumber}`);
  } catch (e) {}

  return ok({ order: orderRecord, estimateNumber }, "Order placed successfully", 201);
}
