# ChefAI Prompt Setup Summary

This document describes the complete prompt engineering setup for the ChefAI application, including pantry scanning and recipe generation prompts.

---

## 1. Pantry Scanning Prompt (`/api/scan-pantry`)

### Purpose
Detect food ingredients from fridge/pantry photos using GPT-4o Vision.

### Model
- **Model**: `gpt-4o` (with vision capabilities)
- **Max Tokens**: 500
- **Response Format**: JSON object
- **Input**: Base64-encoded image + text prompt

### Prompt Structure

```
You are an expert at identifying food items in fridge/pantry photos.

TASK:
Analyze the image and list ALL visible food ingredients with high confidence (80%+).

RULES:
1. Include items you can clearly see or identify from packaging/labels
2. Use simple, generic names (English, singular unless naturally plural)
3. Avoid brand names → use generic terms:
   - "Heinz Ketchup" → "ketchup"
   - "Hellmann's Mayo" → "mayonnaise"
   - "Chobani Yogurt" → "yogurt"
4. For unclear items:
   - If 80%+ confident → include it
   - If less than 80% → skip it
5. DO NOT infer hidden contents (closed boxes, drawers, cabinets)
6. DO NOT add staples not visible (salt, pepper, oil, sugar unless clearly visible)

SPECIAL CASES:
- Eggs, olives, berries, chips → keep plural (naturally plural items)
- Partial bottles/containers → include if you can identify them (80%+ confidence)
- Multiple of same item → list once (e.g., "3 eggs" → "eggs")
- Condiments in standard bottles → include if identifiable
- Clear containers → include if contents are visible

WHAT TO SKIP:
- Blurry/obscured items
- Unclear packages with no visible labels
- Items you're less than 80% confident about
- Non-food items (dishes, containers, decorations)
- Hidden items (inside drawers, behind other items)

COMMON ITEMS TO WATCH FOR:
- Eggs (often in cartons, white shells visible)
- Butter (rectangular package, yellow wrapper)
- Milk (white container, carton or bottle)
- Cheese (packaged blocks, slices, or shredded)
- Yogurt (small containers, often white/colored)
- Condiments (ketchup, mustard, mayo in standard bottles)

Output format:
Return a single JSON object with this exact shape and nothing else:

{
  "ingredients": [
    "ingredient1",
    "ingredient2",
    "ingredient3"
  ]
}

Rules for output:
- Always return valid JSON.
- No comments, no explanations, no trailing commas.
- "ingredients" must be an array of strings.
- Use singular form unless naturally plural (eggs, olives, berries).
```

### Key Features
- **80% confidence threshold**: Balances accuracy vs. completeness
- **Generic names only**: Removes brand names for consistency
- **Naturally plural items**: Keeps plural form for items like eggs, olives
- **Strict JSON output**: Ensures reliable parsing

### Cost Tracking
- Tracks costs per scan in Vercel KV
- Estimates: ~$0.002 per image scan (high-res image analysis)
- Daily/monthly/all-time cost tracking

---

## 2. Recipe Generation Prompt (`/api/generate-recipes`)

### Purpose
Generate 5-7 practical recipes from detected ingredients using GPT-4o.

### Model
- **Model**: `gpt-4o`
- **Max Tokens**: 4000
- **Response Format**: JSON object
- **Input**: Ingredient list + dietary filters (optional)

### Prompt Structure

