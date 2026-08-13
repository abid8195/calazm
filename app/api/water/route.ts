import { prisma } from "@/lib/db";
import { guard, isResponse, json } from "@/lib/api";

export async function POST(req: Request) {
  const g = await guard();
  if (isResponse(g)) return g;
  const { ml } = await req.json();
  const amount = Number(ml) || 250;
  const today = new Date(new Date().setHours(0, 0, 0, 0));
  await prisma.waterEntry.create({ data: { userId: g.userId, ml: amount, date: today } });
  const rows = await prisma.waterEntry.findMany({ where: { userId: g.userId, date: today } });
  return json({ waterMl: rows.reduce((s, r) => s + r.ml, 0) });
}
