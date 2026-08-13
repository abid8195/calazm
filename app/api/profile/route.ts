import { prisma } from "@/lib/db";
import { guard, isResponse, json } from "@/lib/api";
import { computeTargets } from "@/lib/nutrition";

export async function GET() {
  const g = await guard();
  if (isResponse(g)) return g;
  const [user, target, sub] = await Promise.all([
    prisma.user.findUnique({ where: { id: g.userId }, include: { profile: true } }),
    prisma.nutritionTarget.findFirst({ where: { userId: g.userId, active: true }, orderBy: { createdAt: "desc" } }),
    prisma.subscription.findUnique({ where: { userId: g.userId } }),
  ]);
  return json({ email: user?.email, name: user?.name, profile: user?.profile, target, plan: sub?.plan ?? "free" });
}

export async function PATCH(req: Request) {
  const g = await guard();
  if (isResponse(g)) return g;
  const body = await req.json();
  const fields = ["goal", "sex", "age", "heightCm", "weightKg", "targetWeightKg", "activityLevel", "paceKgPerWeek", "dietaryPref", "mealSchedule", "onboarded"] as const;
  const data: Record<string, unknown> = {};
  for (const f of fields) if (body[f] !== undefined) data[f] = body[f];

  const profile = await prisma.profile.upsert({
    where: { userId: g.userId },
    create: { userId: g.userId, goal: (data.goal as string) ?? "maintain", ...data },
    update: data,
  });

  // Recompute targets whenever the profile changes
  const t = computeTargets(profile);
  await prisma.nutritionTarget.updateMany({ where: { userId: g.userId, active: true }, data: { active: false } });
  const target = await prisma.nutritionTarget.create({
    data: {
      userId: g.userId,
      calories: t.calories,
      proteinG: t.proteinG,
      carbsG: t.carbsG,
      fatG: t.fatG,
      fibreG: t.fibreG,
      waterMl: t.waterMl,
      source: "formula",
      rationale: t.rationale,
    },
  });

  // Initial weight entry so trends start immediately
  if (data.weightKg) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await prisma.weightEntry.upsert({
      where: { userId_date: { userId: g.userId, date: today } },
      create: { userId: g.userId, date: today, weightKg: profile.weightKg! },
      update: {},
    });
  }

  return json({ profile, target });
}
