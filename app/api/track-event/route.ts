import { NextRequest, NextResponse } from 'next/server'
import { kv } from '@vercel/kv'

export async function POST(req: NextRequest) {
  try {
    const { event, recipeTitle, method, itemCount, location, currentPlan, userId } = await req.json()
    
    const timestamp = new Date().toISOString()
    const dateKey = timestamp.split('T')[0] // YYYY-MM-DD
    
    try {
      switch (event) {
        case 'recipe_favorited':
          await kv.incr('stats:recipes:favorited')
          await kv.incr(`stats:recipes:favorited:daily:${dateKey}`)
          if (recipeTitle) {
            await kv.incr(`recipe:favorite:${recipeTitle.toLowerCase()}`)
          }
          break
          
        case 'recipe_shared':
          await kv.incr('stats:recipes:shared')
          await kv.incr(`stats:recipes:shared:daily:${dateKey}`)
          if (recipeTitle) {
            await kv.incr(`recipe:share:${recipeTitle.toLowerCase()}`)
          }
          break
          
        case 'instacart_clicked':
          await kv.incr('stats:affiliate:instacart:clicks')
          await kv.incr(`stats:affiliate:instacart:clicks:daily:${dateKey}`)
          break
          
        case 'pwa_installed':
          await kv.incr('stats:pwa:installed')
          break
          
        case 'upgrade_clicked':
          await kv.incr('stats:upgrade:clicked')
          break
          
        case 'error_occurred':
          await kv.incr(`stats:errors:${location || 'unknown'}`)
          // Store error details
          const errorKey = `error:${Date.now()}:${userId || 'anonymous'}`
          await kv.set(errorKey, {
            type: event,
            location,
            userId: userId || 'anonymous',
            timestamp,
            createdAt: Date.now()
          }, { ex: 60 * 60 * 24 * 30 }) // Expire after 30 days
          break
      }
    } catch (kvError) {
      console.warn('[Event Tracking] KV error:', kvError)
      // Silent fail - don't block user experience
    }
    
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('track-event error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to track event' }, { status: 500 })
  }
}

