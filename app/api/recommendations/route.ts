import { prisma } from "@/lib/db";
import { guard, isResponse, json } from "@/lib/api";
import { sumMeals, dayStart } from "@/lib/nutrition";
import { recommend } from "@/lib/recommend";

export async function GET(req: Request) {
  const g = await guard();
  if (isResponse(g)) return g;
  const url = new URL(req.url);
  const filters = (url.searchParams.get("filters") ?? "").split(",").filter(Boolean);

  const start = dayStart();
  const [meals, target, profile] = await Promise.all([
    prisma.meal.findMany({ where: { userId: g.userId, deletedAt: null, eatenAt: { gte: start } }, include: { items: true } }),
    prisma.nutritionTarget.findFirst({ where: { userId: g.userId, active: true }, orderBy: { createdAt: "desc" } }),
    prisma.profile.findUnique({ where: { userId: g.userId } }),
  ]);
  if (!target) return json({ error: "Complete onboarding first." }, 409);

  const totals = sumMeals(meals);
  const remainingKcal = Math.max(target.calories - totals.kcal, 0);
  const remainingProtein = Math.max(target.proteinG - totals.proteinG, 0);

  if (remainingKcal < 120) {
    return json({
      remainingKcal: Math.round(remainingKcal),
      remainingProtein: Math.round(remainingProtein),
      suggestions: [],
      message: "You're at your calorie target for today — nicely done. If you're still hungry, something light and protein-forward (Greek yogurt, cottage cheese) barely moves the needle. One day is never make-or-break either way.",
    });
  }

  const suggestions = await recommend({
    userId: g.userId,
    remainingKcal,
    remainingProtein,
    dietaryPref: profile?.dietaryPref ?? "none",
    filters,
  });

  for (const s of suggestions) {
    await prisma.recommendation.create({ data: { userId: g.userId, payload: JSON.stringify({ name: s.name, kcal: s.kcal }), reason: s.why } });
  }

  return json({
    remainingKcal: Math.round(remainingKcal),
    remainingProtein: Math.round(remainingProtein),
    suggestions,
    message: null,
  });
}
