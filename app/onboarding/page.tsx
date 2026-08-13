"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Answers = {
  goal: string;
  sex: string;
  age: number;
  heightCm: number;
  weightKg: number;
  targetWeightKg: number;
  activityLevel: string;
  paceKgPerWeek: number;
  dietaryPref: string;
};

const GOALS = [
  ["lose", "Lose weight"],
  ["maintain", "Maintain"],
  ["gain", "Gain weight"],
  ["muscle", "Build muscle"],
  ["habits", "Improve habits"],
];
const ACTIVITY = [
  ["sedentary", "Mostly sitting"],
  ["light", "Light activity"],
  ["moderate", "Moderate (2–4 workouts/wk)"],
  ["active", "Very active"],
  ["athlete", "Athlete"],
];
const DIETS = [
  ["none", "No restrictions"],
  ["vegetarian", "Vegetarian"],
  ["vegan", "Vegan"],
  ["pescatarian", "Pescatarian"],
  ["halal", "Halal"],
];

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ calories: number; proteinG: number; carbsG: number; fatG: number; rationale: string } | null>(null);
  const [a, setA] = useState<Answers>({
    goal: "lose",
    sex: "unspecified",
    age: 30,
    heightCm: 172,
    weightKg: 75,
    targetWeightKg: 70,
    activityLevel: "moderate",
    paceKgPerWeek: 0.5,
    dietaryPref: "none",
  });

  async function finish() {
    setBusy(true);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...a, onboarded: true }),
    });
    setBusy(false);
    if (res.ok) {
      const data = await res.json();
      setResult(data.target ? { ...data.target, rationale: data.target.rationale } : null);
      setStep(5);
    }
  }

  const steps = [
    // 0: goal
    <div key="goal">
      <h2 className="text-2xl font-bold">What&apos;s your goal?</h2>
      <p className="text-sm mt-1 mb-5" style={{ color: "var(--muted)" }}>
        Calazm turns this into realistic daily targets — no crash-diet math.
      </p>
      <div className="grid gap-2">
        {GOALS.map(([v, label]) => (
          <button key={v} className={`chip text-left !py-3 !px-4 ${a.goal === v ? "active" : ""}`} onClick={() => setA({ ...a, goal: v })}>
            {label}
          </button>
        ))}
      </div>
    </div>,
    // 1: about you
    <div key="you">
      <h2 className="text-2xl font-bold">About you</h2>
      <p className="text-sm mt-1 mb-5" style={{ color: "var(--muted)" }}>
        Used only to estimate your energy needs.
      </p>
      <div className="grid gap-3">
        <label className="text-sm font-medium">
          Age
          <input className="input mt-1" type="number" value={a.age} onChange={(e) => setA({ ...a, age: +e.target.value })} />
        </label>
        <label className="text-sm font-medium">
          Height (cm)
          <input className="input mt-1" type="number" value={a.heightCm} onChange={(e) => setA({ ...a, heightCm: +e.target.value })} />
        </label>
        <label className="text-sm font-medium">
          Weight (kg)
          <input className="input mt-1" type="number" step="0.1" value={a.weightKg} onChange={(e) => setA({ ...a, weightKg: +e.target.value })} />
        </label>
        <div>
          <div className="text-sm font-medium mb-1">Sex (for the calorie formula)</div>
          <div className="flex gap-2">
            {[
              ["male", "Male"],
              ["female", "Female"],
              ["unspecified", "Prefer not to say"],
            ].map(([v, label]) => (
              <button key={v} className={`chip ${a.sex === v ? "active" : ""}`} onClick={() => setA({ ...a, sex: v })}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>,
    // 2: activity
    <div key="activity">
      <h2 className="text-2xl font-bold">How active are you?</h2>
      <p className="text-sm mt-1 mb-5" style={{ color: "var(--muted)" }}>
        Day-to-day movement plus training.
      </p>
      <div className="grid gap-2">
        {ACTIVITY.map(([v, label]) => (
          <button key={v} className={`chip text-left !py-3 !px-4 ${a.activityLevel === v ? "active" : ""}`} onClick={() => setA({ ...a, activityLevel: v })}>
            {label}
          </button>
        ))}
      </div>
    </div>,
    // 3: pace + target
    <div key="pace">
      <h2 className="text-2xl font-bold">Target &amp; pace</h2>
      <p className="text-sm mt-1 mb-5" style={{ color: "var(--muted)" }}>
        Slower is easier to keep. We cap the pace at a safe level.
      </p>
      <div className="grid gap-3">
        <label className="text-sm font-medium">
          Target weight (kg)
          <input className="input mt-1" type="number" step="0.1" value={a.targetWeightKg} onChange={(e) => setA({ ...a, targetWeightKg: +e.target.value })} />
        </label>
        <div>
          <div className="text-sm font-medium mb-1">Pace (kg per week)</div>
          <div className="flex gap-2 flex-wrap">
            {[0.25, 0.5, 0.75, 1].map((v) => (
              <button key={v} className={`chip ${a.paceKgPerWeek === v ? "active" : ""}`} onClick={() => setA({ ...a, paceKgPerWeek: v })}>
                {v} kg
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>,
    // 4: diet
    <div key="diet">
      <h2 className="text-2xl font-bold">Any dietary preference?</h2>
      <p className="text-sm mt-1 mb-5" style={{ color: "var(--muted)" }}>
        Recommendations will respect this.
      </p>
      <div className="grid gap-2">
        {DIETS.map(([v, label]) => (
          <button key={v} className={`chip text-left !py-3 !px-4 ${a.dietaryPref === v ? "active" : ""}`} onClick={() => setA({ ...a, dietaryPref: v })}>
            {label}
          </button>
        ))}
      </div>
    </div>,
    // 5: result / aha
    <div key="done" className="fade-up">
      <h2 className="text-2xl font-bold">Calazm is ready 🎉</h2>
      {result && (
        <>
          <div className="card p-5 mt-4">
            <div className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--muted)" }}>
              Your daily targets
            </div>
            <div className="big-num text-4xl font-bold mt-1">
              {result.calories.toLocaleString()} <span className="text-lg font-semibold">kcal</span>
            </div>
            <div className="flex gap-4 mt-3 text-sm big-num font-semibold">
              <span style={{ color: "var(--protein)" }}>{result.proteinG}g protein</span>
              <span style={{ color: "var(--carbs)" }}>{result.carbsG}g carbs</span>
              <span style={{ color: "var(--fat)" }}>{result.fatG}g fat</span>
            </div>
          </div>
          <p className="text-xs mt-3 leading-relaxed" style={{ color: "var(--muted)" }}>
            {result.rationale}
          </p>
        </>
      )}
      <p className="text-sm mt-4">Now the fun part — log your next meal and watch Calazm work.</p>
      <button className="btn btn-brand w-full mt-4" onClick={() => router.push("/log")}>
        Log my first meal
      </button>
      <button className="btn btn-ghost w-full mt-2" onClick={() => router.push("/today")}>
        See my dashboard
      </button>
    </div>,
  ];

  return (
    <main className="max-w-sm mx-auto px-6 pt-12 pb-16">
      {step < 5 && (
        <div className="flex gap-1.5 mb-8">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-1 flex-1 rounded-full" style={{ background: i <= step ? "var(--brand)" : "var(--line)" }} />
          ))}
        </div>
      )}
      <div className="fade-up" key={step}>
        {steps[step]}
      </div>
      {step < 5 && (
        <div className="flex gap-2 mt-8">
          {step > 0 && (
            <button className="btn btn-ghost" onClick={() => setStep(step - 1)}>
              Back
            </button>
          )}
          <button className="btn btn-brand flex-1" disabled={busy} onClick={() => (step === 4 ? finish() : setStep(step + 1))}>
            {busy ? "Setting up…" : step === 4 ? "Create my plan" : "Continue"}
          </button>
        </div>
      )}
    </main>
  );
}
