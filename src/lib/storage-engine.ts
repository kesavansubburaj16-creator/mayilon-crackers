import fs from "fs";
import path from "path";

export type OrderRecord = {
  id: string;
  estimateNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  city: string;
  state: string;
  pincode: string;
  address: string;
  totalMrp: number;
  subtotal: number;
  discountAmount: number;
  packingCharges: number;
  transportCharges: number;
  totalAmount: number;
  items: Array<{
    id: string;
    sku: string;
    name: string;
    packing: string;
    mrp: number;
    offerPrice: number;
    quantity: number;
    total: number;
    imageUrl?: string;
  }>;
  status: "PENDING" | "PROCESSING" | "PACKED" | "SHIPPED" | "DELIVERED" | "CANCELLED";
  paymentStatus: "UNPAID" | "PAID" | "COD_VERIFIED" | "REFUNDED";
  paymentMethod: "UPI" | "CARD" | "NETBANKING" | "COD";
  courierName?: string;
  trackingNumber?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type ProductRecord = {
  id: string;
  sku: string;
  slug: string;
  name: string;
  nameTa?: string;
  categoryId?: string;
  categoryName: string;
  shortDescription?: string;
  description?: string;
  imageUrl: string;
  imageUrl2?: string;
  imageUrl3?: string;
  videoUrl?: string;
  packing: string;
  piecesPerPack?: number;
  mrp: number;
  offerPrice: number;
  dealerPrice?: number;
  discountPercent?: number;
  gstPercent?: number;
  moq: number;
  stock: number;
  status: "ACTIVE" | "INACTIVE";
  isFeatured?: boolean;
  isNewArrival?: boolean;
  isBestSeller?: boolean;
  isPremium?: boolean;
  soundLevel?: string;
  burnTime?: string;
  createdAt: string;
};

type GlobalStorage = typeof globalThis & {
  __mayilonOrdersMap?: Map<string, OrderRecord>;
  __mayilonCustomProductsMap?: Map<string, ProductRecord>;
  __mayilonDeletedProductIds?: Set<string>;
  __mayilonProductOrderMap?: Map<string, number>;
  __mayilonSettingsMap?: Map<string, any>;
};

const g = globalThis as GlobalStorage;
if (!g.__mayilonOrdersMap) g.__mayilonOrdersMap = new Map<string, OrderRecord>();
if (!g.__mayilonCustomProductsMap) g.__mayilonCustomProductsMap = new Map<string, ProductRecord>();
if (!g.__mayilonDeletedProductIds) g.__mayilonDeletedProductIds = new Set<string>();
if (!g.__mayilonProductOrderMap) g.__mayilonProductOrderMap = new Map<string, number>();
if (!g.__mayilonSettingsMap) g.__mayilonSettingsMap = new Map<string, any>();

const ORDERS_MAP = g.__mayilonOrdersMap;
const PRODUCTS_MAP = g.__mayilonCustomProductsMap;
const DELETED_SET = g.__mayilonDeletedProductIds;
const REORDER_MAP = g.__mayilonProductOrderMap;
const SETTINGS_MAP = g.__mayilonSettingsMap;

const DATA_DIR = path.join(process.cwd(), ".data");
const STORAGE_FILE = path.join(DATA_DIR, "mayilon_system_storage.json");

const CLOUD_DB_BASE = process.env.CLOUD_DB_URL || "https://mayilon-crackers-default-rtdb.firebaseio.com";

function ensureStorageFile() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {}
}

function saveToDisk() {
  try {
    ensureStorageFile();
    const payload = {
      orders: Array.from(ORDERS_MAP.values()),
      products: Array.from(PRODUCTS_MAP.values()),
      deletedProductIds: Array.from(DELETED_SET),
      reorderMap: Array.from(REORDER_MAP.entries()),
      settings: Array.from(SETTINGS_MAP.entries()),
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(payload, null, 2), "utf-8");
  } catch (err) {}
}

function loadFromDisk() {
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const raw = fs.readFileSync(STORAGE_FILE, "utf-8");
      const data = JSON.parse(raw);
      if (Array.isArray(data.orders)) {
        for (const ord of data.orders) {
          if (ord?.estimateNumber) ORDERS_MAP.set(ord.estimateNumber, ord);
        }
      }
      if (Array.isArray(data.products)) {
        for (const prod of data.products) {
          if (prod?.id) PRODUCTS_MAP.set(prod.id, prod);
        }
      }
      if (Array.isArray(data.deletedProductIds)) {
        for (const id of data.deletedProductIds) DELETED_SET.add(id);
      }
      if (Array.isArray(data.reorderMap)) {
        for (const [k, v] of data.reorderMap) REORDER_MAP.set(k, Number(v));
      }
      if (Array.isArray(data.settings)) {
        for (const [k, v] of data.settings) SETTINGS_MAP.set(k, v);
      }
    }
  } catch (err) {}
}

