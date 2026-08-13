# Calazm — Technical Architecture

## Stack (and why)
- **Next.js 15 (App Router) + TypeScript** — one deployable unit for MVP: UI + API route handlers. Mobile-first responsive web ships fastest; React Native can reuse the API later.
- **Prisma + SQLite locally, PostgreSQL in production** — the schema is written Postgres-compatible; SQLite keeps the prototype zero-config. *Deviation from the brief's "PostgreSQL" is dev-environment only; `DATABASE_URL` swap + `provider = "postgresql"` is the migration.*
- **Tailwind CSS 3** — design tokens as CSS variables, dark mode via class.
- **Auth:** email + bcrypt password, httpOnly signed session cookie. (Swap for OAuth provider in production.)
- **Payments:** Subscription modeled in DB with a stub checkout; Stripe drops into `POST /api/subscriptions` later.
- **Images:** stored under `/uploads` locally; S3-compatible object storage in production behind `lib/storage.ts`.

## Database entities (Prisma)
`User, Profile (goal, biometrics, activity, preferences), NutritionTarget (versioned), Food (+aliases, source, verified), ServingSize, Meal, MealItem (food ref + grams + resolved nutrition), MealImage, SavedMeal, WeightEntry, WaterEntry, DailySummary (cached), WeeklyInsight, UserMemory (typed key/value: usual meals, portions, patterns), FoodCorrection (structured before/after), Recommendation (+feedback), Subscription, AIUsage`.
All tables: `createdAt/updatedAt`; meals soft-delete via `deletedAt`; indexes on `(userId, eatenAt)`, `(userId, date)`, food name/alias.

## API surface (route handlers under /api)
```
POST /api/auth/signup | login | logout        GET /api/me
PATCH /api/profile                             (recomputes targets)
POST /api/meals            create (from text, items, or saved meal)
GET  /api/meals?date=      PATCH/DELETE /api/meals/:id
POST /api/meals/analyze-image   multipart → vision pipeline → draft analysis
POST /api/meals/analyze-text    natural language → parsed items + nutrition
GET  /api/today            dashboard payload: totals, targets, remaining, plan, moment, balance
GET  /api/recommendations?filters=   "What Can I Eat?"
POST /api/recommendations/feedback
GET  /api/insights/weekly
POST /api/weight           GET /api/weight/trends
GET  /api/foods/search?q=  POST /api/foods/custom
GET/POST /api/saved-meals  POST /api/water
GET/POST /api/subscriptions (stub)
```

## AI architecture
**Principle: the model describes; the database quantifies.** Vision output = food labels + portion guesses + confidence. Nutrition numbers always come from the food DB (deterministic math), never model-invented.

```
Image → VisionProvider.analyzeMealImage() → [{label, grams, confidence}]
      → NutritionResolver (DB match: alias → fuzzy → user custom)
      → deterministic macro math + uncertainty range (widened by low confidence / hidden-fat foods)
      → clarifying question if range is wide ("cooked with much oil?")
      → user confirm/correct → FoodCorrection stored → PersonalizationEngine updates portions
```

- **`AIProvider` interface** (`lib/ai/provider.ts`): `analyzeMealImage`, `parseFoodText`, `generateWeeklyNarrative`. Implementations: `AnthropicProvider` (used when `ANTHROPIC_API_KEY` set — Haiku for parsing, Sonnet vision for images, Fable/Opus-tier only for weekly narrative) and `LocalProvider` (deterministic: lexicon parser + heuristic image classifier) so the prototype runs fully offline.
- **Cost tiering:** text parse & recommendations are deterministic/cheap-model; vision only on photo scans (metered on free tier via `AIUsage`); frontier model only weekly.
- **Caching:** resolved food matches cached; repeated meals resolve without any model call.

## Engines (pure TypeScript, no model in the loop)
- **Targets:** Mifflin-St Jeor × activity factor ± pace (capped at safe deficit/surplus, floor 1,200/1,500 kcal); protein 1.6–2.2 g/kg by goal; explained to the user as an estimate.
- **Adaptive target v1:** after ≥14 days of weight + intake data, regress weight trend vs. intake → estimated maintenance, surfaced as "your trend suggests ~X kcal — estimates, not certainty."
- **RecommendationEngine:** scores candidates (user's saved/frequent meals first, then food-DB templates) against remaining kcal ±15%, protein gap, time of day, prefs/filters, recency variety. Every suggestion carries a human-readable "why".
- **PersonalizationEngine:** aggregates meal history → usual breakfast/lunch/dinner, typical portions (median of corrections), frequent foods, overshoot patterns. Written to `UserMemory` as structured rows.
- **Balance score:** 0–100 from calorie alignment (40), protein (30), fibre (15), consistency/hydration (15). Framed as balance, never health judgment.

## Safety & privacy
No diagnosis; safety floor on targets; ED-pattern language triggers supportive copy + professional-help pointer; export + delete account endpoints; no data sale; minimal collection.
