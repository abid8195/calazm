// NutritionResolver: matches free text / vision labels against the food database
// and does deterministic portion + macro math. Models describe; this quantifies.
import type { Food } from "@prisma/client";
import { prisma } from "./db";

export type ResolvedItem = {
  foodId: string | null;
  label: string;
  grams: number;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fibreG: number;
  confidence: number; // 0..1
  hiddenFatRisk: boolean;
};

const NUMBER_WORDS: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
  seven: 7, eight: 8, nine: 9, ten: 10, half: 0.5, quarter: 0.25, couple: 2, few: 3,
};

// unit → multiplier context: "g" is absolute; others scale the food's serving size
const UNITS = [
  "grams", "gram", "g", "kg",
  "cups", "cup", "bowls", "bowl", "plates", "plate",
  "slices", "slice", "pieces", "piece", "scoops", "scoop",
  "tablespoons", "tablespoon", "tbsp", "teaspoons", "teaspoon", "tsp",
  "cans", "can", "glasses", "glass", "handfuls", "handful", "servings", "serving", "tubs", "tub", "bars", "bar",
];

let foodCache: Food[] | null = null;
export async function allFoods(): Promise<Food[]> {
  if (!foodCache) foodCache = await prisma.food.findMany();
  return foodCache;
}
export function invalidateFoodCache() {
  foodCache = null;
}

export function matchFood(text: string, foods: Food[]): { food: Food; score: number } | null {
  const t = ` ${text.toLowerCase().trim()} `;
  let best: { food: Food; score: number } | null = null;
  for (const f of foods) {
    const candidates = [f.name.toLowerCase(), ...f.aliases.split("|").filter(Boolean)];
    for (const alias of candidates) {
      const a = alias.trim();
      if (!a) continue;
      if (t.includes(` ${a} `) || t.trim() === a || t.includes(`${a},`) || t.trim().startsWith(`${a} `) || t.trim().endsWith(` ${a}`)) {
        const score = a.length + (f.verified ? 2 : 0);
        if (!best || score > best.score) best = { food: f, score };
      }
    }
  }
  return best;
}

function parseQuantity(segment: string): { qty: number; unit: string | null; rest: string } {
  let s = segment.toLowerCase().trim();
  let qty = 1;
  let unit: string | null = null;
  let matched = false;

  // "70%" or "about 70%"
  const pct = s.match(/(\d{1,3})\s*%/);
  let pctFactor = 1;
  if (pct) {
    pctFactor = Math.min(parseInt(pct[1], 10), 100) / 100;
    s = s.replace(pct[0], " ").trim();
  }

  const numMatch = s.match(/^(?:about |around |roughly |approx\.? )?(\d+(?:\.\d+)?)(?:\s|$)/);
  if (numMatch) {
    qty = parseFloat(numMatch[1]);
    s = s.slice(numMatch[0].length).trim();
    matched = true;
  } else {
    const firstWord = s.split(/\s+/)[0];
    if (firstWord in NUMBER_WORDS) {
      qty = NUMBER_WORDS[firstWord];
      s = s.slice(firstWord.length).trim();
      matched = true;
    }
  }

  // trailing "x2"
  const times = s.match(/\bx\s?(\d+)\b/);
  if (times) {
    qty *= parseInt(times[1], 10);
    s = s.replace(times[0], " ").trim();
  }

  for (const u of UNITS) {
    const re = new RegExp(`^${u}\\b\\s*(of\\s+)?`);
    if (re.test(s)) {
      unit = u.replace(/s$/, "");
      s = s.replace(re, "").trim();
      break;
    }
  }
  // "200g chicken" glued number+unit
  const glued = segment.toLowerCase().match(/(\d+(?:\.\d+)?)\s?(g|kg|ml)\b/);
  if (glued && !matched) {
    qty = parseFloat(glued[1]);
    unit = glued[2];
    s = segment.toLowerCase().replace(glued[0], " ").trim();
  }

  return { qty: qty * pctFactor, unit, rest: s || segment.toLowerCase() };
}

export function gramsFor(food: Food, qty: number, unit: string | null): number {
  if (unit === "g" || unit === "gram" || unit === "ml") return qty;
  if (unit === "kg") return qty * 1000;
  if (unit === "tablespoon" || unit === "tbsp") return qty * 15;
  if (unit === "teaspoon" || unit === "tsp") return qty * 5;
  // any other unit (slice, bowl, cup, piece, serving…) scales the food's typical serving
  return qty * food.servingG;
}

export function nutritionFor(food: Food, grams: number) {
  const f = grams / 100;
  return {
    kcal: +(food.per100Kcal * f).toFixed(1),
    proteinG: +(food.per100Protein * f).toFixed(1),
    carbsG: +(food.per100Carbs * f).toFixed(1),
    fatG: +(food.per100Fat * f).toFixed(1),
    fibreG: +(food.per100Fibre * f).toFixed(1),
  };
}

export function splitSegments(text: string): string[] {
  return text
    .replace(/\band\b/gi, ",")
    .replace(/\bwith\b/gi, ",")
    .replace(/\bplus\b/gi, ",")
    .replace(/[+;]/g, ",")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 1);
}

export async function resolveText(
  text: string,
  portionOverrides: Record<string, number> = {}
): Promise<{ items: ResolvedItem[]; unmatched: string[] }> {
  const foods = await allFoods();
  const items: ResolvedItem[] = [];
  const unmatched: string[] = [];

  for (const segment of splitSegments(text)) {
    const { qty, unit, rest } = parseQuantity(segment);
    const match = matchFood(rest, foods) ?? matchFood(segment, foods);
    if (!match) {
      unmatched.push(segment);
      continue;
    }
    const f = match.food;
    let grams: number;
    let confidence = 0.9;
    if (unit === "g" || unit === "kg" || unit === "ml") {
      grams = gramsFor(f, qty, unit);
      confidence = 0.97; // explicit weight
    } else {
      const usual = portionOverrides[f.id];
      const base = usual ?? f.servingG;
      grams = unit ? gramsFor({ ...f, servingG: base } as Food, qty, unit) : qty * base;
      confidence = usual ? 0.92 : unit ? 0.85 : 0.75;
    }
    if (f.hiddenFatRisk) confidence -= 0.1;
    items.push({
      foodId: f.id,
      label: f.name,
      grams: +grams.toFixed(0),
      ...nutritionFor(f, grams),
      confidence: +Math.max(0.4, confidence).toFixed(2),
      hiddenFatRisk: f.hiddenFatRisk,
    });
  }
  return { items, unmatched };
}

// Uncertainty range: widened by low confidence and hidden-fat foods.
export function kcalRange(items: ResolvedItem[]): { low: number; high: number; confidence: number } {
  let low = 0,
    high = 0,
    weighted = 0,
    total = 0;
  for (const i of items) {
    const spread = (1 - i.confidence) * 0.6 + (i.hiddenFatRisk ? 0.15 : 0);
    low += i.kcal * (1 - spread);
    high += i.kcal * (1 + spread);
    weighted += i.confidence * i.kcal;
    total += i.kcal;
  }
  return {
    low: Math.round(low),
    high: Math.round(high),
    confidence: total > 0 ? +(weighted / total).toFixed(2) : 0.5,
  };
}
