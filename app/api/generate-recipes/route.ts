import { NextRequest, NextResponse } from "next/server";
import { kv } from '@vercel/kv';
import { createHash } from 'crypto';

const apiKey = process.env.OPENAI_API_KEY;

// Generate recipe image using DALL-E 3
async function generateRecipeImage(recipeName: string, mealType: string): Promise<string | null> {
  if (!apiKey) {
    console.warn('[generate-recipes] No OpenAI API key for image generation')
    return null
  }

  const prompt = `A professional, appetizing photograph of ${recipeName}. The dish should be beautifully plated on a clean white plate, with natural lighting, shallow depth of field, and vibrant colors. Top-down view, food photography style, magazine quality.`

  try {
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[generate-recipes] DALL-E API error:', response.status, errorText)
      return null
    }

    const data = await response.json()
    const imageUrl = data.data?.[0]?.url

    if (imageUrl) {
      // Track image generation cost (non-blocking)
      try {
        // DALL-E 3 standard: $0.040 per image
        const cost = 0.040
        const timestamp = new Date().toISOString()
        const dateKey = timestamp.split('T')[0]
        const monthKey = timestamp.substring(0, 7)
        
        await kv.hincrbyfloat(`costs:daily:${dateKey}`, 'openai_images', cost)
        await kv.hincrbyfloat(`costs:monthly:${monthKey}`, 'openai_images', cost)
        await kv.hincrbyfloat('costs:alltime', 'openai_images', cost)
        
        console.log(`[Cost Tracking] Image gen cost: $${cost.toFixed(4)} for: ${recipeName}`)
      } catch (costErr) {
        console.warn('[Cost Tracking] Failed to track image cost:', costErr)
      }
    }

    return imageUrl || null
  } catch (error) {
    console.error('[generate-recipes] Image generation error:', error)
    return null
  }
}

// Fallback images if DALL-E generation fails
function getFallbackImage(mealType: string): string {
  const fallbacks: Record<string, string> = {
    breakfast: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=800&q=80',
    lunch: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80',
    dinner: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80',
    snack: 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=800&q=80',
  }
  
  return fallbacks[mealType.toLowerCase()] || fallbacks.lunch
}

if (!apiKey) {
  console.error("[generate-recipes] Missing OPENAI_API_KEY in env.");
}

