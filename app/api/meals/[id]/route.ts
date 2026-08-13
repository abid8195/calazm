import { prisma } from "@/lib/db";
import { guard, isResponse, json } from "@/lib/api";
import { kcalRange, type ResolvedItem } from "@/lib/resolver";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard();
  if (isResponse(g)) return g;
  const { id } = await params;
  const meal = await prisma.meal.findFirst({ where: { id, userId: g.userId, deletedAt: null } });
  if (!meal) return json({ error: "Meal not found" }, 404);
  const body = await req.json();

  if (body.items) {
    const items: ResolvedItem[] = body.items;
    const range = kcalRange(items);
    await prisma.mealItem.deleteMany({ where: { mealId: id } });
    await prisma.meal.update({
      where: { id },
      data: {
        name: body.name ?? meal.name,
        confidence: range.confidence,
        kcalLow: range.low,
        kcalHigh: range.high,
        items: {
          create: items.map((i) => ({
            foodId: i.foodId, label: i.label, grams: i.grams, kcal: i.kcal,
            proteinG: i.proteinG, carbsG: i.carbsG, fatG: i.fatG, fibreG: i.fibreG,
            confidence: i.confidence ?? 1,
          })),
        },
      },
    });
  } else if (body.name || body.mealType) {
    await prisma.meal.update({ where: { id }, data: { name: body.name ?? meal.name, mealType: body.mealType ?? meal.mealType } });
  }
  const updated = await prisma.meal.findUnique({ where: { id }, include: { items: true } });
  return json({ meal: updated });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard();
  if (isResponse(g)) return g;
  const { id } = await params;
  const meal = await prisma.meal.findFirst({ where: { id, userId: g.userId } });
  if (!meal) return json({ error: "Meal not found" }, 404);
  await prisma.meal.update({ where: { id }, data: { deletedAt: new Date() } });
  return json({ ok: true });
}
