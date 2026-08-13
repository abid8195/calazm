"use client";
// Calorie ring: consumed vs target. Numbers carry visible labels (palette contrast relief).
export default function Ring({ value, max, label, sub }: { value: number; max: number; label: string; sub: string }) {
  const r = 62;
  const c = 2 * Math.PI * r;
  const frac = Math.max(0, Math.min(value / Math.max(max, 1), 1));
  const over = value > max;
  return (
    <div className="relative w-44 h-44">
      <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
        <circle cx="80" cy="80" r={r} fill="none" stroke="var(--line)" strokeWidth="11" />
        <circle
          cx="80"
          cy="80"
          r={r}
          fill="none"
          stroke={over ? "var(--carbs)" : "var(--brand)"}
          strokeWidth="11"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - frac)}
          style={{ transition: "stroke-dashoffset 0.6s ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="big-num text-4xl font-bold">{Math.round(value).toLocaleString()}</div>
        <div className="text-xs font-medium" style={{ color: "var(--muted)" }}>
          {label}
        </div>
        <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
          {sub}
        </div>
      </div>
    </div>
  );
}
