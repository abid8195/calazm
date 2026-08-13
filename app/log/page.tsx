"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";

type Item = {
  foodId: string | null;
  label: string;
  grams: number;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fibreG: number;
  confidence: number;
  hiddenFatRisk: boolean;
};
type Analysis = {
  items: Item[];
  unmatched?: string[];
  kcalLow: number;
  kcalHigh: number;
  confidence: number;
  clarify: string | null;
  note?: string | null;
  fallback?: string | null;
  imagePath?: string;
  scansLeft?: number | null;
};
type FoodHit = { id: string; name: string; servingName: string; servingG: number; per100Kcal: number; per100Protein: number; per100Carbs: number; per100Fat: number; per100Fibre: number; hiddenFatRisk: boolean };

export default function LogPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [original, setOriginal] = useState<Item[]>([]);
  const [source, setSource] = useState<"text" | "photo" | "saved">("text");
  const [mealType, setMealType] = useState<string>("");
  const [saveAs, setSaveAs] = useState("");
  const [wantSave, setWantSave] = useState(false);
  const [clarifyAnswered, setClarifyAnswered] = useState<string | null>(null);
  const [saved, setSaved] = useState<{ id: string; name: string; kcal: number; proteinG: number; timesUsed: number }[]>([]);
  const [search, setSearch] = useState("");
  const [hits, setHits] = useState<FoodHit[]>([]);
  const [describe, setDescribe] = useState("");

  useEffect(() => {
    fetch("/api/saved-meals")
      .then((r) => (r.status === 401 ? (router.push("/login"), null) : r.json()))
      .then((d) => d && setSaved(d.saved ?? []));
  }, [router]);

  useEffect(() => {
    if (search.length < 2) return setHits([]);
    const t = setTimeout(async () => {
      const r = await fetch(`/api/foods/search?q=${encodeURIComponent(search)}`);
      if (r.ok) setHits((await r.json()).foods);
    }, 200);
    return () => clearTimeout(t);
  }, [search]);

  async function analyzeText() {
    if (!text.trim()) return;
    setBusy("text");
    setError("");
    const res = await fetch("/api/meals/analyze-text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    setBusy(null);
    const data = await res.json();
    if (!res.ok) return setError(data.error);
    if (data.items.length === 0) {
      setError(
        data.unmatched?.length
          ? `I couldn't match "${data.unmatched.join('", "')}" yet — try simpler words (e.g. "chicken and rice") or add items below.`
          : "I couldn't find any food in that. Try something like: 2 eggs and toast with butter."
      );
      return;
    }
    setSource("text");
    setAnalysis(data);
    setOriginal(JSON.parse(JSON.stringify(data.items)));
  }

  async function analyzePhoto(file: File) {
    setBusy("photo");
    setError("");
    const form = new FormData();
    form.append("image", file);
    const res = await fetch("/api/meals/analyze-image", { method: "POST", body: form });
    setBusy(null);
    const data = await res.json();
    if (!res.ok) return setError(data.error);
    setSource("photo");
    setAnalysis(data);
    setOriginal(JSON.parse(JSON.stringify(data.items)));
  }

  async function logSaved(id: string) {
    setBusy(id);
    const res = await fetch("/api/saved-meals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ savedMealId: id }) });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) return setError(data.error);
    await fetch("/api/meals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: data.items, name: data.name, source: "saved" }),
    });
    router.push("/today");
  }

  // Photo couldn't be identified → user describes it; text analysis fills the same review card,
  // keeping the photo attached to the meal.
  async function describeMeal() {
    if (!describe.trim() || !analysis) return;
    setBusy("describe");
    const res = await fetch("/api/meals/analyze-text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: describe }),
    });
    setBusy(null);
    const data = await res.json();
    if (!res.ok || data.items.length === 0) {
      setError(data.error ?? 'I couldn\'t match that either — try simpler words like "eggs and toast".');
      return;
    }
    setError("");
    setAnalysis({ ...data, imagePath: analysis.imagePath, scansLeft: analysis.scansLeft, fallback: null });
    setOriginal(JSON.parse(JSON.stringify(data.items)));
    setDescribe("");
  }

  function setGrams(idx: number, grams: number) {
    if (!analysis) return;
    const items = [...analysis.items];
    const it = items[idx];
    const factor = grams / (it.grams || 1);
    items[idx] = {
      ...it,
      grams,
      kcal: +(it.kcal * factor).toFixed(1),
      proteinG: +(it.proteinG * factor).toFixed(1),
      carbsG: +(it.carbsG * factor).toFixed(1),
      fatG: +(it.fatG * factor).toFixed(1),
      fibreG: +(it.fibreG * factor).toFixed(1),
      confidence: 0.97, // user-confirmed
    };
    setAnalysis({ ...analysis, items });
  }

  function removeItem(idx: number) {
    if (!analysis) return;
    setAnalysis({ ...analysis, items: analysis.items.filter((_, i) => i !== idx) });
  }

  function addFood(f: FoodHit) {
    if (!analysis) {
      setAnalysis({ items: [], kcalLow: 0, kcalHigh: 0, confidence: 1, clarify: null });
      setOriginal([]);
    }
    const grams = f.servingG;
    const item: Item = {
      foodId: f.id,
      label: f.name,
      grams,
      kcal: +((f.per100Kcal * grams) / 100).toFixed(1),
      proteinG: +((f.per100Protein * grams) / 100).toFixed(1),
      carbsG: +((f.per100Carbs * grams) / 100).toFixed(1),
      fatG: +((f.per100Fat * grams) / 100).toFixed(1),
      fibreG: +((f.per100Fibre * grams) / 100).toFixed(1),
      confidence: 0.97,
      hiddenFatRisk: f.hiddenFatRisk,
    };
    setAnalysis((a) => (a ? { ...a, items: [...a.items, item] } : a));
    setSearch("");
    setHits([]);
  }

  function answerClarify(ans: "yes" | "no" | "unsure") {
    setClarifyAnswered(ans);
    if (ans === "yes" && analysis) {
      // add a tablespoon of cooking oil to the estimate
      const oil: Item = {
        foodId: null,
        label: "Cooking oil (est.)",
        grams: 14,
        kcal: 124,
        proteinG: 0,
        carbsG: 0,
        fatG: 14,
        fibreG: 0,
        confidence: 0.7,
        hiddenFatRisk: false,
      };
      setAnalysis({ ...analysis, items: [...analysis.items, oil] });
    }
  }

  async function confirm() {
    if (!analysis || analysis.items.length === 0) return;
    setBusy("confirm");
    // Corrections: portion edits vs. what the analysis originally said
    const corrections = [];
    for (const o of original) {
      const now = analysis.items.find((i) => i.label === o.label);
      if (now && Math.abs(now.grams - o.grams) >= 10) {
        corrections.push({ original: { label: o.label, grams: o.grams }, corrected: { label: now.label, grams: now.grams, foodId: now.foodId } });
      }
    }
    const res = await fetch("/api/meals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: analysis.items,
        source,
        imagePath: analysis.imagePath,
        mealType: mealType || undefined,
        saveAs: wantSave && saveAs.trim() ? saveAs.trim() : undefined,
        corrections,
      }),
    });
    setBusy(null);
    if (res.ok) router.push("/today");
  }

  const totals = analysis
    ? analysis.items.reduce(
        (t, i) => ({ kcal: t.kcal + i.kcal, proteinG: t.proteinG + i.proteinG, carbsG: t.carbsG + i.carbsG, fatG: t.fatG + i.fatG }),
        { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 }
      )
    : null;
  const confPct = analysis ? Math.round(analysis.confidence * 100) : 0;

  return (
    <main className="max-w-xl mx-auto px-5 pt-8 pb-28">
      <h1 className="text-xl font-bold">Log food</h1>

      {!analysis && (
        <>
          <section className="grid grid-cols-2 gap-3 mt-5">
            <button
              className="card p-6 text-center hover:opacity-90"
              onClick={() => fileRef.current?.click()}
              disabled={busy === "photo"}
            >
              <div className="text-3xl">📸</div>
              <div className="font-semibold text-sm mt-2">{busy === "photo" ? "Analyzing…" : "Snap a photo"}</div>
              <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>
                AI identifies the food
              </div>
            </button>
            <div className="card p-4 flex flex-col">
              <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--muted)" }}>
                Describe it
              </div>
              <textarea
                className="input flex-1 !rounded-xl text-sm resize-none"
                rows={3}
                placeholder="2 eggs, toast with butter and a banana"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), analyzeText())}
              />
              <button className="btn btn-brand text-sm mt-2" onClick={analyzeText} disabled={busy === "text"}>
                {busy === "text" ? "Parsing…" : "Analyze"}
              </button>
            </div>
          </section>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={(e) => e.target.files?.[0] && analyzePhoto(e.target.files[0])}
          />

          {busy === "photo" && (
            <div className="mt-4 grid gap-2">
              <div className="skeleton h-16" />
              <div className="skeleton h-16" />
            </div>
          )}

          {error && (
            <div className="card p-4 mt-4 text-sm" style={{ borderColor: "var(--accent)" }}>
              {error}
            </div>
          )}

          {saved.length > 0 && (
            <section className="mt-6">
              <h3 className="text-sm font-semibold mb-2">One-tap saved meals</h3>
              <div className="grid gap-2">
                {saved.map((s) => (
                  <button key={s.id} className="card p-4 flex items-center justify-between text-left hover:opacity-90" onClick={() => logSaved(s.id)} disabled={busy === s.id}>
                    <div>
                      <div className="font-medium text-sm">{s.name}</div>
                      <div className="text-xs" style={{ color: "var(--muted)" }}>
                        {s.timesUsed > 0 ? `Logged ${s.timesUsed}×` : "Saved meal"}
                      </div>
                    </div>
                    <div className="text-right big-num text-sm font-semibold">
                      {Math.round(s.kcal)} kcal
                      <div className="text-xs font-medium" style={{ color: "var(--protein)" }}>
                        {Math.round(s.proteinG)}g protein
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Review & correct */}
      {analysis && (
        <section className="mt-5 fade-up">
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Here&apos;s what I see</h2>
              <span
                className="text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{
                  background: confPct >= 80 ? "var(--brand-soft)" : "var(--line)",
                  color: confPct >= 80 ? "var(--brand)" : "var(--muted)",
                }}
              >
                {confPct >= 80 ? "High" : confPct >= 60 ? "Medium" : "Low"} confidence · {confPct}%
              </span>
            </div>

            {analysis.fallback && (
              <div className="mt-3">
                <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
                  {analysis.fallback}
                </p>
                <div className="flex gap-2 mt-3">
                  <input
                    className="input flex-1 text-sm"
                    placeholder="e.g. two eggs and a slice of toast"
                    value={describe}
                    onChange={(e) => setDescribe(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), describeMeal())}
                  />
                  <button className="btn btn-brand text-sm shrink-0" onClick={describeMeal} disabled={busy === "describe" || !describe.trim()}>
                    {busy === "describe" ? "…" : "Analyze"}
                  </button>
                </div>
                {error && (
                  <p className="text-xs mt-2" style={{ color: "var(--carbs)" }}>
                    {error}
                  </p>
                )}
              </div>
            )}
            {analysis.note && (
              <p className="text-xs mt-2" style={{ color: "var(--brand)" }}>
                ✓ {analysis.note}
              </p>
            )}
            {analysis.unmatched && analysis.unmatched.length > 0 && (
              <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>
                Couldn&apos;t match: {analysis.unmatched.join(", ")} — add them below if needed.
              </p>
            )}

            <div className="grid gap-3 mt-4">
              {analysis.items.map((it, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="text-sm font-medium">{it.label}</div>
                    <div className="text-xs big-num" style={{ color: "var(--muted)" }}>
                      {Math.round(it.kcal)} kcal · {Math.round(it.proteinG)}g protein
                    </div>
                  </div>
                  <input
                    className="input !w-20 !py-1.5 !px-2 text-sm text-right big-num"
                    type="number"
                    value={Math.round(it.grams)}
                    onChange={(e) => setGrams(idx, Math.max(+e.target.value, 1))}
                  />
                  <span className="text-xs" style={{ color: "var(--muted)" }}>
                    g
                  </span>
                  <button className="text-xs px-1" style={{ color: "var(--muted)" }} onClick={() => removeItem(idx)} aria-label={`Remove ${it.label}`}>
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {/* add more items */}
            <div className="relative mt-4" hidden={!!analysis.fallback}>
              <input className="input text-sm" placeholder="Add another food…" value={search} onChange={(e) => setSearch(e.target.value)} />
              {hits.length > 0 && (
                <div className="absolute z-10 inset-x-0 top-full mt-1 card p-1 max-h-56 overflow-auto">
                  {hits.map((f) => (
                    <button key={f.id} className="w-full text-left px-3 py-2 rounded-lg text-sm hover:opacity-80" style={{ background: "transparent" }} onClick={() => addFood(f)}>
                      {f.name}{" "}
                      <span className="text-xs" style={{ color: "var(--muted)" }}>
                        {f.servingName} · {Math.round((f.per100Kcal * f.servingG) / 100)} kcal
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {analysis.clarify && !clarifyAnswered && (
              <div className="mt-4 p-3 rounded-xl" style={{ background: "var(--brand-soft)" }}>
                <p className="text-sm font-medium">{analysis.clarify}</p>
                <div className="flex gap-2 mt-2">
                  <button className="chip" onClick={() => answerClarify("yes")}>
                    Yes
                  </button>
                  <button className="chip" onClick={() => answerClarify("no")}>
                    Not really
                  </button>
                  <button className="chip" onClick={() => answerClarify("unsure")}>
                    Not sure
                  </button>
                </div>
              </div>
            )}

            {totals && analysis.items.length > 0 && (
              <div className="mt-4 pt-4 border-t" style={{ borderColor: "var(--line)" }}>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-semibold">Estimated total</span>
                  <span className="big-num text-xl font-bold">
                    {confPct < 90 && analysis.kcalLow !== analysis.kcalHigh
                      ? `${Math.round(totals.kcal * 0.94)}–${Math.round(totals.kcal * 1.08)} kcal`
                      : `${Math.round(totals.kcal)} kcal`}
                  </span>
                </div>
                <div className="flex gap-3 text-xs big-num font-semibold mt-1">
                  <span style={{ color: "var(--protein)" }}>{Math.round(totals.proteinG)}g protein</span>
                  <span style={{ color: "var(--carbs)" }}>{Math.round(totals.carbsG)}g carbs</span>
                  <span style={{ color: "var(--fat)" }}>{Math.round(totals.fatG)}g fat</span>
                </div>
              </div>
            )}

            {analysis.items.length > 0 && (
              <>
                <div className="flex gap-2 mt-4 flex-wrap">
                  {["breakfast", "lunch", "dinner", "snack"].map((t) => (
                    <button key={t} className={`chip capitalize ${mealType === t ? "active" : ""}`} onClick={() => setMealType(t)}>
                      {t}
                    </button>
                  ))}
                </div>

                <label className="flex items-center gap-2 mt-4 text-sm">
                  <input type="checkbox" checked={wantSave} onChange={(e) => setWantSave(e.target.checked)} />
                  Save as a one-tap meal
                </label>
                {wantSave && <input className="input mt-2 text-sm" placeholder="Name it (e.g. My usual breakfast)" value={saveAs} onChange={(e) => setSaveAs(e.target.value)} />}
              </>
            )}

            <div className="flex gap-2 mt-5">
              <button className="btn btn-ghost flex-1" onClick={() => { setAnalysis(null); setError(""); setClarifyAnswered(null); setDescribe(""); }}>
                Start over
              </button>
              {analysis.items.length > 0 && (
                <button className="btn btn-brand flex-1" onClick={confirm} disabled={busy === "confirm"}>
                  {busy === "confirm" ? "Logging…" : "Looks right — log it"}
                </button>
              )}
            </div>
            {analysis.scansLeft !== null && analysis.scansLeft !== undefined && (
              <p className="text-xs mt-3 text-center" style={{ color: "var(--muted)" }}>
                {analysis.scansLeft} free photo scans left this month · text logging is always unlimited
              </p>
            )}
          </div>
        </section>
      )}

      <Nav />
    </main>
  );
}
