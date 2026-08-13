import { prisma } from "@/lib/db";
import { guard, isResponse, json } from "@/lib/api";
import { clearSession } from "@/lib/session";

// Permanent account deletion (required for App Store / Play Store listing).
// Every user-owned table cascades from User, so this removes everything.
export async function DELETE() {
  const g = await guard();
  if (isResponse(g)) return g;
  await prisma.user.delete({ where: { id: g.userId } });
  await clearSession();
  return json({ ok: true });
}
