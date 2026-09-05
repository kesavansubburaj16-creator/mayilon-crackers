/**
 * Universal Product Store & Clean Catalogue Engine for Mayilon Pyroworld.
 * Supports clearing seed products and starting fresh with custom Admin products only.
 */

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

import fs from "fs";
import path from "path";
import os from "os";

const DATA_FILE = path.join(os.tmpdir(), "mayilon_custom_products.json");

function syncFileSave(prods: ProductRecord[]) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(prods), "utf-8");
  } catch (err) {}
}

function syncFileLoad(): ProductRecord[] {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf-8");
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return arr;
    }
  } catch (err) {}
  return [];
}

type GlobalWithProducts = typeof globalThis & {
  __mayilonCustomProductsStore?: Map<string, ProductRecord>;
  __mayilonClearSeedMode?: boolean;
  __mayilonDeletedProductIds?: Set<string>;
};

const g = globalThis as GlobalWithProducts;
if (!g.__mayilonCustomProductsStore) {
  g.__mayilonCustomProductsStore = new Map<string, ProductRecord>();
  // Pre-fill from persistent file if available
  const saved = syncFileLoad();
  for (const item of saved) {
    if (item && item.id) g.__mayilonCustomProductsStore.set(item.id, item);
  }
}
if (g.__mayilonClearSeedMode === undefined) {
  g.__mayilonClearSeedMode = false;
}
if (!g.__mayilonDeletedProductIds) {
  g.__mayilonDeletedProductIds = new Set<string>();
}

const STORE = g.__mayilonCustomProductsStore;
const DELETED_SET = g.__mayilonDeletedProductIds;

/** Save custom product to memory store and disk file */
export function saveProductToStore(prod: ProductRecord): ProductRecord {
  DELETED_SET.delete(prod.id);
  STORE.set(prod.id, prod);
  syncFileSave(Array.from(STORE.values()));
  return prod;
}

/** Get all custom added products */
export function getCustomProductsFromStore(): ProductRecord[] {
  if (STORE.size === 0) {
    const saved = syncFileLoad();
    for (const item of saved) {
      if (item && item.id && !DELETED_SET.has(item.id)) STORE.set(item.id, item);
    }
  }
  return Array.from(STORE.values());
}

/** Remove individual product from store */
export function deleteProductFromStore(id: string): boolean {
  DELETED_SET.add(id);
  const deleted = STORE.delete(id);
  syncFileSave(Array.from(STORE.values()));
  return deleted;
}

/** Check if seed products are cleared */
export function isSeedCleared(): boolean {
  return g.__mayilonClearSeedMode ?? false;
}

/** Set clear seed mode flag */
export function setSeedCleared(cleared: boolean): void {
  g.__mayilonClearSeedMode = cleared;
}

/** Get set of deleted product IDs */
export function getDeletedProductIds(): Set<string> {
  return DELETED_SET;
}

/** Clear all products completely from store */
export function clearAllProductsInStore(): void {
  STORE.clear();
  g.__mayilonClearSeedMode = true;
  syncFileSave([]);
}

type GlobalWithReorder = GlobalWithProducts & {
  __mayilonProductOrderMap?: Map<string, number>;
};

const g2 = globalThis as GlobalWithReorder;
const REORDER_MAP_FILE = path.join(os.tmpdir(), "mayilon_product_reorder.json");

if (!g2.__mayilonProductOrderMap) {
  g2.__mayilonProductOrderMap = new Map<string, number>();
  try {
    if (fs.existsSync(REORDER_MAP_FILE)) {
      const raw = fs.readFileSync(REORDER_MAP_FILE, "utf-8");
      const obj = JSON.parse(raw);
      if (obj && typeof obj === "object") {
        for (const [k, v] of Object.entries(obj)) {
          g2.__mayilonProductOrderMap.set(k, Number(v));
        }
      }
    }
  } catch (e) {}
}

export function saveProductReorder(orderIds: string[]) {
  const map = g2.__mayilonProductOrderMap!;
  map.clear();
  const obj: Record<string, number> = {};
  orderIds.forEach((id, idx) => {
    map.set(id, idx);
    obj[id] = idx;
  });
  try {
    fs.writeFileSync(REORDER_MAP_FILE, JSON.stringify(obj), "utf-8");
  } catch (e) {}
}

export function getProductReorderMap(): Map<string, number> {
  if (!g2.__mayilonProductOrderMap || g2.__mayilonProductOrderMap.size === 0) {
    try {
      if (fs.existsSync(REORDER_MAP_FILE)) {
        const raw = fs.readFileSync(REORDER_MAP_FILE, "utf-8");
        const obj = JSON.parse(raw);
        g2.__mayilonProductOrderMap = new Map<string, number>();
        for (const [k, v] of Object.entries(obj)) {
          g2.__mayilonProductOrderMap.set(k, Number(v));
        }
      }
    } catch (e) {}
  }
  return g2.__mayilonProductOrderMap || new Map<string, number>();
}
