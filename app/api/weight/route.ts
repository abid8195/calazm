import { prisma } from "@/lib/db";
import { guard, isResponse, json } from "@/lib/api";
import { weightTrends } from "@/lib/insights";

export async function GET() {
  const g = await guard();
  if (isResponse(g)) return g;
  return json(await weightTrends(g.userId));
}

export async function POST(req: Request) {
  const g = await guard();
  if (isResponse(g)) return g;
  const { weightKg, date } = await req.json();
  const w = Number(weightKg);
  if (!w || w < 25 || w > 400) return json({ error: "Please enter a weight between 25 and 400 kg." }, 400);
  const d = date ? new Date(`${date}T00:00:00`) : new Date(new Date().setHours(0, 0, 0, 0));
  await prisma.weightEntry.upsert({
    where: { userId_date: { userId: g.userId, date: d } },
    create: { userId: g.userId, date: d, weightKg: w },
    update: { weightKg: w },
  });
  return json(await weightTrends(g.userId));
}
