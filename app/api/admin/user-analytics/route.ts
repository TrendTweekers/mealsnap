import { NextRequest, NextResponse } from 'next/server'
import { kv } from '@vercel/kv'

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const authHeader = req.headers.get('authorization')
    const cookieAuth = req.headers.get('cookie')?.includes('admin_authenticated=true')
    const isLocalAuth = req.nextUrl.searchParams.get('localAuth') === 'true'
    
    if (!authHeader && !cookieAuth && !isLocalAuth) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Get user behavior stats from KV
    const favoritesCount = await kv.get<number>('stats:recipes:favorited') || 0
    const sharesCount = await kv.get<number>('stats:recipes:shared') || 0
    const instacartClicks = await kv.get<number>('stats:affiliate:instacart:clicks') || 0
    const emailCaptures = await kv.get<number>('waitlist:count') || 0
    const pwaInstalls = await kv.get<number>('stats:pwa:installed') || 0
    const upgradeClicks = await kv.get<number>('stats:upgrade:clicked') || 0

    // Get today's stats
    const today = new Date().toISOString().split('T')[0]
    const favoritesToday = await kv.get<number>(`stats:recipes:favorited:daily:${today}`) || 0
    const sharesToday = await kv.get<number>(`stats:recipes:shared:daily:${today}`) || 0
    const instacartToday = await kv.get<number>(`stats:affiliate:instacart:clicks:daily:${today}`) || 0
    const emailsToday = await kv.get<number>(`waitlist:daily:${today}`) || 0

    // Calculate engagement rates
    const totalRecipeGens = await kv.get<number>('stats:recipes:total') || 0
    const favoriteRate = totalRecipeGens > 0 ? (favoritesCount / totalRecipeGens) * 100 : 0
    const shareRate = totalRecipeGens > 0 ? (sharesCount / totalRecipeGens) * 100 : 0
    const instacartRate = totalRecipeGens > 0 ? (instacartClicks / totalRecipeGens) * 100 : 0

    // Get unique users
    const uniqueUsers = await kv.scard('stats:users:unique') || 0
    const emailCaptureRate = uniqueUsers > 0 ? (emailCaptures / uniqueUsers) * 100 : 0

    return NextResponse.json({
      ok: true,
      analytics: {
        favorites: {
          total: favoritesCount,
          today: favoritesToday,
          rate: Math.round(favoriteRate * 10) / 10
        },
        shares: {
          total: sharesCount,
          today: sharesToday,
          rate: Math.round(shareRate * 10) / 10
        },
        instacart: {
          total: instacartClicks,
          today: instacartToday,
          rate: Math.round(instacartRate * 10) / 10
        },
        emails: {
          total: emailCaptures,
          today: emailsToday,
          captureRate: Math.round(emailCaptureRate * 10) / 10
        },
        pwa: {
          total: pwaInstalls
        },
        upgrades: {
          total: upgradeClicks
        }
      }
    })
  } catch (err: any) {
    console.error('User analytics error:', err)
    return NextResponse.json(
      { ok: false, error: err.message || 'Failed to fetch user analytics' },
      { status: 500 }
    )
  }
}

