import { NextRequest, NextResponse } from 'next/server'
import { kv } from '@vercel/kv'

export async function POST(req: NextRequest) {
  try {
    // Limit request body size
    const contentLength = req.headers.get('content-length')
    if (contentLength && parseInt(contentLength, 10) > 10 * 1024) {
      return NextResponse.json(
        { ok: false, error: 'Request too large' },
        { status: 413 }
      )
    }

    const { userId, recipeCount, ingredientCount, success, cached } = await req.json()

    const timestamp = new Date().toISOString()
    const dateKey = new Date().toISOString().split('T')[0] // YYYY-MM-DD

    try {
      // Only increment total count if not cached (to avoid double counting)
      if (!cached) {
        await kv.incr('stats:recipes:total')
      }
      
      // Increment daily recipe generation count (always, even if cached - it's still a request)
      await kv.incr(`stats:recipes:daily:${dateKey}`)

      // Track successful recipe generations
      if (success) {
        // Only count as new generation if not cached
        if (!cached) {
          await kv.incr('stats:recipes:success')
        }
        // Track cache hits separately
        if (cached) {
          await kv.incr('stats:recipes:cached')
        }
      } else {
        await kv.incr('stats:recipes:failed')
      }

      // Track recipe count distribution (only for non-cached, to avoid double counting)
      if (!cached && typeof recipeCount === 'number' && recipeCount > 0) {
        const countKey = recipeCount <= 3 ? '1-3' :
                        recipeCount <= 6 ? '4-6' :
                        recipeCount <= 9 ? '7-9' :
                        '10+'
        await kv.incr(`stats:recipes:count:${countKey}`)
        
        // Add to total recipes generated (only for new generations)
        await kv.incrby('stats:recipes:total_generated', recipeCount)
      }

      // Track average recipe count per generation
      if (typeof recipeCount === 'number' && recipeCount > 0) {
        const totalGenerations = await kv.get<number>('stats:recipes:success') || 1
        const totalRecipes = await kv.get<number>('stats:recipes:total_generated') || 0
        // We'll calculate average on retrieval
      }

      // Store detailed recipe generation record (for analytics)
      const recordKey = `recipe_gen:${Date.now()}:${userId || 'anonymous'}`
      await kv.set(recordKey, {
        userId: userId || 'anonymous',
        recipeCount: recipeCount || 0,
        ingredientCount: ingredientCount || 0,
        success: success !== false,
        timestamp,
        createdAt: Date.now(),
      }, { ex: 60 * 60 * 24 * 90 }) // Expire after 90 days

      console.log('[Recipe Generation Tracking]', { userId, recipeCount, ingredientCount, success, timestamp })
    } catch (kvError) {
      // If KV is not configured, just log (graceful degradation)
      console.warn('[Recipe Generation Tracking] Vercel KV not configured, logging only:', kvError)
      console.log('[Recipe Generation Tracking]', { userId, recipeCount, ingredientCount, success, timestamp })
    }

    return NextResponse.json({ ok: true, message: 'Recipe generation tracked successfully' })
  } catch (err: any) {
    console.error('track-recipe-generation error:', err)
    return NextResponse.json(
      { ok: false, error: 'Failed to track recipe generation' },
      { status: 500 }
    )
  }
}

