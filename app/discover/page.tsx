"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";

type Suggestion = {
  name: string;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  why: string;
  source: string;
  items: { label: string; foodId: string | null; grams: number; kcal: number; proteinG: number; carbsG: number; fatG: number; fibreG: number }[];
};

const FILTERS = [
  ["high-protein", "High protein"],
  ["fast", "Fast"],
  ["cheap", "Cheap"],
  ["vegetarian", "Vegetarian"],
  ["low-carb", "Low carb"],
  ["high-fibre", "High fibre"],
  ["comfort", "Comfort"],
  ["healthy", "Light & fresh"],
  ["restaurant", "Eating out"],
  ["meal-prep", "Meal prep"],
];

export default function DiscoverPage() {
  const router = useRouter();
  const [filters, setFilters] = useState<string[]>([]);
  const [data, setData] = useState<{ remainingKcal: number; remainingProtein: number; suggestions: Suggestion[]; message: string | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [logging, setLogging] = useState<string | null>(null);

  const load = useCallback(async (f: string[]) => {
    setBusy(true);
    const res = await fetch(`/api/recommendations?filters=${f.join(",")}`);
    setBusy(false);
    if (res.status === 401) return router.push("/login");
    if (res.status === 409) return router.push("/onboarding");
    setData(await res.json());
  }, [router]);

  useEffect(() => {
    load([]);
  }, [load]);

  function toggle(f: string) {
    const next = filters.includes(f) ? filters.filter((x) => x !== f) : [...filters, f];
    setFilters(next);
    load(next);
  }

  async function logSuggestion(s: Suggestion) {
    if (!s.items.length || s.items.every((i) => i.kcal === 0)) return;
    setLogging(s.name);
    await fetch("/api/meals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: s.items.map((i) => ({ ...i, confidence: 0.85, hiddenFatRisk: false })), name: s.name, source: "text" }),
    });
    router.push("/today");
  }

  return (
    <main className="max-w-xl mx-auto px-5 pt-8 pb-28">
      <h1 className="text-xl font-bold">What can I eat?</h1>
      {data && (
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          You have <strong className="big-num" style={{ color: "var(--ink)" }}>{data.remainingKcal.toLocaleString()} kcal</strong>
          {data.remainingProtein > 5 && (
            <>
              {" "}and need about <strong className="big-num" style={{ color: "var(--ink)" }}>{data.remainingProtein}g protein</strong>
            </>
          )}{" "}
          for the rest of today.
        </p>
      )}

      <div className="flex gap-2 flex-wrap mt-4">
        {FILTERS.map(([v, label]) => (
          <button key={v} className={`chip ${filters.includes(v) ? "active" : ""}`} onClick={() => toggle(v)}>
            {label}
          </button>
        ))}
      </div>

      <section className="mt-5 grid gap-3">
        {busy && (
          <>
            <div className="skeleton h-24" />
            <div className="skeleton h-24" />
            <div className="skeleton h-24" />
          </>
        )}
        {!busy && data?.message && (
          <div className="card p-5 text-sm leading-relaxed">{data.message}</div>
        )}
        {!busy && data && !data.message && data.suggestions.length === 0 && (
          <div className="card p-5 text-sm" style={{ color: "var(--muted)" }}>
            Nothing fits those filters right now — try removing one, or check the Log tab to add a custom meal.
          </div>
        )}
        {!busy &&
          data?.suggestions.map((s, i) => (
            <div key={s.name + i} className="card p-5 fade-up">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{s.name}</div>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--muted)" }}>
                    {s.source === "your history" ? "🧠 " : s.source === "saved meal" ? "⭐ " : ""}
                    {s.why}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className="big-num font-bold">{s.kcal} kcal</div>
                  <div className="text-xs big-num font-semibold" style={{ color: "var(--protein)" }}>
                    {s.proteinG}g protein
                  </div>
                </div>
              </div>
              {s.items.length > 0 && s.items.some((it) => it.kcal > 0) && (
                <div className="text-xs mt-2" style={{ color: "var(--muted)" }}>
                  {s.items.map((it) => it.label).join(" · ")}
                </div>
              )}
              <button className="btn btn-ghost text-sm mt-3" onClick={() => logSuggestion(s)} disabled={logging === s.name || s.items.every((i) => i.kcal === 0)}>
                {logging === s.name ? "Logging…" : "I'll have this — log it"}
              </button>
            </div>
          ))}
      </section>

      <Nav />
    </main>
  );
}
