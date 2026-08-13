import { guard, isResponse, json } from "@/lib/api";
import { allFoods } from "@/lib/resolver";

export async function GET(req: Request) {
  const g = await guard();
  if (isResponse(g)) return g;
  const q = (new URL(req.url).searchParams.get("q") ?? "").toLowerCase().trim();
  if (q.length < 2) return json({ foods: [] });
  const foods = (await allFoods())
    .filter((f) => f.name.toLowerCase().includes(q) || f.aliases.includes(q))
    .slice(0, 12)
    .map((f) => ({
      id: f.id,
      name: f.name,
      servingName: f.servingName,
      servingG: f.servingG,
      per100Kcal: f.per100Kcal,
      per100Protein: f.per100Protein,
      per100Carbs: f.per100Carbs,
      per100Fat: f.per100Fat,
      per100Fibre: f.per100Fibre,
      hiddenFatRisk: f.hiddenFatRisk,
    }));
  return json({ foods });
}
