import fs from "fs";
import path from "path";
import os from "os";

export type StorageSchema = {
  orders: Record<string, any>;
  products: Record<string, any>;
  settings: Record<string, any>;
  auditLogs: any[];
  deletedProductIds: string[];
};

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "mayilon_system_storage.json");
const TMP_FILE = path.join(os.tmpdir(), "mayilon_system_storage_backup.json");

type GlobalWithStorage = typeof globalThis & {
  __mayilonUniversalStorage?: StorageSchema;
};

const g = globalThis as GlobalWithStorage;

function initDefaultStorage(): StorageSchema {
  return {
    orders: {},
    products: {},
    settings: {},
    auditLogs: [],
    deletedProductIds: [],
  };
}

function loadDiskData(): StorageSchema {
  // Try project .data directory first, then OS tmp directory
  const filesToTry = [DATA_FILE, TMP_FILE];
  for (const f of filesToTry) {
    try {
      if (fs.existsSync(f)) {
        const raw = fs.readFileSync(f, "utf-8");
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          return {
            orders: parsed.orders || {},
            products: parsed.products || {},
            settings: parsed.settings || {},
            auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : [],
            deletedProductIds: Array.isArray(parsed.deletedProductIds) ? parsed.deletedProductIds : [],
          };
        }
      }
    } catch (e) {}
  }
  return initDefaultStorage();
}

function saveDiskData(data: StorageSchema): void {
  const jsonStr = JSON.stringify(data, null, 2);
  const targetDirs = [DATA_DIR, os.tmpdir()];
  for (const dir of targetDirs) {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const targetFile = path.join(dir, dir === DATA_DIR ? "mayilon_system_storage.json" : "mayilon_system_storage_backup.json");
      fs.writeFileSync(targetFile, jsonStr, "utf-8");
    } catch (e) {}
  }
}

if (!g.__mayilonUniversalStorage) {
  g.__mayilonUniversalStorage = loadDiskData();
}

const STORAGE = g.__mayilonUniversalStorage;

/* ------------------------------------------------------------------ */
/* Orders Storage Engine                                               */
/* ------------------------------------------------------------------ */

export function saveOrderToEngine(order: any): any {
  if (!order || !order.estimateNumber) return order;
  const existing = STORAGE.orders[order.estimateNumber];
  const finalOrder = {
    ...(existing || {}),
    ...order,
    createdAt: existing?.createdAt || order.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  STORAGE.orders[order.estimateNumber] = finalOrder;
  saveDiskData(STORAGE);
  return finalOrder;
}

export function getOrderFromEngine(estimateNumber: string): any | undefined {
  return STORAGE.orders[estimateNumber];
}

export function getAllOrdersFromEngine(): any[] {
  return Object.values(STORAGE.orders).sort(
    (a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
  );
}

export function updateOrderStatusInEngine(
  estimateNumber: string,
  patch: Record<string, any>,
): any | undefined {
  const existing = STORAGE.orders[estimateNumber];
  if (!existing) return undefined;

  const updated = {
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  STORAGE.orders[estimateNumber] = updated;
  saveDiskData(STORAGE);
  return updated;
}

/* ------------------------------------------------------------------ */
/* Products & Reorder Storage Engine                                   */
/* ------------------------------------------------------------------ */

export function saveProductToEngine(product: any): any {
  if (!product || (!product.id && !product.sku)) return product;
  const key = product.sku || product.id;
  STORAGE.products[key] = {
    ...product,
    updatedAt: new Date().toISOString(),
  };
  STORAGE.deletedProductIds = STORAGE.deletedProductIds.filter(
    (id) => id !== product.id && id !== product.sku,
  );
  saveDiskData(STORAGE);
  return product;
}

export function deleteProductFromEngine(idOrSku: string): boolean {
  if (!idOrSku) return false;
  delete STORAGE.products[idOrSku];
  if (!STORAGE.deletedProductIds.includes(idOrSku)) {
    STORAGE.deletedProductIds.push(idOrSku);
  }
  saveDiskData(STORAGE);
  return true;
}

export function getAllCustomProductsFromEngine(): any[] {
  return Object.values(STORAGE.products);
}

export function getDeletedProductIdsFromEngine(): Set<string> {
  return new Set(STORAGE.deletedProductIds);
}

export function saveProductReorderToEngine(itemsOrIds: any[]): void {
  const mapObj: Record<string, number> = {};
  const orderIds: string[] = [];

  if (Array.isArray(itemsOrIds)) {
    itemsOrIds.forEach((item, idx) => {
      if (typeof item === "string" && item.trim()) {
        orderIds.push(item);
        mapObj[item] = idx;
      } else if (item && typeof item === "object") {
        if (item.id) {
          orderIds.push(String(item.id));
          mapObj[String(item.id)] = idx;
        }
        if (item.sku) {
          orderIds.push(String(item.sku));
          mapObj[String(item.sku)] = idx;
        }
        if (item.slug) {
          mapObj[String(item.slug)] = idx;
        }
        if (item.name) {
          mapObj[String(item.name)] = idx;
        }
      }
    });
  }

  STORAGE.settings["product_reorder_map"] = {
    orderIds,
    mapObj,
    updatedAt: new Date().toISOString(),
  };
  saveDiskData(STORAGE);
}

export function getProductReorderMapFromEngine(): Map<string, number> {
  const map = new Map<string, number>();
  const setting = STORAGE.settings["product_reorder_map"];
  if (setting) {
    if (setting.mapObj && typeof setting.mapObj === "object") {
      for (const [k, v] of Object.entries(setting.mapObj)) {
        if (k && v !== undefined && v !== null) {
          map.set(k, Number(v));
        }
      }
    } else if (Array.isArray(setting.orderIds)) {
      setting.orderIds.forEach((id: string, idx: number) => {
        if (id) map.set(id, idx);
      });
    }
  }
  return map;
}

/* ------------------------------------------------------------------ */
/* Audit Log Engine                                                   */
/* ------------------------------------------------------------------ */

export function addAuditLogToEngine(action: string, entity: string, entityId?: string, meta?: any): void {
  STORAGE.auditLogs.unshift({
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    actor: "ADMIN",
    action,
    entity,
    entityId,
    meta,
    createdAt: new Date().toISOString(),
  });
  if (STORAGE.auditLogs.length > 500) {
    STORAGE.auditLogs = STORAGE.auditLogs.slice(0, 500);
  }
  saveDiskData(STORAGE);
}

export function getAuditLogsFromEngine(): any[] {
  return STORAGE.auditLogs;
}
