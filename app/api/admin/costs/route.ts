import { NextRequest, NextResponse } from 'next/server'
import { kv } from '@vercel/kv'

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const authHeader = req.headers.get('authorization')
    const cookieAuth = req.headers.get('cookie')?.includes('admin_authenticated=true')
    
    if (!authHeader && !cookieAuth) {
      // Check localStorage via query param (for client-side)
      const isLocalAuth = req.nextUrl.searchParams.get('localAuth') === 'true'
      if (!isLocalAuth) {
        return NextResponse.json(
          { ok: false, error: 'Unauthorized' },
          { status: 401 }
        )
      }
    }

    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
    const thisMonth = new Date().toISOString().substring(0, 7) // YYYY-MM
    const thisWeekStart = new Date()
    thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay())
    const thisWeekStartStr = thisWeekStart.toISOString().split('T')[0]

    // Get today's costs
    const dailyCosts = await kv.hgetall(`costs:daily:${today}`) as Record<string, string> | null
    const monthlyCosts = await kv.hgetall(`costs:monthly:${thisMonth}`) as Record<string, string> | null
    const alltimeCosts = await kv.hgetall('costs:alltime') as Record<string, string> | null

    // Get this week's costs (aggregate from daily)
    let weekCosts = { openai_scan: 0, openai_recipes: 0, openai_images: 0 }
    const days = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(thisWeekStart)
      date.setDate(thisWeekStart.getDate() + i)
      days.push(date.toISOString().split('T')[0])
    }

    for (const date of days) {
      const dayCosts = await kv.hgetall(`costs:daily:${date}`) as Record<string, string> | null
      if (dayCosts) {
        weekCosts.openai_scan += parseFloat(dayCosts.openai_scan || '0')
        weekCosts.openai_recipes += parseFloat(dayCosts.openai_recipes || '0')
        weekCosts.openai_images += parseFloat(dayCosts.openai_images || '0')
      }
    }

    // Count image generations (check cache keys)
    let imageCount = 0
    let cachedImageCount = 0
    try {
      // Count recipe-image cache keys (these are cached images)
      const imageKeys = await kv.keys('recipe-image:*')
      cachedImageCount = imageKeys.length
      
      // Estimate total generated = cached (since we cache all generated images)
      imageCount = cachedImageCount
    } catch (err) {
      console.warn('Failed to count images:', err)
    }

    // Infrastructure cost (fixed)
    const INFRASTRUCTURE_DAILY = 3.23 // Vercel Pro + KV + other services
    const INFRASTRUCTURE_WEEKLY = INFRASTRUCTURE_DAILY * 7
    const INFRASTRUCTURE_MONTHLY = INFRASTRUCTURE_DAILY * 30

    // Calculate totals
    const todayTotal = {
      openai_scan: parseFloat(dailyCosts?.openai_scan || '0'),
      openai_recipes: parseFloat(dailyCosts?.openai_recipes || '0'),
      openai_images: parseFloat(dailyCosts?.openai_images || '0'),
      infrastructure: INFRASTRUCTURE_DAILY,
      total: parseFloat(dailyCosts?.openai_scan || '0') + 
              parseFloat(dailyCosts?.openai_recipes || '0') + 
              parseFloat(dailyCosts?.openai_images || '0') + 
              INFRASTRUCTURE_DAILY
    }

    const weekTotal = {
      openai_scan: weekCosts.openai_scan,
      openai_recipes: weekCosts.openai_recipes,
      openai_images: weekCosts.openai_images,
      infrastructure: INFRASTRUCTURE_WEEKLY,
      total: weekCosts.openai_scan + weekCosts.openai_recipes + weekCosts.openai_images + INFRASTRUCTURE_WEEKLY
    }

    const monthTotal = {
      openai_scan: parseFloat(monthlyCosts?.openai_scan || '0'),
      openai_recipes: parseFloat(monthlyCosts?.openai_recipes || '0'),
      openai_images: parseFloat(monthlyCosts?.openai_images || '0'),
      infrastructure: INFRASTRUCTURE_MONTHLY,
      total: parseFloat(monthlyCosts?.openai_scan || '0') + 
              parseFloat(monthlyCosts?.openai_recipes || '0') + 
              parseFloat(monthlyCosts?.openai_images || '0') + 
              INFRASTRUCTURE_MONTHLY
    }

    const alltimeTotal = {
      openai_scan: parseFloat(alltimeCosts?.openai_scan || '0'),
      openai_recipes: parseFloat(alltimeCosts?.openai_recipes || '0'),
      openai_images: parseFloat(alltimeCosts?.openai_images || '0'),
      infrastructure: 0, // Not tracked for all-time
      total: parseFloat(alltimeCosts?.openai_scan || '0') + 
              parseFloat(alltimeCosts?.openai_recipes || '0') + 
              parseFloat(alltimeCosts?.openai_images || '0')
    }

    // Estimate cache savings (if we regenerated all cached images)
    const estimatedImageSavings = cachedImageCount * 0.04 // $0.04 per image if regenerated

    return NextResponse.json({
      ok: true,
      costs: {
        today: todayTotal,
        week: weekTotal,
        month: monthTotal,
        alltime: alltimeTotal
      },
      imageStats: {
        generated: imageCount,
        cached: cachedImageCount,
        cacheHitRate: cachedImageCount > 0 ? 100 : 0, // All generated images are cached
        estimatedSavings: estimatedImageSavings
      },
      breakdown: {
        today: dailyCosts || {},
        month: monthlyCosts || {},
        alltime: alltimeCosts || {}
      }
    })
  } catch (err: any) {
    console.error('Cost tracking error:', err)
    return NextResponse.json(
      { ok: false, error: err.message || 'Failed to fetch cost data' },
      { status: 500 }
    )
  }
}

