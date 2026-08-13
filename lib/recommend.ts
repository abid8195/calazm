// RecommendationEngine: deterministic scoring, no model in the loop.
// Candidates: the user's own learned/saved meals first, then curated templates from the food DB.
// Every suggestion carries a human-readable "why".
import { prisma } from "./db";
import { allFoods, nutritionFor } from "./resolver";
import { getUsualMeals } from "./memory";
import { mealTypeForHour } from "./nutrition";

export type Suggestion = {
  name: string;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fibreG: number;
  why: string;
  source: "your history" | "saved meal" | "calazm";
  items: { label: string; foodId: string | null; grams: number; kcal: number; proteinG: number; carbsG: number; fatG: number; fibreG: number }[];
  tags: string[];
};

// Curated meal templates over seeded foods: [name, tags, [foodName, grams][]]
const TEMPLATES: [string, string[], [string, number][]][] = [
  ["Chicken burrito bowl", ["high-protein", "fast"], [["Burrito bowl (chicken)", 450], ["Avocado", 30]]],
  ["Chicken rice bowl", ["high-protein", "cheap", "meal-prep"], [["Chicken breast (cooked)", 150], ["White rice (cooked)", 200], ["Mixed vegetables (cooked)", 120]]],
  ["Tuna wrap", ["high-protein", "fast", "cheap"], [["Tuna (canned in water)", 95], ["Tortilla wrap", 64], ["Salad (leafy, undressed)", 50], ["Mayonnaise", 10]]],
  ["Greek yogurt + berries + oats", ["fast", "vegetarian", "high-fibre"], [["Greek yogurt (plain, low fat)", 170], ["Berries (mixed)", 100], ["Oats (dry)", 40]]],
  ["Protein oats", ["fast", "vegetarian", "cheap"], [["Oats (dry)", 50], ["Whey protein powder", 32], ["Banana", 118]]],
  ["Eggs on toast", ["fast", "vegetarian", "cheap"], [["Egg", 100], ["Bread (wholemeal slice)", 76], ["Butter", 5]]],
  ["Beef stir fry with rice", ["high-protein", "comfort"], [["Beef stir fry", 300], ["White rice (cooked)", 150]]],
  ["Salmon, potato & greens", ["high-protein", "healthy"], [["Salmon (cooked)", 140], ["Potato (boiled)", 170], ["Broccoli (cooked)", 90]]],
  ["Tofu veggie stir fry", ["vegetarian", "vegan", "healthy"], [["Tofu (firm)", 150], ["Mixed vegetables (cooked)", 150], ["White rice (cooked)", 150], ["Olive oil", 7]]],
  ["Lentil & veg bowl", ["vegetarian", "vegan", "cheap", "high-fibre"], [["Lentils (cooked)", 198], ["Mixed vegetables (cooked)", 120], ["Brown rice (cooked)", 150]]],
  ["Cottage cheese snack plate", ["fast", "vegetarian", "low-carb"], [["Cottage cheese", 150], ["Carrot", 60], ["Almonds", 15]]],
  ["Protein shake + banana", ["fast", "cheap"], [["Whey protein powder", 32], ["Milk (skim)", 250], ["Banana", 118]]],
  ["Chicken salad (big)", ["low-carb", "healthy", "high-protein"], [["Chicken breast (cooked)", 150], ["Salad (leafy, undressed)", 100], ["Avocado", 50], ["Tomato", 60]]],
  ["Sushi (8 pieces)", ["fast", "restaurant"], [["Sushi roll", 200]]],
  ["Beef pho", ["restaurant", "comfort"], [["Pho (beef)", 950]]],
  ["Chicken sandwich + fruit", ["fast", "cheap"], [["Sandwich (chicken salad)", 220], ["Apple", 180]]],
  ["Turkey, quinoa & greens", ["high-protein", "healthy", "meal-prep"], [["Turkey breast (cooked)", 120], ["Quinoa (cooked)", 185], ["Spinach (raw)", 60]]],
  ["Chickpea & egg bowl", ["vegetarian", "cheap", "high-fibre"], [["Chickpeas (cooked)", 120], ["Egg", 100], ["Cucumber", 100], ["Hummus", 30]]],
];

export type RecommendContext = {
  userId: string;
  remainingKcal: number;
  remainingProtein: number;
  dietaryPref: string;
  filters: string[]; // high-protein | fast | cheap | vegetarian | low-carb | high-fibre | comfort | healthy | restaurant | meal-prep
  hour?: number;
};

function fits(kcal: number, remaining: number) {
  // fits budget: ≤ remaining + 10% grace, and not trivially small
  return kcal <= remaining * 1.1 && kcal >= Math.min(200, remaining * 0.3);
}