```
You are an expert chef creating simple, practical recipes.

AVAILABLE INGREDIENTS:
[ingredient1], [ingredient2], [ingredient3], ...

[DIETARY RESTRICTIONS SECTION - IF APPLICABLE]

DIETARY RESTRICTIONS (CRITICAL - MUST BE FOLLOWED):
- NO meat, fish, or poultry. Eggs and dairy OK. [if vegetarian]
- NO animal products (meat, dairy, eggs, honey). [if vegan]
- NO wheat, barley, rye, or gluten-containing ingredients. [if gluten-free]
- NO milk, cheese, butter, cream, or dairy products. [if dairy-free]
- LOW CARB (under 10g net carbs per serving). High fat, moderate protein. [if keto]
- NO grains, legumes, dairy, or processed foods. Meat, fish, vegetables, fruits, nuts OK. [if paleo]

ALL recipes MUST follow these restrictions. This is non-negotiable.

TASK:
Create EXACTLY 6 recipes using ONLY the available ingredients plus common pantry staples.

ALLOWED STAPLES (assume user has these - NEVER include these in youNeedToBuy):
- Seasonings: salt, pepper, ALL common dried herbs/spices (oregano, basil, thyme, rosemary, paprika, cumin, etc.)
- Oils & fats: olive oil, vegetable oil, butter, cooking spray
- Basics: flour, sugar, garlic, onions, vinegar (white, balsamic, apple cider)
- Grains: rice, pasta, bread (if not already in ingredients list)
- Baking: baking powder, baking soda, vanilla extract, cornstarch (for baked goods only)
- Dairy basics: milk (if not in ingredients), cream (for cooking)

CRITICAL RULE: These staples MUST NEVER appear in "youNeedToBuy" - they are assumed available!

DO NOT ASSUME (include in youNeedToBuy if needed):
- Fresh produce not listed
- Proteins not listed (meal, fish, tofu)
- Specialty ingredients (exotic spices, specialty cheeses)
- Condiments not listed (unless they're common like ketchup, mustard)

REQUIREMENTS FOR EACH RECIPE:
1. Title: Clear, descriptive name
2. mealType: "breakfast" | "lunch" | "dinner" | "snack"
3. timeMinutes: Realistic total time (prep + cook)
4. difficulty: "easy" | "medium" | "hard"
5. youAlreadyHave: List ingredients from AVAILABLE INGREDIENTS used in this recipe (minimum 3)
6. youNeedToBuy: Small list of extra ingredients needed (can be empty, but NO STAPLES!)
7. steps: 5-8 numbered steps, clear and actionable

MEAL TYPE DISTRIBUTION:
- Ensure variety: aim for 2 breakfast, 2 lunch/dinner, 1-2 snacks
- Balance meal types across the 6 recipes

DIFFICULTY DISTRIBUTION:
- 3 easy recipes
- 2 medium recipes
- 1 hard recipe

INGREDIENT USAGE:
- Each recipe MUST use at least 3 ingredients from AVAILABLE INGREDIENTS
- Prioritize using multiple available ingredients per recipe
- Don't create recipes that only use 1-2 ingredients

SHOPPING LIST:
- Create a merged, deduplicated shopping list from all "youNeedToBuy" arrays
- Remove any staples that might have been incorrectly included

Output format:
Return ONLY valid JSON in this exact structure (no comments, no prose):

{
  "recipes": [
    {
      "title": "Recipe Name",
      "mealType": "breakfast",
      "timeMinutes": 20,
      "difficulty": "easy",
      "youAlreadyHave": ["ingredient1", "ingredient2", "ingredient3"],
      "youNeedToBuy": ["extra ingredient1", "extra ingredient2"],
      "steps": [
        "Step 1 instruction",
        "Step 2 instruction",
        ...
      ]
    },
    ...
  ],
  "shoppingList": [
    "item1",
    "item2",
    ...
  ]
}

CRITICAL OUTPUT RULES:
- Return EXACTLY 6 recipes (no more, no less)
- Always return valid JSON
- No comments, no explanations, no trailing commas
- "recipes" must be an array of exactly 6 objects
- "shoppingList" must be a deduplicated array
- NO STAPLES in "youNeedToBuy" or "shoppingList"
```

### Key Features

#### Allowed Staples (Never in Shopping List)
- **Seasonings**: salt, pepper, oregano, basil, thyme, rosemary, paprika, cumin, garlic powder, onion powder, cayenne, chili powder, curry powder
- **Oils & Fats**: olive oil, vegetable oil, canola oil, cooking oil, butter, cooking spray
- **Basics**: flour, sugar, brown sugar, garlic, onion, onions, vinegar (white, balsamic, apple cider)
- **Grains**: rice, pasta, bread
- **Baking**: baking powder, baking soda, vanilla extract, cornstarch
- **Dairy**: milk, cream, heavy cream, half and half

#### Dietary Restrictions Support
- **Vegetarian**: No meat, fish, poultry (eggs/dairy OK)
- **Vegan**: No animal products
- **Gluten-Free**: No wheat, barley, rye
- **Dairy-Free**: No milk, cheese, butter, cream
- **Keto**: Low carb (<10g net carbs per serving)
- **Paleo**: No grains, legumes, dairy, processed foods

#### Recipe Requirements
- **Count**: EXACTLY 6 recipes (hard limit: max 7)
- **Meal Type Distribution**: 2 breakfast, 2 lunch/dinner, 1-2 snacks
- **Difficulty Distribution**: 3 easy, 2 medium, 1 hard
- **Ingredient Usage**: Minimum 3 ingredients from available list per recipe
- **Staples Filtering**: Post-processing removes staples from shopping lists