export async function POST(req: NextRequest) {
  try {
    // --- 1. Read & validate body -----------------------------------------
    // Limit request body size (1MB max for ingredients list)
    const contentLength = req.headers.get('content-length')
    if (contentLength && parseInt(contentLength, 10) > 1024 * 1024) {
      return NextResponse.json(
        { ok: false, error: "Request too large. Maximum size: 1MB." },
        { status: 413 }
      )
    }

    const body = await req.json().catch((err) => {
      console.error("[generate-recipes] Failed to parse request JSON:", err);
      return null;
    });

    const rawIngredients = body?.ingredients;
    const userId = body?.userId;
    const dietaryFilters = body?.dietaryFilters || [];

    const ingredients: string[] | null =
      Array.isArray(rawIngredients)
        ? rawIngredients
            .map((i: unknown) => String(i ?? "").trim())
            .filter((i) => i.length > 0)
            .slice(0, 100) // Limit to 100 ingredients max
        : null;

    if (!ingredients || ingredients.length === 0) {
      return NextResponse.json(
        { ok: false, error: "No ingredients provided." },
        { status: 400 }
      );
    }

    // Validate ingredient lengths (prevent extremely long strings)
    const invalidIngredients = ingredients.filter(i => i.length > 100)
    if (invalidIngredients.length > 0) {
      return NextResponse.json(
        { ok: false, error: "Invalid ingredient: maximum length is 100 characters." },
        { status: 400 }
      )
    }

    if (!apiKey) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Server is not configured with an OpenAI API key. Set OPENAI_API_KEY in .env.local.",
        },
        { status: 500 }
      );
    }

    // --- 2. Check cache first (intelligent caching) ----------------------
    // Create cache key from sorted ingredients (same combo = same hash)
    const sortedIngredients = [...ingredients].sort().map(i => i.toLowerCase().trim()).filter(i => i.length > 0)
    const ingredientsString = sortedIngredients.join(',')
    const cacheKey = createHash('sha256').update(ingredientsString).digest('hex')
    const cacheRedisKey = `recipes:${cacheKey}`
    
    // Track if we're using cached data (used later for cost tracking)
    let isCached = false

    try {
      // Check if we have cached recipes for these ingredients
      const cached = await kv.get(cacheRedisKey)
      
      if (cached) {
        isCached = true
        console.log(`[generate-recipes] Cache HIT for key: ${cacheKey.substring(0, 8)}...`)
        
        // Limit cached recipes to 7 max (in case old cache has more)
        let cachedRecipes = cached.recipes || []
        if (cachedRecipes.length > 7) {
          cachedRecipes = cachedRecipes.slice(0, 7)
          console.log(`[generate-recipes] Limited cached recipes from ${cached.recipes.length} to 7`)
        }
        
        // Filter staples from cached recipes (in case old cache has them)
        const STAPLES = [
          'salt', 'pepper', 'oregano', 'basil', 'thyme', 'rosemary', 'paprika', 'cumin', 
          'garlic powder', 'onion powder', 'cayenne', 'chili powder', 'curry powder',
          'olive oil', 'vegetable oil', 'canola oil', 'cooking oil', 'oil', 'butter', 
          'cooking spray', 'flour', 'sugar', 'brown sugar', 'garlic', 'onion', 'onions',
          'vinegar', 'white vinegar', 'balsamic vinegar', 'apple cider vinegar',
          'rice', 'pasta', 'bread', 'baking powder', 'baking soda', 'vanilla extract', 
          'vanilla', 'cornstarch', 'milk', 'cream', 'heavy cream', 'half and half',
          'black pepper', 'white pepper', 'sea salt', 'kosher salt', 'table salt'
        ]
        
        const isStaple = (item: string): boolean => {
          const normalized = item.toLowerCase().trim()
          return STAPLES.some(staple => normalized === staple || normalized.includes(staple))
        }

        // Filter staples from cached recipes
        cachedRecipes = cachedRecipes.map((recipe: any) => {
          if (Array.isArray(recipe.youNeedToBuy)) {
            recipe.youNeedToBuy = recipe.youNeedToBuy.filter((item: string) => !isStaple(item))
          }
          return recipe
        })

        // Filter staples from cached shopping list
        if (cached.shoppingList && Array.isArray(cached.shoppingList)) {
          cached.shoppingList = [...new Set(
            cached.shoppingList.filter((item: string) => !isStaple(item))
          )]
        }
        
        // Ensure cached recipes have images (generate if missing)
        const cachedRecipesWithImages = await Promise.all(
          cachedRecipes.map(async (recipe: any) => {
            if (recipe.imageUrl) {
              return recipe // Already has image
            }
            
            // Generate image for cached recipe without one
            const imageCacheKey = `recipe-image:${recipe.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
            try {
              const cachedImage = await kv.get(imageCacheKey)
              if (cachedImage) {
                return { ...recipe, imageUrl: cachedImage }
              }
              
              // Generate new image
              const imageUrl = await generateRecipeImage(recipe.title, recipe.mealType)
              if (imageUrl) {
                await kv.set(imageCacheKey, imageUrl, { ex: 7776000 })
                return { ...recipe, imageUrl }
              }
            } catch (err) {
              console.warn(`[generate-recipes] Failed to get image for cached recipe ${recipe.title}:`, err)
            }
            
            return { ...recipe, imageUrl: getFallbackImage(recipe.mealType) }
          })
        )
        
        // Track cache hit (non-blocking)
        try {
          fetch(`${req.nextUrl.origin}/api/track-recipe-generation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: userId || 'anonymous',
              recipeCount: cachedRecipesWithImages.length,
              ingredientCount: ingredients.length,
              success: true,
              cached: true,
              userPlan: body?.userPlan || 'free'
            }),
          }).catch(() => {}) // Silent fail
        } catch {}
        
        return NextResponse.json(
          {
            ok: true,
            recipes: cachedRecipesWithImages,
            shoppingList: cached.shoppingList || [],
            cached: true, // Indicate this was from cache
          },
          { status: 200 }
        )
      }
      
      console.log(`[generate-recipes] Cache MISS for key: ${cacheKey.substring(0, 8)}...`)
    } catch (cacheError) {
      // If cache check fails, continue with OpenAI call (graceful degradation)
      console.warn('[generate-recipes] Cache check failed, continuing with OpenAI:', cacheError)
    }

    // --- 3. Build very explicit JSON-only prompt --------------------------
    const prompt = `
You are an expert chef creating simple, practical recipes.

AVAILABLE INGREDIENTS:
${ingredients.join(", ")}

${dietaryFilters.length > 0 ? `

