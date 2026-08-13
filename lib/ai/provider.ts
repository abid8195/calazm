// AI provider abstraction. The app never depends on one vendor:
// - AnthropicProvider is used when ANTHROPIC_API_KEY is set (Haiku for text, Sonnet vision for images).
// - LocalProvider is a fully offline deterministic fallback so the prototype runs without keys.
// In both cases the model only DESCRIBES food; nutrition numbers come from the database (lib/resolver).

import { resolveText, allFoods, matchFood, type ResolvedItem } from "../resolver";

export type VisionDetection = { label: string; grams: number; confidence: number };

export interface AIProvider {
  name: string;
  // Returns detected food labels + portion guesses. NOT nutrition numbers.
  analyzeMealImage(imageBase64: string, mediaType: string, hint?: string): Promise<VisionDetection[]>;
  parseFoodText(text: string, portionOverrides?: Record<string, number>): Promise<{ items: ResolvedItem[]; unmatched: string[] }>;
  generateWeeklyNarrative(stats: Record<string, unknown>): Promise<string | null>;
}

class LocalProvider implements AIProvider {
  name = "local";

  async analyzeMealImage(_img: string, _mt: string, hint?: string): Promise<VisionDetection[]> {
    // Offline heuristic: use the filename/hint keywords against the food DB.
    // Low confidence by design — the review screen asks the user to confirm.
    const foods = await allFoods();
    const detections: VisionDetection[] = [];
    if (hint) {
      for (const word of hint.toLowerCase().replace(/[-_.]/g, " ").split(/\s+/)) {
        if (word.length < 3) continue;
        const m = matchFood(word, foods);
        if (m && !detections.some((d) => d.label === m.food.name)) {
          detections.push({ label: m.food.name, grams: m.food.servingG, confidence: 0.6 });
        }
      }
    }
    return detections;
  }

  async parseFoodText(text: string, portionOverrides?: Record<string, number>) {
    return resolveText(text, portionOverrides);
  }

  async generateWeeklyNarrative(): Promise<string | null> {
    return null; // caller falls back to template narrative
  }
}

class AnthropicProvider implements AIProvider {
  name = "anthropic";
  private local = new LocalProvider();

  private async call(model: string, maxTokens: number, content: unknown): Promise<string | null> {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": process.env.ANTHROPIC_API_KEY!,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({ model, max_tokens: maxTokens, messages: [{ role: "user", content }] }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data?.content?.[0]?.text ?? null;
    } catch {
      return null;
    }
  }

  async analyzeMealImage(imageBase64: string, mediaType: string, hint?: string): Promise<VisionDetection[]> {
    const text = await this.call("claude-sonnet-5", 600, [
      { type: "image", source: { type: "base64", media_type: mediaType, data: imageBase64 } },
      {
        type: "text",
        text:
          `Identify the foods in this meal photo${hint ? ` (filename hint: ${hint})` : ""}. ` +
          `Reply with ONLY a JSON array: [{"label": "common food name", "grams": estimated portion in grams, "confidence": 0-1}]. ` +
          `Use generic food names (e.g. "chicken breast", "white rice"). Do not estimate calories.`,
      },
    ]);
    if (!text) return this.local.analyzeMealImage(imageBase64, mediaType, hint);
    try {
      const arr = JSON.parse(text.slice(text.indexOf("["), text.lastIndexOf("]") + 1));
      return arr
        .filter((d: VisionDetection) => d.label && d.grams > 0)
        .map((d: VisionDetection) => ({ label: String(d.label), grams: Number(d.grams), confidence: Math.min(Math.max(Number(d.confidence) || 0.7, 0), 1) }));
    } catch {
      return this.local.analyzeMealImage(imageBase64, mediaType, hint);
    }
  }

  async parseFoodText(text: string, portionOverrides?: Record<string, number>) {
    // Deterministic parser first (free, instant); cheap model only for what it missed.
    const parsed = await resolveText(text, portionOverrides);
    if (parsed.unmatched.length === 0) return parsed;
    const reply = await this.call("claude-haiku-4-5-20251001", 400, [
      {
        type: "text",
        text:
          `Normalize these food phrases to generic food names with portion grams. ` +
          `Phrases: ${JSON.stringify(parsed.unmatched)}. ` +
          `Reply ONLY JSON: [{"phrase": original, "label": "generic name", "grams": number}].`,
      },
    ]);
    if (reply) {
      try {
        const arr = JSON.parse(reply.slice(reply.indexOf("["), reply.lastIndexOf("]") + 1));
        const still: string[] = [...parsed.unmatched];
        for (const n of arr) {
          const re = await resolveText(`${n.grams}g ${n.label}`, portionOverrides);
          if (re.items.length) {
            parsed.items.push({ ...re.items[0], confidence: Math.min(re.items[0].confidence, 0.7) });
            const i = still.indexOf(n.phrase);
            if (i >= 0) still.splice(i, 1);
          }
        }
        parsed.unmatched = still;
      } catch {
        /* keep deterministic result */
      }
    }
    return parsed;
  }

  async generateWeeklyNarrative(stats: Record<string, unknown>): Promise<string | null> {
    return this.call("claude-fable-5", 500, [
      {
        type: "text",
        text:
          `You are Calazm, a supportive nutrition companion (never shaming, food is never "good/bad"). ` +
          `Write a 4-6 sentence weekly review from these stats: ${JSON.stringify(stats)}. ` +
          `Mention the biggest win, the biggest opportunity, and ONE concrete suggestion for next week. Plain text only.`,
      },
    ]);
  }
}

let provider: AIProvider | null = null;
export function getAI(): AIProvider {
  if (!provider) {
    provider = process.env.ANTHROPIC_API_KEY ? new AnthropicProvider() : new LocalProvider();
  }
  return provider;
}
