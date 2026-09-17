import { describe, it, expect, vi, beforeEach } from "vitest";
import { FOODS, CHICKEN, EGG, RICE, OIL } from "./fixtures";

// resolver.ts reads foods through prisma; replace the DB with the fixture list.
vi.mock("../lib/db", () => ({
  prisma: { food: { findMany: vi.fn(async () => FOODS) } },
}));

import { nutritionFor, gramsFor, matchFood, splitSegments, resolveText, kcalRange, invalidateFoodCache } from "../lib/resolver";

beforeEach(() => invalidateFoodCache());

describe("nutritionFor — per-100g scaling", () => {
  it("scales every macro linearly by grams/100", () => {
    expect(nutritionFor(CHICKEN, 200)).toEqual({ kcal: 330, proteinG: 62, carbsG: 0, fatG: 7.2, fibreG: 0 });
  });
  it("rounds to one decimal", () => {
    expect(nutritionFor(CHICKEN, 33).kcal).toBe(54.5); // 165 × 0.33 = 54.45
  });
  it("returns zeros for zero grams", () => {
    expect(nutritionFor(CHICKEN, 0)).toEqual({ kcal: 0, proteinG: 0, carbsG: 0, fatG: 0, fibreG: 0 });
  });
});

describe("gramsFor — unit handling", () => {
  it("treats g/ml as absolute and kg as x1000", () => {
    expect(gramsFor(RICE, 250, "g")).toBe(250);
    expect(gramsFor(RICE, 250, "ml")).toBe(250);
    expect(gramsFor(RICE, 0.5, "kg")).toBe(500);
  });
  it("uses fixed weights for spoons", () => {
    expect(gramsFor(OIL, 2, "tbsp")).toBe(30);
    expect(gramsFor(OIL, 1, "tsp")).toBe(5);
  });
  it("scales the food serving size for any other unit or no unit", () => {
    expect(gramsFor(RICE, 2, "bowl")).toBe(400);
    expect(gramsFor(EGG, 3, null)).toBe(150);
  });
});

describe("matchFood — alias matching", () => {
  it("prefers the longest matching alias", () => {
    expect(matchFood("grilled chicken breast", FOODS)?.food.name).toBe("Chicken breast (cooked)");
    expect(matchFood("chicken thigh", FOODS)?.food.name).toBe("Chicken thigh (cooked)");
  });
  it("returns null when nothing matches", () => {
    expect(matchFood("moon dust", FOODS)).toBeNull();
  });
});

describe("splitSegments", () => {
  it("splits on commas, and, with, plus", () => {
    expect(splitSegments("eggs and toast with butter, plus a banana")).toEqual(["eggs", "toast", "butter", "a banana"]);
  });
});

describe("resolveText — parsing + confidence", () => {
  it("parses a multi-item natural-language meal (converted from scripts/e2e.mjs)", async () => {
    const { items, unmatched } = await resolveText("two eggs, two slices of toast with butter and a banana");
    expect(unmatched).toEqual([]);
    expect(items.map((i) => [i.label, i.grams])).toEqual([
      ["Egg", 100],
      ["Bread (white slice)", 76],
      ["Butter", 5],
      ["Banana", 118],
    ]);
  });

  it("explicit weight gives the highest confidence (0.97)", async () => {
    const { items } = await resolveText("200g chicken breast");
    expect(items[0]).toMatchObject({ label: "Chicken breast (cooked)", grams: 200, confidence: 0.97 });
  });

  it("named unit (bowl/slice) gives 0.85; a bare count gives 0.75", async () => {
    const { items } = await resolveText("a bowl of rice and two eggs");
    expect(items[0]).toMatchObject({ label: "White rice (cooked)", grams: 200, confidence: 0.85 });
    expect(items[1]).toMatchObject({ label: "Egg", grams: 100, confidence: 0.75 });
  });

  it("hidden-fat-risk foods lose 0.1 confidence", async () => {
    const { items } = await resolveText("100g olive oil, chicken curry");
    expect(items[0]).toMatchObject({ label: "Olive oil", confidence: 0.87, hiddenFatRisk: true }); // 0.97 - 0.1
    expect(items[1]).toMatchObject({ label: "Chicken curry", grams: 280, confidence: 0.65, hiddenFatRisk: true }); // 0.75 - 0.1
  });

  it("a learned portion override replaces the default serving and raises confidence to 0.92", async () => {
    const { items } = await resolveText("eggs", { [EGG.id]: 150 });
    expect(items[0]).toMatchObject({ grams: 150, confidence: 0.92 });
  });

  it("fractions and percentages scale the portion (converted from scripts/e2e.mjs)", async () => {
    const half = await resolveText("half the pizza");
    expect(half.items[0].grams).toBe(54); // 0.5 × 107g slice
    const pct = await resolveText("70% of a pizza");
    expect(pct.items[0].grams).toBe(75); // 0.7 × 107
  });

  it("zero grams yields a zero-nutrition item rather than an error", async () => {
    const { items } = await resolveText("0g chicken");
    expect(items[0]).toMatchObject({ grams: 0, kcal: 0, proteinG: 0 });
  });

  it("reports unmatched phrases instead of guessing", async () => {
    const { items, unmatched } = await resolveText("moon dust and a banana");
    expect(unmatched).toEqual(["moon dust"]);
    expect(items).toHaveLength(1);
  });

  it("loads the food list from the DB once and caches it", async () => {
    const { prisma } = await import("../lib/db");
    const spy = prisma.food.findMany as unknown as ReturnType<typeof vi.fn>;
    spy.mockClear();
    await resolveText("banana");
    await resolveText("banana");
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe("kcalRange — uncertainty", () => {
  const base = { foodId: null, label: "x", grams: 100, proteinG: 0, carbsG: 0, fatG: 0, fibreG: 0 };

  it("collapses to a point estimate for fully confident, non-hidden-fat items", () => {
    expect(kcalRange([{ ...base, kcal: 400, confidence: 1, hiddenFatRisk: false }])).toEqual({ low: 400, high: 400, confidence: 1 });
  });

  it("widens by (1-confidence)*0.6 plus 0.15 for hidden-fat items", () => {
    // spread = 0.25*0.6 + 0.15 = 0.30
    expect(kcalRange([{ ...base, kcal: 400, confidence: 0.75, hiddenFatRisk: true }])).toEqual({ low: 280, high: 520, confidence: 0.75 });
  });

  it("weights overall confidence by calories", () => {
    const r = kcalRange([
      { ...base, kcal: 300, confidence: 1, hiddenFatRisk: false },
      { ...base, kcal: 100, confidence: 0.6, hiddenFatRisk: false },
    ]);
    expect(r.confidence).toBe(0.9); // (300×1 + 100×0.6) / 400
  });

  it("handles an empty list and zero-calorie items without dividing by zero", () => {
    expect(kcalRange([])).toEqual({ low: 0, high: 0, confidence: 0.5 });
    expect(kcalRange([{ ...base, kcal: 0, confidence: 0.97, hiddenFatRisk: false }]).confidence).toBe(0.5);
  });
});
