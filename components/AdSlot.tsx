"use client";
// Ad slot for free-tier users only. Plus subscribers never see ads — that's part of what they pay for.
// - With NEXT_PUBLIC_ADSENSE_ID set (web) it renders a Google AdSense responsive unit.
// - Without it, it renders a labeled "house ad" promoting Calazm Plus, so the layout
//   and the upgrade funnel are testable before an ad account exists.
// - In the Capacitor native build, replace this with AdMob banners (see docs/04-mobile-release.md).
// Ads are always labeled, never interstitial, and never interrupt logging flows.
import { useEffect, useState } from "react";
import Link from "next/link";

const ADSENSE_ID = process.env.NEXT_PUBLIC_ADSENSE_ID;

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

export default function AdSlot({ placement }: { placement: string }) {
  const [plan, setPlan] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/subscriptions")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setPlan(d?.plan ?? "free"))
      .catch(() => setPlan("free"));
  }, []);

  useEffect(() => {
    if (plan !== "free" || !ADSENSE_ID) return;
    if (!document.querySelector("script[data-calazm-adsense]")) {
      const s = document.createElement("script");
      s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_ID}`;
      s.async = true;
      s.crossOrigin = "anonymous";
      s.setAttribute("data-calazm-adsense", "1");
      document.head.appendChild(s);
    }
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      /* blocked or not ready — the empty slot collapses */
    }
  }, [plan]);

  if (plan !== "free") return null; // paid users and loading state: no ad, no layout jump worth risking

  return (
    <div className="mt-4" data-placement={placement}>
      <div className="text-[9px] font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--muted)" }}>
        Ad
      </div>
      {ADSENSE_ID ? (
        <ins
          className="adsbygoogle"
          style={{ display: "block", minHeight: 90, borderRadius: 16, overflow: "hidden" }}
          data-ad-client={ADSENSE_ID}
          data-ad-slot="auto"
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      ) : (
        <Link href="/profile" className="card p-4 flex items-center justify-between gap-3 hover:opacity-90" style={{ borderStyle: "dashed" }}>
          <div>
            <div className="text-sm font-semibold">Tired of ads? Calazm Plus is $2.99/mo.</div>
            <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
              No ads, unlimited AI scans, full insights. Cancel any time.
            </div>
          </div>
          <span className="chip shrink-0">Go Plus</span>
        </Link>
      )}
    </div>
  );
}
