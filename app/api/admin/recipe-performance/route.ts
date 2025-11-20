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

    // Get most favorited recipes
    const favoriteKeys = await kv.keys('recipe:favorite:*')
    const favoriteCounts: { [key: string]: number } = {}
    
    for (const key of favoriteKeys) {
      const recipeTitle = key.replace('recipe:favorite:', '')
      const count = await kv.get<number>(key) || 0
      favoriteCounts[recipeTitle] = count
    }

    // Get most shared recipes
    const shareKeys = await kv.keys('recipe:share:*')
    const shareCounts: { [key: string]: number } = {}
    
    for (const key of shareKeys) {
      const recipeTitle = key.replace('recipe:share:', '')
      const count = await kv.get<number>(key) || 0
      shareCounts[recipeTitle] = count
    }

    // Get most generated recipes (from cache keys)
    const recipeCacheKeys = await kv.keys('recipes:*')
    const generationCounts: { [key: string]: number } = {}
    
    // Note: This is approximate - cache keys are hashed, so we can't get exact recipe titles
    // But we can count cache hits as a proxy for popularity
    const totalCacheHits = await kv.get<number>('stats:recipes:cached') || 0

    // Sort by popularity
    const topFavorited = Object.entries(favoriteCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([title, count]) => ({ title, favorites: count }))

    const topShared = Object.entries(shareCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([title, count]) => ({ title, shares: count }))

    return NextResponse.json({
      ok: true,
      performance: {
        mostFavorited: topFavorited,
        mostShared: topShared,
        totalCacheHits,
        totalUniqueRecipes: recipeCacheKeys.length
      }
    })
  } catch (err: any) {
    console.error('Recipe performance error:', err)
    return NextResponse.json(
      { ok: false, error: err.message || 'Failed to fetch recipe performance' },
      { status: 500 }
    )
  }
}

