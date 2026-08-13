import { prisma } from "@/lib/db";
import { guard, isResponse, json } from "@/lib/api";

export async function GET() {
  const g = await guard();
  if (isResponse(g)) return g;
  const saved = await prisma.savedMeal.findMany({ where: { userId: g.userId }, orderBy: [{ timesUsed: "desc" }, { createdAt: "desc" }] });
  return json({ saved });
}

// Log a saved meal in one tap
export async function POST(req: Request) {
  const g = await guard();
  if (isResponse(g)) return g;
  const { savedMealId } = await req.json();
  const saved = await prisma.savedMeal.findFirst({ where: { id: savedMealId, userId: g.userId } });
  if (!saved) return json({ error: "Saved meal not found" }, 404);
  await prisma.savedMeal.update({ where: { id: saved.id }, data: { timesUsed: { increment: 1 }, lastUsed: new Date() } });
  return json({ items: JSON.parse(saved.itemsJson), name: saved.name, mealType: saved.mealType });
}
