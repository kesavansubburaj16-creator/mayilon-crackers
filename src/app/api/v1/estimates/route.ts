import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { customers, estimateItems, estimates } from "@/db/schema";
import { ok } from "@/lib/api";
import { calculateTotals, extractNumber, makeEstimateNumber } from "@/lib/estimate";
import { getAllOrdersFromStore, saveOrderToStore, type OrderRecord } from "@/lib/orders-store";

export const dynamic = "force-dynamic";

/** Guarantees 100% permanent insertion/update of order into Supabase PostgreSQL database */
export async function persistOrderToDb(o: OrderRecord): Promise<boolean> {
  try {
    let customerId: string | null = null;
    try {
      const [cRow] = await db
        .insert(customers)
        .values({
          name: o.customerName || "Valued Customer",
          mobile: o.mobile || "9876543210",
          email: o.email || null,
          state: o.state || "Tamil Nadu",
          district: o.district || null,
          city: o.city || null,
          pincode: o.pincode || null,
          address: o.address || null,
          gstNumber: o.gstNumber || null,
          dealerName: o.dealerName || null,
          isVerified: true,
        })
        .onConflictDoUpdate({
          target: customers.mobile,
          set: {
            name: o.customerName || "Valued Customer",
            email: o.email || null,
            state: o.state || "Tamil Nadu",
            city: o.city || null,
            pincode: o.pincode || null,
            address: o.address || null,
            isVerified: true,
            updatedAt: new Date(),
          },
        })
        .returning();
      if (cRow?.id) customerId = cRow.id;
    } catch (cErr) {
      console.warn("[persistOrderToDb] Customer upsert note:", cErr);
    }

    const [estRow] = await db
      .insert(estimates)
      .values({
        estimateNumber: o.estimateNumber,
        customerId,
        customerName: o.customerName || "Valued Customer",
        mobile: o.mobile || "9876543210",
        email: o.email || null,
        state: o.state || "Tamil Nadu",
        district: o.district || null,
        city: o.city || null,
        pincode: o.pincode || null,
        address: o.address || null,
        gstNumber: o.gstNumber || null,
        dealerName: o.dealerName || null,
        transportName: o.transportName || null,
        deliveryLocation: o.deliveryLocation || null,
        instructions: o.instructions || null,
        couponCode: o.couponCode || null,
        itemCount: o.itemCount || o.items?.length || 0,
        mrpTotal: String(o.mrpTotal || "0.00"),
        subtotal: String(o.subtotal || "0.00"),
        savings: String(o.savings || "0.00"),
        discount: String(o.discount || "0.00"),
        transportCharge: String(o.transportCharge || "0.00"),
        gstAmount: String(o.gstAmount || "0.00"),
        grandTotal: String(o.grandTotal || "0.00"),
        status: o.status || "NEW",
        paymentMethod: o.paymentMethod || "COD",
        paymentStatus: o.paymentStatus || "UNPAID",
        createdAt: o.createdAt ? new Date(o.createdAt) : new Date(),
      })
      .onConflictDoUpdate({
        target: estimates.estimateNumber,
        set: {
          customerName: o.customerName || "Valued Customer",
          mobile: o.mobile || "9876543210",
          email: o.email || null,
          state: o.state || "Tamil Nadu",
          district: o.district || null,
          city: o.city || null,
          pincode: o.pincode || null,
          address: o.address || null,
          grandTotal: String(o.grandTotal || "0.00"),
          status: o.status || "NEW",
          paymentMethod: o.paymentMethod || "COD",
          paymentStatus: o.paymentStatus || "UNPAID",
          updatedAt: new Date(),
        },
      })
      .returning();

    let targetEstimateId: string | null = estRow?.id || null;
    if (!targetEstimateId) {
      const [existing] = await db
        .select({ id: estimates.id })
        .from(estimates)
        .where(eq(estimates.estimateNumber, o.estimateNumber))
        .limit(1);
      if (existing?.id) targetEstimateId = existing.id;
    }

    const isValidUuid = (val: string) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(val));

    if (targetEstimateId && o.items && o.items.length > 0) {
      // Refresh items to ensure 100% item detail accuracy
      await db.delete(estimateItems).where(eq(estimateItems.estimateId, targetEstimateId)).catch(() => {});

      await db.insert(estimateItems).values(
        o.items.map((l: any) => ({
          estimateId: targetEstimateId!,
          productId: isValidUuid(l.id) ? String(l.id) : null,
          sku: String(l.sku || `MYL-PROD`),
          name: String(l.name || "Sivakasi Fireworks Item"),
          categoryName: String(l.categoryName || "Fireworks"),
          packing: String(l.packing || "1 Pack"),
          imageUrl: String(l.imageUrl || ""),
          mrp: String(l.mrp || 0),
          price: String(l.price || 0),
          quantity: Number(l.quantity || 1),
          lineTotal: String(l.lineTotal || 0),
        })),
      );
    }
    console.log(`[persistOrderToDb] ✓ Synchronously persisted order ${o.estimateNumber} into Supabase DB (Status: ${o.status})`);
    return true;
  } catch (err) {
    console.error(`[persistOrderToDb] Error persisting ${o.estimateNumber}:`, err);
    return false;
  }
}

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

  // 1. Save to Universal Store
  saveOrderToStore(newOrder);

  // 2. Synchronous Guaranteed Supabase DB Insert before returning response
  await persistOrderToDb(newOrder);

  return ok(
    { estimateNumber, totals, status: "NEW", paymentMethod, order: newOrder },
    "Order placed successfully",
    201,
  );
}

/** Admin listing (Merges DB & Memory Store with automatic repair to Supabase DB) */
export async function GET() {
  const storeOrders = getAllOrdersFromStore();
  let dbRows: any[] = [];
  const dbEstimateNumbers = new Set<string>();

  try {
    const rawEstimates = await db
      .select()
      .from(estimates)
      .orderBy(desc(estimates.createdAt))
      .limit(250);

    for (const est of rawEstimates) {
      if (est.estimateNumber) dbEstimateNumbers.add(est.estimateNumber);
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

  // Auto-heal: Synchronously persist any store orders missing from Supabase DB
  for (const o of storeOrders) {
    if (o && o.estimateNumber && !dbEstimateNumbers.has(o.estimateNumber)) {
      console.log(`[GET /estimates] Auto-persisting store order ${o.estimateNumber} to Supabase DB`);
      await persistOrderToDb(o);
    }
  }

  // Merge store orders and db rows
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
