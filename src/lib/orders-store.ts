import {
  getAllOrdersFromEngine,
  getOrderFromEngine,
  saveOrderToEngine,
  updateOrderStatusInEngine,
} from "./storage-engine";

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
  paymentProofUrl?: string;
  transactionId?: string;
  createdAt: string;
  items: OrderItemRecord[];
};

const INITIAL_SEED_ORDERS: OrderRecord[] = [
  {
    id: "est-2608-884390",
    estimateNumber: "MYL-2608-884390",
    customerName: "dsafdsdf",
    mobile: "8545265223",
    email: "rajeswariproperties@gmail.com",
    state: "Tamil Nadu",
    district: "Namakkal",
    city: "Namakkal",
    pincode: "637015",
    address: "363/5 vetrivel nagar , murugan kovil Back side namakkal, Tamil Nadu, 637015",
    gstNumber: "JGHJGHJGHJGHJGHJGHJ",
    transportName: "Direct Factory Transport",
    deliveryLocation: "Sivakasi Licensed Dispatch",
    paymentMethod: "COD",
    paymentStatus: "PAID",
    status: "SHIPPED",
    itemCount: 1,
    mrpTotal: "371700.00",
    subtotal: "74340.00",
    savings: "297360.00",
    discount: "0.00",
    transportCharge: "0.00",
    gstAmount: "0.00",
    grandTotal: "74340.00",
    createdAt: "2026-09-02T20:38:00.000Z",
    items: [
      { id: "prod-115", sku: "MYL-RKT-01", name: "Musical Rocket", categoryName: "Rockets", packing: "1 Box", mrp: "1062.00", price: "212.40", quantity: 350, lineTotal: "74340.00" },
    ],
  },
  {
    id: "est-1788238469070-k5dr",
    estimateNumber: "MYL-2608-234565",
    customerName: "Surjith Thangavel",
    mobile: "8667038564",
    email: "sujithjai007@gmail.com",
    state: "Tamil Nadu",
    district: "Namakkal",
    city: "Tiruchengode",
    pincode: "637211",
    address: "7/148,athurampalayam,karuveppampatti(p.o),tiruchengode(t.k),namakkal, Tamil Nadu",
    transportName: "Direct Factory Transport",
    deliveryLocation: "Sivakasi Licensed Dispatch",
    paymentMethod: "COD",
    paymentStatus: "UNPAID",
    status: "NEW",
    itemCount: 6,
    mrpTotal: "1777575.00",
    subtotal: "355515.00",
    savings: "1457611.50",
    discount: "35551.50",
    transportCharge: "0.00",
    gstAmount: "57593.43",
    grandTotal: "377556.93",
    couponCode: "DEEPAVALI10",
    createdAt: "2026-09-01T04:54:29.068Z",
    items: [
      { id: "prod-106", sku: "MYL-GFT-01", name: "25 Items (10pc packs)", categoryName: "Gift Boxes", packing: "1 Box", mrp: "1875.00", price: "375.00", quantity: 1, lineTotal: "375.00" },
      { id: "prod-108", sku: "MYL-GFT-03", name: "35 Items (10pc packs)", categoryName: "Gift Boxes", packing: "1 Box", mrp: "2700.00", price: "540.00", quantity: 1, lineTotal: "540.00" },
      { id: "prod-109", sku: "MYL-GFT-04", name: "42 Items (10pc packs)", categoryName: "Gift Boxes", packing: "1 Box", mrp: "4000.00", price: "800.00", quantity: 45, lineTotal: "36000.00" },
      { id: "prod-110", sku: "MYL-GFT-05", name: "50 Items (10pc packs)", categoryName: "Gift Boxes", packing: "1 Box", mrp: "5000.00", price: "1000.00", quantity: 231, lineTotal: "231000.00" },
      { id: "prod-112", sku: "MYL-GFT-07", name: "40 Items (5pc packs)", categoryName: "Gift Boxes", packing: "1 Box", mrp: "3000.00", price: "600.00", quantity: 6, lineTotal: "3600.00" },
      { id: "prod-113", sku: "MYL-GFT-08", name: "50 Items (5pc packs)", categoryName: "Gift Boxes", packing: "1 Box", mrp: "4000.00", price: "800.00", quantity: 105, lineTotal: "84000.00" },
    ],
  },
];

// Seed initial orders into Engine if empty
for (const o of INITIAL_SEED_ORDERS) {
  if (!getOrderFromEngine(o.estimateNumber)) {
    saveOrderToEngine(o);
  }
}

/** Save order to Zero-Config System Engine */
export function saveOrderToStore(order: OrderRecord): OrderRecord {
  return saveOrderToEngine(order);
}

/** Retrieve order by estimate number */
export function getOrderFromStore(estimateNumber: string): OrderRecord | undefined {
  return getOrderFromEngine(estimateNumber);
}

/** Get all orders for Admin portal (sorted newest first) */
export function getAllOrdersFromStore(): OrderRecord[] {
  return getAllOrdersFromEngine();
}

/** Update order status in store without clearing order history or date */
export function updateOrderStatusInStore(
  estimateNumber: string,
  patch: Partial<Pick<OrderRecord, "status" | "paymentStatus" | "paymentMethod">>,
): OrderRecord | undefined {
  return updateOrderStatusInEngine(estimateNumber, patch);
}
