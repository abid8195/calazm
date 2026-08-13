import { prisma } from "@/lib/db";
import { guard, isResponse, json } from "@/lib/api";
import { mealTypeForHour } from "@/lib/nutrition";
import { updateMemoryAfterMeal, recordCorrection } from "@/lib/memory";
import { kcalRange, type ResolvedItem } from "@/lib/resolver";

export async function GET(req: Request) {
  const g = await guard();
  if (isResponse(g)) return g;
  const url = new URL(req.url);
  const dateStr = url.searchParams.get("date");
  const start = dateStr ? new Date(`${dateStr}T00:00:00`) : new Date(new Date().setHours(0, 0, 0, 0));
  const end = new Date(start.getTime() + 86400000);
  const meals = await prisma.meal.findMany({
    where: { userId: g.userId, deletedAt: null, eatenAt: { gte: start, lt: end } },
    include: { items: true },
    orderBy: { eatenAt: "asc" },
  });
  return json({ meals });
}

export async function POST(req: Request) {
  const g = await guard();
  if (isResponse(g)) return g;
  const body = await req.json();
  const items: ResolvedItem[] = body.items ?? [];
  if (!items.length) return json({ error: "A meal needs at least one item." }, 400);

  const mealType = body.mealType || mealTypeForHour(new Date().getHours());
  const name: string = body.name || items.map((i) => i.label).slice(0, 3).join(", ");
  const range = kcalRange(items);

  const meal = await prisma.meal.create({
    data: {
      userId: g.userId,
      name,
      mealType,
      source: body.source ?? "text",
      imagePath: body.imagePath ?? null,
      confidence: range.confidence,
      kcalLow: range.low,
      kcalHigh: range.high,
      items: {
        create: items.map((i) => ({
          foodId: i.foodId,
          label: i.label,
          grams: i.grams,
          kcal: i.kcal,
          proteinG: i.proteinG,
          carbsG: i.carbsG,
          fatG: i.fatG,
          fibreG: i.fibreG,
          confidence: i.confidence ?? 1,
        })),
      },
    },
    include: { items: true },
  });

  // Correction learning: the review screen sends what the analysis originally said
  for (const c of body.corrections ?? []) {
    await recordCorrection(g.userId, c.original, c.corrected, mealType);
  }

  const kcal = items.reduce((s, i) => s + i.kcal, 0);
  const proteinG = items.reduce((s, i) => s + i.proteinG, 0);
  await updateMemoryAfterMeal(g.userId, mealType, name, items.map((i) => ({ foodId: i.foodId, label: i.label, grams: i.grams })), kcal, proteinG);

  if (body.saveAs) {
    await prisma.savedMeal.create({
      data: {
        userId: g.userId,
        name: body.saveAs,
        mealType,
        itemsJson: JSON.stringify(items),
        kcal,
        proteinG,
        carbsG: items.reduce((s, i) => s + i.carbsG, 0),
        fatG: items.reduce((s, i) => s + i.fatG, 0),
        fibreG: items.reduce((s, i) => s + i.fibreG, 0),
      },
    });
  }

  return json({ meal });
}
