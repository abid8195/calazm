// PersonalizationEngine: structured memory, not chat logs.
// Every logged meal and correction makes Calazm measurably smarter about this user.
import { prisma } from "./db";

type ItemLike = { foodId: string | null; label: string; grams: number };

export async function updateMemoryAfterMeal(userId: string, mealType: string, mealName: string, items: ItemLike[], kcal: number, proteinG: number) {
  // frequent foods
  for (const it of items) {
    const key = it.label.toLowerCase();
    await prisma.userMemory.upsert({
      where: { userId_kind_key: { userId, kind: "frequent_food", key } },
      create: { userId, kind: "frequent_food", key, valueJson: JSON.stringify({ foodId: it.foodId, label: it.label }), strength: 1 },
      update: { strength: { increment: 1 } },
    });
  }
  // usual meal per slot
  const key = mealName.toLowerCase();
  await prisma.userMemory.upsert({
    where: { userId_kind_key: { userId, kind: `usual_${mealType}`, key } },
    create: {
      userId,
      kind: `usual_${mealType}`,
      key,
      valueJson: JSON.stringify({ name: mealName, items, kcal: Math.round(kcal), proteinG: Math.round(proteinG) }),
      strength: 1,
    },
    update: {
      strength: { increment: 1 },
      valueJson: JSON.stringify({ name: mealName, items, kcal: Math.round(kcal), proteinG: Math.round(proteinG) }),
    },
  });
}

export async function recordCorrection(
  userId: string,
  original: { label: string; grams: number },
  corrected: { label: string; grams: number; foodId: string | null },
  context: string
) {
  await prisma.foodCorrection.create({
    data: {
      userId,
      originalLabel: original.label,
      originalGrams: original.grams,
      correctedLabel: corrected.label,
      correctedGrams: corrected.grams,
      context,
    },
  });
  // typical portion: rolling average of the user's corrected grams for this food
  if (corrected.foodId) {
    const key = corrected.foodId;
    const existing = await prisma.userMemory.findUnique({ where: { userId_kind_key: { userId, kind: "typical_portion", key } } });
    if (existing) {
      const prev = JSON.parse(existing.valueJson) as { grams: number };
      const grams = Math.round((prev.grams * existing.strength + corrected.grams) / (existing.strength + 1));
      await prisma.userMemory.update({
        where: { id: existing.id },
        data: { strength: { increment: 1 }, valueJson: JSON.stringify({ grams, label: corrected.label }) },
      });
    } else {
      await prisma.userMemory.create({
        data: { userId, kind: "typical_portion", key, valueJson: JSON.stringify({ grams: corrected.grams, label: corrected.label }), strength: 1 },
      });
    }
  }
}

// foodId → learned grams (only once seen ≥2 times, to avoid one-off noise)
export async function getPortionOverrides(userId: string): Promise<Record<string, number>> {
  const rows = await prisma.userMemory.findMany({ where: { userId, kind: "typical_portion", strength: { gte: 2 } } });
  const out: Record<string, number> = {};
  for (const r of rows) out[r.key] = (JSON.parse(r.valueJson) as { grams: number }).grams;
  return out;
}

export type UsualMeal = { name: string; items: ItemLike[]; kcal: number; proteinG: number; strength: number };

export async function getUsualMeals(userId: string, mealType?: string): Promise<UsualMeal[]> {
  const rows = await prisma.userMemory.findMany({
    where: { userId, kind: mealType ? `usual_${mealType}` : { startsWith: "usual_" } },
    orderBy: { strength: "desc" },
    take: 12,
  });
  return rows.map((r) => ({ ...(JSON.parse(r.valueJson) as Omit<UsualMeal, "strength">), strength: r.strength }));
}

export async function getMemorySummary(userId: string) {
  const [frequentFoods, portions, usuals, corrections] = await Promise.all([
    prisma.userMemory.findMany({ where: { userId, kind: "frequent_food", strength: { gte: 2 } }, orderBy: { strength: "desc" }, take: 8 }),
    prisma.userMemory.findMany({ where: { userId, kind: "typical_portion", strength: { gte: 2 } } }),
    prisma.userMemory.findMany({ where: { userId, kind: { startsWith: "usual_" }, strength: { gte: 2 } }, orderBy: { strength: "desc" }, take: 6 }),
    prisma.foodCorrection.count({ where: { userId } }),
  ]);
  return {
    frequentFoods: frequentFoods.map((f) => ({ label: (JSON.parse(f.valueJson) as { label: string }).label, times: f.strength })),
    learnedPortions: portions.map((p) => JSON.parse(p.valueJson) as { label: string; grams: number }),
    learnedMeals: usuals.map((u) => ({ slot: u.kind.replace("usual_", ""), ...(JSON.parse(u.valueJson) as { name: string; kcal: number }) })),
    correctionsApplied: corrections,
  };
}
