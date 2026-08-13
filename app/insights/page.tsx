"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";

type Weekly = {
  weekStart: string;
  stats: {
    daysLogged: number;
    avgKcal: number;
    avgProtein: number;
    proteinHitDays: number;
    onTargetDays: number;
    targetKcal: number | null;
    targetProtein: number | null;
    topFoods: { label: string; n: number }[];
    dayStats: { date: string; kcal: number; proteinG: number }[];
  };
  narrative: string;
  trends: { entries: { date: string; weightKg: number }[]; latest: number | null; avg7: number | null; avg30: number | null; weeklyChange: number | null };
  memory: {
    frequentFoods: { label: string; times: number }[];
    learnedPortions: { label: string; grams: number }[];
    learnedMeals: { slot: string; name: string; kcal: number }[];
    correctionsApplied: number;
  };
  adaptive: { estimate: number; days: number } | null;
  target: { calories: number } | null;
};

function WeightChart({ entries }: { entries: { date: string; weightKg: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  if (entries.length < 2)
    return (
      <p className="text-sm" style={{ color: "var(--muted)" }}>
        Log your weight a few times and the trend appears here. Daily fluctuations are normal — the trend is what matters.
      </p>
    );
  const w = 560, h = 180, pad = { l: 40, r: 12, t: 12, b: 24 };
  const data = entries.slice(-30);
  const min = Math.min(...data.map((d) => d.weightKg));
  const max = Math.max(...data.map((d) => d.weightKg));
  const span = Math.max(max - min, 0.5);
  const x = (i: number) => pad.l + (i / Math.max(data.length - 1, 1)) * (w - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - (v - min + span * 0.15) / (span * 1.3)) * (h - pad.t - pad.b);
  const path = data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d.weightKg).toFixed(1)}`).join(" ");
  const ticks = [min, (min + max) / 2, max];
  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ minWidth: 320 }} role="img" aria-label="Weight trend">
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={pad.l} x2={w - pad.r} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth="1" />
            <text x={pad.l - 6} y={y(t) + 3.5} textAnchor="end" fontSize="10" fill="var(--muted)" className="big-num">
              {t.toFixed(1)}
            </text>
          </g>
        ))}
        <path d={path} fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {data.map((d, i) => (
          <g key={d.date}>
            {/* invisible hit target bigger than the mark */}
            <rect
              x={x(i) - Math.max((w - pad.l - pad.r) / data.length / 2, 8)}
              y={pad.t}
              width={Math.max((w - pad.l - pad.r) / data.length, 16)}
              height={h - pad.t - pad.b}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            />
            {(hover === i || i === data.length - 1) && (
              <circle cx={x(i)} cy={y(d.weightKg)} r="4" fill="var(--brand)" stroke="var(--card)" strokeWidth="2" />
            )}
          </g>
        ))}
        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={h - pad.b} stroke="var(--muted)" strokeWidth="1" strokeDasharray="3 3" />
            <text
              x={Math.min(Math.max(x(hover), pad.l + 40), w - pad.r - 40)}
              y={pad.t + 2}
              textAnchor="middle"
              fontSize="11"
              fontWeight="600"
              fill="var(--ink)"
              className="big-num"
            >
              {data[hover].weightKg.toFixed(1)} kg · {new Date(data[hover].date + "T12:00:00").toLocaleDateString("en", { month: "short", day: "numeric" })}
            </text>
          </g>
        )}
        <text x={x(data.length - 1)} y={y(data[data.length - 1].weightKg) - 8} textAnchor="end" fontSize="11" fontWeight="600" fill="var(--ink)" className="big-num">
          {data[data.length - 1].weightKg.toFixed(1)} kg
        </text>
      </svg>
    </div>
  );
}

function KcalBars({ days, target }: { days: { date: string; kcal: number }[]; target: number | null }) {
  const [hover, setHover] = useState<number | null>(null);
  const week: { date: string; kcal: number }[] = [];
  const monday = new Date();
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    week.push({ date: key, kcal: days.find((x) => x.date === key)?.kcal ?? 0 });
  }
  const maxV = Math.max(...week.map((d) => d.kcal), target ?? 0, 1);
  const w = 560, h = 150, pad = { l: 8, r: 8, t: 18, b: 22 };
  const bw = (w - pad.l - pad.r) / 7;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Calories per day this week">
      {target && (
        <g>
          <line x1={pad.l} x2={w - pad.r} y1={pad.t + (1 - target / maxV) * (h - pad.t - pad.b)} y2={pad.t + (1 - target / maxV) * (h - pad.t - pad.b)} stroke="var(--muted)" strokeWidth="1" strokeDasharray="4 3" />
          <text x={w - pad.r} y={pad.t + (1 - target / maxV) * (h - pad.t - pad.b) - 4} textAnchor="end" fontSize="10" fill="var(--muted)">
            target {target.toLocaleString()}
          </text>
        </g>
      )}
      {week.map((d, i) => {
        const bh = (d.kcal / maxV) * (h - pad.t - pad.b);
        const bx = pad.l + i * bw + 5;
        const by = h - pad.b - bh;
        return (
          <g key={d.date} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            <rect x={pad.l + i * bw} y={pad.t} width={bw} height={h - pad.t - pad.b} fill="transparent" />
            {d.kcal > 0 && (
              <path
                d={`M${bx},${h - pad.b} L${bx},${by + 4} Q${bx},${by} ${bx + 4},${by} L${bx + bw - 14},${by} Q${bx + bw - 10},${by} ${bx + bw - 10},${by + 4} L${bx + bw - 10},${h - pad.b} Z`}
                fill="var(--accent)"
              />
            )}
            {(hover === i || d.kcal > 0) && hover === i && (
              <text x={pad.l + i * bw + bw / 2} y={by - 6 < pad.t ? pad.t + 10 : by - 6} textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--ink)" className="big-num">
                {Math.round(d.kcal).toLocaleString()}
              </text>
            )}
            <text x={pad.l + i * bw + bw / 2} y={h - 6} textAnchor="middle" fontSize="10" fill="var(--muted)">
              {new Date(d.date + "T12:00:00").toLocaleDateString("en", { weekday: "short" })}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function InsightsPage() {
  const router = useRouter();
  const [data, setData] = useState<Weekly | null>(null);
  const [weight, setWeight] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/insights/weekly");
    if (res.status === 401) return router.push("/login");
    setData(await res.json());
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  async function logWeight() {
    if (!weight) return;
    setBusy(true);
    await fetch("/api/weight", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ weightKg: +weight }) });
    setWeight("");
    setBusy(false);
    load();
  }

  if (!data)
    return (
      <main className="max-w-xl mx-auto px-5 pt-8 pb-28">
        <div className="skeleton h-32" />
        <div className="skeleton h-48 mt-4" />
        <Nav />
      </main>
    );

  const s = data.stats;

  return (
    <main className="max-w-xl mx-auto px-5 pt-8 pb-28">
      <h1 className="text-xl font-bold">Insights</h1>

      {/* Weekly narrative */}
      <section className="card p-5 mt-5" style={{ background: "var(--brand-soft)", borderColor: "transparent" }}>
        <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--brand)" }}>
          Your week with Calazm
        </div>
        <p className="text-sm mt-2 leading-relaxed">{data.narrative}</p>
      </section>

      {/* Week stat tiles */}
      {s.daysLogged > 0 && (
        <section className="grid grid-cols-3 gap-2 mt-4">
          {[
            [s.avgKcal.toLocaleString(), "avg kcal/day"],
            [`${s.avgProtein}g`, "avg protein"],
            [`${s.proteinHitDays}/${s.daysLogged}`, "protein target hit"],
          ].map(([v, label]) => (
            <div key={label as string} className="card p-3 text-center">
              <div className="big-num text-lg font-bold">{v}</div>
              <div className="text-[10px] font-medium mt-0.5" style={{ color: "var(--muted)" }}>
                {label}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Calories this week */}
      <section className="card p-5 mt-4">
        <h3 className="text-sm font-semibold mb-2">Calories this week</h3>
        {s.dayStats.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Give Calazm a few days of data and we&apos;ll start finding patterns.
          </p>
        ) : (
          <KcalBars days={s.dayStats} target={s.targetKcal} />
        )}
      </section>

      {/* Weight */}
      <section className="card p-5 mt-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Weight trend</h3>
          {data.trends.weeklyChange !== null && (
            <span className="text-xs big-num font-semibold" style={{ color: "var(--muted)" }}>
              7-day avg {data.trends.weeklyChange > 0 ? "+" : ""}
              {data.trends.weeklyChange} kg vs last week
            </span>
          )}
        </div>
        <WeightChart entries={data.trends.entries} />
        {data.trends.entries.length >= 2 && (
          <p className="text-xs mt-2 leading-relaxed" style={{ color: "var(--muted)" }}>
            Day-to-day jumps are mostly water and timing — don&apos;t overreact to one measurement. The 7-day average is the honest signal.
          </p>
        )}
        <div className="flex gap-2 mt-3">
          <input className="input !w-32 text-sm big-num" type="number" step="0.1" placeholder="kg today" value={weight} onChange={(e) => setWeight(e.target.value)} />
          <button className="btn btn-ghost text-sm" onClick={logWeight} disabled={busy || !weight}>
            Log weight
          </button>
        </div>
        {data.adaptive && (
          <p className="text-xs mt-3" style={{ color: "var(--brand)" }}>
            Your trend suggests maintenance may be around {data.adaptive.estimate.toLocaleString()} kcal/day (from {data.adaptive.days} days of data). Estimates, not certainty — Calazm keeps learning.
          </p>
        )}
      </section>

      {/* What Calazm has learned */}
      <section className="card p-5 mt-4">
        <h3 className="text-sm font-semibold">🧠 What Calazm has learned about you</h3>
        {data.memory.learnedMeals.length === 0 && data.memory.frequentFoods.length === 0 ? (
          <p className="text-sm mt-2" style={{ color: "var(--muted)" }}>
            Nothing yet — every meal you log teaches Calazm your routine. Learned meals, usual portions and habits will appear here.
          </p>
        ) : (
          <div className="mt-3 grid gap-3 text-sm">
            {data.memory.learnedMeals.length > 0 && (
              <div>
                <div className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: "var(--muted)" }}>
                  Your usual meals
                </div>
                {data.memory.learnedMeals.map((m, i) => (
                  <div key={i} className="flex justify-between py-1">
                    <span>
                      <span className="capitalize" style={{ color: "var(--muted)" }}>
                        {m.slot}:
                      </span>{" "}
                      {m.name}
                    </span>
                    <span className="big-num" style={{ color: "var(--muted)" }}>
                      ~{m.kcal} kcal
                    </span>
                  </div>
                ))}
              </div>
            )}
            {data.memory.frequentFoods.length > 0 && (
              <div>
                <div className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: "var(--muted)" }}>
                  Foods you eat most
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {data.memory.frequentFoods.map((f) => (
                    <span key={f.label} className="chip !cursor-default text-xs">
                      {f.label} ×{f.times}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {data.memory.learnedPortions.length > 0 && (
              <div>
                <div className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: "var(--muted)" }}>
                  Your usual portions
                </div>
                {data.memory.learnedPortions.map((p, i) => (
                  <div key={i} className="text-sm py-0.5">
                    {p.label}: <span className="big-num font-semibold">~{p.grams}g</span>
                  </div>
                ))}
              </div>
            )}
            {data.memory.correctionsApplied > 0 && (
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                {data.memory.correctionsApplied} correction{data.memory.correctionsApplied > 1 ? "s" : ""} applied — each one makes future estimates more yours.
              </p>
            )}
          </div>
        )}
      </section>

      {s.topFoods.length > 0 && (
        <section className="card p-5 mt-4">
          <h3 className="text-sm font-semibold mb-2">Most repeated this week</h3>
          <div className="flex gap-1.5 flex-wrap">
            {s.topFoods.map((f) => (
              <span key={f.label} className="chip !cursor-default text-xs">
                {f.label} ×{f.n}
              </span>
            ))}
          </div>
        </section>
      )}

      <Nav />
    </main>
  );
}
