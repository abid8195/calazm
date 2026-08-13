import { prisma } from "@/lib/db";
import { guard, isResponse, json } from "@/lib/api";
import { computeWeeklyInsight, weightTrends, adaptiveMaintenance } from "@/lib/insights";
import { getMemorySummary } from "@/lib/memory";

export async function GET() {
  const g = await guard();
  if (isResponse(g)) return g;

  // Current week starting Monday
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);

  const [current, trends, memory, adaptive, target] = await Promise.all([
    computeWeeklyInsight(g.userId, monday),
    weightTrends(g.userId),
    getMemorySummary(g.userId),
    adaptiveMaintenance(g.userId),
    prisma.nutritionTarget.findFirst({ where: { userId: g.userId, active: true }, orderBy: { createdAt: "desc" } }),
  ]);

  // Persist snapshot (idempotent per week)
  await prisma.weeklyInsight.upsert({
    where: { userId_weekStart: { userId: g.userId, weekStart: monday } },
    create: { userId: g.userId, weekStart: monday, dataJson: JSON.stringify(current.stats), narrative: current.narrative },
    update: { dataJson: JSON.stringify(current.stats), narrative: current.narrative },
  });

  return json({ weekStart: monday.toISOString().slice(0, 10), ...current, trends, memory, adaptive, target });
}
