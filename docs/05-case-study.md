# Calazm — Project Case Study

*Portfolio write-up. Each section maps to an interview question. Everything here is true of the repository as it stands; things that are planned or unproven are labeled as such.*

## One-liner

Solo-built **Calazm**, a working prototype of an AI nutrition tracker: log a meal by photo or sentence, get a calorie estimate with an honest confidence range, and get suggestions for what to eat next based on what's left in the day and what the app has learned about your habits. Next.js 15 / TypeScript / Prisma, Claude behind a provider abstraction, unit-tested with CI. Not yet deployed to users; billing not implemented.

## The problem I picked

I researched the current calorie-tracker market (Cal AI, MyFitnessPal, MacroFactor, Lose It!, Cronometer — see [01-product-strategy.md](01-product-strategy.md)) and found three gaps I wanted to build against:

1. Every app answers *"what did I eat?"*; none answers *"what should I eat next?"*, which is the question people actually have several times a day.
2. Photo-recognition apps report a single number ("691 kcal") with no uncertainty, and get criticized when it's wrong — press reviews of Cal AI reported misidentifications and a 90% accuracy claim with no citation.
3. Pricing is either hidden behind an onboarding quiz or heavy ($60–100/yr).

## The bet

Photo recognition is becoming a commodity. The defensible part is **personal nutrition intelligence** — structured memory of a user's meals, real portion sizes, and corrections that makes the app more useful the longer it's used. That's a product thesis, not a measured result: I haven't had users long enough to test retention.

## What I built

- **Logging pipeline:** natural-language text (deterministic parser, no model), photo (vision model returns labels + grams + confidence only), one-tap saved meals. Every estimate carries a confidence score and a kcal range; foods flagged as hidden-fat risks widen the range and trigger a clarifying question.
- **Targets:** Mifflin-St Jeor with a capped deficit/surplus and a calorie floor, rationale shown to the user.
- **Personalization:** portion corrections are stored as structured rows; after two corrections on a food the parser uses the user's gram value. Usual meals and frequent foods are tracked the same way. Recommendations score against remaining calories/protein and boost the user's own history. No model in this loop.
- **Dashboard, insights, weight trends:** daily ring/macros/next-action, a template-or-model weekly review, 7/30-day weight averages, a maintenance-calorie estimate once enough data exists (displayed, not applied to targets).
- **Cost controls:** vision results cached by image hash; free-tier scan metering; failed scans don't consume quota; in-memory rate limiting on auth and scan endpoints.
- **Compliance scaffolding:** privacy page, JSON data export, in-app account deletion.
- **Engineering:** 46 Vitest unit tests (resolver math, provider fallback with mocked fetch, target formula), 43 HTTP-level integration checks against a running dev server, GitHub Actions running typecheck + lint + tests on every push.

## What I have *not* done (yet)

- No public deployment and no users other than my own test accounts.
- No payment processing. The subscription endpoint flips a plan column in the database; it exists so the plan-gating logic could be built and tested.
- No ad account; the ad component renders a house ad until one exists.
- No native app. Capacitor config and a release playbook exist; nothing has been generated or submitted to either store. PWA manifest/service worker are in place but unverified on a device.
- No accuracy benchmark for the AI path. The model split (Sonnet vision / Haiku text normalization / Fable weekly narrative) is a cost-and-latency design decision, not a measured one.
- Photo storage is local disk and rate limiting is in-memory — fine for one instance, not for production scale.

## Numbers

None yet. The `/admin` dashboard computes users, weekly actives, plan counts, projected MRR (plan rows × price), and estimated AI spend (scans × an assumed per-call cost), so the table below can be filled in from real data if the app is launched. Until then these are blank on purpose.

| Metric | Value |
|---|---|
| Registered users | — |
| Weekly active | — |
| Paying subscribers | — |
| MRR | — |

## Decisions I can defend in an interview

1. **The model describes; the database quantifies.** The vision prompt asks for labels, grams, and confidence, and says "do not estimate calories." Nutrition values are always `per100g × grams / 100` from a database row. This makes numbers reproducible, makes the text-logging path cost zero model calls, and gives "confidence" a concrete meaning (uncertainty in *what and how much*) that I can turn into a range instead of false precision. The trade-off: the food table is ~85 curated entries, so anything not in it is reported as unmatched rather than guessed.
2. **Deterministic parser first, model for leftovers.** Text goes through the alias parser before any model sees it; only unmatched phrases go to a small model for normalization, and its output is fed back through the same database matching. In the unit tests, a fully-matched sentence makes zero fetch calls.
3. **Fallback is a first-class path, and it's tested.** `AnthropicProvider` falls back to `LocalProvider` on network failure, non-2xx, or unparseable output. The tests mock each case and assert the result equals the local provider's output. Without a key the app still runs end-to-end (photo recognition is the one thing that doesn't, and the UI says so).
4. **Transparent freemium as a design stance.** Price on the landing page, text logging unlimited on free, a stubbed Plus tier gating scans and ads. I chose $2.99/mo to contrast with the category; I don't yet have cost or conversion data to say whether it's viable.
5. **Retention through usefulness, not notifications.** No streak-shaming, no push spam, a Balance score framed as balance rather than a grade. This is a stance I'd argue for; it's untested against real users.

## Resume bullets

*Honest for the project as it is today:*

- Built **Calazm**, an AI nutrition-tracking prototype (Next.js 15, TypeScript, Prisma, Claude via a provider abstraction): photo/text meal logging with confidence ranges, portion learning from user corrections, and budget-aware meal suggestions.
- Designed the AI pipeline so the model only labels foods and estimates portions while a nutrition database does all arithmetic — text logging makes zero model calls, vision results are cached by image hash, and every provider failure mode falls back to an offline path covered by unit tests.
- Set up the engineering baseline solo: 46 Vitest unit tests, HTTP-level integration scripts, GitHub Actions CI (typecheck, lint, tests), free-tier metering and rate limiting, GDPR-style export and account deletion.

*Only after a real launch (do not use before then):* user counts, paying subscribers, MRR, retention.

## Architecture at a glance

Next.js 15 (App Router, one deployable) · Prisma (SQLite in dev; schema is Postgres-compatible but untested on it) · `lib/ai/provider.ts` (Anthropic or offline deterministic fallback) · `lib/resolver.ts` (alias matching + per-100g math + uncertainty range) · cookie-session auth (bcrypt + HMAC) · plan gating without billing · Dockerfile for a single host with a volume · Vitest + integration scripts · CI on every push.
