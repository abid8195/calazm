// Weekly insight computation + daily "Calazm Moment" + weight trends + adaptive maintenance estimate.
import { prisma } from "./db";
import { localDateKey, sumMeals } from "./nutrition";
import { getAI } from "./ai/provider";

export async function weightTrends(userId: string) {
  const entries = await prisma.weightEntry.findMany({ where: { userId }, orderBy: { date: "asc" } });
  const now = Date.now();
  const within = (days: number) => entries.filter((e) => now - e.date.getTime() <= days * 86400000);
  const avg = (arr: typeof entries) => (arr.length ? arr.reduce((s, e) => s + e.weightKg, 0) / arr.length : null);
  const last7 = within(7), prev7 = entries.filter((e) => { const d = (now - e.date.getTime()) / 86400000; return d > 7 && d <= 14; });
  const a7 = avg(last7), p7 = avg(prev7);
  return {
    entries: entries.map((e) => ({ date: localDateKey(e.date), weightKg: e.weightKg })),
    latest: entries.at(-1)?.weightKg ?? null,
    avg7: a7 ? +a7.toFixed(1) : null,
    avg30: avg(within(30)) ? +avg(within(30))!.toFixed(1) : null,
    weeklyChange: a7 && p7 ? +(a7 - p7).toFixed(2) : null,
  };
}

// Adaptive maintenance: weight change vs. average intake over ≥14 days of data.
export async function adaptiveMaintenance(userId: string): Promise<{ estimate: number; days: number } | null> {
  const since = new Date(Date.now() - 28 * 86400000);
  const [meals, weights] = await Promise.all([
    prisma.meal.findMany({ where: { userId, deletedAt: null, eatenAt: { gte: since } }, include: { items: true } }),
    prisma.weightEntry.findMany({ where: { userId, date: { gte: since } }, orderBy: { date: "asc" } }),
  ]);
  if (weights.length < 5) return null;
  const days = new Set(meals.map((m) => localDateKey(m.eatenAt)));
  if (days.size < 14) return null;
  const totalKcal = meals.reduce((s, m) => s + m.items.reduce((x, i) => x + i.kcal, 0), 0);
  const avgIntake = totalKcal / days.size;
  const spanDays = (weights.at(-1)!.date.getTime() - weights[0].date.getTime()) / 86400000;
  if (spanDays < 10) return null;
  const deltaKg = weights.at(-1)!.weightKg - weights[0].weightKg;
  const dailySurplus = (deltaKg * 7700) / spanDays;
  return { estimate: Math.round(avgIntake - dailySurplus), days: days.size };
}

