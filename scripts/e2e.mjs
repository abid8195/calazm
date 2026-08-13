const base = "http://localhost:3000";
let cookie = "";
let failures = 0;

async function call(method, path, body, form) {
  const headers = { cookie };
  let payload;
  if (form) {
    payload = form;
  } else if (body) {
    headers["content-type"] = "application/json";
    payload = JSON.stringify(body);
  }
  const res = await fetch(base + path, { method, headers, body: payload, redirect: "manual" });
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) cookie = setCookie.split(";")[0];
  let data = null;
  try { data = await res.json(); } catch {}
  return { status: res.status, data };
}

function check(name, cond, detail) {
  if (cond) console.log(`PASS  ${name}`);
  else { failures++; console.log(`FAIL  ${name} :: ${JSON.stringify(detail).slice(0, 400)}`); }
}

const email = `test${Date.now()}@calazm.dev`;

// 1. Signup
let r = await call("POST", "/api/auth/signup", { email, password: "password123", name: "Sam" });
check("signup", r.status === 200, r);

// duplicate signup rejected
r = await call("POST", "/api/auth/signup", { email, password: "password123" });
check("duplicate signup rejected", r.status === 409, r);

// 2. Today before onboarding → 409
r = await call("GET", "/api/today");
check("today requires onboarding", r.status === 409 && r.data.needsOnboarding, r);

// 3. Onboarding
r = await call("PATCH", "/api/profile", {
  goal: "lose", sex: "male", age: 28, heightCm: 178, weightKg: 82, targetWeightKg: 76,
  activityLevel: "moderate", paceKgPerWeek: 0.5, dietaryPref: "none", onboarded: true,
});
check("onboarding computes targets", r.status === 200 && r.data.target.calories > 1500 && r.data.target.proteinG > 100, r.data.target);
const target = r.data.target;
console.log(`      targets: ${target.calories} kcal / ${target.proteinG}P / ${target.carbsG}C / ${target.fatG}F — ${target.rationale?.slice(0, 80)}...`);

// 4. Text analysis
r = await call("POST", "/api/meals/analyze-text", { text: "two eggs, two slices of toast with butter and a banana" });
check("text analysis parses items", r.status === 200 && r.data.items.length >= 3, r.data);
check("analysis has confidence + range", r.data.confidence > 0 && r.data.kcalLow <= r.data.kcalHigh, r.data);
console.log(`      parsed: ${r.data.items.map((i) => `${i.label} ${i.grams}g`).join(" | ")} → ${r.data.kcalLow}-${r.data.kcalHigh} kcal @ ${r.data.confidence}`);
const analysis = r.data;

// 5. Log meal with a portion correction (eggs 100 → 150g) and saveAs
const items = analysis.items.map((i) => (i.label === "Egg" ? { ...i, grams: 150, kcal: i.kcal * 1.5, proteinG: i.proteinG * 1.5, carbsG: i.carbsG * 1.5, fatG: i.fatG * 1.5, fibreG: i.fibreG * 1.5 } : i));
r = await call("POST", "/api/meals", {
  items, source: "text", mealType: "breakfast", saveAs: "My usual breakfast",
  corrections: [{ original: { label: "Egg", grams: 100 }, corrected: { label: "Egg", grams: 150, foodId: analysis.items.find((i) => i.label === "Egg")?.foodId } }],
});
check("meal logged", r.status === 200 && r.data.meal.items.length >= 3, r);

// second correction → portion learning threshold (strength >= 2)
await call("POST", "/api/meals", {
  items: items.filter((i) => i.label === "Egg"), source: "text", mealType: "snack",
  corrections: [{ original: { label: "Egg", grams: 100 }, corrected: { label: "Egg", grams: 150, foodId: analysis.items.find((i) => i.label === "Egg")?.foodId } }],
});

// 6. Learned portion applied on next parse
r = await call("POST", "/api/meals/analyze-text", { text: "eggs" });
const eggItem = r.data.items.find((i) => i.label === "Egg");
check("portion learning applied (egg ~150g)", eggItem && Math.abs(eggItem.grams - 150) <= 2, r.data.items);
check("learned-portion note shown", !!r.data.note, r.data);

// 7. Today dashboard
r = await call("GET", "/api/today");
check("today dashboard", r.status === 200 && r.data.totals.kcal > 300 && r.data.remaining.kcal < target.calories, r.data.totals);
check("balance score sane", r.data.balance >= 0 && r.data.balance <= 100, r.data.balance);
check("plan slots exist", Array.isArray(r.data.plan) && r.data.plan.length > 0, r.data.plan);
check("calazm moment present", typeof r.data.moment === "string" && r.data.moment.length > 10, r.data.moment);
console.log(`      today: ${r.data.totals.kcal} kcal eaten, ${r.data.remaining.kcal} left, balance ${r.data.balance}, moment: "${r.data.moment.slice(0, 70)}..."`);

