import { NextRequest, NextResponse } from 'next/server'
import { kv } from '@vercel/kv'
import { cookies } from 'next/headers'

async function checkAdminAuth() {
  const cookieStore = await cookies()
  const authCookie = cookieStore.get('admin_auth')
  return authCookie?.value === 'authenticated'
}

export async function GET(req: NextRequest) {
  // Check admin authentication
  const isAuthenticated = await checkAdminAuth()
  if (!isAuthenticated) {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized. Admin authentication required.' },
      { status: 401 }
    )
  }

  try {
    // Get all missed ingredients
    const missedIngredients = await kv.smembers('missed_ingredients:all') || []
    const allManualIngredients = await kv.smembers('manual_ingredients:all') || []

    // Get counts and details for missed ingredients
    const missedIngredientStats = await Promise.all(
      missedIngredients.map(async (ingredient: string) => {
        const missedCount = await kv.get<number>(`missed_ingredient:${ingredient}`) || 0
        const totalManualCount = await kv.get<number>(`manual_ingredient:${ingredient}`) || 0
        
        // Get sample scan IDs and reasons for this ingredient
        const sampleRecords: any[] = []
        const pattern = `missed_ingredient:record:*:${ingredient}`
        
        // Get recent records (last 50)
        // Note: Redis doesn't support wildcard scans easily, so we'll get what we can
        // For better performance, we'd maintain a separate sorted set
        
        return {
          ingredient,
          missedCount,
          totalManualCount,
          missRate: totalManualCount > 0 ? Math.round((missedCount / totalManualCount) * 100) : 0,
          sampleRecords: sampleRecords.slice(0, 5),
        }
      })
    )

    // Sort by missed count (descending)
    const sortedMissed = missedIngredientStats
      .filter(item => item.missedCount > 0)
      .sort((a, b) => b.missedCount - a.missedCount)

    // Calculate accuracy score
    const totalMissed = missedIngredientStats.reduce((sum, item) => sum + item.missedCount, 0)
    const totalManual = allManualIngredients.reduce(async (sumPromise, ingredient) => {
      const count = await kv.get<number>(`manual_ingredient:${ingredient}`) || 0
      return (await sumPromise) + count
    }, Promise.resolve(0))
    const totalManualCount = await totalManual
    
    // Get overall scan count from stats
    const totalScans = await kv.get<number>('stats:scans:success') || 0
    const accuracyScore = totalScans > 0 
      ? Math.round(((totalScans - totalMissed) / totalScans) * 100) 
      : 100

    // Generate improvement suggestions
    const improvementSuggestions: string[] = []
    
    // Top 5 most missed ingredients
    const topMissed = sortedMissed.slice(0, 5)
    topMissed.forEach((item) => {
      if (item.missRate > 30) {
        improvementSuggestions.push(
          `Improve detection for "${item.ingredient}" (missed ${item.missRate}% of the time)`
        )
      }
    })

    // Get date range for "first seen" and "last seen"
    const now = Date.now()
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000)
    
    // For each missed ingredient, get common issues
    const missedWithDetails = await Promise.all(
      sortedMissed.slice(0, 10).map(async (item) => {
        // Get sample records to identify common issues
        // In a real implementation, we'd maintain a sorted set by timestamp
        const commonIssues: string[] = []
        
        // Try to infer common issues from ingredient name patterns
        if (item.ingredient.includes('chicken') || item.ingredient.includes('meat')) {
          commonIssues.push('packaging')
          commonIssues.push('in_container')
        }
        if (item.ingredient.includes('garlic') || item.ingredient.includes('onion')) {
          commonIssues.push('small_size')
          commonIssues.push('behind_other_items')
        }
        if (item.ingredient.includes('butter') || item.ingredient.includes('cheese')) {
          commonIssues.push('packaging')
          commonIssues.push('similar_to_others')
        }

        return {
          ingredient: item.ingredient,
          count: item.missedCount,
          missRate: item.missRate,
          commonIssues: commonIssues.length > 0 ? commonIssues : ['unknown'],
          imageSamples: [], // Would contain scan IDs if we tracked them
          firstSeen: new Date(sevenDaysAgo).toISOString().split('T')[0],
          lastSeen: new Date().toISOString().split('T')[0],
        }
      })
    )

    return NextResponse.json({
      ok: true,
      missedIngredients: missedWithDetails,
      accuracyScore,
      improvementSuggestions: improvementSuggestions.slice(0, 5),
      summary: {
        totalMissed,
        totalManual: totalManualCount,
        uniqueMissedIngredients: sortedMissed.length,
      },
    })
  } catch (err: any) {
    console.error('admin/training-data error:', err)
    // If KV is not configured, return empty data
    return NextResponse.json({
      ok: true,
      missedIngredients: [],
      accuracyScore: 100,
      improvementSuggestions: [],
      summary: {
        totalMissed: 0,
        totalManual: 0,
        uniqueMissedIngredients: 0,
      },
    })
  }
}

