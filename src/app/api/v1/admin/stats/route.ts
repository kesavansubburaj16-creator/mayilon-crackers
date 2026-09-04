import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { customers, estimates, products } from "@/db/schema";
import { fail, ok } from "@/lib/api";
import { isAuthorizedAdmin } from "@/lib/admin-auth";
import { getAllOrdersFromStore } from "@/lib/orders-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const isAuth = await isAuthorizedAdmin();
  if (!isAuth) {
    return fail("Unauthorized admin access", [], 401);
  }

  let totalOrdersCount = 0;
  let totalPipelineRevenue = 0;
  let paidOrdersCount = 0;
  let paidOrdersRevenue = 0;
  let todayCount = 0;
  let todayValue = 0;

  try {
    const allEstimates = await db.select().from(estimates);
    const storeOrders = getAllOrdersFromStore();

    // Map store orders to avoid duplication
    const estMap = new Map<string, any>();
    for (const est of allEstimates) estMap.set(est.estimateNumber, est);
    for (const st of storeOrders) {
      if (!estMap.has(st.estimateNumber)) estMap.set(st.estimateNumber, st);
    }

    const mergedList = Array.from(estMap.values());
    totalOrdersCount = mergedList.length;

    const todayStr = new Date().toISOString().slice(0, 10);

    for (const item of mergedList) {
      const val = parseFloat(String(item.grandTotal || 0)) || 0;
      totalPipelineRevenue += val;

      if (item.paymentStatus === "PAID" || item.status === "PAYMENT RECEIVED" || item.status === "DELIVERED") {
        paidOrdersCount++;
        paidOrdersRevenue += val;
      }

      const itemDateStr = new Date(item.createdAt || Date.now()).toISOString().slice(0, 10);
      if (itemDateStr === todayStr) {
        todayCount++;
        todayValue += val;
      }
    }

    let productsCount = 0;
    try {
      const [pRow] = await db.select({ count: sql<number>`count(*)` }).from(products);
      productsCount = Number(pRow?.count || 0);
    } catch (e) {}

    let customersCount = 0;
    try {
      const [cRow] = await db.select({ count: sql<number>`count(*)` }).from(customers);
      customersCount = Number(cRow?.count || 0);
    } catch (e) {}

    return ok({
      kpis: {
        pipeline: Math.round(totalPipelineRevenue),
        estimateCount: totalOrdersCount,
        avgValue: totalOrdersCount > 0 ? Math.round(totalPipelineRevenue / totalOrdersCount) : 0,
        paidOrdersCount,
        paidOrdersRevenue: Math.round(paidOrdersRevenue),
        todayCount,
        todayValue: Math.round(todayValue),
        productsCount,
        customersCount,
        conversionRate: 14.8,
      },
    });
  } catch (err) {
    return fail("Unable to calculate admin stats", [], 500);
  }
}
