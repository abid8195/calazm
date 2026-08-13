"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import Ring from "@/components/Ring";
import MacroBar from "@/components/MacroBar";
import AdSlot from "@/components/AdSlot";

type Today = {
  target: { calories: number; proteinG: number; carbsG: number; fatG: number; fibreG: number; waterMl: number };
  totals: { kcal: number; proteinG: number; carbsG: number; fatG: number; fibreG: number };
  remaining: { kcal: number; proteinG: number };
  waterMl: number;
  meals: { id: string; name: string; mealType: string; eatenAt: string; confidence: number | null; kcalLow: number | null; kcalHigh: number | null; items: { kcal: number; proteinG: number }[] }[];
  plan: { slot: string; kcal: number }[];
  nextSlot: string;
  balance: number;
  moment: string;
  adaptive: { estimate: number; days: number } | null;
};

export default function TodayPage() {
  const router = useRouter();
  const [data, setData] = useState<Today | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/today");
    if (res.status === 401) return router.push("/login");
    if (res.status === 409) return router.push("/onboarding");
    setData(await res.json());
    setLoaded(true);
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  async function addWater() {
    await fetch("/api/water", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ml: 250 }) });
    load();
  }

  async function deleteMeal(id: string) {
    await fetch(`/api/meals/${id}`, { method: "DELETE" });
    load();
  }

  if (!loaded || !data)
    return (
      <main className="max-w-xl mx-auto px-5 pt-8 pb-28">
        <div className="skeleton h-44 w-44 mx-auto rounded-full" />
        <div className="skeleton h-24 mt-6" />
        <div className="skeleton h-24 mt-4" />
        <Nav />
      </main>
    );

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <main className="max-w-xl mx-auto px-5 pt-8 pb-28">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{greeting}</h1>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            {new Date().toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
        <div className="card px-3 py-2 text-center">
          <div className="big-num text-lg font-bold" style={{ color: "var(--brand)" }}>
            {data.balance}
          </div>
          <div className="text-[10px] font-medium uppercase tracking-wide" style={{ color: "var(--muted)" }}>
            Balance
          </div>
        </div>
      </header>

      <section className="flex flex-col items-center mt-6 fade-up">
        <Ring
          value={data.totals.kcal}
          max={data.target.calories}
          label="kcal eaten"
          sub={data.remaining.kcal >= 0 ? `${data.remaining.kcal.toLocaleString()} left` : `${Math.abs(data.remaining.kcal)} over`}
        />
      </section>

      <section className="card p-5 mt-5 grid gap-3">
        <MacroBar label="Protein" value={data.totals.proteinG} max={data.target.proteinG} colorVar="--protein" />
        <MacroBar label="Carbs" value={data.totals.carbsG} max={data.target.carbsG} colorVar="--carbs" />
        <MacroBar label="Fat" value={data.totals.fatG} max={data.target.fatG} colorVar="--fat" />
        <MacroBar label="Fibre" value={data.totals.fibreG} max={data.target.fibreG} colorVar="--fibre" />
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs font-medium" style={{ color: "var(--muted)" }}>
            💧 Water {data.waterMl} / {data.target.waterMl} ml
          </span>
          <button className="chip" onClick={addWater}>
            + 250 ml
          </button>
        </div>
      </section>

      {/* Next best action */}
      <section className="card p-5 mt-4" style={{ background: "var(--brand-soft)", borderColor: "transparent" }}>
        <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--brand)" }}>
          Next best action
        </div>
        <p className="text-sm mt-1 leading-relaxed">
          {data.remaining.kcal <= 0
            ? "You've reached today's calorie target. If you're still hungry, keep it light and protein-forward — and remember, one day never defines the week."
            : data.remaining.proteinG > 15
              ? `You have ${data.remaining.kcal.toLocaleString()} kcal left and need about ${data.remaining.proteinG}g more protein. Your next ${data.nextSlot} could prioritise ~${Math.min(Math.max(Math.round(data.remaining.proteinG * 0.6), 25), 50)}g protein.`
              : `You have ${data.remaining.kcal.toLocaleString()} kcal left and protein is on track — nice. Keep the next ${data.nextSlot} balanced.`}
        </p>
        <div className="flex gap-2 mt-3">
          <Link href="/log" className="btn btn-brand text-sm">
            Log food
          </Link>
          <Link href="/discover" className="btn btn-ghost text-sm">
            What can I eat?
          </Link>
        </div>
      </section>

      {/* Day plan for remaining slots */}
      {data.plan.length > 0 && data.remaining.kcal > 100 && (
        <section className="card p-5 mt-4">
          <h3 className="text-sm font-semibold">Suggested split for the rest of today</h3>
          <div className="flex gap-2 mt-3 flex-wrap">
            {data.plan.map((p) => (
              <div key={p.slot} className="chip !cursor-default">
                <span className="capitalize">{p.slot}</span> <span className="big-num font-semibold">~{p.kcal}</span> kcal
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Calazm Moment */}
      <section className="card p-5 mt-4">
        <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--accent)" }}>
          Calazm moment
        </div>
        <p className="text-sm mt-1 leading-relaxed">{data.moment}</p>
        {data.adaptive && (
          <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>
            Based on {data.adaptive.days} days of your data, your maintenance intake may be around {data.adaptive.estimate.toLocaleString()} kcal/day.
            That&apos;s an estimate — Calazm keeps refining it.
          </p>
        )}
      </section>

      <AdSlot placement="today-mid" />

      {/* Meals */}
      <section className="mt-6">
        <h3 className="text-sm font-semibold mb-2">Today&apos;s meals</h3>
        {data.meals.length === 0 ? (
          <div className="card p-6 text-center">
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              No meals yet. Snap your next meal and Calazm handles the rest.
            </p>
            <Link href="/log" className="btn btn-brand inline-block mt-3 text-sm">
              Log my first meal today
            </Link>
          </div>
        ) : (
          <div className="grid gap-2">
            {data.meals.map((m) => {
              const kcal = Math.round(m.items.reduce((s, i) => s + i.kcal, 0));
              const protein = Math.round(m.items.reduce((s, i) => s + i.proteinG, 0));
              return (
                <div key={m.id} className="card p-4 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium capitalize" style={{ color: "var(--muted)" }}>
                      {m.mealType} · {new Date(m.eatenAt).toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" })}
                    </div>
                    <div className="font-medium text-sm mt-0.5">{m.name}</div>
                    {m.confidence !== null && m.confidence < 0.8 && m.kcalLow && m.kcalHigh && (
                      <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                        est. {m.kcalLow}–{m.kcalHigh} kcal
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="big-num font-bold">{kcal} kcal</div>
                    <div className="text-xs big-num" style={{ color: "var(--protein)" }}>
                      {protein}g protein
                    </div>
                    <button className="text-xs mt-1" style={{ color: "var(--muted)" }} onClick={() => deleteMeal(m.id)}>
                      remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <Nav />
    </main>
  );
}
