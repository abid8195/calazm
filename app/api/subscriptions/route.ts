import { prisma } from "@/lib/db";
import { guard, isResponse, json } from "@/lib/api";

export async function GET() {
  const g = await guard();
  if (isResponse(g)) return g;
  const sub = await prisma.subscription.findUnique({ where: { userId: g.userId } });
  const month = new Date().toISOString().slice(0, 7);
  const usage = await prisma.aIUsage.findUnique({ where: { userId_kind_month: { userId: g.userId, kind: "photo_scan", month } } });
  return json({ plan: sub?.plan ?? "free", scansUsed: usage?.count ?? 0, freeScanLimit: 10 });
}

// Prototype checkout stub — production swaps this for Stripe Checkout + webhook.
export async function POST(req: Request) {
  const g = await guard();
  if (isResponse(g)) return g;
  const { plan } = await req.json();
  if (plan !== "plus" && plan !== "free") return json({ error: "Unknown plan" }, 400);
  const sub = await prisma.subscription.upsert({
    where: { userId: g.userId },
    create: { userId: g.userId, plan, renewsAt: plan === "plus" ? new Date(Date.now() + 30 * 86400000) : null },
    update: { plan, renewsAt: plan === "plus" ? new Date(Date.now() + 30 * 86400000) : null },
  });
  return json({ plan: sub.plan });
}
