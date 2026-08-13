import { prisma } from "@/lib/db";
import { guard, isResponse, json } from "@/lib/api";

// Owner-only business metrics. Set ADMIN_EMAIL in env; only that signed-in
// account can read this. Powers the /admin dashboard.
export async function GET() {
  const g = await guard();
  if (isResponse(g)) return g;
  const me = await prisma.user.findUnique({ where: { id: g.userId } });
  const adminEmail = (process.env.ADMIN_EMAIL ?? "").toLowerCase();
  if (!adminEmail || me?.email !== adminEmail) return json({ error: "Not authorized" }, 403);

  const now = Date.now();
  const d7 = new Date(now - 7 * 86400000);
  const d30 = new Date(now - 30 * 86400000);
  const month = new Date().toISOString().slice(0, 7);

  const [totalUsers, newUsers7, plusSubs, meals7, mealsTotal, activeUserRows, scanUsage, weights7, savedMeals, corrections] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: d7 } } }),
    prisma.subscription.count({ where: { plan: "plus", status: "active" } }),
    prisma.meal.count({ where: { deletedAt: null, eatenAt: { gte: d7 } } }),
    prisma.meal.count({ where: { deletedAt: null } }),
    prisma.meal.findMany({ where: { deletedAt: null, eatenAt: { gte: d7 } }, select: { userId: true }, distinct: ["userId"] }),
    prisma.aIUsage.aggregate({ where: { kind: "photo_scan", month }, _sum: { count: true } }),
    prisma.weightEntry.count({ where: { createdAt: { gte: d7 } } }),
    prisma.savedMeal.count(),
    prisma.foodCorrection.count(),
  ]);

  const activeUsers7 = activeUserRows.length;
  const scansThisMonth = scanUsage._sum.count ?? 0;
  const mrr = +(plusSubs * 2.99).toFixed(2);
  const estAiCost = +(scansThisMonth * 0.015).toFixed(2); // ~ $0.01–0.02 per vision scan

  // signups per day, last 30 days
  const recent = await prisma.user.findMany({ where: { createdAt: { gte: d30 } }, select: { createdAt: true } });
  const signupsByDay = new Map<string, number>();
  for (const u of recent) {
    const k = `${u.createdAt.getFullYear()}-${String(u.createdAt.getMonth() + 1).padStart(2, "0")}-${String(u.createdAt.getDate()).padStart(2, "0")}`;
    signupsByDay.set(k, (signupsByDay.get(k) ?? 0) + 1);
  }

  return json({
    totalUsers,
    newUsers7,
    activeUsers7,
    plusSubs,
    conversionPct: totalUsers ? +((plusSubs / totalUsers) * 100).toFixed(1) : 0,
    mrr,
    scansThisMonth,
    estAiCost,
    meals7,
    mealsTotal,
    weights7,
    savedMeals,
    corrections,
    signups30: [...signupsByDay.entries()].sort().map(([date, n]) => ({ date, n })),
  });
}
