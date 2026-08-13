"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/today", label: "Today", icon: "M3 12l9-8 9 8M5 10v10h5v-6h4v6h5V10" },
  { href: "/log", label: "Log", icon: "M12 5v14M5 12h14" },
  { href: "/discover", label: "Discover", icon: "M12 2a10 10 0 100 20 10 10 0 000-20zm4-0.5l-3 7-7 3 3-7 7-3z" },
  { href: "/insights", label: "Insights", icon: "M4 20V10m6 10V4m6 16v-7m4 7H2" },
  { href: "/profile", label: "Profile", icon: "M12 12a4 4 0 100-8 4 4 0 000 8zm-7 8a7 7 0 0114 0" },
];

export default function Nav() {
  const path = usePathname();
  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 border-t"
      style={{ background: "var(--card)", borderColor: "var(--line)" }}
    >
      <div className="max-w-xl mx-auto flex justify-around py-2 pb-[max(8px,env(safe-area-inset-bottom))]">
        {items.map((it) => {
          const active = path.startsWith(it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-xs font-medium"
              style={{ color: active ? "var(--brand)" : "var(--muted)" }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d={it.icon} />
              </svg>
              {it.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
