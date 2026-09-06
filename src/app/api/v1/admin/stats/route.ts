import { ok } from "@/lib/api";
import { getAllOrders } from "@/lib/db";
import { getProducts } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  const orders = await getAllOrders();
  const { total: totalProducts } = await getProducts({ limit: 1 });

  const todayStr = new Date().toISOString().slice(0, 10);
  let pipeline = 0;
  let paidOrdersCount = 0;
  let paidOrdersRevenue = 0;
  let todayCount = 0;
  let todayValue = 0;

  for (const ord of orders) {
    const amt = Number(ord.totalAmount) || 0;
    pipeline += amt;

    const pStat = String(ord.paymentStatus || "").toUpperCase();
    const stat = String(ord.status || "").toUpperCase();

    if (pStat.includes("PAID") || stat.includes("PAID") || stat === "DELIVERED") {
      paidOrdersCount++;
      paidOrdersRevenue += amt;
    }

    const dateStr = new Date(ord.createdAt || Date.now()).toISOString().slice(0, 10);
    if (dateStr === todayStr) {
      todayCount++;
      todayValue += amt;
    }
  }

  const estimateCount = orders.length;
  const averageOrderValue = estimateCount > 0 ? Math.round(pipeline / estimateCount) : 0;

  return ok({
    kpis: {
      pipeline: Math.round(pipeline),
      estimateCount,
      paidOrdersCount,
      paidOrdersRevenue: Math.round(paidOrdersRevenue),
      todayCount,
      todayValue: Math.round(todayValue),
      totalRevenue: Math.round(paidOrdersRevenue),
      averageOrderValue,
      totalProducts,
    },
    orders: orders.slice(0, 10),
  });
}
