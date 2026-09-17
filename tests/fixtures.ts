// Minimal food fixtures mirroring prisma/seed.ts values, so assertions can be checked by hand.
import type { Food } from "@prisma/client";

type Required = Pick<Food, "id" | "name" | "aliases" | "per100Kcal" | "per100Protein" | "per100Carbs" | "per100Fat">;
type Optional = { per100Fibre?: number; servingName?: string; servingG?: number; hiddenFatRisk?: boolean; verified?: boolean };

export function food(p: Required & Optional): Food {
  return {
    category: "general",
    source: "curated",
    verified: true,
    per100Fibre: 0,
    servingName: "serving",
    servingG: 100,
    hiddenFatRisk: false,
    createdById: null,
    createdAt: new Date(0),
    ...p,
  };
}

export const CHICKEN = food({ id: "f-chicken", name: "Chicken breast (cooked)", aliases: "chicken|chicken breast|grilled chicken", per100Kcal: 165, per100Protein: 31, per100Carbs: 0, per100Fat: 3.6, servingName: "1 breast", servingG: 150 });
export const THIGH = food({ id: "f-thigh", name: "Chicken thigh (cooked)", aliases: "chicken thigh|thigh", per100Kcal: 209, per100Protein: 26, per100Carbs: 0, per100Fat: 10.9, servingName: "1 thigh", servingG: 100 });
export const EGG = food({ id: "f-egg", name: "Egg", aliases: "eggs|boiled egg|fried egg|scrambled egg", per100Kcal: 155, per100Protein: 13, per100Carbs: 1.1, per100Fat: 11, servingName: "1 egg", servingG: 50 });
export const RICE = food({ id: "f-rice", name: "White rice (cooked)", aliases: "rice|steamed rice|jasmine rice|scoop of rice", per100Kcal: 130, per100Protein: 2.7, per100Carbs: 28, per100Fat: 0.3, per100Fibre: 0.4, servingName: "1 bowl", servingG: 200 });
export const TOAST = food({ id: "f-toast", name: "Bread (white slice)", aliases: "bread|toast|white bread|slice of bread|piece of toast", per100Kcal: 265, per100Protein: 9, per100Carbs: 49, per100Fat: 3.2, per100Fibre: 2.7, servingName: "1 slice", servingG: 38 });
export const BUTTER = food({ id: "f-butter", name: "Butter", aliases: "butter", per100Kcal: 717, per100Protein: 0.9, per100Carbs: 0.1, per100Fat: 81, servingName: "1 tsp", servingG: 5, hiddenFatRisk: true });
export const BANANA = food({ id: "f-banana", name: "Banana", aliases: "banana", per100Kcal: 89, per100Protein: 1.1, per100Carbs: 23, per100Fat: 0.3, per100Fibre: 2.6, servingName: "1 banana", servingG: 118 });
export const OIL = food({ id: "f-oil", name: "Olive oil", aliases: "oil|olive oil|cooking oil|tablespoon of oil", per100Kcal: 884, per100Protein: 0, per100Carbs: 0, per100Fat: 100, servingName: "1 tbsp", servingG: 14, hiddenFatRisk: true });
export const CURRY = food({ id: "f-curry", name: "Chicken curry", aliases: "curry|chicken curry|tikka masala|butter chicken", per100Kcal: 160, per100Protein: 13, per100Carbs: 6, per100Fat: 9, per100Fibre: 1.5, servingName: "1 serving", servingG: 280, hiddenFatRisk: true });
export const PIZZA = food({ id: "f-pizza", name: "Pizza (slice)", aliases: "pizza|pizza slice|slice of pizza", per100Kcal: 266, per100Protein: 11, per100Carbs: 33, per100Fat: 10, per100Fibre: 2.3, servingName: "1 slice", servingG: 107, hiddenFatRisk: true });

export const FOODS: Food[] = [CHICKEN, THIGH, EGG, RICE, TOAST, BUTTER, BANANA, OIL, CURRY, PIZZA];