loadFromDisk();

/* ------------------------------------------------------------------ */
/* Cloud Database Sync Handlers                                       */
/* ------------------------------------------------------------------ */

async function syncOrdersFromCloud(): Promise<void> {
  try {
    const res = await fetch(`${CLOUD_DB_BASE}/orders.json`, { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    if (data && typeof data === "object") {
      Object.values(data).forEach((ord: any) => {
        if (ord && ord.estimateNumber) {
          ORDERS_MAP.set(ord.estimateNumber, ord);
          if (ord.id) ORDERS_MAP.set(ord.id, ord);
        }
      });
      saveToDisk();
    }
  } catch (err) {}
}

async function syncOrderToCloud(order: OrderRecord): Promise<void> {
  try {
    await fetch(`${CLOUD_DB_BASE}/orders/${encodeURIComponent(order.estimateNumber)}.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(order),
    });
  } catch (err) {}
}

/* ------------------------------------------------------------------ */
/* Orders Storage Interface                                           */
/* ------------------------------------------------------------------ */

export async function saveOrderToEngine(order: OrderRecord): Promise<OrderRecord> {
  ORDERS_MAP.set(order.estimateNumber, order);
  ORDERS_MAP.set(order.id, order);
  saveToDisk();
  void syncOrderToCloud(order);
  return order;
}

export async function getOrderFromEngine(idOrNumber: string): Promise<OrderRecord | null> {
  let existing = ORDERS_MAP.get(idOrNumber);
  if (!existing) {
    await syncOrdersFromCloud();
    existing = ORDERS_MAP.get(idOrNumber);
  }
  return existing ?? null;
}

export async function getAllOrdersFromEngine(): Promise<OrderRecord[]> {
  await syncOrdersFromCloud();
  loadFromDisk();
  const unique = new Map<string, OrderRecord>();
  for (const ord of ORDERS_MAP.values()) {
    if (ord && ord.estimateNumber) {
      unique.set(ord.estimateNumber, ord);
    }
  }
  return Array.from(unique.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function updateOrderStatusInEngine(
  estimateNumber: string,
  updates: Partial<OrderRecord>
): Promise<OrderRecord | null> {
  const existing = await getOrderFromEngine(estimateNumber);
  if (!existing) return null;
  const updated: OrderRecord = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  await saveOrderToEngine(updated);
  return updated;
}

/* ------------------------------------------------------------------ */
/* Products Storage Interface                                         */
/* ------------------------------------------------------------------ */

export function saveProductToEngine(prod: ProductRecord): ProductRecord {
  DELETED_SET.delete(prod.id);
  PRODUCTS_MAP.set(prod.id, prod);
  saveToDisk();
  return prod;
}

export function getAllCustomProductsFromEngine(): ProductRecord[] {
  loadFromDisk();
  return Array.from(PRODUCTS_MAP.values());
}

export function deleteProductFromEngine(id: string): void {
  DELETED_SET.add(id);
  PRODUCTS_MAP.delete(id);
  saveToDisk();
}

export function getDeletedProductIdsFromEngine(): Set<string> {
  loadFromDisk();
  return DELETED_SET;
}

/* ------------------------------------------------------------------ */
/* Reorder Sequence Engine                                            */
/* ------------------------------------------------------------------ */

export function saveProductReorderToEngine(itemsOrIds: any[]): void {
  if (!Array.isArray(itemsOrIds)) return;
  REORDER_MAP.clear();
  itemsOrIds.forEach((item, idx) => {
    if (typeof item === "string") {
      REORDER_MAP.set(item, idx);
    } else if (item && typeof item === "object") {
      if (item.sku) REORDER_MAP.set(String(item.sku), idx);
      if (item.id) REORDER_MAP.set(String(item.id), idx);
      if (item.slug) REORDER_MAP.set(String(item.slug), idx);
      if (item.name) REORDER_MAP.set(String(item.name), idx);
    }
  });
  saveToDisk();
}

export function getProductReorderMapFromEngine(): Map<string, number> {
  loadFromDisk();
  return REORDER_MAP;
}
