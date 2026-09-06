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
  type OrderRecord,
  type ProductRecord,
} from "./storage-engine";

export type { OrderRecord, ProductRecord };

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function saveOrder(order: OrderRecord): Promise<OrderRecord> {
  saveOrderToEngine(order);

  if (SUPABASE_URL && SUPABASE_KEY) {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/estimates`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          Prefer: "resolution=merge-duplicates",
        },
        body: JSON.stringify({
          estimate_number: order.estimateNumber,
          customer_name: order.customerName,
          customer_phone: order.customerPhone,
          customer_email: order.customerEmail,
          city: order.city,
          state: order.state,
          pincode: order.pincode,
          address: order.address,
          total_mrp: order.totalMrp,
          subtotal: order.subtotal,
          discount_amount: order.discountAmount,
          packing_charges: order.packingCharges,
          transport_charges: order.transportCharges,
          total_amount: order.totalAmount,
          items: order.items,
          status: order.status,
          payment_status: order.paymentStatus,
          payment_method: order.paymentMethod,
          courier_name: order.courierName,
          tracking_number: order.trackingNumber,
          created_at: order.createdAt,
        }),
      });
    } catch (e) {
      console.warn("[Supabase Order Sync] Fallback to embedded engine:", e);
    }
  }

  return order;
}

export async function getOrder(idOrNumber: string): Promise<OrderRecord | null> {
  if (SUPABASE_URL && SUPABASE_KEY) {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/estimates?estimate_number=eq.${encodeURIComponent(idOrNumber)}&select=*`,
        {
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
          },
          cache: "no-store",
        }
      );
      const rows = await res.json();
      if (Array.isArray(rows) && rows.length > 0) {
        const row = rows[0];
        const record: OrderRecord = {
          id: row.id || `ord-${row.estimate_number}`,
          estimateNumber: row.estimate_number,
          customerName: row.customer_name,
          customerPhone: row.customer_phone,
          customerEmail: row.customer_email,
          city: row.city,
          state: row.state,
          pincode: row.pincode,
          address: row.address,
          totalMrp: Number(row.total_mrp) || 0,
          subtotal: Number(row.subtotal) || 0,
          discountAmount: Number(row.discount_amount) || 0,
          packingCharges: Number(row.packing_charges) || 0,
          transportCharges: Number(row.transport_charges) || 0,
          totalAmount: Number(row.total_amount) || 0,
          items: Array.isArray(row.items) ? row.items : [],
          status: row.status || "PENDING",
          paymentStatus: row.payment_status || "UNPAID",
          paymentMethod: row.payment_method || "UPI",
          courierName: row.courier_name,
          trackingNumber: row.tracking_number,
          createdAt: row.created_at || new Date().toISOString(),
          updatedAt: row.updated_at || new Date().toISOString(),
        };
        saveOrderToEngine(record);
        return record;
      }
    } catch (e) {}
  }
  return getOrderFromEngine(idOrNumber);
}

export async function getAllOrders(): Promise<OrderRecord[]> {
  if (SUPABASE_URL && SUPABASE_KEY) {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/estimates?select=*&order=created_at.desc`,
        {
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
          },
          cache: "no-store",
        }
      );
      const rows = await res.json();
      if (Array.isArray(rows) && rows.length > 0) {
        const list: OrderRecord[] = rows.map((row: any) => ({
          id: row.id || `ord-${row.estimate_number}`,
          estimateNumber: row.estimate_number,
          customerName: row.customer_name,
          customerPhone: row.customer_phone,
          customerEmail: row.customer_email,
          city: row.city,
          state: row.state,
          pincode: row.pincode,
          address: row.address,
          totalMrp: Number(row.total_mrp) || 0,
          subtotal: Number(row.subtotal) || 0,
          discountAmount: Number(row.discount_amount) || 0,
          packingCharges: Number(row.packing_charges) || 0,
          transportCharges: Number(row.transport_charges) || 0,
          totalAmount: Number(row.total_amount) || 0,
          items: Array.isArray(row.items) ? row.items : [],
          status: row.status || "PENDING",
          paymentStatus: row.payment_status || "UNPAID",
          paymentMethod: row.payment_method || "UPI",
          courierName: row.courier_name,
          trackingNumber: row.tracking_number,
          createdAt: row.created_at || new Date().toISOString(),
          updatedAt: row.updated_at || new Date().toISOString(),
        }));
        list.forEach((ord) => saveOrderToEngine(ord));
        return list;
      }
    } catch (e) {}
  }
  return getAllOrdersFromEngine();
}

export async function updateOrderStatus(
  estimateNumber: string,
  updates: Partial<OrderRecord>
): Promise<OrderRecord | null> {
  const updated = updateOrderStatusInEngine(estimateNumber, updates);

  if (SUPABASE_URL && SUPABASE_KEY && updated) {
    try {
      await fetch(
        `${SUPABASE_URL}/rest/v1/estimates?estimate_number=eq.${encodeURIComponent(estimateNumber)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
          },
          body: JSON.stringify({
            status: updated.status,
            payment_status: updated.paymentStatus,
            courier_name: updated.courierName,
            tracking_number: updated.trackingNumber,
            updated_at: new Date().toISOString(),
          }),
        }
      );
    } catch (e) {}
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
};
