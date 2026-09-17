import { describe, it, expect } from "vitest";
import { computeTargets, balanceScore, sumMeals, mealTypeForHour, localDateKey } from "../lib/nutrition";

describe("computeTargets — Mifflin-St Jeor + goal adjustment", () => {
  const sam = { goal: "lose", sex: "male", age: 28, heightCm: 178, weightKg: 82, activityLevel: "moderate", paceKgPerWeek: 0.5 };

  it("reproduces the onboarding numbers asserted in scripts/e2e.mjs", () => {
    // BMR = 10×82 + 6.25×178 − 5×28 + 5 = 1797.5; TDEE = ×1.55 = 2786; 0.5 kg/wk = −550 kcal/day
    const t = computeTargets(sam);
    expect(t.maintenance).toBe(2786);
    expect(t.calories).toBe(2236);
    expect(t.proteinG).toBe(148); // 1.8 g/kg for a cut
    expect(t.fatG).toBe(70); // 28% of calories
    expect(t.carbsG).toBe(254); // remainder
  });

  it("caps the deficit at 25% of maintenance and never goes below the safety floor", () => {
    const aggressive = computeTargets({ ...sam, paceKgPerWeek: 2 }); // would be −2200/day uncapped
    expect(aggressive.calories).toBe(Math.round(2786 - 2786 * 0.25));

    const small = computeTargets({ goal: "lose", sex: "female", age: 60, heightCm: 150, weightKg: 45, activityLevel: "sedentary", paceKgPerWeek: 1 });
    expect(small.calories).toBe(1200);
  });

  it("uses a smaller surplus for gaining and higher protein for muscle", () => {
    const gain = computeTargets({ ...sam, goal: "gain" });
    expect(gain.calories).toBe(Math.round(2786 + Math.min((0.5 * 7700) / 7, 2786 * 0.15)));
    expect(computeTargets({ ...sam, goal: "muscle" }).proteinG).toBe(Math.round(82 * 2.0));
    expect(computeTargets({ ...sam, goal: "maintain" }).proteinG).toBe(Math.round(82 * 1.6));
  });

  it("explains itself as an estimate", () => {
    expect(computeTargets(sam).rationale).toMatch(/estimates/i);
  });
});

describe("balanceScore", () => {
  const target = { calories: 2000, proteinG: 150, fibreG: 28 };

  it("is 100 for a day that hits every component", () => {
    expect(balanceScore({ kcal: 2000, proteinG: 150, carbsG: 0, fatG: 0, fibreG: 28 }, target, 2000, 2000, 3)).toBe(100);
  });

  it("is bounded to [0, 100] for an empty day and a wildly over day", () => {
    expect(balanceScore({ kcal: 0, proteinG: 0, carbsG: 0, fatG: 0, fibreG: 0 }, target, 0, 2000, 0)).toBe(0);
    const over = balanceScore({ kcal: 6000, proteinG: 300, carbsG: 0, fatG: 0, fibreG: 60 }, target, 5000, 2000, 9);
    expect(over).toBeGreaterThanOrEqual(0);
    expect(over).toBeLessThanOrEqual(100);
  });

  it("gives full calorie credit within ±10% and none beyond ±50%", () => {
    const within = balanceScore({ kcal: 2150, proteinG: 0, carbsG: 0, fatG: 0, fibreG: 0 }, target, 0, 2000, 0);
    const beyond = balanceScore({ kcal: 3100, proteinG: 0, carbsG: 0, fatG: 0, fibreG: 0 }, target, 0, 2000, 0);
    expect(within).toBe(40);
    expect(beyond).toBe(0);
  });
});

describe("helpers", () => {
  it("sumMeals totals every item across meals", () => {
    const meals = [
      { items: [{ kcal: 100, proteinG: 10, carbsG: 5, fatG: 2, fibreG: 1 }] },
      { items: [{ kcal: 50, proteinG: 5, carbsG: 0, fatG: 1, fibreG: 0 }, { kcal: 25, proteinG: 0, carbsG: 6, fatG: 0, fibreG: 2 }] },
    ];
    expect(sumMeals(meals)).toEqual({ kcal: 175, proteinG: 15, carbsG: 11, fatG: 3, fibreG: 3 });
  });

  it("mealTypeForHour maps the day into breakfast/lunch/dinner/snack", () => {
    expect(mealTypeForHour(7)).toBe("breakfast");
    expect(mealTypeForHour(12)).toBe("lunch");
    expect(mealTypeForHour(19)).toBe("dinner");
    expect(mealTypeForHour(22)).toBe("snack");
  });

  it("localDateKey uses the local calendar day, not UTC", () => {
    const d = new Date(2026, 7, 13, 2, 9); // 02:09 local on Aug 13 — UTC date may differ
    expect(localDateKey(d)).toBe("2026-08-13");
  });
});
