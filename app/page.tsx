import Link from "next/link";
import { currentUserId } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function Landing() {
  if (await currentUserId()) redirect("/today");
  return (
    <main className="max-w-xl mx-auto px-6 pb-24">
      <header className="flex items-center justify-between py-6">
        <div className="text-xl font-bold tracking-tight" style={{ color: "var(--brand)" }}>
          calazm
        </div>
        <Link href="/login" className="text-sm font-medium" style={{ color: "var(--muted)" }}>
          Sign in
        </Link>
      </header>

      <section className="pt-10 pb-12 fade-up hero-glow -mx-6 px-6 rounded-b-3xl">
        <h1 className="text-4xl font-bold leading-tight tracking-tight">
          Snap it. Ask it.
          <br />
          <span style={{ color: "var(--brand)" }}>Eat better.</span>
        </h1>
        <p className="mt-4 text-lg leading-relaxed" style={{ color: "var(--muted)" }}>
          Calazm doesn&apos;t just count what you ate. It learns your habits, knows what you have left today, and helps you decide
          what to eat next.
        </p>
        <Link href="/signup" className="btn btn-brand inline-block mt-6">
          Start free — no card required
        </Link>
        <p className="mt-3 text-xs" style={{ color: "var(--muted)" }}>
          Free forever for the basics. Plus is $2.99/mo — the price is right here, not hidden behind a quiz.
        </p>

        {/* Product preview */}
        <div className="card p-5 mt-10 float max-w-sm mx-auto shadow-xl" aria-hidden="true">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-medium" style={{ color: "var(--muted)" }}>Good evening</div>
              <div className="big-num text-3xl font-bold mt-0.5">1,264 <span className="text-sm font-semibold" style={{ color: "var(--muted)" }}>kcal left</span></div>
            </div>
            <div className="brand-grad rounded-2xl px-3 py-2 text-center">
              <div className="big-num text-lg font-bold">84</div>
              <div className="text-[9px] font-semibold uppercase tracking-wide opacity-80">Balance</div>
            </div>
          </div>
          <div className="grid gap-2 mt-4">
            {[
              ["Protein", 72, 148, "--protein"],
              ["Carbs", 118, 254, "--carbs"],
              ["Fat", 38, 70, "--fat"],
            ].map(([label, v, max, cv]) => (
              <div key={label as string}>
                <div className="flex justify-between text-[11px] font-medium" style={{ color: "var(--muted)" }}>
                  <span>{label}</span>
                  <span className="big-num">{v as number} / {max as number}g</span>
                </div>
                <div className="h-1.5 rounded-full mt-0.5" style={{ background: "var(--line)" }}>
                  <div className="h-full rounded-full" style={{ width: `${((v as number) / (max as number)) * 100}%`, background: `var(${cv})` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 rounded-xl text-xs leading-relaxed" style={{ background: "var(--brand-soft)" }}>
            <span className="font-semibold" style={{ color: "var(--brand)" }}>Next best action · </span>
            You need ~42g more protein. Best match from your usual meals: <span className="font-semibold">chicken burrito bowl</span> — 588 kcal, 46g protein.
          </div>
        </div>
      </section>

      <section className="grid gap-4">
        {[
          ["📸", "Log a meal in seconds", "Photo, plain English, or one tap on a saved meal. Honest estimates with confidence ranges — never fake precision."],
          ["🧠", "Calazm Memory", "It learns your usual meals, your real portion sizes, and your routine. The longer you use it, the less you have to type."],
          ["🍽️", "“What can I eat?”", "The question every other tracker ignores. Suggestions that fit your remaining calories and protein — drawn from meals you actually like."],
          ["📈", "A week you can act on", "Not just charts: your biggest win, your biggest opportunity, and one concrete change for next week."],
        ].map(([emoji, title, body]) => (
          <div key={title as string} className="card p-5">
            <div className="text-2xl">{emoji}</div>
            <h3 className="font-semibold mt-2">{title}</h3>
            <p className="text-sm mt-1 leading-relaxed" style={{ color: "var(--muted)" }}>
              {body}
            </p>
          </div>
        ))}
      </section>

      <section className="card p-6 mt-8 text-center">
        <h2 className="font-semibold text-lg">Simple, honest pricing</h2>
        <div className="flex justify-center gap-8 mt-4">
          <div>
            <div className="big-num text-3xl font-bold">$0</div>
            <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>
              Free — genuinely useful
            </div>
          </div>
          <div>
            <div className="big-num text-3xl font-bold" style={{ color: "var(--brand)" }}>
              $2.99
            </div>
            <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>
              Plus, per month ($24.99/yr)
            </div>
          </div>
        </div>
        <p className="text-xs mt-4" style={{ color: "var(--muted)" }}>
          Calazm is a nutrition companion, not medical advice. Estimates are estimates — we&apos;ll always tell you how confident we are.
        </p>
      </section>
    </main>
  );
}
