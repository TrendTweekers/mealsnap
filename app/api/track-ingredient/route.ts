import { NextRequest, NextResponse } from 'next/server'
import { kv } from '@vercel/kv'

export async function POST(req: NextRequest) {
  try {
    const { ingredient, userId } = await req.json()

    if (!ingredient || typeof ingredient !== 'string') {
      return NextResponse.json(
        { ok: false, error: 'Invalid ingredient' },
        { status: 400 }
      )
    }

    const cleanIngredient = ingredient.toLowerCase().trim()
    
    if (!cleanIngredient) {
      return NextResponse.json(
        { ok: false, error: 'Ingredient cannot be empty' },
        { status: 400 }
      )
    }

    const timestamp = new Date().toISOString()
    const ingredientKey = `manual_ingredient:${cleanIngredient}`

    try {
      // Increment count for this ingredient
      await kv.incr(ingredientKey)
      
      // Add to set of all manually added ingredients (for easy querying)
      await kv.sadd('manual_ingredients:all', cleanIngredient)
      
      // Store detailed record with timestamp (for analytics)
      const recordKey = `manual_ingredient:record:${Date.now()}:${cleanIngredient}`
      await kv.set(recordKey, {
        ingredient: cleanIngredient,
        userId: userId || 'unknown',
        timestamp,
        createdAt: Date.now(),
      }, { ex: 60 * 60 * 24 * 90 }) // Expire after 90 days
      
      console.log('[Ingredient Tracking]', { ingredient: cleanIngredient, userId, timestamp })
    } catch (kvError) {
      // If KV is not configured, just log (graceful degradation)
      console.warn('[Ingredient Tracking] Vercel KV not configured, logging only:', kvError)
      console.log('[Ingredient Tracking]', { ingredient: cleanIngredient, userId, timestamp })
    }

    return NextResponse.json({ ok: true, message: 'Ingredient tracked successfully' })
  } catch (err: any) {
    console.error('track-ingredient error:', err)
    return NextResponse.json(
      { ok: false, error: 'Failed to track ingredient' },
      { status: 500 }
    )
  }
}

