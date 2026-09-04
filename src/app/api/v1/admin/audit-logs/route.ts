import { desc } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { fail, ok } from "@/lib/api";
import { isAuthorizedAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const isAuth = await isAuthorizedAdmin();
  if (!isAuth) {
    return fail("Unauthorized admin access", [], 401);
  }

  try {
    const logs = await db
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(100);

    return ok({ logs });
  } catch (err) {
    return fail("Unable to fetch audit logs", [], 500);
  }
}
