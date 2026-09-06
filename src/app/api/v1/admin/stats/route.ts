import { ok } from "@/lib/api";
import { getAllOrders } from "@/lib/db";
import { getProducts } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  const orders = await getAllOrders();
  const { total: totalProducts } = await getProducts({ limit: 1 });

  const totalRevenue = orders.reduce((sum, o) => sum + (o.paymentStatus === "PAID" || o.paymentStatus === "COD_VERIFIED" ? o.totalAmount : 0), 0);
  const estimateCount = orders.length;
  const averageOrderValue = estimateCount > 0 ? Math.round(totalRevenue / estimateCount) : 0;
  const pendingCount = orders.filter((o) => o.status === "PENDING" || o.status === "PROCESSING").length;

  return ok({
    kpis: {
      totalRevenue,
      estimateCount,
      averageOrderValue,
      pendingCount,
      totalProducts,
    },
    orders: orders.slice(0, 10),
  });
}
