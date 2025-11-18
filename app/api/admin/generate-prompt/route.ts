import { NextRequest, NextResponse } from 'next/server'
import { kv } from '@vercel/kv'
import { cookies } from 'next/headers'

async function checkAdminAuth() {
  const cookieStore = await cookies()
  const authCookie = cookieStore.get('admin_auth')
  return authCookie?.value === 'authenticated'
}

export async function GET(req: NextRequest) {
  // TEMP: Skip auth check for debugging (frontend uses localStorage)
  // TODO: Re-enable proper authentication later
  // const isAuthenticated = await checkAdminAuth()
  // if (!isAuthenticated) {
  //   return NextResponse.json(
  //     { ok: false, error: 'Unauthorized. Admin authentication required.' },
  //     { status: 401 }
  //   )
  // }

  try {
    // Get top missed ingredients
    const missedIngredients = await kv.smembers('missed_ingredients:all') || []
    const missedIngredientStats = await Promise.all(
      missedIngredients.map(async (ingredient: string) => {
        const missedCount = await kv.get<number>(`missed_ingredient:${ingredient}`) || 0
        const totalManualCount = await kv.get<number>(`manual_ingredient:${ingredient}`) || 0
        return {
          ingredient,
          missedCount,
          missRate: totalManualCount > 0 ? Math.round((missedCount / totalManualCount) * 100) : 0,
        }
      })
    )

    const topMissed = missedIngredientStats
      .filter(item => item.missedCount > 0)
      .sort((a, b) => b.missedCount - a.missedCount)
      .slice(0, 10)

    // Build improved prompt based on missed ingredients
    let improvedPrompt = `You are an ingredient detection AI. Task: Look at this single fridge/pantry photo and list only the food items that are CLEARLY and UNAMBIGUOUSLY visible.

IMPORTANT RULES (follow strictly):
- Only include items you are at least 90% sure about.
- If you are not sure what something is, DO NOT include it.
- Do NOT invent or guess ingredients based on context or culture.
- If packaging text is not readable, do NOT guess the product from shape alone.
- Generic categories are acceptable ("yogurt", "cheese", "buttery spread") if brand is unclear.
- Ignore any dishes or meals that you can't see directly (no guessing things like dumplings, soups, etc.).
- Ignore all non-food items.

`

    // Add specific improvements based on missed ingredients
    if (topMissed.length > 0) {
      improvedPrompt += `SPECIAL ATTENTION REQUIRED:\n`
      improvedPrompt += `Pay extra attention to these commonly missed items (they ARE often in the photo):\n`
      topMissed.forEach((item, index) => {
        improvedPrompt += `${index + 1}. ${item.ingredient} (often missed ${item.missRate}% of the time)\n`
      })
      improvedPrompt += `\n`

      // Add specific detection hints
      const hasPackagedItems = topMissed.some(item => 
        item.ingredient.includes('chicken') || 
        item.ingredient.includes('meat') || 
        item.ingredient.includes('butter')
      )
      
      const hasSmallItems = topMissed.some(item => 
        item.ingredient.includes('garlic') || 
        item.ingredient.includes('onion')
      )

      if (hasPackagedItems) {
        improvedPrompt += `PACKAGING DETECTION:\n`
        improvedPrompt += `- Look carefully at items in packaging, wrappers, or containers\n`
        improvedPrompt += `- Even if label text is not readable, identify by shape and packaging type\n`
        improvedPrompt += `- Common packaged items: chicken, meats, butter, cheese, yogurt\n`
        improvedPrompt += `\n`
      }

      if (hasSmallItems) {
        improvedPrompt += `SMALL ITEM DETECTION:\n`
        improvedPrompt += `- Pay attention to small items that might be behind or next to larger items\n`
        improvedPrompt += `- Look for: garlic, onions, small vegetables, spices\n`
        improvedPrompt += `\n`
      }
    }

    improvedPrompt += `Output format: Return ONLY a JSON object with this exact shape, e.g.:
{
  "ingredients": ["yogurt", "eggs", "cheese slices", "buttery spread"]
}

No explanations, no comments, no extra text.`

    return NextResponse.json({
      ok: true,
      improvedPrompt,
      improvements: {
        topMissedIngredients: topMissed.map(item => item.ingredient),
        addedPackagingDetection: topMissed.some(item => 
          item.ingredient.includes('chicken') || item.ingredient.includes('meat')
        ),
        addedSmallItemDetection: topMissed.some(item => 
          item.ingredient.includes('garlic') || item.ingredient.includes('onion')
        ),
      },
    })
  } catch (err: any) {
    console.error('admin/generate-prompt error:', err)
    return NextResponse.json(
      { ok: false, error: 'Failed to generate prompt' },
      { status: 500 }
    )
  }
}

