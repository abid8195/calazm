"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";

type ProfileData = {
  email: string;
  name: string | null;
  profile: {
    goal: string;
    age: number | null;
    heightCm: number | null;
    weightKg: number | null;
    targetWeightKg: number | null;
    activityLevel: string;
    paceKgPerWeek: number;
    dietaryPref: string;
  } | null;
  target: { calories: number; proteinG: number; carbsG: number; fatG: number; fibreG: number; rationale: string | null } | null;
  plan: string;
};

export default function ProfilePage() {
  const router = useRouter();
  const [data, setData] = useState<ProfileData | null>(null);
  const [sub, setSub] = useState<{ plan: string; scansUsed: number; freeScanLimit: number } | null>(null);
  const [dark, setDark] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [p, s] = await Promise.all([fetch("/api/profile"), fetch("/api/subscriptions")]);
    if (p.status === 401) return router.push("/login");
    setData(await p.json());
    if (s.ok) setSub(await s.json());
  }, [router]);

  useEffect(() => {
    load();
    setDark(document.documentElement.classList.contains("dark"));
  }, [load]);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("calazm-theme", next ? "dark" : "light");
  }

  async function update(field: string, value: unknown) {
    setBusy(true);
    await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [field]: value }) });
    setBusy(false);
    load();
  }

  async function switchPlan(plan: string) {
    setBusy(true);
    await fetch("/api/subscriptions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan }) });
    setBusy(false);
    load();
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  if (!data)
    return (
      <main className="max-w-xl mx-auto px-5 pt-8 pb-28">
        <div className="skeleton h-32" />
        <Nav />
      </main>
    );

  const p = data.profile;

  return (
    <main className="max-w-xl mx-auto px-5 pt-8 pb-28">
      <h1 className="text-xl font-bold">Profile</h1>
      <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
        {data.name ? `${data.name} · ` : ""}
        {data.email}
      </p>

      {/* Targets */}
      {data.target && (
        <section className="card p-5 mt-5">
          <h3 className="text-sm font-semibold">Daily targets</h3>
          <div className="flex gap-4 mt-2 big-num font-semibold text-sm flex-wrap">
            <span>{data.target.calories.toLocaleString()} kcal</span>
            <span style={{ color: "var(--protein)" }}>{data.target.proteinG}g protein</span>
            <span style={{ color: "var(--carbs)" }}>{data.target.carbsG}g carbs</span>
            <span style={{ color: "var(--fat)" }}>{data.target.fatG}g fat</span>
          </div>
          {data.target.rationale && (
            <p className="text-xs mt-2 leading-relaxed" style={{ color: "var(--muted)" }}>
              {data.target.rationale}
            </p>
          )}
        </section>
      )}

      {/* Editable basics */}
      {p && (
        <section className="card p-5 mt-4 grid gap-4">
          <h3 className="text-sm font-semibold">Your details (targets recompute automatically)</h3>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>
              Weight (kg)
              <input className="input mt-1 text-sm big-num" type="number" step="0.1" defaultValue={p.weightKg ?? ""} onBlur={(e) => e.target.value && update("weightKg", +e.target.value)} />
            </label>
            <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>
              Target weight (kg)
              <input className="input mt-1 text-sm big-num" type="number" step="0.1" defaultValue={p.targetWeightKg ?? ""} onBlur={(e) => e.target.value && update("targetWeightKg", +e.target.value)} />
            </label>
          </div>
          <div>
            <div className="text-xs font-medium mb-1" style={{ color: "var(--muted)" }}>
              Goal
            </div>
            <div className="flex gap-2 flex-wrap">
              {[
                ["lose", "Lose"],
                ["maintain", "Maintain"],
                ["gain", "Gain"],
                ["muscle", "Muscle"],
                ["habits", "Habits"],
              ].map(([v, label]) => (
                <button key={v} className={`chip ${p.goal === v ? "active" : ""}`} disabled={busy} onClick={() => update("goal", v)}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium mb-1" style={{ color: "var(--muted)" }}>
              Dietary preference
            </div>
            <div className="flex gap-2 flex-wrap">
              {[
                ["none", "None"],
                ["vegetarian", "Vegetarian"],
                ["vegan", "Vegan"],
                ["pescatarian", "Pescatarian"],
                ["halal", "Halal"],
              ].map(([v, label]) => (
                <button key={v} className={`chip ${p.dietaryPref === v ? "active" : ""}`} disabled={busy} onClick={() => update("dietaryPref", v)}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Subscription */}
      {sub && (
        <section className="card p-5 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">{sub.plan === "plus" ? "Calazm Plus" : "Free plan"}</h3>
              <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                {sub.plan === "plus"
                  ? "Unlimited scans, full insights, adaptive targets. Cancel any time — one tap, no runaround."
                  : `${sub.scansUsed}/${sub.freeScanLimit} AI photo scans used this month. Text logging is always unlimited.`}
              </p>
            </div>
            {sub.plan === "plus" ? (
              <button className="btn btn-ghost text-sm" disabled={busy} onClick={() => switchPlan("free")}>
                Cancel Plus
              </button>
            ) : (
              <button className="btn btn-brand text-sm shrink-0" disabled={busy} onClick={() => switchPlan("plus")}>
                Plus · $2.99/mo
              </button>
            )}
          </div>
        </section>
      )}

      {/* Appearance + account */}
      <section className="card p-5 mt-4 grid gap-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Dark mode</span>
          <button className={`chip ${dark ? "active" : ""}`} onClick={toggleTheme}>
            {dark ? "On" : "Off"}
          </button>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Sign out</span>
          <button className="chip" onClick={logout}>
            Sign out
          </button>
        </div>
      </section>

      {/* Your data */}
      <section className="card p-5 mt-4 grid gap-3">
        <h3 className="text-sm font-semibold">Your data</h3>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">Export everything</div>
            <div className="text-xs" style={{ color: "var(--muted)" }}>
              Download all your data as JSON
            </div>
          </div>
          <a className="chip" href="/api/export" download>
            Export
          </a>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">Delete account</div>
            <div className="text-xs" style={{ color: "var(--muted)" }}>
              Permanent — removes all meals, photos and history
            </div>
          </div>
          <button
            className="chip"
            style={{ color: "var(--carbs)", borderColor: "var(--carbs)" }}
            onClick={async () => {
              if (!confirm("Delete your Calazm account and ALL data permanently? This cannot be undone.")) return;
              if (!confirm("Last check — this erases every meal, photo and trend. Continue?")) return;
              await fetch("/api/account", { method: "DELETE" });
              router.push("/");
            }}
          >
            Delete
          </button>
        </div>
        <p className="text-xs" style={{ color: "var(--muted)" }}>
          <a href="/privacy" className="underline">Privacy policy</a>
        </p>
      </section>

      <p className="text-xs mt-6 leading-relaxed text-center" style={{ color: "var(--muted)" }}>
        Calazm is a nutrition companion, not a medical device. Estimates are estimates. If tracking ever feels compulsive or stressful,
        stepping back is a valid choice — and talking to a health professional is always a good one.
      </p>

      <Nav />
    </main>
  );
}
