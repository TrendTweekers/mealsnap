import { NextRequest, NextResponse } from 'next/server'
import { kv } from '@vercel/kv'

export async function POST(req: NextRequest) {
  try {
    const { ingredient, userId, scanId } = await req.json()
    
    if (!ingredient || typeof ingredient !== 'string') {
      return NextResponse.json({ ok: false, error: 'Ingredient required' }, { status: 400 })
    }
    
    const cleanIngredient = ingredient.toLowerCase().trim()
    const timestamp = new Date().toISOString()
    const dateKey = timestamp.split('T')[0] // YYYY-MM-DD
    
    // Track incorrect detection count for this ingredient
    const incorrectKey = `incorrect_detection:${cleanIngredient}`
    await kv.incr(incorrectKey)
    
    // Track daily incorrect detections
    await kv.incr(`incorrect_detections:daily:${dateKey}`)
    await kv.incr('incorrect_detections:total')
    
    // Store detailed record
    const recordKey = `incorrect_detection:record:${Date.now()}:${cleanIngredient}`
    await kv.set(recordKey, {
      ingredient: cleanIngredient,
      userId: userId || 'anonymous',
      scanId: scanId || null,
      timestamp,
      createdAt: Date.now(),
    }, { ex: 60 * 60 * 24 * 90 }) // Expire after 90 days
    
    // Add to set of all incorrectly detected ingredients
    await kv.sadd('incorrect_detections:all', cleanIngredient)
    
    console.log('[Incorrect Detection]', { ingredient: cleanIngredient, userId, scanId })
    
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('track-incorrect-detection error:', err)
    // Graceful degradation - don't fail the request
    return NextResponse.json({ ok: false, error: 'Failed to track incorrect detection' }, { status: 500 })
  }
}

