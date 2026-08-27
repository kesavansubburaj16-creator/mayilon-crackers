import fs from "fs";
import path from "path";
import os from "os";

export type OrderItemRecord = {
  id: string;
  sku: string;
  name: string;
  categoryName: string;
  packing: string;
  imageUrl?: string;
  mrp: string | number;
  price: string | number;
  quantity: number;
  lineTotal: string | number;
};

export type OrderRecord = {
  id: string;
  estimateNumber: string;
  customerName: string;
  mobile: string;
  email: string;
  state: string;
  district: string;
  city: string;
  pincode: string;
  address: string;
  gstNumber?: string;
  dealerName?: string;
  transportName?: string;
  deliveryLocation?: string;
  instructions?: string;
  paymentMethod: string;
  paymentStatus: "PAID" | "UNPAID" | "PENDING VERIFICATION";
  status: "NEW" | "PAYMENT RECEIVED" | "PACKAGE READY" | "SHIPPED" | "OUT FOR DELIVERY" | "DELIVERED" | "CANCELLED";
  itemCount: number;
  mrpTotal: string;
  subtotal: string;
  savings: string;
  discount: string;
  transportCharge: string;
  gstAmount: string;
  grandTotal: string;
  couponCode?: string;
  createdAt: string;
  items: OrderItemRecord[];
};

const DATA_FILE = path.join(os.tmpdir(), "mayilon_orders.json");

function syncFileSave(orders: OrderRecord[]) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(orders), "utf-8");
  } catch (err) {}
}

function syncFileLoad(): OrderRecord[] {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf-8");
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return arr;
    }
  } catch (err) {}
  return [];
}

type GlobalWithOrders = typeof globalThis & {
  __mayilonOrdersStore?: Map<string, OrderRecord>;
};

const g = globalThis as GlobalWithOrders;
if (!g.__mayilonOrdersStore) {
  g.__mayilonOrdersStore = new Map<string, OrderRecord>();
  // Pre-fill from persistent disk file
  const saved = syncFileLoad();
  for (const item of saved) {
    if (item && item.estimateNumber) {
      g.__mayilonOrdersStore.set(item.estimateNumber, item);
    }
  }
}

const STORE = g.__mayilonOrdersStore;

/** Save order to universal store and disk backup */
export function saveOrderToStore(order: OrderRecord): OrderRecord {
  const existing = STORE.get(order.estimateNumber);
  const finalOrder: OrderRecord = {
    ...order,
    createdAt: existing?.createdAt || order.createdAt || new Date().toISOString(),
  };
  STORE.set(finalOrder.estimateNumber, finalOrder);
  syncFileSave(Array.from(STORE.values()));
  return finalOrder;
}

/** Retrieve order by estimate number */
export function getOrderFromStore(estimateNumber: string): OrderRecord | undefined {
  return STORE.get(estimateNumber);
}

/** Get all orders for Admin portal (sorted newest first) */
export function getAllOrdersFromStore(): OrderRecord[] {
  return Array.from(STORE.values()).sort(
    (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
  );
}

/** Update order status in store without clearing order history or date */
export function updateOrderStatusInStore(
  estimateNumber: string,
  patch: Partial<Pick<OrderRecord, "status" | "paymentStatus" | "paymentMethod">>,
): OrderRecord | undefined {
  const existing = STORE.get(estimateNumber);
  if (!existing) return undefined;

  const updated: OrderRecord = {
    ...existing,
    ...patch,
    createdAt: existing.createdAt || new Date().toISOString(),
  };
  STORE.set(estimateNumber, updated);
  syncFileSave(Array.from(STORE.values()));
  return updated;
}
