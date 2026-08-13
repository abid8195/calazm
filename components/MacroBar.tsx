"use client";
export default function MacroBar({ label, value, max, colorVar, unit = "g" }: { label: string; value: number; max: number; colorVar: string; unit?: string }) {
  const frac = Math.max(0, Math.min(value / Math.max(max, 1), 1));
  return (
    <div>
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-xs font-medium flex items-center gap-1.5" style={{ color: "var(--muted)" }}>
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: `var(${colorVar})` }} />
          {label}
        </span>
        <span className="text-xs big-num font-semibold">
          {Math.round(value)} / {Math.round(max)}
          {unit}
        </span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--line)" }}>
        <div className="h-full rounded-full" style={{ width: `${frac * 100}%`, background: `var(${colorVar})`, transition: "width 0.5s ease-out" }} />
      </div>
    </div>
  );
}