export async function recommend(ctx: RecommendContext): Promise<Suggestion[]> {
  const foods = await allFoods();
  const byName = new Map(foods.map((f) => [f.name, f]));
  const hour = ctx.hour ?? new Date().getHours();
  const slot = mealTypeForHour(hour);
  const veg = ctx.dietaryPref === "vegetarian" || ctx.dietaryPref === "vegan" || ctx.filters.includes("vegetarian");

  const candidates: Suggestion[] = [];

  // 1) User's learned meals for this slot (the memory flywheel)
  const usuals = await getUsualMeals(ctx.userId, slot);
  for (const u of usuals) {
    if (u.strength < 2) continue;
    candidates.push({
      name: u.name,
      kcal: u.kcal,
      proteinG: u.proteinG,
      carbsG: 0,
      fatG: 0,
      fibreG: 0,
      why: `You've had this ${u.strength} times — it's one of your usual ${slot}s`,
      source: "your history",
      items: u.items.map((i) => ({ label: i.label, foodId: i.foodId, grams: i.grams, kcal: 0, proteinG: 0, carbsG: 0, fatG: 0, fibreG: 0 })),
      tags: [],
    });
  }

  // 2) Saved meals
  const saved = await prisma.savedMeal.findMany({ where: { userId: ctx.userId }, orderBy: { timesUsed: "desc" }, take: 10 });
  for (const s of saved) {
    candidates.push({
      name: s.name,
      kcal: s.kcal,
      proteinG: s.proteinG,
      carbsG: s.carbsG,
      fatG: s.fatG,
      fibreG: s.fibreG,
      why: s.timesUsed > 1 ? `A saved favourite (logged ${s.timesUsed}×)` : "From your saved meals",
      source: "saved meal",
      items: JSON.parse(s.itemsJson),
      tags: [],
    });
  }

  // 3) Curated templates
  for (const [name, tags, parts] of TEMPLATES) {
    if (veg && !tags.includes("vegetarian") && !tags.includes("vegan")) continue;
    if (ctx.dietaryPref === "vegan" && !tags.includes("vegan")) continue;
    let kcal = 0, proteinG = 0, carbsG = 0, fatG = 0, fibreG = 0;
    const items: Suggestion["items"] = [];
    let ok = true;
    for (const [foodName, grams] of parts) {
      const f = byName.get(foodName);
      if (!f) { ok = false; break; }
      const n = nutritionFor(f, grams);
      kcal += n.kcal; proteinG += n.proteinG; carbsG += n.carbsG; fatG += n.fatG; fibreG += n.fibreG;
      items.push({ label: f.name, foodId: f.id, grams, ...n });
    }
    if (!ok) continue;
    candidates.push({
      name,
      kcal: Math.round(kcal),
      proteinG: Math.round(proteinG),
      carbsG: Math.round(carbsG),
      fatG: Math.round(fatG),
      fibreG: Math.round(fibreG),
      why: "",
      source: "calazm",
      items,
      tags,
    });
  }

  // Score
  const scored = candidates
    .filter((c) => fits(c.kcal, ctx.remainingKcal))
    .filter((c) => ctx.filters.every((f) => c.source !== "calazm" || f === "high-protein" || c.tags.includes(f)))
    .map((c) => {
      let score = 0;
      // protein gap coverage (dominant factor when behind)
      const proteinNeed = Math.max(ctx.remainingProtein, 0);
      score += Math.min(c.proteinG / Math.max(proteinNeed, 20), 1.2) * 40;
      if (ctx.filters.includes("high-protein")) score += c.proteinG * 0.5;
      // budget fit: closer to a sensible share of remaining = better
      const ideal = Math.min(ctx.remainingKcal * 0.85, 750);
      score += 30 * (1 - Math.min(Math.abs(c.kcal - ideal) / Math.max(ideal, 1), 1));
      // personal history boost — the moat
      if (c.source === "your history") score += 25;
      if (c.source === "saved meal") score += 15;
      return { c, score };
    })
    .sort((a, b) => b.score - a.score);

  const top = scored.slice(0, 5).map(({ c }) => {
    if (!c.why) {
      const bits: string[] = [];
      if (ctx.remainingProtein > 15 && c.proteinG >= ctx.remainingProtein * 0.5)
        bits.push(`covers ${Math.min(Math.round((c.proteinG / Math.max(ctx.remainingProtein, 1)) * 100), 100)}% of your remaining protein`);
      bits.push(`fits your ${Math.round(ctx.remainingKcal)} kcal budget`);
      c.why = bits.join(" and ");
    }
    return c;
  });

  return top;
}
