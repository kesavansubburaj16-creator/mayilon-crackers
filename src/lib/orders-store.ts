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

const INITIAL_SEED_ORDERS: OrderRecord[] = [
  {
    id: "est-2608-905083",
    estimateNumber: "MYL-2608-905083",
    customerName: "SUJIT",
    mobile: "8667038564",
    email: "sujit@gmail.com",
    state: "Tamil Nadu",
    district: "Chennai",
    city: "Chennai",
    pincode: "600100",
    address: "ffdfsdf, Chennai, Chennai, Tamil Nadu, 600100",
    transportName: "Direct Factory Transport (Sivakasi Licensed Dispatch)",
    paymentMethod: "COD",
    paymentStatus: "UNPAID",
    status: "NEW",
    itemCount: 5,
    mrpTotal: "71325.00",
    subtotal: "14265.00",
    savings: "58486.50",
    discount: "1426.50",
    transportCharge: "449.35",
    gstAmount: "2310.93",
    grandTotal: "15598.78",
    couponCode: "DEEPAVALI10",
    createdAt: "2026-08-28T09:50:00.000Z",
    items: [
      { id: "1", sku: "MYL-SKY-07", name: "4\" Glory Series", categoryName: "Aerial Shots", packing: "1 Box (1 Pc)", mrp: "2300.00", price: "460.00", quantity: 15, lineTotal: "6900.00" },
      { id: "2", sku: "MYL-SKY-06", name: "3.5\" Double Ball", categoryName: "Aerial Shots", packing: "1 Box (1 Pc)", mrp: "2100.00", price: "420.00", quantity: 6, lineTotal: "2520.00" },
      { id: "3", sku: "MYL-SKY-05", name: "3.5\" Knight Series (2 Pc)", categoryName: "Aerial Shots", packing: "1 Box (2 Pcs)", mrp: "2625.00", price: "525.00", quantity: 6, lineTotal: "3150.00" },
      { id: "4", sku: "MYL-SKY-04", name: "3.5\" Single Smash", categoryName: "Aerial Shots", packing: "1 Box (1 Pc)", mrp: "1575.00", price: "315.00", quantity: 3, lineTotal: "945.00" },
      { id: "5", sku: "MYL-SKY-03", name: "2\" Fancy (3 Pc)", categoryName: "Aerial Shots", packing: "1 Box (3 Pcs)", mrp: "1250.00", price: "250.00", quantity: 3, lineTotal: "750.00" },
    ],
  },
];

type GlobalWithOrders = typeof globalThis & {
  __mayilonOrdersStore?: Map<string, OrderRecord>;
};

const g = globalThis as GlobalWithOrders;
if (!g.__mayilonOrdersStore) {
  g.__mayilonOrdersStore = new Map<string, OrderRecord>();
  // Pre-fill from persistent disk file or initial seed orders
  const saved = syncFileLoad();
  const initial = saved.length > 0 ? saved : INITIAL_SEED_ORDERS;
  for (const item of initial) {
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
