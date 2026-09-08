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
  __mayilonSkuOverrideMap?: Map<string, string>;
  __mayilonSettingsMap?: Map<string, any>;
};

const g = globalThis as GlobalStorage;
if (!g.__mayilonOrdersMap) g.__mayilonOrdersMap = new Map<string, OrderRecord>();
if (!g.__mayilonCustomProductsMap) g.__mayilonCustomProductsMap = new Map<string, ProductRecord>();
if (!g.__mayilonDeletedProductIds) g.__mayilonDeletedProductIds = new Set<string>();
if (!g.__mayilonProductOrderMap) g.__mayilonProductOrderMap = new Map<string, number>();
if (!g.__mayilonSkuOverrideMap) g.__mayilonSkuOverrideMap = new Map<string, string>();
if (!g.__mayilonSettingsMap) g.__mayilonSettingsMap = new Map<string, any>();

const ORDERS_MAP = g.__mayilonOrdersMap;
const PRODUCTS_MAP = g.__mayilonCustomProductsMap;
const DELETED_SET = g.__mayilonDeletedProductIds;
const REORDER_MAP = g.__mayilonProductOrderMap;
const SKU_OVERRIDE_MAP = g.__mayilonSkuOverrideMap;
const SETTINGS_MAP = g.__mayilonSettingsMap;

import os from "os";

function resolveDataDir(): string {
  try {
    const isServerless = Boolean(
      process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT
    );
    if (isServerless) {
      return path.join(os.tmpdir(), "mayilon-data");
    }
    const localDir = path.join(process.cwd(), ".data");
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    return localDir;
  } catch {
    return path.join(os.tmpdir(), "mayilon-data");
  }
}

const DATA_DIR = resolveDataDir();
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
    const uniqueOrders = new Map<string, OrderRecord>();
    for (const ord of ORDERS_MAP.values()) {
      if (ord && ord.estimateNumber) {
        uniqueOrders.set(ord.estimateNumber, ord);
      }
    }
    const payload = {
      orders: Array.from(uniqueOrders.values()),
      products: Array.from(PRODUCTS_MAP.values()),
      deletedProductIds: Array.from(DELETED_SET),
      reorderMap: Array.from(REORDER_MAP.entries()),
      skuOverrideMap: Array.from(SKU_OVERRIDE_MAP.entries()),
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
          if (ord?.id) ORDERS_MAP.set(ord.id, ord);
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
      if (Array.isArray(data.skuOverrideMap)) {
        for (const [k, v] of data.skuOverrideMap) SKU_OVERRIDE_MAP.set(String(k), String(v));
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

export async function deleteOrderFromEngine(idOrNumber: string): Promise<boolean> {
  const existing = ORDERS_MAP.get(idOrNumber);
  if (existing) {
    ORDERS_MAP.delete(existing.estimateNumber);
    ORDERS_MAP.delete(existing.id);
  } else {
    ORDERS_MAP.delete(idOrNumber);
  }
  saveToDisk();
  return true;
}

/* ------------------------------------------------------------------ */
/* Products Storage Interface                                         */
/* ------------------------------------------------------------------ */

export function saveProductToEngine(prod: ProductRecord): ProductRecord {
  DELETED_SET.delete(prod.id);
  if (prod.sku) DELETED_SET.delete(prod.sku);

  // If there's an existing item with the same SKU or name, purge old ID to prevent duplication
  for (const [existingId, existing] of PRODUCTS_MAP.entries()) {
    if (existing.sku === prod.sku || (prod.name && existing.name.toLowerCase() === prod.name.toLowerCase())) {
      PRODUCTS_MAP.delete(existingId);
    }
  }

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
/* Reorder Sequence & SKU Engine                                      */
/* ------------------------------------------------------------------ */

export async function syncCatalogSequenceFromCloud(): Promise<void> {
  try {
    const res = await fetch(`${CLOUD_DB_BASE}/settings/catalog_sequence.json`, { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    if (data && typeof data === "object") {
      if (Array.isArray(data.reorderMap)) {
        for (const [k, v] of data.reorderMap) REORDER_MAP.set(String(k), Number(v));
      }
      if (Array.isArray(data.skuOverrideMap)) {
        for (const [k, v] of data.skuOverrideMap) SKU_OVERRIDE_MAP.set(String(k), String(v));
      }
      saveToDisk();
    }
  } catch (err) {}
}

export async function syncCatalogSequenceToCloud(): Promise<void> {
  try {
    await fetch(`${CLOUD_DB_BASE}/settings/catalog_sequence.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reorderMap: Array.from(REORDER_MAP.entries()),
        skuOverrideMap: Array.from(SKU_OVERRIDE_MAP.entries()),
        updatedAt: new Date().toISOString(),
      }),
    });
  } catch (err) {}
}

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
      if (item.previousSku) REORDER_MAP.set(String(item.previousSku), idx);

      // Record SKU overrides
      if (item.id && item.sku) {
        SKU_OVERRIDE_MAP.set(String(item.id), String(item.sku));
      }
      if (item.previousSku && item.sku) {
        SKU_OVERRIDE_MAP.set(String(item.previousSku), String(item.sku));
      }

      // If custom product exists in PRODUCTS_MAP, update its sku directly
      if (item.id && PRODUCTS_MAP.has(String(item.id))) {
        const existing = PRODUCTS_MAP.get(String(item.id))!;
        existing.sku = String(item.sku);
        PRODUCTS_MAP.set(String(item.id), existing);
      }
    }
  });
  saveToDisk();
  void syncCatalogSequenceToCloud();
}

export function getProductReorderMapFromEngine(): Map<string, number> {
  loadFromDisk();
  return REORDER_MAP;
}

export function getProductSkuOverrideMapFromEngine(): Map<string, string> {
  loadFromDisk();
  return SKU_OVERRIDE_MAP;
}
