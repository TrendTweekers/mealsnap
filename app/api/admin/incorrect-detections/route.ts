import { NextRequest, NextResponse } from 'next/server'
import { kv } from '@vercel/kv'

export async function GET(req: NextRequest) {
  try {
    // Basic authentication (same as other admin routes)
    const authHeader = req.headers.get('authorization')
    const cookieAuth = req.headers.get('cookie')?.includes('admin_authenticated=true')
    
    if (!authHeader && !cookieAuth) {
      const isLocalAuth = req.nextUrl.searchParams.get('localAuth') === 'true'
      if (!isLocalAuth) {
        return NextResponse.json(
          { ok: false, error: 'Unauthorized' },
          { status: 401 }
        )
      }
    }

    // Get all incorrectly detected ingredients (false positives)
    const incorrectIngredients = await kv.smembers('incorrect_detections:all') || []
    
    // Get all missed ingredients (false negatives)
    const missedIngredients = await kv.smembers('missed_detections:all') || []
    
    // Get counts and stats for each incorrectly detected ingredient
    const incorrectStats = await Promise.all(
      incorrectIngredients.map(async (ingredient: string) => {
        const incorrectCount = await kv.get<number>(`incorrect_detection:${ingredient}`) || 0
        
        // Get total scans to calculate false positive rate
        const totalScans = await kv.get<number>('stats:scans:success') || 0
        
        // Calculate false positive rate (how often this ingredient is incorrectly detected)
        const falsePositiveRate = totalScans > 0 
          ? Math.round((incorrectCount / totalScans) * 100 * 10) / 10 // Round to 1 decimal
          : 0
        
        return {
          ingredient,
          incorrectCount,
          falsePositiveRate,
        }
      })
    )

    // Sort by incorrect count (highest first)
    const sorted = incorrectStats
      .filter(item => item.incorrectCount > 0)
      .sort((a, b) => b.incorrectCount - a.incorrectCount)

    // Get total incorrect detections (false positives)
    const totalIncorrect = await kv.get<number>('incorrect_detections:total') || 0
    
    // Get total missed detections (false negatives)
    const totalMissed = await kv.get<number>('missed_detections:total') || 0
    
    // Get daily breakdown (last 7 days)
    const today = new Date().toISOString().split('T')[0]
    const dailyBreakdown: { [key: string]: number } = {}
    for (let i = 0; i < 7; i++) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateKey = date.toISOString().split('T')[0]
      const count = await kv.get<number>(`incorrect_detections:daily:${dateKey}`) || 0
      dailyBreakdown[dateKey] = count
    }

    // Calculate overall false positive and false negative rates
    const totalScans = await kv.get<number>('stats:scans:success') || 0
    const overallFalsePositiveRate = totalScans > 0
      ? Math.round((totalIncorrect / totalScans) * 100 * 10) / 10
      : 0
    const overallFalseNegativeRate = totalScans > 0
      ? Math.round((totalMissed / totalScans) * 100 * 10) / 10
      : 0
    
    // Calculate overall accuracy
    const overallAccuracy = totalScans > 0
      ? Math.max(0, Math.round((100 - overallFalsePositiveRate - overallFalseNegativeRate) * 10) / 10)
      : 100

    // Generate improvement suggestions
    const improvementSuggestions: string[] = []
    
    // Top incorrectly detected ingredients
    const topIncorrect = sorted.slice(0, 5)
    topIncorrect.forEach((item) => {
      if (item.falsePositiveRate > 5) {
        improvementSuggestions.push(
          `Reduce false positives for "${item.ingredient}" (incorrectly detected ${item.falsePositiveRate}% of scans)`
        )
      }
    })

    // Add general suggestions based on patterns
    if (overallFalsePositiveRate > 10) {
      improvementSuggestions.push(
        `Overall false positive rate is ${overallFalsePositiveRate}% - consider increasing confidence threshold to 85%+`
      )
    }

    if (topIncorrect.length > 0) {
      const commonPatterns = topIncorrect.map(item => item.ingredient).join(', ')
      improvementSuggestions.push(
        `Most common false positives: ${commonPatterns} - add explicit rules to exclude these unless clearly visible`
      )
    }

    // Get missed detection stats
    const missedStats = await Promise.all(
      missedIngredients.map(async (ingredient: string) => {
        const missedCount = await kv.get<number>(`missed_detection:${ingredient}`) || 0
        const falseNegativeRate = totalScans > 0 
          ? Math.round((missedCount / totalScans) * 100 * 10) / 10
          : 0
        return {
          ingredient,
          missedCount,
          falseNegativeRate,
        }
      })
    )
    const topMissed = missedStats
      .filter(item => item.missedCount > 0)
      .sort((a, b) => b.missedCount - a.missedCount)
      .slice(0, 10)

    return NextResponse.json({
      ok: true,
      incorrectDetections: {
        total: totalIncorrect || 0,
        overallFalsePositiveRate: overallFalsePositiveRate || 0,
        overallFalseNegativeRate: overallFalseNegativeRate || 0,
        overallAccuracy: overallAccuracy || 100,
        totalScans: totalScans || 0,
        topIncorrect: sorted.slice(0, 10) || [],
        topMissed: topMissed || [],
        dailyBreakdown: dailyBreakdown || {},
        improvementSuggestions: improvementSuggestions.slice(0, 5) || [],
      }
    })

  } catch (err: any) {
    console.error('Admin incorrect-detections route error:', err)
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch incorrect detection data' },
      { status: 500 }
    )
  }
}

