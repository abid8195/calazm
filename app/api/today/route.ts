import { prisma } from "@/lib/db";
import { guard, isResponse, json } from "@/lib/api";
import { sumMeals, balanceScore, dayStart, mealTypeForHour } from "@/lib/nutrition";
import { calazmMoment, adaptiveMaintenance } from "@/lib/insights";

export async function POST() {
  return json({ error: "Method not allowed" }, 405);
}

export async function GET() {
  const g = await guard();
  if (isResponse(g)) return g;
  const start = dayStart();
  const end = new Date(start.getTime() + 86400000);

  const [meals, target, water, profile] = await Promise.all([
    prisma.meal.findMany({ where: { userId: g.userId, deletedAt: null, eatenAt: { gte: start, lt: end } }, include: { items: true }, orderBy: { eatenAt: "asc" } }),
    prisma.nutritionTarget.findFirst({ where: { userId: g.userId, active: true }, orderBy: { createdAt: "desc" } }),
    prisma.waterEntry.findMany({ where: { userId: g.userId, date: { gte: start, lt: end } } }),
    prisma.profile.findUnique({ where: { userId: g.userId } }),
  ]);

  if (!target) return json({ error: "Complete onboarding first.", needsOnboarding: true }, 409);

  const totals = sumMeals(meals);
  const waterMl = water.reduce((s, w) => s + w.ml, 0);
  const remaining = {
    kcal: Math.round(target.calories - totals.kcal),
    proteinG: Math.round(target.proteinG - totals.proteinG),
    carbsG: Math.round(target.carbsG - totals.carbsG),
    fatG: Math.round(target.fatG - totals.fatG),
  };

  // Day plan: remaining budget split across the meal slots not yet eaten
  const slots = ["breakfast", "lunch", "snack", "dinner"];
  const weights: Record<string, number> = { breakfast: 0.22, lunch: 0.3, snack: 0.12, dinner: 0.36 };
  const eaten = new Set(meals.map((m) => m.mealType));
  const remainingSlots = slots.filter((s) => !eaten.has(s));
  const weightSum = remainingSlots.reduce((s, k) => s + weights[k], 0) || 1;
  const plan = remainingSlots.map((s) => ({
    slot: s,
    kcal: Math.max(Math.round((Math.max(remaining.kcal, 0) * weights[s]) / weightSum), 0),
  }));

  const [moment, adaptive] = await Promise.all([
    calazmMoment(g.userId, target.proteinG),
    adaptiveMaintenance(g.userId),
  ]);

  const hour = new Date().getHours();
  return json({
    date: start.toISOString().slice(0, 10),
    target,
    totals: {
      kcal: Math.round(totals.kcal),
      proteinG: Math.round(totals.proteinG),
      carbsG: Math.round(totals.carbsG),
      fatG: Math.round(totals.fatG),
      fibreG: Math.round(totals.fibreG),
    },
    remaining,
    waterMl,
    meals,
    plan,
    nextSlot: mealTypeForHour(hour),
    balance: balanceScore(totals, target, waterMl, target.waterMl, meals.length),
    moment,
    adaptive, // {estimate, days} | null — surfaced as an estimate, never certainty
    firstName: profile ? undefined : undefined,
  });
}