DIETARY RESTRICTIONS (CRITICAL - MUST BE FOLLOWED):
${dietaryFilters.map((f: string) => {
  switch(f) {
    case 'vegetarian': return '- NO meat, fish, or poultry. Eggs and dairy OK.';
    case 'vegan': return '- NO animal products (meat, dairy, eggs, honey).';
    case 'gluten-free': return '- NO wheat, barley, rye, or gluten-containing ingredients.';
    case 'dairy-free': return '- NO milk, cheese, butter, cream, or dairy products.';
    case 'keto': return '- LOW CARB (under 10g net carbs per serving). High fat, moderate protein.';
    case 'paleo': return '- NO grains, legumes, dairy, or processed foods. Meat, fish, vegetables, fruits, nuts OK.';
    default: return '';
  }
}).filter(Boolean).join('\n')}

ALL recipes MUST follow these restrictions. This is non-negotiable.
` : ''}

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
- Proteins not listed (meat, fish, tofu)
- Specialty ingredients (exotic spices, specialty cheeses)
- Expensive or exotic items
- Items that require special equipment
- Fresh herbs (use dried herbs instead)

RECIPE REQUIREMENTS:
1. EXACTLY 6 recipes (no more, no less)
2. Variety across meal types:
   - 1-2 breakfast recipes
   - 2-3 lunch/dinner recipes
   - 1-2 snack recipes
3. Variety in difficulty:
   - 3 easy recipes (10-20 min, simple techniques)
   - 2 medium recipes (20-40 min, moderate techniques)
   - 1 can be challenging (40+ min, advanced techniques)
4. Each recipe MUST use at least 3 ingredients from the available list
5. Be creative but realistic - actual recipes people would make
6. Steps should be clear, actionable, and in logical order

RECIPE STRUCTURE:
Each recipe must have:
- title: Descriptive, appetizing name
- mealType: "breakfast" | "lunch" | "dinner" | "snack"
- timeMinutes: Realistic total time (prep + cook)
- difficulty: "easy" | "medium" | "hard"
- servings: Number of servings (typically 2-4)
- youAlreadyHave: Array of ingredients from the available list used in this recipe
- youNeedToBuy: Array of additional ingredients needed (can be empty [])
  CRITICAL: NEVER include staples in youNeedToBuy! Staples listed above are assumed available.
  Only include: fresh produce, proteins, specialty items NOT in the available ingredients list.
- steps: Array of 5-8 clear, numbered cooking instructions

SHOPPING LIST:
Create a deduplicated list of ALL items needed across all recipes (items that appear in youNeedToBuy for any recipe).

IMPORTANT - STAPLES FILTERING:
Before creating the shopping list, REMOVE any staples from youNeedToBuy arrays:
- Remove: salt, pepper, oregano, basil, thyme, rosemary, paprika, cumin, and ALL spices/herbs
- Remove: olive oil, vegetable oil, butter, cooking spray
- Remove: flour, sugar, garlic, onions, vinegar
- Remove: rice, pasta, bread (unless specifically needed and not in ingredients)
- Remove: baking powder, baking soda, vanilla extract, cornstarch
- Remove: milk, cream (unless specifically needed for recipe)

Only include in shopping list:
- Fresh produce not in available ingredients
- Proteins not in available ingredients (meat, fish, tofu, etc.)
- Specialty items (exotic cheeses, specialty sauces, etc.)
- Items that are clearly NOT common pantry staples

RESPONSE FORMAT:
Return ONLY valid JSON in this exact structure (no comments, no markdown, no explanations):

{
  "recipes": [
    {
      "title": "string",
      "mealType": "breakfast" | "lunch" | "dinner" | "snack",
      "timeMinutes": number,
      "difficulty": "easy" | "medium" | "hard",
      "servings": number,
      "youAlreadyHave": ["ingredient1", "ingredient2"],
      "youNeedToBuy": ["ingredient1"],
      "steps": ["Step 1: Clear instruction", "Step 2: ..."]
    }
  ],
  "shoppingList": ["item1", "item2"]
}

QUALITY CHECKS:
- All recipes use available ingredients ✓
- Recipe count is EXACTLY 6 ✓
- Steps are clear and actionable ✓
- Cooking times are realistic ✓
- No invented ingredients ✓
- Meal type variety (breakfast, lunch, dinner, snack) ✓
- Difficulty variety (easy, medium, hard) ✓

RULES:
- Response MUST be valid JSON that can be parsed by JSON.parse in JavaScript.
- Do NOT wrap the JSON in backticks or a \`\`\`json code block.
- Do NOT include any additional text before or after the JSON.
- Each recipe must have all required fields.
`;

    // --- 4. Call OpenAI ---------------------------------------------------
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 4000,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[generate-recipes] OpenAI HTTP error:", response.status, errText);
      return NextResponse.json(
        {
          ok: false,
          error: `OpenAI HTTP error: ${response.status}`,
          details: errText,
        },
        { status: 500 }
      );
    }

    const data = await response.json();
    const rawText = data.choices?.[0]?.message?.content || "";

    if (!rawText) {
      return NextResponse.json(
        { ok: false, error: "No response from OpenAI" },
        { status: 500 }
      );
    }

    console.log("[generate-recipes] Raw model response:", rawText);

    // --- 5. Clean & parse JSON safely -------------------------------------
    let cleaned = rawText.trim();

    // just in case the model still uses ```json ... ```
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```json\s*/i, "").replace(/^```/i, "");
      cleaned = cleaned.replace(/```$/i, "").trim();
    }

    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch (err) {
      console.error("[generate-recipes] JSON.parse failed:", err, {
        cleaned,
      });
      // Track failed recipe generation (non-blocking)
      try {
        fetch(`${req.nextUrl.origin}/api/track-recipe-generation`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: userId || 'anonymous',
            recipeCount: 0,
            ingredientCount: ingredients.length,
            success: false,
            userPlan: body?.userPlan || 'free'
          }),
        }).catch(() => {}) // Silent fail
      } catch {}
      
      return NextResponse.json(
        { ok: false, error: "LLM JSON parse error" },
        { status: 500 }
      );
    }

    if (
      !parsed ||
      !Array.isArray(parsed.recipes) ||
      !Array.isArray(parsed.shoppingList)
    ) {
      console.error(
        "[generate-recipes] Unexpected JSON shape from model:",
        parsed
      );
      // Track failed recipe generation (non-blocking)
      try {
        fetch(`${req.nextUrl.origin}/api/track-recipe-generation`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: userId || 'anonymous',
            recipeCount: 0,
            ingredientCount: ingredients.length,
            success: false,
            userPlan: body?.userPlan || 'free'
          }),
        }).catch(() => {}) // Silent fail
      } catch {}
      
      return NextResponse.json(
        { ok: false, error: "LLM JSON shape error" },
        { status: 500 }
      );
    }

    // Limit recipes to maximum 7 (in case LLM generates more)
    if (parsed.recipes.length > 7) {
      console.warn(`[generate-recipes] LLM generated ${parsed.recipes.length} recipes, limiting to 7`)
      parsed.recipes = parsed.recipes.slice(0, 7)
    }

    // Filter staples from youNeedToBuy and shopping list
    const STAPLES = [
      'salt', 'pepper', 'oregano', 'basil', 'thyme', 'rosemary', 'paprika', 'cumin', 
      'garlic powder', 'onion powder', 'cayenne', 'chili powder', 'curry powder',
      'olive oil', 'vegetable oil', 'canola oil', 'cooking oil', 'oil', 'butter', 
      'cooking spray', 'flour', 'sugar', 'brown sugar', 'garlic', 'onion', 'onions',
      'vinegar', 'white vinegar', 'balsamic vinegar', 'apple cider vinegar',
      'rice', 'pasta', 'bread', 'baking powder', 'baking soda', 'vanilla extract', 
      'vanilla', 'cornstarch', 'milk', 'cream', 'heavy cream', 'half and half',
      'black pepper', 'white pepper', 'sea salt', 'kosher salt', 'table salt'
    ]
    
    const isStaple = (item: string): boolean => {
      const normalized = item.toLowerCase().trim()
      return STAPLES.some(staple => normalized === staple || normalized.includes(staple))
    }

    // Filter staples from each recipe's youNeedToBuy
    parsed.recipes = parsed.recipes.map((recipe: any) => {
      if (Array.isArray(recipe.youNeedToBuy)) {
        recipe.youNeedToBuy = recipe.youNeedToBuy.filter((item: string) => !isStaple(item))
      }
      return recipe
    })

    // Filter staples from shopping list and deduplicate
    if (Array.isArray(parsed.shoppingList)) {
      parsed.shoppingList = [...new Set(
        parsed.shoppingList.filter((item: string) => !isStaple(item))
      )]
    }

    // Track OpenAI costs (non-blocking) - only if not cached
    if (!isCached) {
      try {
        const usage = data.usage || {}
        const promptTokens = usage.prompt_tokens || 2000 // Estimate if not provided
        const completionTokens = usage.completion_tokens || 2000
        const totalTokens = usage.total_tokens || (promptTokens + completionTokens)
        
        // GPT-4o pricing: $0.005 per 1K input tokens, $0.015 per 1K output tokens
        // For recipe generation, use higher estimate
        const inputCost = (promptTokens * 0.005 / 1000)
        const outputCost = (completionTokens * 0.015 / 1000)
        const totalCost = inputCost + outputCost
        
        const timestamp = new Date().toISOString()
        const dateKey = timestamp.split('T')[0] // YYYY-MM-DD
        const monthKey = timestamp.substring(0, 7) // YYYY-MM
        
        // Track daily costs
        await kv.hincrbyfloat(`costs:daily:${dateKey}`, 'openai_recipes', totalCost)
        await kv.hincrbyfloat(`costs:monthly:${monthKey}`, 'openai_recipes', totalCost)
        await kv.hincrbyfloat('costs:alltime', 'openai_recipes', totalCost)
        
        // Store detailed record for analytics (now that we have parsed data)
        const recordKey = `cost:recipe:${Date.now()}:${userId || 'anonymous'}`
        await kv.set(recordKey, {
          userId: userId || 'anonymous',
          tokens: totalTokens,
          cost: totalCost,
          recipeCount: parsed.recipes?.length || 0,
          cached: false,
          date: dateKey,
          timestamp,
          createdAt: Date.now(),
        }, { ex: 60 * 60 * 24 * 90 }) // Expire after 90 days
        
        console.log('[Cost Tracking] Recipe gen cost:', totalCost.toFixed(4), 'tokens:', totalTokens, 'recipes:', parsed.recipes?.length || 0)
      } catch (costError) {
        // Silent fail - cost tracking shouldn't block response
        console.warn('[Cost Tracking] Failed to track recipe cost:', costError)
      }
    }

    // Track recipe generation statistics (non-blocking)
    try {
      fetch(`${req.nextUrl.origin}/api/track-recipe-generation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            userId: userId || 'anonymous',
            recipeCount: parsed.recipes?.length || 0,
            ingredientCount: ingredients.length,
            success: true,
            cached: false, // This is a fresh generation, not cached
            userPlan: body?.userPlan || 'free'
          }),
      }).catch(err => {
        // Silent fail - tracking shouldn't block response
        console.warn('Failed to track recipe generation:', err)
      })
    } catch (trackErr) {
      // Silent fail
    }

    // --- 6. Generate images for recipes (with caching) -------------------
    const recipesWithImages = await Promise.all(
      parsed.recipes.map(async (recipe: any) => {
        // Check cache first
        const imageCacheKey = `recipe-image:${recipe.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
        
        try {
          const cachedImage = await kv.get(imageCacheKey)
          if (cachedImage) {
            console.log(`[generate-recipes] Image cache HIT for: ${recipe.title}`)
            return { ...recipe, imageUrl: cachedImage }
          }
        } catch (cacheErr) {
          console.warn('[generate-recipes] Image cache check failed:', cacheErr)
        }

        // Generate new image
        try {
          const imageUrl = await generateRecipeImage(recipe.title, recipe.mealType)
          
          if (imageUrl) {
            // Cache for 90 days
            try {
              await kv.set(imageCacheKey, imageUrl, { ex: 7776000 })
              console.log(`[generate-recipes] Generated and cached image for: ${recipe.title}`)
            } catch (cacheErr) {
              console.warn('[generate-recipes] Failed to cache image:', cacheErr)
            }
            
            return { ...recipe, imageUrl }
          }
        } catch (imageErr) {
          console.error(`[generate-recipes] Failed to generate image for ${recipe.title}:`, imageErr)
        }

        // Fallback to placeholder
        return { ...recipe, imageUrl: getFallbackImage(recipe.mealType) }
      })
    )

    // --- 8. Cache the results for 7 days ----------------------------------
    try {
      await kv.set(cacheRedisKey, {
        recipes: recipesWithImages,
        shoppingList: parsed.shoppingList,
        ingredients: sortedIngredients,
        createdAt: new Date().toISOString(),
      }, { ex: 604800 }) // Expire after 7 days (604800 seconds)
      
      console.log(`[generate-recipes] Cached ${recipesWithImages.length} recipes for key: ${cacheKey.substring(0, 8)}...`)
    } catch (cacheError) {
      // If caching fails, still return results (graceful degradation)
      console.warn('[generate-recipes] Failed to cache results:', cacheError)
    }

    // --- 9. Return normalized payload -------------------------------------
    return NextResponse.json(
      {
        ok: true,
        recipes: recipesWithImages,
        shoppingList: parsed.shoppingList,
        cached: false, // Indicate this was freshly generated
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[generate-recipes] route error:", err);

    const message =
      typeof err?.message === "string"
        ? err.message
        : "Unexpected server error during recipe generation.";

    return NextResponse.json(
      {
        ok: false,
        error: message.startsWith("[OpenAI Error]")
          ? "OpenAI HTTP error"
          : message,
        details: message,
      },
      { status: 500 }
    );
  }
}
