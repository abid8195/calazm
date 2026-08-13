# Calazm — Product Case Study

*Portfolio document. Structured so each section maps to an interview question ("walk me through something you shipped").*

## One-liner

Solo-built and operated **Calazm**, an AI nutrition companion (web + iOS/Android) that competes with Cal AI/MyFitnessPal — from competitive research through architecture, build, launch, and paid-user operations.

## The problem I picked

Every 2026 calorie tracker answers *"what did I eat?"* Photo-recognition is commoditized; users churn once the novelty fades. Research across Cal AI, MyFitnessPal, MacroFactor, Lose It! and Cronometer surfaced three unserved gaps: nobody answers **"what should I eat next?"**, nobody communicates estimate **uncertainty** honestly, and category pricing is either predatory (hidden post-quiz paywalls) or heavy ($60–100/yr).

## The bet

The moat isn't AI food recognition — it's **personal nutrition intelligence**: structured memory of a user's meals, real portion sizes, corrections and routines that compounds daily. Day-90 Calazm knows you; day-1 competitors don't. That's the retention flywheel and the switching cost.

## What I shipped

- **Product:** onboarding → computed targets (Mifflin-St Jeor, safety-capped, rationale shown), photo/text/one-tap logging, confidence ranges + clarifying questions, "What Can I Eat?" recommendations, weekly narrative reviews, weight trends, gamification-free Balance score.
- **Personalization engine:** every correction becomes structured data (typical portions, usual meals, frequent foods) — after two corrections the system quotes *your* portions back to you.
- **Cost-tiered AI architecture:** deterministic parser first (free), cheap model for leftovers, vision model only on photo scans, frontier model once weekly. Vision results cached by image hash. Models *describe* food; the nutrition database *quantifies* it — zero hallucinated calories by construction.
- **Monetization:** transparent freemium — free tier genuinely useful (unlimited text logging, 10 AI scans/mo, labeled ads), Plus $2.99/mo (unlimited scans, no ads). Price public on the landing page as a deliberate contrast to competitors' hidden paywalls.
- **Operations:** founder dashboard tracking DAU/WAU, free→paid conversion, MRR, per-month AI spend vs. revenue; rate limiting, scan metering, abuse caps; GDPR-style export and one-tap account deletion.

## Numbers that matter (fill in as they grow)

| Metric | Value | Where it comes from |
|---|---|---|
| Registered users | ___ | /admin dashboard |
| Weekly active | ___ | /admin |
| Paid (Plus) subscribers | ___ | /admin |
| Free → paid conversion | ___% | /admin |
| MRR | $___ | /admin |
| AI cost as % of MRR | ___% | /admin |
| Meals logged | ___ | /admin |

## Hard decisions I can defend in an interview

1. **Deterministic-first AI.** The obvious build (send everything to a frontier model) costs ~10× more and hallucinates nutrition. I inverted it: the model only labels foods; a verified database does the math. Result: text logging costs $0, and accuracy criticism that sank Cal AI ("apple identified as tikka masala, no uncertainty shown") is answered with explicit confidence ranges.
2. **Undercut on price, publicly.** $2.99/mo vs. $6–8/mo category norm — viable *because* of the cost-tiered architecture (est. AI cost < $0.40/user/mo, visible live on the founder dashboard).
3. **Retention without dark patterns.** No streak-shaming, no notification spam. Retention comes from the memory flywheel: more data → better suggestions → less typing → more use. This is a product-strategy stance I can articulate against the "engagement at all costs" default.
4. **One codebase, three surfaces.** Next.js app is the product; phones get it as PWA → Play Store TWA → Capacitor iOS build. Shipped store compliance (in-app deletion, privacy policy, data export) as features, not afterthoughts.

## Resume bullets (pick 2–3)

- Built and launched **Calazm**, an AI nutrition app (Next.js/TypeScript/Prisma + Claude vision), to the App Store and Play Store from a single codebase; grew to ___ users including ___ paying subscribers at $___ MRR.
- Designed a cost-tiered AI pipeline (deterministic parsing → cached vision → weekly frontier-model insights) holding AI spend under _% of subscription revenue while eliminating hallucinated nutrition data.
- Operated the full product lifecycle solo: competitive research, freemium pricing, ad + subscription monetization, rate-limited/metered APIs, GDPR-style data controls, and a live founder metrics dashboard (DAU, conversion, MRR, unit economics).

## Architecture at a glance

Next.js 15 (App Router, one deployable) · Prisma (SQLite→Postgres) · provider-abstracted AI (`lib/ai/provider.ts`: Anthropic or offline deterministic fallback) · cookie-session auth · Stripe/RevenueCat-ready subscription gating · Dockerized deploy (Railway/Fly) · e2e suite (40 checks) run against every change.
