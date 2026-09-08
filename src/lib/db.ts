import {
  saveOrderToEngine,
  getOrderFromEngine,
  getAllOrdersFromEngine,
  updateOrderStatusInEngine,
  saveProductToEngine,
  getAllCustomProductsFromEngine,
  deleteProductFromEngine,
  getDeletedProductIdsFromEngine,
  saveProductReorderToEngine,
  getProductReorderMapFromEngine,
  getProductSkuOverrideMapFromEngine,
  type OrderRecord,
  type ProductRecord,
} from "./storage-engine";
import { isSupabaseConfigured, supabaseFetch } from "./supabase";

export type { OrderRecord, ProductRecord };

/** Helper to convert OrderRecord to Supabase row format */
function mapOrderToSupabasePayload(order: OrderRecord) {
  return {
    order_number: order.estimateNumber,
    customer_name: order.customerName || "Customer",
    customer_phone: order.customerPhone || "9876543210",
    customer_email: order.customerEmail || null,
    shipping_address: {
      address: order.address,
      city: order.city,
      state: order.state,
      pincode: order.pincode,
    },
    items: order.items,
    subtotal: order.subtotal,
    discount_amount: order.discountAmount,
    packing_charges: order.packingCharges,
    transport_charges: order.transportCharges,
    total_amount: order.totalAmount,
    payment_method: order.paymentMethod,
    payment_status: order.paymentStatus,
    status: order.status,
    courier_partner: order.courierName || null,
    tracking_id: order.trackingNumber || null,
    notes: order.notes || null,
    created_at: order.createdAt,
    updated_at: order.updatedAt,
  };
}

