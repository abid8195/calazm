import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// name, aliases, category, kcal, protein, carbs, fat, fibre (per 100g), servingName, servingG, hiddenFatRisk
type F = [string, string, string, number, number, number, number, number, string, number, boolean?];

const foods: F[] = [
  // Proteins
  ["Chicken breast (cooked)", "chicken|chicken breast|grilled chicken", "protein", 165, 31, 0, 3.6, 0, "1 breast", 150],
  ["Chicken thigh (cooked)", "chicken thigh|thigh", "protein", 209, 26, 0, 10.9, 0, "1 thigh", 100],
  ["Beef mince 90/10 (cooked)", "beef|mince|ground beef|beef mince", "protein", 217, 27, 0, 11.8, 0, "1 serving", 120],
  ["Beef steak (cooked)", "steak|sirloin", "protein", 244, 27, 0, 15, 0, "1 steak", 180],
  ["Salmon (cooked)", "salmon|salmon fillet", "protein", 206, 22, 0, 12, 0, "1 fillet", 140],
  ["Tuna (canned in water)", "tuna|canned tuna", "protein", 116, 26, 0, 1, 0, "1 can", 95],
  ["White fish (cooked)", "fish|cod|basa|tilapia", "protein", 105, 23, 0, 1, 0, "1 fillet", 140],
  ["Prawns (cooked)", "prawns|shrimp", "protein", 99, 24, 0, 0.3, 0, "1 cup", 100],
  ["Egg", "eggs|boiled egg|fried egg|scrambled egg", "protein", 155, 13, 1.1, 11, 0, "1 egg", 50],
  ["Egg white", "egg whites", "protein", 52, 11, 0.7, 0.2, 0, "1 white", 33],
  ["Tofu (firm)", "tofu", "protein", 144, 17, 3, 8, 2, "1 block half", 150],
  ["Tempeh", "tempeh", "protein", 192, 20, 8, 11, 5, "1 serving", 100],
  ["Greek yogurt (plain, low fat)", "greek yogurt|yogurt|yoghurt", "dairy", 73, 10, 4, 1.9, 0, "1 tub", 170],
  ["Cottage cheese", "cottage cheese", "dairy", 98, 11, 3.4, 4.3, 0, "half cup", 110],
  ["Whey protein powder", "protein powder|whey|protein shake|scoop of protein", "protein", 380, 76, 8, 5, 1, "1 scoop", 32],
  ["Bacon (cooked)", "bacon|bacon rasher", "protein", 468, 35, 1.4, 35, 0, "2 rashers", 34, true],
  ["Ham (sliced)", "ham", "protein", 107, 17, 1.5, 3.5, 0, "2 slices", 46],
  ["Turkey breast (cooked)", "turkey", "protein", 147, 30, 0, 2.1, 0, "1 serving", 120],
  // Carbs
  ["White rice (cooked)", "rice|steamed rice|jasmine rice|scoop of rice", "carb", 130, 2.7, 28, 0.3, 0.4, "1 bowl", 200],
  ["Brown rice (cooked)", "brown rice", "carb", 112, 2.6, 24, 0.9, 1.8, "1 bowl", 200],
  ["Pasta (cooked)", "pasta|spaghetti|penne", "carb", 158, 5.8, 31, 0.9, 1.8, "1 bowl", 200],
  ["Bread (white slice)", "bread|toast|white bread|slice of bread|piece of toast", "carb", 265, 9, 49, 3.2, 2.7, "1 slice", 38],
  ["Bread (wholemeal slice)", "wholemeal bread|brown bread|wholegrain toast", "carb", 247, 13, 41, 3.4, 7, "1 slice", 38],
  ["Oats (dry)", "oats|oatmeal|porridge|rolled oats", "carb", 379, 13, 67, 6.5, 10, "half cup", 45],
  ["Potato (boiled)", "potato|potatoes|boiled potato", "carb", 87, 1.9, 20, 0.1, 1.8, "1 medium", 170],
  ["Sweet potato (baked)", "sweet potato|kumara", "carb", 90, 2, 21, 0.2, 3.3, "1 medium", 150],
  ["Hot chips / fries", "chips|fries|french fries|hot chips", "carb", 312, 3.4, 41, 15, 3.8, "1 serving", 150, true],
  ["Tortilla wrap", "wrap|tortilla|flour tortilla", "carb", 306, 8.2, 51, 7.7, 3, "1 wrap", 64],
  ["Quinoa (cooked)", "quinoa", "carb", 120, 4.4, 21, 1.9, 2.8, "1 bowl", 185],
  ["Couscous (cooked)", "couscous", "carb", 112, 3.8, 23, 0.2, 1.4, "1 bowl", 160],
  ["Noodles (cooked)", "noodles|egg noodles|ramen noodles", "carb", 138, 4.5, 25, 2.1, 1.2, "1 bowl", 200],
  ["Bagel", "bagel", "carb", 250, 10, 49, 1.5, 2.1, "1 bagel", 100],
  ["Cereal (flakes)", "cereal|cornflakes|weetbix", "carb", 357, 7.5, 84, 0.4, 3, "1 bowl", 40],
  // Fruit & veg
  ["Banana", "banana", "fruit", 89, 1.1, 23, 0.3, 2.6, "1 banana", 118],
  ["Apple", "apple", "fruit", 52, 0.3, 14, 0.2, 2.4, "1 apple", 180],
  ["Berries (mixed)", "berries|blueberries|strawberries|raspberries", "fruit", 45, 0.7, 10, 0.3, 3, "1 cup", 140],
  ["Orange", "orange|mandarin", "fruit", 47, 0.9, 12, 0.1, 2.4, "1 orange", 130],
  ["Grapes", "grapes", "fruit", 69, 0.7, 18, 0.2, 0.9, "1 cup", 150],
  ["Avocado", "avocado|avo", "fat", 160, 2, 9, 15, 7, "half avocado", 100, true],
  ["Broccoli (cooked)", "broccoli", "veg", 35, 2.4, 7, 0.4, 3.3, "1 cup", 90],
  ["Mixed vegetables (cooked)", "vegetables|mixed veg|veggies|stir fry vegetables", "veg", 45, 2.3, 8, 0.5, 3.5, "1 cup", 120],
  ["Salad (leafy, undressed)", "salad|lettuce|leafy greens|garden salad", "veg", 17, 1.3, 3, 0.2, 1.8, "1 bowl", 85],
  ["Carrot", "carrot|carrots", "veg", 41, 0.9, 10, 0.2, 2.8, "1 carrot", 60],
  ["Spinach (raw)", "spinach", "veg", 23, 2.9, 3.6, 0.4, 2.2, "2 cups", 60],
  ["Cucumber", "cucumber", "veg", 15, 0.7, 3.6, 0.1, 0.5, "half cucumber", 150],
  ["Tomato", "tomato|tomatoes", "veg", 18, 0.9, 3.9, 0.2, 1.2, "1 tomato", 120],
  ["Corn (cooked)", "corn|sweetcorn", "veg", 96, 3.4, 21, 1.5, 2.4, "1 cob", 100],
  ["Beans (black/kidney, cooked)", "beans|black beans|kidney beans", "veg", 127, 8.7, 23, 0.5, 7.5, "half cup", 90],
  ["Chickpeas (cooked)", "chickpeas|garbanzo", "veg", 164, 8.9, 27, 2.6, 7.6, "half cup", 82],
  ["Lentils (cooked)", "lentils|dal|dahl", "veg", 116, 9, 20, 0.4, 7.9, "1 cup", 198],
  // Fats & extras
  ["Olive oil", "oil|olive oil|cooking oil|tablespoon of oil", "fat", 884, 0, 0, 100, 0, "1 tbsp", 14, true],
  ["Butter", "butter", "fat", 717, 0.9, 0.1, 81, 0, "1 tsp", 5, true],
  ["Peanut butter", "peanut butter|pb", "fat", 588, 25, 20, 50, 6, "1 tbsp", 16, true],
  ["Almonds", "almonds|nuts|mixed nuts", "fat", 579, 21, 22, 50, 12.5, "1 handful", 28, true],
  ["Cheese (cheddar)", "cheese|cheddar|cheese slice", "dairy", 403, 25, 1.3, 33, 0, "1 slice", 20, true],
  ["Milk (full cream)", "milk|full cream milk|whole milk", "dairy", 61, 3.2, 4.8, 3.3, 0, "1 cup", 250],
  ["Milk (skim)", "skim milk|light milk", "dairy", 34, 3.4, 5, 0.1, 0, "1 cup", 250],
  ["Hummus", "hummus", "fat", 166, 8, 14, 10, 6, "2 tbsp", 30, true],
  ["Mayonnaise", "mayo|mayonnaise|aioli", "fat", 680, 1, 0.6, 75, 0, "1 tbsp", 14, true],
  // Composite / restaurant-style
  ["Chicken curry", "curry|chicken curry|tikka masala|butter chicken", "composite", 160, 13, 6, 9, 1.5, "1 serving", 280, true],
  ["Beef stir fry", "stir fry|beef stir fry|stirfry", "composite", 135, 12, 8, 6, 1.8, "1 plate", 300, true],
  ["Burger (beef, with bun)", "burger|cheeseburger|hamburger", "composite", 254, 13, 24, 12, 1.5, "1 burger", 330, true],
  ["Chicken burger", "chicken burger|grilled chicken burger", "composite", 210, 16, 22, 7, 1.6, "1 burger", 300, true],
  ["Pizza (slice)", "pizza|pizza slice|slice of pizza", "composite", 266, 11, 33, 10, 2.3, "1 slice", 107, true],
  ["Sushi roll", "sushi|sushi roll|california roll", "composite", 150, 6, 28, 1.5, 1.2, "1 roll (8pc)", 200],
  ["Burrito (chicken)", "burrito|chicken burrito", "composite", 163, 10, 19, 5.5, 2.5, "1 burrito", 350, true],
  ["Burrito bowl (chicken)", "burrito bowl|chicken bowl|guzman bowl", "composite", 120, 10, 13, 3.5, 2.8, "1 bowl", 450],
  ["Pho (beef)", "pho|beef pho", "composite", 62, 5, 8, 1, 0.5, "1 large bowl", 950],
  ["Fried rice", "fried rice|chicken fried rice", "composite", 168, 6, 24, 5.5, 1, "1 plate", 300, true],
  ["Pad thai", "pad thai", "composite", 178, 8, 23, 6.5, 1.5, "1 plate", 320, true],
  ["Sandwich (chicken salad)", "sandwich|chicken sandwich", "composite", 190, 12, 20, 6.5, 1.8, "1 sandwich", 220],
  ["Kebab (chicken, wrap)", "kebab|doner|shawarma", "composite", 175, 13, 17, 6.5, 1.5, "1 kebab", 380, true],
  ["Ramen (with pork)", "ramen", "composite", 90, 5, 12, 2.8, 0.7, "1 bowl", 550, true],
  ["Protein oats (cooked with whey)", "protein oats|proats", "composite", 120, 8.5, 15, 2.5, 2.2, "1 bowl", 350],
  ["Smoothie (banana + protein)", "smoothie|protein smoothie", "composite", 85, 6, 12, 1.2, 1, "1 glass", 400],
  // Snacks & drinks
  ["Dark chocolate", "chocolate|dark chocolate", "snack", 546, 4.9, 61, 31, 7, "2 squares", 20, true],
  ["Protein bar", "protein bar", "snack", 380, 33, 38, 12, 5, "1 bar", 60],
  ["Muesli bar", "muesli bar|granola bar", "snack", 432, 7, 64, 16, 5, "1 bar", 35],
  ["Rice cakes", "rice cakes|rice cake", "snack", 387, 8, 82, 2.8, 1.2, "2 cakes", 18],
  ["Ice cream (vanilla)", "ice cream|icecream", "snack", 207, 3.5, 24, 11, 0.7, "1 scoop", 66, true],
  ["Soft drink (cola)", "coke|cola|soft drink|soda", "drink", 42, 0, 10.6, 0, 0, "1 can", 375],
  ["Orange juice", "juice|orange juice|oj", "drink", 45, 0.7, 10.4, 0.2, 0.2, "1 glass", 250],
  ["Beer", "beer", "drink", 43, 0.5, 3.6, 0, 0, "1 can", 375],
  ["Wine (red)", "wine|red wine|white wine", "drink", 85, 0.1, 2.6, 0, 0, "1 glass", 150],
  ["Coffee with milk", "coffee|latte|flat white|cappuccino", "drink", 43, 2.2, 4.4, 1.8, 0, "1 cup", 240],
];

async function main() {
  const count = await prisma.food.count();
  if (count > 0) {
    console.log(`Food table already has ${count} rows; skipping seed.`);
    return;
  }
  for (const [name, aliases, category, kcal, protein, carbs, fat, fibre, servingName, servingG, hiddenFat] of foods) {
    await prisma.food.create({
      data: {
        name,
        aliases: aliases.toLowerCase(),
        category,
        source: "curated",
        verified: true,
        per100Kcal: kcal,
        per100Protein: protein,
        per100Carbs: carbs,
        per100Fat: fat,
        per100Fibre: fibre,
        servingName,
        servingG,
        hiddenFatRisk: hiddenFat ?? false,
      },
    });
  }
  console.log(`Seeded ${foods.length} foods.`);
}

main().finally(() => prisma.$disconnect());