### Post-Processing
1. **Limit Recipes**: `recipes.slice(0, 7)` ensures max 7 recipes
2. **Filter Staples**: Removes staples from `youNeedToBuy` arrays
3. **Image Generation**: Generates DALL-E 3 images for each recipe (cached)
4. **Caching**: Recipes cached by ingredient hash (SHA-256) for 90 days

### Cost Tracking
- **Recipe Generation**: ~$0.01-0.02 per generation (GPT-4o)
- **Image Generation**: $0.040 per image (DALL-E 3 standard)
- **Caching**: Reduces costs significantly (cache hit rate tracked)

---

## 3. Image Generation Prompt (`generateRecipeImage`)

### Purpose
Generate appetizing food photography for each recipe using DALL-E 3.

### Model
- **Model**: `dall-e-3`
- **Size**: 1024x1024
- **Quality**: standard
- **Cost**: $0.040 per image

### Prompt Structure

```
A professional, appetizing photograph of [recipeName]. 
The dish should be beautifully plated on a clean white plate, 
with natural lighting, shallow depth of field, and vibrant colors. 
Top-down view, food photography style, magazine quality.
```

### Caching
- Images cached in Vercel KV for 90 days
- Cache key: `recipe-image:[recipe-title-normalized]`
- Fallback to Unsplash if generation fails

---

## 4. Prompt Improvement System

### Tracking Incorrect Detections
- When users remove AI-detected ingredients, tracked as "false positives"
- Stored in Vercel KV: `incorrect_detection:[ingredient]`
- Admin panel shows false positive rates and improvement suggestions

### Admin Insights
- **False Positive Rate**: Percentage of scans with incorrect detections
- **Top Incorrect Ingredients**: Most commonly incorrectly detected items
- **Improvement Suggestions**: Auto-generated prompt improvement recommendations

### Example Suggestions
- "Reduce false positives for 'chicken' (incorrectly detected 8.5% of scans)"
- "Overall false positive rate is 12% - consider increasing confidence threshold to 85%+"
- "Most common false positives: chicken, rice, pasta - add explicit rules to exclude these unless clearly visible"

---

## 5. Technical Implementation

### API Routes
- `/api/scan-pantry`: Pantry scanning (GPT-4o Vision)
- `/api/generate-recipes`: Recipe generation (GPT-4o)
- `/api/track-incorrect-detection`: Track false positives
- `/api/admin/incorrect-detections`: Admin analytics

### Caching Strategy
- **Recipes**: Cached by ingredient hash (SHA-256) for 90 days
- **Images**: Cached by recipe title for 90 days
- **Cache Hit Rate**: Tracked in admin panel

### Error Handling
- Graceful degradation if KV unavailable
- Fallback images if DALL-E fails
- Silent error tracking (doesn't block user flow)

---

## 6. Cost Optimization

### Current Costs (Estimated)
- **Scan**: ~$0.002 per image (GPT-4o Vision)
- **Recipe Generation**: ~$0.01-0.02 per generation (GPT-4o)
- **Image Generation**: $0.040 per image (DALL-E 3)
- **Infrastructure**: $3.23/day (Vercel Pro + KV)

### Cost Reduction Strategies
1. **Recipe Caching**: Reduces GPT-4o calls by 50-70%
2. **Image Caching**: One-time cost per unique recipe
3. **Staples Filtering**: Reduces unnecessary shopping list items
4. **Confidence Threshold**: 80% reduces false positives

---

## 7. Future Improvements

### Prompt Enhancements
- Dynamic confidence threshold based on false positive rate
- Ingredient-specific rules (e.g., "chicken" requires 90% confidence)
- Context-aware detection (e.g., breakfast items in morning scans)

### Analytics-Driven Improvements
- Use incorrect detection data to refine prompts
- A/B test different confidence thresholds
- Track accuracy improvements over time

---

## Summary

**Pantry Scanning**: 80% confidence threshold, generic names, strict JSON output
**Recipe Generation**: EXACTLY 6 recipes, dietary restrictions, staples filtering, meal type distribution
**Image Generation**: Professional food photography, cached for cost efficiency
**Improvement System**: Track false positives, generate suggestions, iterate on prompts

All prompts are designed for:
- **Reliability**: Strict JSON output, error handling
- **Cost Efficiency**: Caching, filtering, optimization
- **User Experience**: Accurate detection, practical recipes, beautiful images
- **Continuous Improvement**: Data-driven prompt refinement

