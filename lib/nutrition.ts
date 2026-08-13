// Deterministic nutrition math. The AI never invents these numbers.

export type ProfileInput = {
  goal: string;
  sex?: string | null;
  age?: number | null;
  heightCm?: number | null;
  weightKg?: number | null;
  activityLevel: string;
  paceKgPerWeek: number;
};

const ACTIVITY: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  athlete: 1.9,
};

export function computeTargets(p: ProfileInput) {
  const weight = p.weightKg ?? 75;
  const height = p.heightCm ?? 172;
  const age = p.age ?? 30;
  // Mifflin-St Jeor; unspecified sex → midpoint of the two constants
  const sexConst = p.sex === "male" ? 5 : p.sex === "female" ? -161 : -78;
  const bmr = 10 * weight + 6.25 * height - 5 * age + sexConst;
  const tdee = bmr * (ACTIVITY[p.activityLevel] ?? 1.55);

  // 7700 kcal ≈ 1 kg; cap adjustment at ±25% of TDEE for safety
  let adjustment = 0;
  if (p.goal === "lose") adjustment = -Math.min((p.paceKgPerWeek * 7700) / 7, tdee * 0.25);
  if (p.goal === "gain" || p.goal === "muscle") adjustment = Math.min((Math.abs(p.paceKgPerWeek) * 7700) / 7, tdee * 0.15);

  const floor = p.sex === "male" ? 1500 : 1200;
  const calories = Math.max(Math.round(tdee + adjustment), floor);

  const proteinPerKg = p.goal === "muscle" ? 2.0 : p.goal === "lose" ? 1.8 : 1.6;
  const proteinG = Math.round(weight * proteinPerKg);
  const fatG = Math.round((calories * 0.28) / 9);
  const carbsG = Math.max(Math.round((calories - proteinG * 4 - fatG * 9) / 4), 50);
  const fibreG = Math.max(Math.round((calories / 1000) * 14), 25);

  const rationale =
    `Estimated from your stats (Mifflin-St Jeor × activity ${ACTIVITY[p.activityLevel] ?? 1.55}) ` +
    `≈ ${Math.round(tdee)} kcal maintenance, adjusted ${adjustment >= 0 ? "+" : ""}${Math.round(adjustment)} kcal for your goal. ` +
    `These are estimates — Calazm refines them as your real data accumulates.`;

  return { calories, proteinG, carbsG, fatG, fibreG, waterMl: 2000, rationale, maintenance: Math.round(tdee) };
}

export type DayTotals = { kcal: number; proteinG: number; carbsG: number; fatG: number; fibreG: number };

export function sumMeals(meals: { items: { kcal: number; proteinG: number; carbsG: number; fatG: number; fibreG: number }[] }[]): DayTotals {
  const t: DayTotals = { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0, fibreG: 0 };
  for (const m of meals)
    for (const i of m.items) {
      t.kcal += i.kcal;
      t.proteinG += i.proteinG;
      t.carbsG += i.carbsG;
      t.fatG += i.fatG;
      t.fibreG += i.fibreG;
    }
  return t;
}

// Calazm Balance: 0–100, framed as balance, never punishment.
export function balanceScore(totals: DayTotals, target: { calories: number; proteinG: number; fibreG: number }, waterMl: number, waterTarget: number, mealCount: number) {
  // Calorie alignment (40): full marks within ±10% of target, tapering to 0 at ±50%
  const calDev = Math.abs(totals.kcal - target.calories) / target.calories;
  const calScore = 40 * Math.max(0, Math.min(1, (0.5 - calDev) / 0.4));
  const proteinScore = 30 * Math.min(1, totals.proteinG / target.proteinG);
  const fibreScore = 15 * Math.min(1, totals.fibreG / target.fibreG);
  const hydration = 7.5 * Math.min(1, waterMl / Math.max(waterTarget, 1));
  const consistency = 7.5 * Math.min(1, mealCount / 3);
  return Math.round(calScore + proteinScore + fibreScore + hydration + consistency);
}

export function mealTypeForHour(h: number): string {
  if (h < 10.5) return "breakfast";
  if (h < 15) return "lunch";
  if (h < 20.5) return "dinner";
  return "snack";
}

// Local-time date key (never toISOString — that shifts days across UTC offsets)
export function localDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function dayStart(d = new Date()) {
  const s = new Date(d);
  s.setHours(0, 0, 0, 0);
  return s;
}
