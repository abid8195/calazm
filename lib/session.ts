import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "./db";

const SECRET = process.env.SESSION_SECRET ?? "calazm-dev-secret";
const COOKIE = "calazm_session";

function sign(value: string) {
  return createHmac("sha256", SECRET).update(value).digest("base64url");
}

export function makeToken(userId: string) {
  return `${userId}.${sign(userId)}`;
}

export function verifyToken(token: string | undefined): string | null {
  if (!token) return null;
  const idx = token.lastIndexOf(".");
  if (idx < 1) return null;
  const userId = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  const expected = sign(userId);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return userId;
}

export async function setSession(userId: string) {
  const store = await cookies();
  store.set(COOKIE, makeToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
  });
}

export async function clearSession() {
  const store = await cookies();
  store.delete(COOKIE);
}

export async function currentUserId(): Promise<string | null> {
  const store = await cookies();
  return verifyToken(store.get(COOKIE)?.value);
}

export async function requireUser() {
  const userId = await currentUserId();
  if (!userId) return null;
  return prisma.user.findUnique({ where: { id: userId }, include: { profile: true } });
}
