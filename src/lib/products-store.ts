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

import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  saveProductToEngine,
  deleteProductFromEngine,
  getAllCustomProductsFromEngine,
  getDeletedProductIdsFromEngine,
  saveProductReorderToEngine,
  getProductReorderMapFromEngine,
} from "./storage-engine";

type GlobalWithProducts = typeof globalThis & {
  __mayilonCustomProductsStore?: Map<string, ProductRecord>;
  __mayilonClearSeedMode?: boolean;
  __mayilonDeletedProductIds?: Set<string>;
  __mayilonProductOrderMap?: Map<string, number>;
};

const g = globalThis as GlobalWithProducts;
if (!g.__mayilonCustomProductsStore) {
  g.__mayilonCustomProductsStore = new Map<string, ProductRecord>();
}
if (g.__mayilonClearSeedMode === undefined) {
  g.__mayilonClearSeedMode = false;
}
if (!g.__mayilonDeletedProductIds) {
  g.__mayilonDeletedProductIds = new Set<string>();
}

const STORE = g.__mayilonCustomProductsStore;
const DELETED_SET = g.__mayilonDeletedProductIds;

/** Save custom product to storage engine and memory */
export function saveProductToStore(prod: ProductRecord): ProductRecord {
  DELETED_SET.delete(prod.id);
  STORE.set(prod.id, prod);
  saveProductToEngine(prod);
  return prod;
}

/** Get all custom added products from engine */
export function getCustomProductsFromStore(): ProductRecord[] {
  const customList = getAllCustomProductsFromEngine();
  const deletedEngine = getDeletedProductIdsFromEngine();
  
  for (const id of deletedEngine) {
    DELETED_SET.add(id);
  }

  for (const item of customList) {
    if (item && item.id && !DELETED_SET.has(item.id)) {
      STORE.set(item.id, item);
    }
  }
  return Array.from(STORE.values());
}

/** Remove individual product from store */
export function deleteProductFromStore(id: string): boolean {
  DELETED_SET.add(id);
  STORE.delete(id);
  deleteProductFromEngine(id);
  return true;
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
  const fromEngine = getDeletedProductIdsFromEngine();
  for (const id of fromEngine) {
    DELETED_SET.add(id);
  }
  return DELETED_SET;
}

/** Clear all products completely from store */
export function clearAllProductsInStore(): void {
  STORE.clear();
  g.__mayilonClearSeedMode = true;
}

/** Save product reorder mapping to storage engine */
export function saveProductReorder(orderIds: string[]) {
  saveProductReorderToEngine(orderIds);

  const map = g.__mayilonProductOrderMap || new Map<string, number>();
  map.clear();
  orderIds.forEach((id, idx) => map.set(id, idx));
  g.__mayilonProductOrderMap = map;

  // Optional background sync to DB settings table if available
  try {
    void db
      .insert(settings)
      .values({
        key: "product_reorder_map",
        value: { orderIds },
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: settings.key,
        set: {
          value: { orderIds },
          updatedAt: new Date(),
        },
      })
      .catch((err: any) => console.warn("[saveProductReorder] DB sync note:", err));
  } catch (e) {}
}

export async function loadReorderMapFromDb(): Promise<Map<string, number>> {
  const map = getProductReorderMapFromEngine();
  if (map.size > 0) return map;

  try {
    const [row] = await db
      .select()
      .from(settings)
      .where(eq(settings.key, "product_reorder_map"))
      .limit(1);
    if (row?.value && typeof row.value === "object") {
      const orderIds = (row.value as any).orderIds;
      if (Array.isArray(orderIds)) {
        saveProductReorderToEngine(orderIds);
        const map = getProductReorderMapFromEngine();
        return map;
      }
    }
  } catch (e) {
    console.warn("[loadReorderMapFromDb] DB read note:", e);
  }
  return map;
}

export function getProductReorderMap(): Map<string, number> {
  const engineMap = getProductReorderMapFromEngine();
  if (engineMap.size > 0) {
    return engineMap;
  }
  if (!g.__mayilonProductOrderMap) {
    g.__mayilonProductOrderMap = new Map<string, number>();
    void loadReorderMapFromDb();
  }
  return g.__mayilonProductOrderMap;
}
