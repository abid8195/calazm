# Calazm — Product Strategy

## 1. Competitive analysis (researched Aug 2026)

| App | Price | What users love | What users hate |
|---|---|---|---|
| **Cal AI** | ~$30–50/yr (A/B-tested, hidden until post-quiz paywall), 3-day trial | Photo → calories in seconds; clean UI; "just a picture" simplicity | Accuracy misses (apple → "tikka masala"; oil/hidden ingredients); unverifiable "90% accurate" claim; price hidden behind onboarding quiz; shortest trial in category; hard-to-cancel subscription; refund runaround |
| **MyFitnessPal** | Free (ads) / $79.99/yr Premium / $99.99/yr Premium+ | Huge database, brand trust, integrations | Crowdsourced DB full of duplicates & wrong entries; cluttered UI; aggressive ads + paywall prompts; laggy search; expensive |
| **MacroFactor** | $71.99/yr, no free tier | Adaptive TDEE from weight trend — best-in-class science; non-judgmental tone | No free tier, no photo AI, no web app; smaller DB; "gets way off track if you miss days" |
| **Lose It!** | Free / premium | Simple, approachable | Database sacrificed verification for scale; same noise problem as MFP |
| **Cronometer** | Free / $59.99/yr Gold | Micronutrient depth, verified data | Less friendly UX; small branded-food DB; no meal planning |
| **Foodvisor / SnapCalorie** | subscription | Photo recognition | Commodity feature now; nothing after the scan |

### The pattern
1. **Photo recognition is commoditizing.** Every 2026 app has it. It's table stakes, not a moat.
2. **Every app stops at logging.** They all answer "what did I eat?" Nobody answers **"what should I eat next?"** — the question users actually have 3–5×/day.
3. **Accuracy trust is broken.** Apps output false precision ("691 kcal") and get roasted when wrong. Nobody communicates uncertainty honestly.
4. **Pricing is either predatory (Cal AI's hidden paywall) or heavy ($60–100/yr).** A transparent low-price product has room.
5. **Adaptive targets (MacroFactor) are loved but locked behind $72/yr with no photo AI.** Combining adaptive targets + AI logging + recommendations is unoccupied territory.
6. **Retention is notification-driven, not value-driven** — users churn when the novelty of scanning wears off.

## 2. Unique value proposition

> **Calazm: Your AI nutrition companion. Snap it. Ask it. Eat better.**

Calazm doesn't just count what you ate — it uses your remaining budget, your habits, and your goals to tell you **what to eat next**. The moat is **personal nutrition intelligence**: memory of your meals, portions, corrections, schedule, and preferences that compounds daily. Day 90 Calazm is meaningfully smarter about *you* than Day 1 Calazm — that's the flywheel and the switching cost.

Differentiators, ranked by defensibility:
1. **Calazm Memory** — learned meals, portions, correction history, routines (compounds; hard to copy the *data*)
2. **"What Can I Eat?"** — recommendation engine over remaining budget + preferences (the daily-use hook)
3. **Honest uncertainty** — ranges + confidence + one-tap clarifying questions (trust)
4. **Adaptive targets** — MacroFactor-style TDEE learning, free-tier included
5. **Transparent pricing** — $2.99/mo / $24.99/yr, price on the website, generous free tier

## 3. Personas
- **Sam, 27, gym-goer** — wants 160g protein/day, hates logging. Uses: photo scan, "what can I eat", saved meals.
- **Priya, 34, busy parent** — wants to lose 6kg sustainably. Uses: morning plan, Before You Eat, weekly review.
- **Marcus, 21, student** — $70/wk food budget, microwave only. Uses: budget mode, quick suggestions, text logging.
- **Dana, 45, habit-changer** — no macros background, wants awareness not restriction. Uses: dashboard, insights, gentle score.

## 4. User journeys (core loop)
1. **Morning** → open app → daily plan with remaining budget split across meals, adjusted for training + yesterday's protein gap → accept/modify.
2. **Meal** → photo/text/saved-meal → analysis with confidence + range → one-tap correction → context ("1,330 kcal left, prioritize ~40g protein next").
3. **Between meals** → "What can I eat?" → 3 suggestions matching remaining budget, drawn from user's own meal history first.
4. **Evening** → dashboard closes the day → Calazm Balance score + one insight.
5. **Weekly** → "Your Week With Calazm" → trends, biggest win, biggest opportunity, one concrete next-week recommendation.

## 5. Pricing
- **Free:** manual + text logging unlimited, 10 AI photo scans/mo, macros, weight tracking, dashboard, saved meals, basic weekly summary.
- **Calazm Plus — $2.99/mo or $24.99/yr, 14-day trial, price public, cancel in-app:** unlimited scans, "What Can I Eat?" unlimited, adaptive targets, meal planner, restaurant/grocery modes, budget mode, full insights history, AI coach.
- Unit economics: cheap model for parsing/classification, vision model only on scans, frontier model only for weekly insight + complex planning; aggressive caching of repeated foods. Target AI cost < $0.40/user/mo.

## 6. Retention strategy (no dark patterns)
Memory compounding (learned meals/portions visibly surfaced: "Calazm has learned your 6 most common meals"), daily decision support, weekly insight, one useful "Calazm Moment"/day, streaks with restart-friendly framing, notifications off-by-default beyond 2 contextual ones, all customizable.

## 7. Growth
Shareable weekly report cards ("Generated with Calazm"), recipe/meal cards, referral = +1 month Plus both sides. No forced sharing.

## 8. MVP roadmap
- **Phase 1 (this build):** onboarding, targets (Mifflin-St Jeor + goal pace), photo-scan pipeline (provider-abstracted), text logging, dashboard, food history, saved meals, weight + trend, What Can I Eat?, recommendations, weekly insights, memory/personalization, Balance score, subscription stub.
- **Phase 2:** voice, barcode, restaurant/grocery/receipt modes, meal planner, budget mode, health integrations, adaptive TDEE v2.
- **Phase 3:** AI coaching, accountability circles, advanced analytics.
