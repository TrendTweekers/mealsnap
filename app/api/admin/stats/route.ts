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
    // Get scan statistics
    const totalScans = await kv.get<number>('stats:scans:total') || 0
    const successfulScans = await kv.get<number>('stats:scans:success') || 0
    const failedScans = await kv.get<number>('stats:scans:failed') || 0

    // Get recipe statistics
    const totalRecipeGens = await kv.get<number>('stats:recipes:total') || 0
    const successfulRecipeGens = await kv.get<number>('stats:recipes:success') || 0
    const failedRecipeGens = await kv.get<number>('stats:recipes:failed') || 0
    const totalRecipesGenerated = await kv.get<number>('stats:recipes:total_generated') || 0

    // Get unique users
    const uniqueUsers = await kv.scard('stats:users:unique') || 0

    // Get daily scans for last 7 days
    const dailyScans: { [key: string]: number } = {}
    const dailyRecipes: { [key: string]: number } = {}
    const today = new Date()
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateKey = date.toISOString().split('T')[0]
      dailyScans[dateKey] = await kv.get<number>(`stats:scans:daily:${dateKey}`) || 0
      dailyRecipes[dateKey] = await kv.get<number>(`stats:recipes:daily:${dateKey}`) || 0
    }

    // Get ingredient count distribution
    const ingredientCounts = {
      '1-5': await kv.get<number>('stats:scans:ingredient_count:1-5') || 0,
      '6-10': await kv.get<number>('stats:scans:ingredient_count:6-10') || 0,
      '11-15': await kv.get<number>('stats:scans:ingredient_count:11-15') || 0,
      '16+': await kv.get<number>('stats:scans:ingredient_count:16+') || 0,
    }

    // Get recipe count distribution
    const recipeCounts = {
      '1-3': await kv.get<number>('stats:recipes:count:1-3') || 0,
      '4-6': await kv.get<number>('stats:recipes:count:4-6') || 0,
      '7-9': await kv.get<number>('stats:recipes:count:7-9') || 0,
      '10+': await kv.get<number>('stats:recipes:count:10+') || 0,
    }

    // Calculate averages
    const avgIngredientsPerScan = totalScans > 0 ? 
      Object.entries(ingredientCounts).reduce((sum, [range, count]) => {
        const mid = range === '1-5' ? 3 : range === '6-10' ? 8 : range === '11-15' ? 13 : 18
        return sum + (mid * count)
      }, 0) / totalScans : 0

    const avgRecipesPerGeneration = successfulRecipeGens > 0 ? 
      totalRecipesGenerated / successfulRecipeGens : 0

    // Get today's stats
    const todayKey = today.toISOString().split('T')[0]
    const scansToday = await kv.get<number>(`stats:scans:daily:${todayKey}`) || 0
    const recipesToday = await kv.get<number>(`stats:recipes:daily:${todayKey}`) || 0

    // Get hourly stats for today (last 24 hours)
    const hourlyScans: { [key: string]: number } = {}
    for (let i = 23; i >= 0; i--) {
      const hour = new Date(today)
      hour.setHours(hour.getHours() - i)
      const hourKey = hour.toISOString().slice(0, 13)
      hourlyScans[hourKey] = await kv.get<number>(`stats:scans:hourly:${hourKey}`) || 0
    }

    // Calculate success rates
    const scanSuccessRate = totalScans > 0 ? (successfulScans / totalScans) * 100 : 0
    const recipeSuccessRate = totalRecipeGens > 0 ? (successfulRecipeGens / totalRecipeGens) * 100 : 0

    // Calculate conversion rate (scans → recipes)
    const conversionRate = totalScans > 0 ? (totalRecipeGens / totalScans) * 100 : 0

    return NextResponse.json({
      ok: true,
      stats: {
        // Overall stats
        totalScans,
        successfulScans,
        failedScans,
        scanSuccessRate: Math.round(scanSuccessRate * 10) / 10,
        
        totalRecipeGenerations: totalRecipeGens,
        successfulRecipeGenerations: successfulRecipeGens,
        failedRecipeGenerations: failedRecipeGens,
        recipeSuccessRate: Math.round(recipeSuccessRate * 10) / 10,
        
        totalRecipesGenerated,
        avgRecipesPerGeneration: Math.round(avgRecipesPerGeneration * 10) / 10,
        
        uniqueUsers,
        conversionRate: Math.round(conversionRate * 10) / 10,
        
        // Today's stats
        scansToday,
        recipesToday,
        
        // Averages
        avgIngredientsPerScan: Math.round(avgIngredientsPerScan * 10) / 10,
        
        // Distributions
        dailyScans,
        dailyRecipes,
        hourlyScans,
        ingredientCountDistribution: ingredientCounts,
        recipeCountDistribution: recipeCounts,
      },
    })
  } catch (err: any) {
    console.error('admin/stats error:', err)
    // If KV is not configured, return empty stats
    return NextResponse.json({
      ok: true,
      stats: {
        totalScans: 0,
        successfulScans: 0,
        failedScans: 0,
        scanSuccessRate: 0,
        totalRecipeGenerations: 0,
        successfulRecipeGenerations: 0,
        failedRecipeGenerations: 0,
        recipeSuccessRate: 0,
        totalRecipesGenerated: 0,
        avgRecipesPerGeneration: 0,
        uniqueUsers: 0,
        conversionRate: 0,
        scansToday: 0,
        recipesToday: 0,
        avgIngredientsPerScan: 0,
        dailyScans: {},
        dailyRecipes: {},
        hourlyScans: {},
        ingredientCountDistribution: {},
        recipeCountDistribution: {},
      },
    })
  }
}

