import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { customers, estimateItems, estimates } from "@/db/schema";
import { ok } from "@/lib/api";
import { calculateTotals, extractNumber, makeEstimateNumber } from "@/lib/estimate";
import { getAllOrdersFromStore, saveOrderToStore, type OrderRecord } from "@/lib/orders-store";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const rawCustomer = body.customer || {};
  const rawItems = Array.isArray(body.items) && body.items.length > 0 ? body.items : [];
  const paymentMethod = body.paymentMethod || "COD";
  const couponCode = body.couponCode || "";
  const transport = body.transport || {};

  const customer = {
    name: String(rawCustomer.name || "Valued Customer").trim() || "Valued Customer",
    mobile: String(rawCustomer.mobile || "9876543210").replace(/\D/g, "") || "9876543210",
    email: String(rawCustomer.email || ""),
    state: String(rawCustomer.state || "Tamil Nadu"),
    district: String(rawCustomer.district || ""),
    city: String(rawCustomer.city || ""),
    pincode: String(rawCustomer.pincode || ""),
    address: String(rawCustomer.address || "Direct Sivakasi Licensed Dispatch Address"),
    gstNumber: String(rawCustomer.gstNumber || ""),
    dealerName: String(rawCustomer.dealerName || ""),
  };

  // Build clean detailed product lines
  const lines = rawItems.map((i: any, idx: number) => {
    const mrpVal = extractNumber(i.mrp, i.offerPrice, 100);
    const priceVal = extractNumber(i.price, i.offerPrice, mrpVal);
    const qtyVal = Math.max(1, extractNumber(i.quantity, 1));
    const lineTotalVal = priceVal * qtyVal;

    return {
      id: String(i.id || `item-${idx + 1}`),
      sku: String(i.sku || `MYL-PROD-${idx + 1}`),
      name: String(i.name || "Sivakasi Fireworks Item"),
      categoryName: String(i.categoryName || "Fireworks"),
      packing: String(i.packing || "1 Pack"),
      imageUrl: String(i.imageUrl || "/images/placeholder.jpg"),
      mrp: mrpVal.toFixed(2),
      price: priceVal.toFixed(2),
      quantity: qtyVal,
      lineTotal: lineTotalVal.toFixed(2),
    };
  });

  const totals = calculateTotals(
    lines.map((l: any) => ({ mrp: l.mrp, price: l.price, quantity: l.quantity })),
    { state: customer.state, couponCode },
  );

  const estimateNumber = String(body.estimateNumber || "").trim() || makeEstimateNumber();
  const createdAt = new Date().toISOString();

  const newOrder: OrderRecord = {
    id: `est-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    estimateNumber,
    customerName: customer.name,
    mobile: customer.mobile,
    email: customer.email,
    state: customer.state,
    district: customer.district,
    city: customer.city,
    pincode: customer.pincode,
    address: customer.address,
    gstNumber: customer.gstNumber,
    dealerName: customer.dealerName,
    transportName: transport.transportName || "Direct Factory Transport",
    deliveryLocation: transport.deliveryLocation || "Sivakasi Licensed Dispatch",
    instructions: transport.instructions || "",
    paymentMethod,
    paymentStatus: paymentMethod === "COD" ? "UNPAID" : "PENDING VERIFICATION",
    status: "NEW",
    itemCount: lines.length,
    mrpTotal: totals.mrpTotal.toFixed(2),
    subtotal: totals.subtotal.toFixed(2),
    savings: totals.savings.toFixed(2),
    discount: totals.discount.toFixed(2),
    transportCharge: totals.transportCharge.toFixed(2),
    gstAmount: totals.gstAmount.toFixed(2),
    grandTotal: totals.grandTotal.toFixed(2),
    couponCode: couponCode || undefined,
    paymentProofUrl: body.paymentProofUrl || undefined,
    transactionId: body.transactionId || undefined,
    createdAt,
    items: lines,
  };

  // 1. Save to Universal Store FIRST (Instant Guaranteed Availability)
  saveOrderToStore(newOrder);

  // 2. Background DB Insert (Best Effort Sync)
  try {
    const [customerRow] = await db
      .insert(customers)
      .values({
        name: customer.name,
        mobile: customer.mobile,
        email: customer.email || null,
        state: customer.state,
        district: customer.district || null,
        city: customer.city || null,
        pincode: customer.pincode || null,
        address: customer.address || null,
        gstNumber: customer.gstNumber || null,
        dealerName: customer.dealerName || null,
        isVerified: true,
      })
      .onConflictDoUpdate({
        target: customers.mobile,
        set: {
          name: customer.name,
          email: customer.email || null,
          state: customer.state,
          city: customer.city || null,
          pincode: customer.pincode || null,
          address: customer.address || null,
          isVerified: true,
          updatedAt: new Date(),
        },
      })
      .returning();

    const [estimate] = await db
      .insert(estimates)
      .values({
        estimateNumber,
        customerId: customerRow?.id,
        customerName: customer.name,
        mobile: customer.mobile,
        email: customer.email || null,
        state: customer.state,
        district: customer.district || null,
        city: customer.city || null,
        pincode: customer.pincode || null,
        address: customer.address || null,
        gstNumber: customer.gstNumber || null,
        dealerName: customer.dealerName || null,
        transportName: transport.transportName || null,
        deliveryLocation: transport.deliveryLocation || null,
        instructions: transport.instructions || null,
        couponCode: couponCode || null,
        itemCount: lines.length,
        mrpTotal: totals.mrpTotal.toFixed(2),
        subtotal: totals.subtotal.toFixed(2),
        savings: totals.savings.toFixed(2),
        discount: totals.discount.toFixed(2),
        transportCharge: totals.transportCharge.toFixed(2),
        gstAmount: totals.gstAmount.toFixed(2),
        grandTotal: totals.grandTotal.toFixed(2),
        status: "NEW",
      })
      .returning();

    const isValidUuid = (val: string) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(val));

    if (estimate?.id) {
      await db.insert(estimateItems).values(
        lines.map((l: any) => ({
          estimateId: estimate.id,
          productId: isValidUuid(l.id) ? String(l.id) : null,
          sku: l.sku,
          name: l.name,
          categoryName: l.categoryName,
          packing: l.packing,
          imageUrl: l.imageUrl || "",
          mrp: String(l.mrp),
          price: String(l.price),
          quantity: l.quantity,
          lineTotal: String(l.lineTotal),
        })),
      );
    }
  } catch (err) {
    console.warn("[POST /estimates] DB background sync note:", err);
  }

  return ok(
    { estimateNumber, totals, status: "NEW", paymentMethod, order: newOrder },
    "Order placed successfully",
    201,
  );
}

/** Admin listing (Merges Store + DB with full items) */
export async function GET() {
  const storeOrders = getAllOrdersFromStore();
  let dbRows: any[] = [];

  try {
    const rawEstimates = await db
      .select()
      .from(estimates)
      .orderBy(desc(estimates.createdAt))
      .limit(150);

    for (const est of rawEstimates) {
      try {
        const itemRows = await db
          .select()
          .from(estimateItems)
          .where(eq(estimateItems.estimateId, est.id));

        const formattedItems = itemRows.map((it) => ({
          id: it.id,
          sku: it.sku,
          name: it.name,
          categoryName: it.categoryName || "Fireworks",
          packing: it.packing || "1 Pack",
          imageUrl: it.imageUrl || "",
          mrp: String(it.mrp),
          price: String(it.price),
          quantity: it.quantity,
          lineTotal: String(it.lineTotal),
        }));

        dbRows.push({
          ...est,
          items: formattedItems,
        });
      } catch (iErr) {
        dbRows.push(est);
      }
    }
  } catch (err) {
    console.warn("[GET /estimates] DB read fallback:", err);
  }

  // Merge store orders and db rows, avoiding duplicates by estimateNumber
  const map = new Map<string, any>();
  for (const o of storeOrders) {
    if (o && o.estimateNumber) map.set(o.estimateNumber, o);
  }
  for (const r of dbRows) {
    if (r && r.estimateNumber) {
      const existing = map.get(r.estimateNumber);
      map.set(r.estimateNumber, {
        ...(existing || {}),
        ...r,
        items: (existing?.items && existing.items.length > 0) ? existing.items : r.items || [],
      });
    }
  }

  const items = Array.from(map.values()).sort(
    (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
  );

  return ok({ items, total: items.length });
}
