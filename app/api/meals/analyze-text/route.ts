import { guard, isResponse, json } from "@/lib/api";
import { getAI } from "@/lib/ai/provider";
import { getPortionOverrides } from "@/lib/memory";
import { kcalRange } from "@/lib/resolver";

export async function POST(req: Request) {
  const g = await guard();
  if (isResponse(g)) return g;
  const { text } = await req.json();
  if (!text?.trim()) return json({ error: "Describe your meal first." }, 400);

  const overrides = await getPortionOverrides(g.userId);
  const { items, unmatched } = await getAI().parseFoodText(text, overrides);
  const range = kcalRange(items);
  const usedLearnedPortion = items.some((i) => i.foodId && overrides[i.foodId]);

  return json({
    items,
    unmatched,
    kcalLow: range.low,
    kcalHigh: range.high,
    confidence: range.confidence,
    clarify: items.some((i) => i.hiddenFatRisk) ? "Was this cooked with much oil or butter?" : null,
    note: usedLearnedPortion ? "Used your usual portion sizes where Calazm has learned them." : null,
  });
}
