import { NextRequest, NextResponse } from 'next/server'
import { kv } from '@vercel/kv'

export async function POST(req: NextRequest) {
  try {
    const { ingredient, userId, scanId, timestamp } = await req.json()
    
    if (!ingredient || typeof ingredient !== 'string') {
      return NextResponse.json({ ok: false, error: 'Ingredient required' }, { status: 400 })
    }
    
    if (!scanId) {
      return NextResponse.json({ ok: false, error: 'Scan ID required' }, { status: 400 })
    }
    
    const cleanIngredient = ingredient.toLowerCase().trim()
    const dateKey = timestamp ? timestamp.split('T')[0] : new Date().toISOString().split('T')[0] // YYYY-MM-DD
    
    // Track missed detection count for this ingredient
    const missedKey = `missed_detection:${cleanIngredient}`
    await kv.incr(missedKey)
    
    // Track daily missed detections
    await kv.incr(`missed_detections:daily:${dateKey}`)
    await kv.incr('missed_detections:total')
    
    // Store detailed record
    const recordKey = `missed_detection:record:${Date.now()}:${cleanIngredient}`
    await kv.set(recordKey, {
      ingredient: cleanIngredient,
      userId: userId || 'anonymous',
      scanId: scanId,
      timestamp: timestamp || new Date().toISOString(),
      createdAt: Date.now(),
    }, { ex: 60 * 60 * 24 * 90 }) // Expire after 90 days
    
    // Add to set of all missed ingredients
    await kv.sadd('missed_detections:all', cleanIngredient)
    
    console.log('[Missed Detection]', { ingredient: cleanIngredient, userId, scanId })
    
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('track-missed-detection error:', err)
    // Graceful degradation - don't fail the request
    return NextResponse.json({ ok: false, error: 'Failed to track missed detection' }, { status: 500 })
  }
}

