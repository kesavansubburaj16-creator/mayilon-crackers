import { cookies } from "next/headers";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";

const ADMIN_COOKIE_NAME = "mayilon_admin_session";
const DEFAULT_PASSCODE = process.env.ADMIN_PASSCODE || "mayilon-admin";

/** Hash secret helper using Web Crypto API */
export async function hashSecret(secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(secret + "_mayilon_salt_2026");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyAdminPasscode(inputPasscode: string): Promise<boolean> {
  if (!inputPasscode) return false;
  return inputPasscode.trim() === DEFAULT_PASSCODE.trim();
}

/** Set HTTP-Only Admin Session Cookie */
export async function setAdminSessionCookie(): Promise<void> {
  const token = await hashSecret(DEFAULT_PASSCODE);
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

/** Clear Admin Session Cookie */
export async function clearAdminSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE_NAME);
}

/** Verify if request is from an authenticated admin */
export async function isAuthorizedAdmin(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
    if (!token) return false;
    const expectedToken = await hashSecret(DEFAULT_PASSCODE);
    return token === expectedToken;
  } catch (err) {
    return false;
  }
}

/** Record Administrative Audit Log in DB */
export async function recordAuditLog(params: {
  actorId?: string;
  actorRole?: string;
  action: string;
  entityType: string;
  entityId?: string;
  payload?: any;
  ipAddress?: string;
}): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      actorId: params.actorId || "ADMIN",
      actorRole: params.actorRole || "SUPER_ADMIN",
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId || null,
      payload: params.payload || {},
      ipAddress: params.ipAddress || "127.0.0.1",
    });
  } catch (err) {
    console.warn("[recordAuditLog] Unable to insert audit log:", err);
  }
}
