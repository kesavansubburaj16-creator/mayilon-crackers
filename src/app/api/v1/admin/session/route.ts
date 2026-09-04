import { fail, ok } from "@/lib/api";
import {
  clearAdminSessionCookie,
  isAuthorizedAdmin,
  recordAuditLog,
  setAdminSessionCookie,
  verifyAdminPasscode,
} from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/** GET /api/v1/admin/session -> Verify active admin session */
export async function GET() {
  const isAuth = await isAuthorizedAdmin();
  if (!isAuth) {
    return fail("Unauthorized admin session", [], 401);
  }
  return ok({ authenticated: true, role: "SUPER_ADMIN" }, "Authenticated");
}

/** POST /api/v1/admin/session -> Verify passcode and set HTTP-only cookie */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { passcode } = body;

  const isValid = await verifyAdminPasscode(passcode);
  if (!isValid) {
    await recordAuditLog({
      action: "ADMIN_LOGIN_FAILED",
      entityType: "system",
      payload: { reason: "Invalid passcode attempt" },
    });
    return fail("Invalid admin passcode", [], 401);
  }

  await setAdminSessionCookie();
  await recordAuditLog({
    action: "ADMIN_LOGIN_SUCCESS",
    entityType: "system",
    payload: { loginAt: new Date().toISOString() },
  });

  return ok({ authenticated: true, role: "SUPER_ADMIN" }, "Admin session authenticated successfully");
}

/** DELETE /api/v1/admin/session -> Logout admin and clear cookie */
export async function DELETE() {
  await clearAdminSessionCookie();
  await recordAuditLog({
    action: "ADMIN_LOGOUT",
    entityType: "system",
  });
  return ok({ authenticated: false }, "Admin logged out successfully");
}
