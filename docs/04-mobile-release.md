# Calazm — Mobile Release Playbook (App Store + Play Store)

The strategy: **one codebase, three surfaces.** The deployed web app is the product; phones get it three ways, in increasing effort order. Do them in order — each step is useful on its own.

## Stage 0 — Use it on your own phone today (PWA, zero cost)

Calazm is already an installable PWA (manifest + service worker are in the repo).

1. Deploy the web app (see README) so it has an HTTPS URL.
2. On your phone, open the URL → browser menu → **Add to Home Screen** (Android Chrome shows an install prompt automatically).
3. It launches full-screen with the Calazm icon, keeps you signed in, and works like an app. This is your personal daily-driver while the store builds are in review.

## Stage 1 — Play Store (easiest store, ~1–2 days)

Two routes; **TWA is recommended** for a web-served app:

**Route A — Trusted Web Activity (recommended):**
1. Create a [Play Console](https://play.google.com/console) developer account ($25 one-time).
2. `npm i -g @bubblewrap/cli` → `bubblewrap init --manifest https://YOUR-DOMAIN/manifest.webmanifest` → `bubblewrap build` produces a signed `.aab`.
3. Host the generated `assetlinks.json` at `https://YOUR-DOMAIN/.well-known/assetlinks.json` (proves you own the domain — removes the browser bar).
4. Play Console → create app → upload `.aab` → fill the **Data safety** form (declare: email, health & fitness data, photos; encrypted in transit; deletable in-app) → privacy policy URL: `https://YOUR-DOMAIN/privacy`.

**Route B — Capacitor** (already configured in `capacitor.config.ts`): set your production URL in the config, then `npx cap add android && npx cap sync && npx cap open android` (needs Android Studio) → build a signed `.aab`. Use this route if/when you add native plugins (camera, haptics, AdMob).

## Stage 2 — App Store (strictest review, ~1 week)

1. Apple Developer Program ($99/yr) + a Mac (or a cloud Mac like MacStadium) with Xcode.
2. `npx cap add ios && npx cap sync && npx cap open ios` → set signing team → archive → upload via Xcode.
3. **Review-proofing (Apple rejects thin webview wrappers under guideline 4.2):** before submitting, add 2–3 native touches via Capacitor plugins — `@capacitor/camera` for the meal-photo flow, `@capacitor/haptics` on logging actions, `@capacitor/push-notifications` (opt-in only, per our notification principles). These are small and make the shell a real app.
4. Requirements already satisfied by the codebase: **in-app account deletion** (Profile → Delete), privacy policy URL, no forced login before showing value (landing page), transparent subscription pricing.
5. App Privacy questionnaire: Health & Fitness data — collected, linked to identity, not used for tracking; photos — collected for app functionality.

## Payments in native apps (important)

Store rules require **in-app purchases (IAP)** for digital subscriptions bought *inside* iOS/Android apps — you can't link out to Stripe checkout from the native app (web stays on Stripe).
- Easiest path: **RevenueCat** (free tier) — one SDK for StoreKit + Google Play Billing; its webhook sets `plan: "plus"` in the `Subscription` table exactly like the Stripe webhook would. The server-side plan gating already works regardless of which store billed the user.
- Price note: stores take 15% (small-business tier), so $2.99 nets ~$2.54. Still fine at our AI cost/user.

## Ads (free tier only — Plus removes them)

- **Web/PWA/TWA:** Google **AdSense** — create an account, set `NEXT_PUBLIC_ADSENSE_ID=ca-pub-…` in env. `components/AdSlot.tsx` then serves real responsive units to free users; paid users see nothing. Until then, the slot shows a labeled house ad promoting Plus (which also A/B-primes the upgrade funnel).
- **Capacitor native builds:** AdMob, via `@capacitor-community/admob` — banner units in the same two placements (`today-mid`, `insights-bottom`). Keep the rules encoded in AdSlot: always labeled, never interstitials, never inside the logging flow, gone for Plus.
- Never target ads using health data (also promised in the privacy policy).

## Store listing copy (ready to paste)

**Title:** Calazm — AI Calorie & Nutrition Tracker
**Subtitle (Apple, 30 chars):** Snap it. Ask it. Eat better.
**Short description (Play, 80 chars):** AI food scanner that learns your habits and tells you what to eat next.
**Description:**
> Meet Calazm — your AI nutrition companion.
> Snap your food. Calazm estimates the nutrition. But that's only the beginning.
> Calazm learns your habits, understands your goals, and helps you decide what to eat next.
> • Photo, text or one-tap logging — with honest confidence ranges, never fake precision
> • "What can I eat?" — suggestions that fit your remaining calories and protein
> • Calazm Memory — learns your usual meals and real portion sizes
> • Weekly reviews with one concrete improvement, not just charts
> • Weight trends that calm you down instead of stressing you out
> Free to use. Calazm Plus ($2.99/mo) adds unlimited AI scans, full insights and no ads — the price is public, no hidden paywall quiz.
**Keywords:** calorie counter, macro tracker, AI food scanner, protein, meal planner
**Screenshots to capture (phone frame, both themes):** Today dashboard, photo-scan review with confidence chip, What Can I Eat?, weekly insights, memory panel.

## Release checklist

- [ ] Production deploy on HTTPS custom domain
- [ ] Stripe (web) live; RevenueCat wired for native IAP
- [ ] AdSense / AdMob accounts, env IDs set
- [ ] PNG icon set (512/192/180/120 px) generated from `public/icons/icon.svg` (stores require PNG; any icon generator works)
- [ ] `assetlinks.json` served (TWA)
- [ ] Data safety / App Privacy forms filled to match `/privacy`
- [ ] Test account for reviewers (Apple asks): create demo@… with seeded data
