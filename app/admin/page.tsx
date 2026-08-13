"use client";
// Founder dashboard: users, engagement, revenue, AI cost. Access requires the
// signed-in account's email to match ADMIN_EMAIL (server-enforced).
import { useEffect, useState } from "react";
import Link from "next/link";

type Metrics = {
  totalUsers: number;
  newUsers7: number;
  activeUsers7: number;
  plusSubs: number;
  conversionPct: number;
  mrr: number;
  scansThisMonth: number;
  estAiCost: number;
  meals7: number;
  mealsTotal: number;
  weights7: number;
  savedMeals: number;
  corrections: number;
  signups30: { date: string; n: number }[];
};

function Tile({ value, label, accent }: { value: string | number; label: string; accent?: string }) {
  return (
    <div className="card p-4">
      <div className="big-num text-2xl font-bold" style={accent ? { color: `var(${accent})` } : undefined}>
        {value}
      </div>
      <div className="text-xs font-medium mt-0.5" style={{ color: "var(--muted)" }}>
        {label}
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [m, setM] = useState<Metrics | null>(null);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    fetch("/api/admin/metrics").then(async (r) => {
      if (!r.ok) return setDenied(true);
      setM(await r.json());
    });
  }, []);

  if (denied)
    return (
      <main className="max-w-xl mx-auto px-6 pt-16 text-center">
        <h1 className="text-xl font-bold">Founder dashboard</h1>
        <p className="text-sm mt-2" style={{ color: "var(--muted)" }}>
          Sign in with the admin account (set <code>ADMIN_EMAIL</code> in env) to view business metrics.
        </p>
        <Link href="/today" className="btn btn-ghost inline-block mt-4 text-sm">
          Back to the app
        </Link>
      </main>
    );

  if (!m)
    return (
      <main className="max-w-xl mx-auto px-5 pt-8">
        <div className="skeleton h-24" />
        <div className="skeleton h-24 mt-3" />
      </main>
    );

  const maxSignups = Math.max(...m.signups30.map((d) => d.n), 1);

  return (
    <main className="max-w-xl mx-auto px-5 pt-8 pb-16">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Founder dashboard</h1>
        <Link href="/today" className="chip">
          ← App
        </Link>
      </div>

      <h2 className="text-xs font-semibold uppercase tracking-wide mt-6 mb-2" style={{ color: "var(--muted)" }}>
        Users
      </h2>
      <div className="grid grid-cols-3 gap-2">
        <Tile value={m.totalUsers} label="total users" />
        <Tile value={m.activeUsers7} label="active (7d)" accent="--brand" />
        <Tile value={`+${m.newUsers7}`} label="new (7d)" />
      </div>

      <h2 className="text-xs font-semibold uppercase tracking-wide mt-6 mb-2" style={{ color: "var(--muted)" }}>
        Revenue
      </h2>
      <div className="grid grid-cols-3 gap-2">
        <Tile value={m.plusSubs} label="Plus subscribers" accent="--brand" />
        <Tile value={`${m.conversionPct}%`} label="free → paid" />
        <Tile value={`$${m.mrr}`} label="MRR" accent="--brand" />
      </div>

      <h2 className="text-xs font-semibold uppercase tracking-wide mt-6 mb-2" style={{ color: "var(--muted)" }}>
        AI economics (this month)
      </h2>
      <div className="grid grid-cols-3 gap-2">
        <Tile value={m.scansThisMonth} label="photo scans" />
        <Tile value={`$${m.estAiCost}`} label="est. AI cost" accent="--accent" />
        <Tile value={m.mrr > 0 ? `${Math.round((m.estAiCost / m.mrr) * 100)}%` : "—"} label="cost / MRR" />
      </div>

      <h2 className="text-xs font-semibold uppercase tracking-wide mt-6 mb-2" style={{ color: "var(--muted)" }}>
        Engagement
      </h2>
      <div className="grid grid-cols-2 gap-2">
        <Tile value={m.meals7} label="meals logged (7d)" />
        <Tile value={m.mealsTotal} label="meals all-time" />
        <Tile value={m.savedMeals} label="saved meals created" />
        <Tile value={m.corrections} label="portion corrections learned" />
      </div>

      <section className="card p-5 mt-6">
        <h3 className="text-sm font-semibold mb-3">Signups — last 30 days</h3>
        {m.signups30.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            No signups in the last 30 days.
          </p>
        ) : (
          <div className="flex items-end gap-1 h-24" role="img" aria-label="Signups per day, last 30 days">
            {m.signups30.map((d) => (
              <div key={d.date} className="flex-1 rounded-t" title={`${d.date}: ${d.n}`} style={{ height: `${(d.n / maxSignups) * 100}%`, minHeight: 3, background: "var(--brand)" }} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
