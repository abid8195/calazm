# Calazm — Information Architecture & Design System

## Sitemap
```
/                     Landing (marketing, transparent pricing)
/signup, /login       Auth
/onboarding           7-step wizard → targets → first-scan aha moment
/today                Dashboard: rings, remaining budget, next best action, Calazm Moment, Balance
/log                  Log hub: photo / text / saved meals (barcode & voice = Phase 2)
/log/review/:id       Analysis review: items, confidence, range, clarifying question, corrections
/discover             "What Can I Eat?" + filters + swaps
/insights             Weekly review, trends, weight chart, what Calazm notices
/profile              Goals, targets, preferences, memory viewer, notifications, subscription, data export/delete
```
Bottom nav (5): **Today · Log · Discover · Insights · Profile**

## Screen inventory
| Screen | Answers | Key elements |
|---|---|---|
| Today | "How am I doing?" | Calorie ring, macro bars, next-best-action card, plan strip, Calazm Moment, water, Balance |
| Log | fastest path in | Big photo button, text field ("2 eggs and toast"), saved meals one-tap, recent meals |
| Review | "is this right?" | Item list w/ portions, kcal range + confidence, clarifier chip ("Much oil? Yes/No/Unsure"), edit/confirm |
| Discover | "what should I eat?" | Remaining-budget header, filter chips (high protein/fast/cheap/veg/low-carb), ranked suggestions w/ swap |
| Insights | "is it working?" | Week summary, weight trend (7/30-day), consistency, biggest win/opportunity, notices |
| Profile | control | Editable targets, memory ("Calazm has learned…"), prefs, plan, privacy |

## Empty states
- Today: "No meals yet. Snap your next meal and Calazm handles the rest."
- Insights: "Give Calazm 7 days and we'll start finding patterns."
- Discover: works from day 1 via food DB; gets personal as history accumulates.

## Design language
**Feel:** premium, calm, intelligent. Not neon-gym, not clinical.

- **Type:** Inter (variable). Nutrition numbers oversized (clamp 2–3rem, tabular-nums, weight 700). Labels 12–13px, wide tracking, muted.
- **Color:** Ink `#101614`; background warm off-white `#FAF9F6`; brand **Calazm Green** `#1E7A5A` (deep, food-fresh, trustworthy); accent amber `#E8A33D` (energy/kcal); macro hues: protein `#3E7CB1`, carbs `#C97B4A`, fat `#8E6FB0`, fibre `#5E8C61`. Dark mode: `#0E1412` bg, `#3DA47F` brand, elevated cards `#16201C`.
- **Shape:** cards radius 20px, soft single-layer shadows, 4px-grid spacing, generous whitespace.
- **Components:** ring gauge, macro progress bars, suggestion card (name / kcal / protein / why-this), confidence chip (High ≥80 / Medium / Low w/ range), streak pill, insight card, filter chips, sheet-style forms.
- **Motion:** 150–250ms ease-out; count-up on numbers; skeletons during analysis (never blank screens).
- **Voice:** the friend who knows nutrition. Never "you failed" — "about 280 kcal over; one day doesn't define the week."