export async function computeWeeklyInsight(userId: string, weekStart: Date) {
  const weekEnd = new Date(weekStart.getTime() + 7 * 86400000);
  const [meals, target, trends] = await Promise.all([
    prisma.meal.findMany({ where: { userId, deletedAt: null, eatenAt: { gte: weekStart, lt: weekEnd } }, include: { items: true }, orderBy: { eatenAt: "asc" } }),
    prisma.nutritionTarget.findFirst({ where: { userId, active: true }, orderBy: { createdAt: "desc" } }),
    weightTrends(userId),
  ]);

  const byDay = new Map<string, typeof meals>();
  for (const m of meals) {
    const k = localDateKey(m.eatenAt);
    byDay.set(k, [...(byDay.get(k) ?? []), m]);
  }
  const dayStats = [...byDay.entries()].map(([date, ms]) => ({ date, ...sumMeals(ms), meals: ms.length }));
  const daysLogged = dayStats.length;
  const avg = (f: (d: (typeof dayStats)[0]) => number) => (daysLogged ? Math.round(dayStats.reduce((s, d) => s + f(d), 0) / daysLogged) : 0);

  const avgKcal = avg((d) => d.kcal);
  const avgProtein = avg((d) => d.proteinG);
  const proteinHitDays = target ? dayStats.filter((d) => d.proteinG >= target.proteinG * 0.9).length : 0;
  const onTargetDays = target ? dayStats.filter((d) => Math.abs(d.kcal - target.calories) <= target.calories * 0.1).length : 0;
  const overshootDays = target ? dayStats.filter((d) => d.kcal > target.calories * 1.15).map((d) => d.date) : [];

  const foodCounts = new Map<string, number>();
  for (const m of meals) for (const i of m.items) foodCounts.set(i.label, (foodCounts.get(i.label) ?? 0) + 1);
  const topFoods = [...foodCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([label, n]) => ({ label, n }));

  const stats = {
    daysLogged, avgKcal, avgProtein, proteinHitDays, onTargetDays,
    targetKcal: target?.calories ?? null, targetProtein: target?.proteinG ?? null,
    overshootDays, topFoods, weeklyWeightChange: trends.weeklyChange, dayStats,
  };

  // Narrative: frontier model if available, honest template otherwise.
  let narrative = (await getAI().generateWeeklyNarrative(stats)) ?? "";
  if (!narrative) {
    const parts: string[] = [];
    if (daysLogged === 0) {
      narrative = "No meals logged this week. Whenever you're ready, one photo is all it takes to start again.";
    } else {
      parts.push(`You logged ${daysLogged} day${daysLogged > 1 ? "s" : ""}, averaging ${avgKcal} kcal and ${avgProtein}g protein.`);
      if (target) {
        if (proteinHitDays >= 5) parts.push(`Protein was a real strength — you hit your target ${proteinHitDays} of ${daysLogged} days.`);
        else if (proteinHitDays > 0) parts.push(`You hit your protein target ${proteinHitDays} of ${daysLogged} days — your biggest opportunity is closing that gap on the other days.`);
        else parts.push(`Protein ran below target most days — front-loading ~30g at breakfast is the easiest fix.`);
        if (overshootDays.length >= 2) {
          const names = overshootDays.map((d) => new Date(d + "T12:00:00").toLocaleDateString("en", { weekday: "long" }));
          parts.push(`Calories ran higher on ${names.join(" and ")} — planning those dinners ahead usually works better than restricting the next day.`);
        } else if (onTargetDays >= 4) {
          parts.push(`Calorie consistency was strong: ${onTargetDays} days within 10% of target.`);
        }
      }
      if (trends.weeklyChange !== null) parts.push(`Your 7-day weight average moved ${trends.weeklyChange > 0 ? "up" : "down"} ${Math.abs(trends.weeklyChange)} kg vs. last week.`);
      if (topFoods.length) parts.push(`Most repeated: ${topFoods.slice(0, 3).map((f) => f.label).join(", ")}.`);
      narrative = parts.join(" ");
    }
  }
  return { stats, narrative };
}

// One concise personalized insight for today.
export async function calazmMoment(userId: string, targetProtein: number): Promise<string> {
  const since = new Date(Date.now() - 7 * 86400000);
  const meals = await prisma.meal.findMany({ where: { userId, deletedAt: null, eatenAt: { gte: since } }, include: { items: true } });
  if (meals.length === 0) return "Log your first meal and Calazm starts learning your patterns from day one.";

  const byDay = new Map<string, { proteinG: number; kcal: number }>();
  for (const m of meals) {
    const k = localDateKey(m.eatenAt);
    const t = byDay.get(k) ?? { proteinG: 0, kcal: 0 };
    for (const i of m.items) { t.proteinG += i.proteinG; t.kcal += i.kcal; }
    byDay.set(k, t);
  }
  const days = [...byDay.values()];
  const proteinHits = days.filter((d) => d.proteinG >= targetProtein * 0.9).length;

  const lunches = meals.filter((m) => m.mealType === "lunch");
  if (lunches.length >= 3) {
    const avgLunch = Math.round(lunches.reduce((s, m) => s + m.items.reduce((x, i) => x + i.kcal, 0), 0) / lunches.length);
    if (avgLunch > 650) return `Your last ${lunches.length} lunches averaged ${avgLunch} kcal. Today's easiest win: a ~500–550 kcal lunch.`;
  }
  if (proteinHits >= 4) return `You've hit your protein target ${proteinHits} of the last ${days.length} days. Keep the streak rolling.`;
  if (days.length >= 3) {
    const avgProtein = Math.round(days.reduce((s, d) => s + d.proteinG, 0) / days.length);
    if (avgProtein < targetProtein * 0.85)
      return `You've averaged ${avgProtein}g protein this week vs. a ${targetProtein}g target — an extra protein-forward snack would close most of that gap.`;
  }
  return `You've logged ${days.length} of the last 7 days. Every day logged makes Calazm's suggestions sharper.`;
}
