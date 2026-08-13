import { writeFile, mkdir } from "fs/promises";
import { createHash } from "crypto";
import path from "path";
import { prisma } from "@/lib/db";
import { guard, isResponse, json } from "@/lib/api";
import { getAI, type VisionDetection } from "@/lib/ai/provider";
import { getPortionOverrides } from "@/lib/memory";
import { allFoods, matchFood, nutritionFor, kcalRange, type ResolvedItem } from "@/lib/resolver";
import { rateLimit } from "@/lib/ratelimit";

const FREE_SCANS_PER_MONTH = 10;

export async function POST(req: Request) {
  const g = await guard();
  if (isResponse(g)) return g;

  const rl = rateLimit(`scan:${g.userId}`, 10, 60_000);
  if (!rl.ok) return json({ error: `Too many scans at once — try again in ${rl.retryAfterS}s.` }, 429);

  const form = await req.formData();
  const file = form.get("image") as File | null;
  const hint = (form.get("hint") as string) || undefined;
  if (!file) return json({ error: "No image provided." }, 400);
  if (file.size > 10 * 1024 * 1024) return json({ error: "Image is too large (max 10 MB)." }, 400);

  const buffer = Buffer.from(await file.arrayBuffer());
  const imageHash = createHash("sha256").update(buffer).digest("hex");

  // Cache first: an identical photo (re-scan, duplicate, retry) costs no model call
  // and does not spend a free scan.
  const cached = await prisma.aIAnalysisCache.findUnique({ where: { imageHash } });

  const month = new Date().toISOString().slice(0, 7);
  const sub = await prisma.subscription.findUnique({ where: { userId: g.userId } });
  const usage = await prisma.aIUsage.upsert({
    where: { userId_kind_month: { userId: g.userId, kind: "photo_scan", month } },
    create: { userId: g.userId, kind: "photo_scan", month, count: 0 },
    update: {},
  });
  const isFree = (sub?.plan ?? "free") === "free";
  if (!cached && isFree && usage.count >= FREE_SCANS_PER_MONTH) {
    return json({ error: `You've used your ${FREE_SCANS_PER_MONTH} free scans this month. Text logging is always unlimited — or upgrade to Calazm Plus for unlimited scans.`, upgrade: true }, 402);
  }

  const uploads = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploads, { recursive: true });
  const filename = `${g.userId}-${Date.now()}${path.extname(file.name) || ".jpg"}`;
  await writeFile(path.join(uploads, filename), buffer);

  let detections: VisionDetection[];
  if (cached) {
    detections = JSON.parse(cached.detectionsJson);
  } else {
    const mediaType = file.type || "image/jpeg";
    detections = await getAI().analyzeMealImage(buffer.toString("base64"), mediaType, hint ?? file.name);
    if (detections.length > 0) {
      // Only successful analyses spend a free scan — a photo we couldn't read costs the user nothing.
      await prisma.aIUsage.update({ where: { id: usage.id }, data: { count: { increment: 1 } } });
      await prisma.aIAnalysisCache.upsert({
        where: { imageHash },
        create: { imageHash, detectionsJson: JSON.stringify(detections), provider: getAI().name },
        update: {},
      });
    }
  }

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

  const spentScan = !cached && detections.length > 0;
  const scansUsed = usage.count + (spentScan ? 1 : 0);
  const range = kcalRange(items);
  const isLocalProvider = getAI().name === "local";
  return json({
    items,
    imagePath: `/uploads/${filename}`,
    kcalLow: range.low,
    kcalHigh: range.high,
    confidence: range.confidence,
    cached: !!cached,
    clarify: items.some((i) => i.hiddenFatRisk) ? "Was this cooked with much oil or butter?" : null,
    // Honest degradation: if we couldn't identify anything, guide the user to describe it
    fallback:
      items.length === 0
        ? isLocalProvider
          ? "Photo recognition isn't set up on this server yet (it needs an AI vision key — see the README). Describe the meal below and I'll analyze it instantly. This failed scan didn't use your quota."
          : "I couldn't confidently identify the food in this photo. Describe it in a few words below and I'll take it from there. This scan didn't use your quota."
        : null,
    scansLeft: isFree ? Math.max(FREE_SCANS_PER_MONTH - scansUsed, 0) : null,
  });
}
