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

    const { userId, ingredientCount, success } = await req.json()

    const timestamp = new Date().toISOString()
    const dateKey = new Date().toISOString().split('T')[0] // YYYY-MM-DD
    const hourKey = new Date().toISOString().slice(0, 13) // YYYY-MM-DDTHH

    try {
      // Increment total scan count
      await kv.incr('stats:scans:total')
      
      // Increment daily scan count
      await kv.incr(`stats:scans:daily:${dateKey}`)
      
      // Increment hourly scan count (for hourly breakdown)
      await kv.incr(`stats:scans:hourly:${hourKey}`)
      
      // Track successful scans
      if (success) {
        await kv.incr('stats:scans:success')
      } else {
        await kv.incr('stats:scans:failed')
      }

      // Track ingredient count distribution
      if (typeof ingredientCount === 'number' && ingredientCount > 0) {
        const countKey = ingredientCount <= 5 ? '1-5' :
                        ingredientCount <= 10 ? '6-10' :
                        ingredientCount <= 15 ? '11-15' :
                        '16+'
        await kv.incr(`stats:scans:ingredient_count:${countKey}`)
      }

      // Store detailed scan record (for analytics)
      const scanKey = `scan:${Date.now()}:${userId || 'anonymous'}`
      await kv.set(scanKey, {
        userId: userId || 'anonymous',
        ingredientCount: ingredientCount || 0,
        success: success !== false,
        timestamp,
        createdAt: Date.now(),
      }, { ex: 60 * 60 * 24 * 90 }) // Expire after 90 days

      // Track unique users (if userId provided)
      if (userId && userId !== 'anonymous') {
        await kv.sadd('stats:users:unique', userId)
        
        // Track customer usage if they're a paying customer
        const userPlan = await kv.get<string>(`user:${userId}:plan`)
        if (userPlan === 'pro' || userPlan === 'family') {
          await kv.incr(`customer:${userId}:scans`)
          await kv.set(`customer:${userId}:last_active`, timestamp)
        }
      }

      console.log('[Scan Tracking]', { userId, ingredientCount, success, timestamp })
    } catch (kvError) {
      // If KV is not configured, just log (graceful degradation)
      console.warn('[Scan Tracking] Vercel KV not configured, logging only:', kvError)
      console.log('[Scan Tracking]', { userId, ingredientCount, success, timestamp })
    }

    return NextResponse.json({ ok: true, message: 'Scan tracked successfully' })
  } catch (err: any) {
    console.error('track-scan error:', err)
    return NextResponse.json(
      { ok: false, error: 'Failed to track scan' },
      { status: 500 }
    )
  }
}

