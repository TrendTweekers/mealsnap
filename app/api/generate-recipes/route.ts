import { NextRequest, NextResponse } from "next/server";
import { kv } from '@vercel/kv';
import { createHash } from 'crypto';

const apiKey = process.env.OPENAI_API_KEY;

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

    try {
      // Check if we have cached recipes for these ingredients
      const cached = await kv.get(cacheRedisKey)
      
      if (cached) {
        console.log(`[generate-recipes] Cache HIT for key: ${cacheKey.substring(0, 8)}...`)
        
        // Track cache hit (non-blocking)
        try {
          fetch(`${req.nextUrl.origin}/api/track-recipe-generation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: userId || 'anonymous',
              recipeCount: cached.recipes?.length || 0,
              ingredientCount: ingredients.length,
              success: true,
              cached: true,
            }),
          }).catch(() => {}) // Silent fail
        } catch {}
        
        return NextResponse.json(
          {
            ok: true,
            recipes: cached.recipes || [],
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
You are a cooking assistant.

User gives you a list of ingredients currently in their fridge/pantry.

INGREDIENTS:
${ingredients.join(", ")}

TASK:
1. Create 6–8 very simple, realistic recipes using ONLY these ingredients plus very basic pantry staples:
   - Allowed extra staples: salt, pepper, oil, water, sugar, basic dried herbs.
   - DO NOT invent ingredients that are clearly not available (no "Silesian dumplings" etc.).
   - Aim for variety: include breakfast, lunch, dinner, and snack options when possible.

2. Each recipe should:
   - Have: title, mealType ("breakfast" | "lunch" | "dinner" | "snack"),
           timeMinutes (approx total time),
           difficulty ("easy" | "medium"),
           youAlreadyHave (list of ingredients from the fridge list),
           youNeedToBuy (small list of extra ingredients, can be empty),
           steps (5–8 short numbered steps).

3. Also create a shopping list that merges and deduplicates all "youNeedToBuy" items across recipes.

RESPONSE FORMAT:
Return ONLY valid JSON in this exact structure (no comments, no prose):

{
  "recipes": [
    {
      "title": "string",
      "mealType": "breakfast" | "lunch" | "dinner" | "snack",
      "timeMinutes": number,
      "difficulty": "easy" | "medium",
      "youAlreadyHave": ["string", "..."],
      "youNeedToBuy": ["string", "..."],
      "steps": ["Step 1...", "Step 2...", "..."]
    }
  ],
  "shoppingList": [
    "item 1",
    "item 2"
  ]
}

RULES:
- Response MUST be valid JSON that can be parsed by JSON.parse in JavaScript.
- Do NOT wrap the JSON in backticks or a \`\`\`json code block.
- Do NOT include any additional text before or after the JSON.
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
          }),
        }).catch(() => {}) // Silent fail
      } catch {}
      
      return NextResponse.json(
        { ok: false, error: "LLM JSON shape error" },
        { status: 500 }
      );
    }

    // Track OpenAI costs (non-blocking) - only if not cached
    if (!cached) {
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
          cached: cached || false,
        }),
      }).catch(err => {
        // Silent fail - tracking shouldn't block response
        console.warn('Failed to track recipe generation:', err)
      })
    } catch (trackErr) {
      // Silent fail
    }

    // --- 6. Cache the results for 7 days ----------------------------------
    try {
      await kv.set(cacheRedisKey, {
        recipes: parsed.recipes,
        shoppingList: parsed.shoppingList,
        ingredients: sortedIngredients,
        createdAt: new Date().toISOString(),
      }, { ex: 604800 }) // Expire after 7 days (604800 seconds)
      
      console.log(`[generate-recipes] Cached recipes for key: ${cacheKey.substring(0, 8)}...`)
    } catch (cacheError) {
      // If caching fails, still return results (graceful degradation)
      console.warn('[generate-recipes] Failed to cache results:', cacheError)
    }

    // --- 7. Return normalized payload -------------------------------------
    return NextResponse.json(
      {
        ok: true,
        recipes: parsed.recipes,
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
