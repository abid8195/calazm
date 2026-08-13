import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";
import { guard, isResponse, json } from "@/lib/api";
import { getAI } from "@/lib/ai/provider";
import { getPortionOverrides } from "@/lib/memory";
import { allFoods, matchFood, nutritionFor, kcalRange, type ResolvedItem } from "@/lib/resolver";

const FREE_SCANS_PER_MONTH = 10;

export async function POST(req: Request) {
  const g = await guard();
  if (isResponse(g)) return g;

  // Free-tier metering (transparent: the response says how many scans remain)
  const month = new Date().toISOString().slice(0, 7);
  const sub = await prisma.subscription.findUnique({ where: { userId: g.userId } });
  const usage = await prisma.aIUsage.upsert({
    where: { userId_kind_month: { userId: g.userId, kind: "photo_scan", month } },
    create: { userId: g.userId, kind: "photo_scan", month, count: 0 },
    update: {},
  });
  if ((sub?.plan ?? "free") === "free" && usage.count >= FREE_SCANS_PER_MONTH) {
    return json({ error: `You've used your ${FREE_SCANS_PER_MONTH} free scans this month. Text logging is always unlimited — or upgrade to Calazm Plus for unlimited scans.`, upgrade: true }, 402);
  }

  const form = await req.formData();
  const file = form.get("image") as File | null;
  const hint = (form.get("hint") as string) || undefined;
  if (!file) return json({ error: "No image provided." }, 400);

  const buffer = Buffer.from(await file.arrayBuffer());
  const uploads = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploads, { recursive: true });
  const filename = `${g.userId}-${Date.now()}${path.extname(file.name) || ".jpg"}`;
  await writeFile(path.join(uploads, filename), buffer);

  const mediaType = file.type || "image/jpeg";
  const detections = await getAI().analyzeMealImage(buffer.toString("base64"), mediaType, hint ?? file.name);

  // Resolve detections against the DB — deterministic nutrition, learned portions applied
  const foods = await allFoods();
  const overrides = await getPortionOverrides(g.userId);
  const items: ResolvedItem[] = [];
  for (const d of detections) {
    const m = matchFood(d.label, foods);
    if (!m) continue;
    const grams = overrides[m.food.id] ?? d.grams ?? m.food.servingG;
    items.push({
      foodId: m.food.id,
      label: m.food.name,
      grams: Math.round(grams),
      ...nutritionFor(m.food, grams),
      confidence: +Math.min(d.confidence, m.food.hiddenFatRisk ? 0.8 : 0.95).toFixed(2),
      hiddenFatRisk: m.food.hiddenFatRisk,
    });
  }

  await prisma.aIUsage.update({ where: { id: usage.id }, data: { count: { increment: 1 } } });

  const range = kcalRange(items);
  return json({
    items,
    imagePath: `/uploads/${filename}`,
    kcalLow: range.low,
    kcalHigh: range.high,
    confidence: range.confidence,
    clarify: items.some((i) => i.hiddenFatRisk) ? "Was this cooked with much oil or butter?" : null,
    // Honest degradation: if we couldn't identify anything, guide the user to describe it
    fallback: items.length === 0 ? "I couldn't confidently identify the food in this photo. Describe it in a few words and I'll take it from there." : null,
    scansLeft: (sub?.plan ?? "free") === "free" ? Math.max(FREE_SCANS_PER_MONTH - usage.count - 1, 0) : null,
  });
}