/** Helper to convert Supabase row format to OrderRecord */
function mapSupabaseRowToOrderRecord(row: any): OrderRecord {
  const shipping = row.shipping_address || {};
  const items = Array.isArray(row.items) ? row.items : [];
  const calculatedMrp = items.reduce((sum: number, it: any) => {
    const mrp = Number(it.mrp || 0) || (Number(it.offerPrice ?? it.price ?? 0) * 2);
    const qty = Math.max(1, Number(it.quantity || 1));
    return sum + mrp * qty;
  }, 0);
  const subtotal = Number(row.subtotal || 0);
  const totalMrp = Number(row.total_mrp) || calculatedMrp || Number(row.total_amount || 0);

  return {
    id: row.id || `ord-${row.order_number || row.estimate_number}`,
    estimateNumber: row.order_number || row.estimate_number,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    customerEmail: row.customer_email || undefined,
    city: shipping.city || row.city || "",
    state: shipping.state || row.state || "Tamil Nadu",
    pincode: shipping.pincode || row.pincode || "",
    address: shipping.address || row.address || "",
    totalMrp,
    subtotal,
    discountAmount: Number(row.discount_amount || 0) || Math.max(0, totalMrp - subtotal),
    packingCharges: Number(row.packing_charges || 0),
    transportCharges: Number(row.transport_charges || 0),
    totalAmount: Number(row.total_amount || subtotal),
    items,
    status: row.status || "PENDING",
    paymentStatus: row.payment_status || "UNPAID",
    paymentMethod: row.payment_method || "UPI",
    courierName: row.courier_partner || row.courier_name || undefined,
    trackingNumber: row.tracking_id || row.tracking_number || undefined,
    notes: row.notes || undefined,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

export async function saveOrder(order: OrderRecord): Promise<OrderRecord> {
  // Always save immediately to internal resilient storage engine
  await saveOrderToEngine(order);

  // Sync to Supabase persistent database if configured
  if (isSupabaseConfigured()) {
    try {
      const payload = mapOrderToSupabasePayload(order);
      const { error } = await supabaseFetch("orders", {
        method: "POST",
        query: "on_conflict=order_number",
        body: payload,
        prefer: "resolution=merge-duplicates",
      });

      if (error) {
        console.warn("[saveOrder] Supabase orders table error:", error);
        // Try fallback table 'estimates' in case user created schema using alternate name
        await supabaseFetch("estimates", {
          method: "POST",
          query: "on_conflict=estimate_number",
          body: {
            ...payload,
            estimate_number: order.estimateNumber,
            total_mrp: order.totalMrp,
          },
          prefer: "resolution=merge-duplicates",
        });
      }
    } catch (err) {
      console.warn("[saveOrder] Supabase sync fallback to engine:", err);
    }
  }

  return order;
}

export async function getOrder(idOrNumber: string): Promise<OrderRecord | null> {
  if (isSupabaseConfigured()) {
    try {
      const encoded = encodeURIComponent(idOrNumber);
      // Query orders table
      const res = await supabaseFetch<any[]>("orders", {
        query: `order_number=eq.${encoded}&select=*`,
      });

      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        const record = mapSupabaseRowToOrderRecord(res.data[0]);
        await saveOrderToEngine(record);
        return record;
      }

      // Try fallback table 'estimates'
      const estRes = await supabaseFetch<any[]>("estimates", {
        query: `estimate_number=eq.${encoded}&select=*`,
      });
      if (estRes.data && Array.isArray(estRes.data) && estRes.data.length > 0) {
        const record = mapSupabaseRowToOrderRecord(estRes.data[0]);
        await saveOrderToEngine(record);
        return record;
      }
    } catch (err) {
      console.warn("[getOrder] Supabase fetch fallback to engine:", err);
    }
  }

  return getOrderFromEngine(idOrNumber);
}

export async function getAllOrders(): Promise<OrderRecord[]> {
  const allOrdersMap = new Map<string, OrderRecord>();

  // 1. Get from engine memory/disk
  try {
    const engineOrders = await getAllOrdersFromEngine();
    for (const ord of engineOrders) {
      if (ord?.estimateNumber) allOrdersMap.set(ord.estimateNumber, ord);
    }
  } catch (e) {}

  // 2. If Supabase is configured, fetch from Supabase and merge
  if (isSupabaseConfigured()) {
    try {
      const res = await supabaseFetch<any[]>("orders", {
        query: "select=*&order=created_at.desc",
      });

      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        const records = res.data.map(mapSupabaseRowToOrderRecord);
        for (const ord of records) {
          allOrdersMap.set(ord.estimateNumber, ord);
          await saveOrderToEngine(ord);
        }
      } else {
        // Fallback table 'estimates'
        const estRes = await supabaseFetch<any[]>("estimates", {
          query: "select=*&order=created_at.desc",
        });
        if (estRes.data && Array.isArray(estRes.data) && estRes.data.length > 0) {
          const records = estRes.data.map(mapSupabaseRowToOrderRecord);
          for (const ord of records) {
            allOrdersMap.set(ord.estimateNumber, ord);
            await saveOrderToEngine(ord);
          }
        }
      }
    } catch (err) {
      console.warn("[getAllOrders] Supabase fetch fallback to engine:", err);
    }
  }

  return Array.from(allOrdersMap.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * Updates order status via SQL UPDATE / REST PATCH.
 * Strictly guarantees records are NEVER deleted or overwritten with blanks.
 */
export async function updateOrderStatus(
  estimateNumber: string,
  updates: Partial<OrderRecord>
): Promise<OrderRecord | null> {
  let existing = await getOrder(estimateNumber);
  if (!existing) {
    existing = await getOrderFromEngine(estimateNumber);
  }
  if (!existing) return null;

  const updated: OrderRecord = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  await saveOrderToEngine(updated);

  if (isSupabaseConfigured()) {
    try {
      const encoded = encodeURIComponent(estimateNumber);
      const patchBody: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };
      if (updates.status) patchBody.status = updates.status;
      if (updates.paymentStatus) patchBody.payment_status = updates.paymentStatus;
      if (updates.courierName) patchBody.courier_partner = updates.courierName;
      if (updates.trackingNumber) patchBody.tracking_id = updates.trackingNumber;

      const { error } = await supabaseFetch("orders", {
        method: "PATCH",
        query: `order_number=eq.${encoded}`,
        body: patchBody,
      });

      if (error) {
        // Fallback table 'estimates'
        await supabaseFetch("estimates", {
          method: "PATCH",
          query: `estimate_number=eq.${encoded}`,
          body: patchBody,
        });
      }
    } catch (err) {
      console.warn("[updateOrderStatus] Supabase PATCH error:", err);
    }
  }

  return updated;
}

export {
  saveProductToEngine as saveProduct,
  getAllCustomProductsFromEngine as getAllCustomProducts,
  deleteProductFromEngine as deleteProduct,
  getDeletedProductIdsFromEngine as getDeletedProductIds,
  saveProductReorderToEngine as saveProductReorder,
  getProductReorderMapFromEngine as getProductReorderMap,
  getProductSkuOverrideMapFromEngine as getProductSkuOverrideMap,
};
