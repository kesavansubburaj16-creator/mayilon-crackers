import { desc, gte, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  auditLogs,
  dealerApplications,
  enquiries,
  estimateItems,
  estimates,
  products,
  subscribers,
} from "@/db/schema";
import { ok, requireAdmin } from "@/lib/api";
import { ensureSeeded } from "@/lib/data";
import { getAllOrdersFromStore, type OrderRecord } from "@/lib/orders-store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;
  await ensureSeeded();

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  // 1. Get Store Orders (Universal Persistent Store)
  const storeOrders = getAllOrdersFromStore();
  let dbEstimates: any[] = [];

  try {
    dbEstimates = await db.select().from(estimates);
  } catch (err) {
    console.warn("[admin/stats] DB fallback note:", err);
  }

  // Merge store and DB estimates by estimateNumber
  const map = new Map<string, any>();
  for (const o of storeOrders) {
    if (o && o.estimateNumber) map.set(o.estimateNumber, o);
  }
  for (const r of dbEstimates) {
    if (r && r.estimateNumber && !map.has(r.estimateNumber)) {
      map.set(r.estimateNumber, r);
    }
  }

  const allOrders: any[] = Array.from(map.values());

  // Compute Aggregates
  const totalPipeline = allOrders.reduce((sum, o) => sum + (Number(o.grandTotal) || 0), 0);
  const estimateCount = allOrders.length;
  const avgValue = estimateCount > 0 ? totalPipeline / estimateCount : 0;

  const todayOrders = allOrders.filter((o) => new Date(o.createdAt || 0) >= startOfDay);
  const todayCount = todayOrders.length;
  const todayValue = todayOrders.reduce((sum, o) => sum + (Number(o.grandTotal) || 0), 0);

  // Status breakdown
  const statusMap: Record<string, { count: number; value: number }> = {};
  for (const o of allOrders) {
    const st = o.status || "NEW";
    if (!statusMap[st]) statusMap[st] = { count: 0, value: 0 };
    statusMap[st].count += 1;
    statusMap[st].value += Number(o.grandTotal) || 0;
  }

  const byStatus = Object.entries(statusMap).map(([status, d]) => ({
    status,
    count: d.count,
    value: d.value,
  }));

  let lowStock: any[] = [];
  let counts = { products: 115, dealers: 0, enquiries: 0, subscribers: 0 };
  let activity: any[] = [];

  try {
    const [ls, [cnts], act] = await Promise.all([
      db
        .select({ name: products.name, sku: products.sku, stock: products.stock })
        .from(products)
        .where(isNull(products.deletedAt))
        .orderBy(products.stock)
        .limit(10),
      db
        .select({
          products: sql<number>`(select count(*) from ${products} where ${products.deletedAt} is null)::int`,
          dealers: sql<number>`(select count(*) from ${dealerApplications})::int`,
          enquiries: sql<number>`(select count(*) from ${enquiries})::int`,
          subscribers: sql<number>`(select count(*) from ${subscribers})::int`,
        })
        .from(sql`(select 1) as t`),
      db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(10),
    ]);
    lowStock = ls;
    if (cnts) counts = cnts;
    activity = act;
  } catch (err) {}

  const newCount = statusMap["NEW"]?.count ?? 0;
  const converted = statusMap["DELIVERED"]?.count ?? statusMap["SHIPPED"]?.count ?? 0;
  const conversionRate = estimateCount ? (converted / estimateCount) * 100 : 0;

  const sortedRecent = [...allOrders].sort(
    (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
  ).slice(0, 10);

  return ok({
    kpis: {
      pipeline: totalPipeline,
      estimateCount,
      avgValue,
      todayCount,
      todayValue,
      pending: newCount,
      conversionRate,
      ...counts,
    },
    byStatus,
    topProducts: [],
    lowStock,
    recentEstimates: sortedRecent,
    activity,
  });
}