// 8. Recommendations
r = await call("GET", "/api/recommendations?filters=high-protein");
check("recommendations fit budget", r.status === 200 && r.data.suggestions.length > 0 && r.data.suggestions.every((s) => s.kcal <= r.data.remainingKcal * 1.1), r.data);
check("recommendations carry why", r.data.suggestions.every((s) => s.why.length > 5), r.data.suggestions?.map((s) => s.why));
console.log(`      suggestions: ${r.data.suggestions.map((s) => `${s.name} (${s.kcal} kcal/${s.proteinG}P) [${s.source}]`).join(" | ")}`);

// vegetarian filter respected
r = await call("GET", "/api/recommendations?filters=vegetarian");
check("vegetarian filter", r.data.suggestions.every((s) => !/chicken|beef|salmon|tuna|turkey|pho/i.test(s.name) || s.source !== "calazm"), r.data.suggestions?.map((s) => s.name));

// 9. Saved meals + one-tap log
r = await call("GET", "/api/saved-meals");
check("saved meal exists", r.data.saved.length === 1 && r.data.saved[0].name === "My usual breakfast", r.data);
r = await call("POST", "/api/saved-meals", { savedMealId: r.data.saved[0].id });
check("one-tap saved meal returns items", r.status === 200 && r.data.items.length >= 3, r);

// 10. Weight + trends
await call("POST", "/api/weight", { weightKg: 82, date: new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10) });
await call("POST", "/api/weight", { weightKg: 81.6, date: new Date(Date.now() - 1 * 86400000).toISOString().slice(0, 10) });
r = await call("POST", "/api/weight", { weightKg: 81.4 });
check("weight trends", r.status === 200 && r.data.entries.length >= 3 && r.data.avg7 !== null, r.data);
r = await call("POST", "/api/weight", { weightKg: 5 });
check("absurd weight rejected", r.status === 400, r);

// 11. Water
r = await call("POST", "/api/water", { ml: 500 });
check("water logged", r.status === 200 && r.data.waterMl === 500, r);

// 12. Weekly insights
r = await call("GET", "/api/insights/weekly");
check("weekly insight", r.status === 200 && r.data.narrative.length > 20, r.data.narrative);
check("memory has learned meals/foods", r.data.memory.frequentFoods.length > 0 || r.data.memory.learnedPortions.length > 0, r.data.memory);
console.log(`      narrative: "${r.data.narrative.slice(0, 140)}..."`);
console.log(`      memory: ${JSON.stringify(r.data.memory).slice(0, 200)}`);

// 13. Food search
r = await call("GET", "/api/foods/search?q=chick");
check("food search", r.data.foods.length > 0, r.data);

// 14. Subscription flow
r = await call("GET", "/api/subscriptions");
check("subscription starts free", r.data.plan === "free", r.data);
r = await call("POST", "/api/subscriptions", { plan: "plus" });
check("upgrade to plus", r.data.plan === "plus", r.data);

// 15. Meal edit + delete
r = await call("GET", "/api/meals");
const mealId = r.data.meals[0].id;
r = await call("PATCH", `/api/meals/${mealId}`, { name: "Renamed breakfast" });
check("meal rename", r.data.meal.name === "Renamed breakfast", r);
r = await call("DELETE", `/api/meals/${mealId}`);
check("meal soft delete", r.status === 200, r);
r = await call("GET", "/api/meals");
check("deleted meal hidden", !r.data.meals.some((m) => m.id === mealId), r.data.meals.length);

// 16. Percentage + natural language variants
r = await call("POST", "/api/meals/analyze-text", { text: "half the pizza" });
check("fraction parsing (half pizza)", r.status === 200 && r.data.items.length === 1 && r.data.items[0].grams < 107, r.data.items);
r = await call("POST", "/api/meals/analyze-text", { text: "200g chicken breast and a bowl of rice" });
const chick = r.data.items.find((i) => i.label.includes("Chicken"));
check("explicit grams (200g chicken)", chick && chick.grams === 200 && chick.confidence >= 0.9, r.data.items);

// 17. Unauthed request rejected
cookie = "";
r = await call("GET", "/api/today");
check("auth required", r.status === 401, r);

console.log(failures === 0 ? "\nALL TESTS PASSED" : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
