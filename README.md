# Calazm — Your AI nutrition companion

> Snap it. Ask it. Eat better.

Calazm is an AI calorie & nutrition tracker that doesn't stop at logging — it learns your habits (meals, portions, routines) and helps you decide **what to eat next**. Built with Next.js 15, TypeScript, Prisma and Tailwind.

**Product docs:** [docs/01-product-strategy.md](docs/01-product-strategy.md) · [docs/02-experience.md](docs/02-experience.md) · [docs/03-architecture.md](docs/03-architecture.md)

## Features (MVP)

- **Onboarding → daily targets** — Mifflin-St Jeor + goal pace, safety-capped, with the rationale shown to the user
- **AI food logging** — photo scan (vision-provider abstraction), natural-language text ("2 eggs and toast with butter"), one-tap saved meals
- **Honest uncertainty** — every estimate has a confidence % and a kcal range; hidden-fat foods trigger a clarifying question ("cooked with much oil?")
- **Calazm Memory** — learns your usual meals, real portion sizes (from your corrections) and frequent foods; visibly surfaced in Insights
- **"What can I eat?"** — suggestions that fit your *remaining* calories & protein, drawn from your own history first, with a human-readable "why"
- **Today dashboard** — calorie ring, macro bars, next-best-action, day-plan split, daily Calazm Moment, Calazm Balance score
- **Weight trends** — 7/30-day averages, anti-anxiety framing, adaptive maintenance estimate after ~2 weeks of data
- **Weekly review** — narrative with biggest win / biggest opportunity / one concrete change
- **Free tier + Calazm Plus** — 10 free photo scans/month (text logging always unlimited), $2.99/mo Plus (checkout stubbed, Stripe-ready)

The AI layer is provider-abstracted (`lib/ai/provider.ts`): with `ANTHROPIC_API_KEY` set it uses Claude (Haiku for text, Sonnet vision for photos, a frontier model for weekly narratives); without a key it falls back to a fully offline deterministic parser so the app works out of the box. **Nutrition numbers always come from the food database — models describe, the database quantifies.**

## Run it locally

```bash
npm install
npx prisma db push        # creates SQLite dev.db
npm run db:seed           # loads ~85 curated foods
npm run dev               # http://localhost:3000
```

Then: **Sign up → 5-step onboarding → Log** ("two eggs and toast with butter and a banana") → watch the dashboard, Discover and Insights fill in. Optional: add `ANTHROPIC_API_KEY` to `.env` to enable real photo scanning.

Run the end-to-end API test suite (server must be running): the suite in `scripts/e2e.mjs` covers auth, targets, parsing, portion learning, recommendations, insights, metering — 30 checks.

```bash
node scripts/e2e.mjs
```

## Deploy to production

SQLite needs a persistent disk, so use a host with volumes (Railway, Fly.io, Render) — **or** switch to Postgres for serverless (Vercel).

### Option A — Railway / Fly.io / Render (fastest, keeps SQLite)

1. Push this repo to GitHub (done if you're reading this there).
2. Create a new service from the repo — the included `Dockerfile` is auto-detected.
3. Add a volume mounted at `/data` and set env vars:
   - `DATABASE_URL=file:/data/calazm.db`
   - `SESSION_SECRET=<long random string>`
   - `ANTHROPIC_API_KEY=<key>` (for real photo AI)
4. Deploy. The container runs `prisma db push` + seed on boot, so first deploy is fully set up.

### Option B — Vercel + Postgres (scales further)

1. Create a Postgres DB (Vercel Postgres / Neon / Supabase).
2. In `prisma/schema.prisma` change `provider = "sqlite"` → `"postgresql"`.
3. Set `DATABASE_URL`, `SESSION_SECRET`, `ANTHROPIC_API_KEY` in Vercel project settings.
4. `npx prisma db push && npm run db:seed` once against the prod DB, then import the repo in Vercel.
5. Note: meal photos currently save to local disk (`public/uploads`) — on serverless, swap `app/api/meals/analyze-image/route.ts` to S3/R2/Vercel Blob (the write is isolated to one function).

### Go-live checklist

- [ ] `SESSION_SECRET` set to a strong random value (sessions are HMAC-signed with it)
- [ ] **Monetization:** replace the checkout stub in `app/api/subscriptions/route.ts` with Stripe — create a $2.99/mo + $24.99/yr Price, redirect to Stripe Checkout, set `plan: "plus"` in the `checkout.session.completed` webhook. The plan gating (scan metering) already works off the `Subscription` table.
- [ ] Object storage for meal images (Option B only)
- [ ] Rate limiting on `/api/auth/*` and `/api/meals/analyze-image` (e.g. Upstash)
- [ ] Privacy policy + account data export/delete endpoints before public launch

## Stack

Next.js 15 (App Router) · TypeScript · Prisma (SQLite dev / Postgres prod) · Tailwind CSS 3 · cookie-session auth (bcrypt + HMAC) · provider-abstracted AI (Anthropic or offline deterministic fallback)
