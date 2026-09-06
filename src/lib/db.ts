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

export async function saveOrder(order: OrderRecord): Promise<OrderRecord> {
  return saveOrderToEngine(order);
}

export async function getOrder(idOrNumber: string): Promise<OrderRecord | null> {
  return getOrderFromEngine(idOrNumber);
}

export async function getAllOrders(): Promise<OrderRecord[]> {
  return getAllOrdersFromEngine();
}

export async function updateOrderStatus(
  estimateNumber: string,
  updates: Partial<OrderRecord>
): Promise<OrderRecord | null> {
  return updateOrderStatusInEngine(estimateNumber, updates);
}

export {
  saveProductToEngine as saveProduct,
  getAllCustomProductsFromEngine as getAllCustomProducts,
  deleteProductFromEngine as deleteProduct,
  getDeletedProductIdsFromEngine as getDeletedProductIds,
  saveProductReorderToEngine as saveProductReorder,
  getProductReorderMapFromEngine as getProductReorderMap,
};
