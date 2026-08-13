import { prisma } from "@/lib/db";
import { guard, isResponse, json } from "@/lib/api";

// Full personal data export (GDPR-style). Returned as a downloadable JSON document.
export async function GET() {
  const g = await guard();
  if (isResponse(g)) return g;
  const [user, meals, savedMeals, weights, water, memories, corrections, insights, subscription] = await Promise.all([
    prisma.user.findUnique({ where: { id: g.userId }, include: { profile: true }, omit: { passwordHash: true } }),
    prisma.meal.findMany({ where: { userId: g.userId }, include: { items: true } }),
    prisma.savedMeal.findMany({ where: { userId: g.userId } }),
    prisma.weightEntry.findMany({ where: { userId: g.userId } }),
    prisma.waterEntry.findMany({ where: { userId: g.userId } }),
    prisma.userMemory.findMany({ where: { userId: g.userId } }),
    prisma.foodCorrection.findMany({ where: { userId: g.userId } }),
    prisma.weeklyInsight.findMany({ where: { userId: g.userId } }),
    prisma.subscription.findUnique({ where: { userId: g.userId } }),
  ]);
  const res = json({ exportedAt: new Date().toISOString(), user, meals, savedMeals, weights, water, memories, corrections, insights, subscription });
  res.headers.set("Content-Disposition", 'attachment; filename="calazm-export.json"');
  return res;
}
