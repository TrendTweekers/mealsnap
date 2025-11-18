import { NextRequest, NextResponse } from 'next/server'
import { kv } from '@vercel/kv'

// Infrastructure costs (daily estimates)
const INFRASTRUCTURE_COSTS = {
  vercel_hosting: 0.67, // $20/month / 30 days
  vercel_kv: 0.67, // $20/month / 30 days
  plausible_analytics: 0.30, // $9/month / 30 days
  domain: 0.03, // $1/year / 365 days
  monitoring: 0.33, // $10/month / 30 days
  email_service: 1.00, // $30/month / 30 days
  backups: 0.23, // $7/month / 30 days
}

const TOTAL_DAILY_INFRASTRUCTURE = Object.values(INFRASTRUCTURE_COSTS).reduce((a, b) => a + b, 0)

// Pricing tiers
const PRICING = {
  free: 0,
  pro: 9.99, // per month
  family: 19.99, // per month
}

// Affiliate estimates
const AFFILIATE_CONVERSION_RATE = 0.05 // 5%
const AFFILIATE_COMMISSION = 2.00 // $2 per conversion

// Check admin authentication
async function checkAdminAuth(req: NextRequest): Promise<boolean> {
  const password = req.headers.get('x-admin-password') || req.cookies.get('admin_session')?.value
  
  const adminPassword = process.env.ADMIN_PASSWORD || 'mealsnap2024'
  
  if (password === adminPassword) {
    return true
  }
  
  // Check session cookie
  try {
    const session = await kv.get(`admin_session:${password}`)
    return session === true
  } catch {
    return false
  }
}

export async function GET(req: NextRequest) {
  try {
    // TEMP: Skip auth check for debugging (frontend uses localStorage)
    // TODO: Re-enable proper authentication later
    // const isAuthenticated = await checkAdminAuth(req)
    // if (!isAuthenticated) {
    //   return NextResponse.json(
    //     { ok: false, error: 'Unauthorized' },
    //     { status: 401 }
    //   )
    // }

    const { searchParams } = new URL(req.url)
    const period = searchParams.get('period') || 'today' // today, week, month, alltime

    const now = new Date()
    const today = now.toISOString().split('T')[0] // YYYY-MM-DD
    const thisMonth = today.substring(0, 7) // YYYY-MM
    const thisWeekStart = new Date(now)
    thisWeekStart.setDate(now.getDate() - now.getDay()) // Start of week (Sunday)
    const weekStart = thisWeekStart.toISOString().split('T')[0]

    // Fetch cost data from KV
    let openaiScanCost = 0
    let openaiRecipeCost = 0
    let infrastructureCost = 0
    let scanCount = 0
    let recipeCount = 0
    let totalUsers = 0
    let freeUsers = 0
    let proUsers = 0
    let familyUsers = 0
    let instacartClicks = 0

    try {
      if (period === 'today') {
        // Today's costs
        const dailyCosts = await kv.hgetall(`costs:daily:${today}`) as Record<string, string> | null
        if (dailyCosts) {
          openaiScanCost = parseFloat(dailyCosts.openai_scan || '0')
          openaiRecipeCost = parseFloat(dailyCosts.openai_recipes || '0')
        }
        infrastructureCost = TOTAL_DAILY_INFRASTRUCTURE

        // Today's stats
        const dailyScans = await kv.get(`stats:scans:daily:${today}`) as number || 0
        const dailyRecipes = await kv.get(`stats:recipes:daily:${today}`) as number || 0
        scanCount = dailyScans
        recipeCount = dailyRecipes
      } else if (period === 'week') {
        // This week's costs (aggregate from daily)
        const days = []
        for (let i = 0; i < 7; i++) {
          const date = new Date(thisWeekStart)
          date.setDate(thisWeekStart.getDate() + i)
          days.push(date.toISOString().split('T')[0])
        }

        for (const date of days) {
          const dailyCosts = await kv.hgetall(`costs:daily:${date}`) as Record<string, string> | null
          if (dailyCosts) {
            openaiScanCost += parseFloat(dailyCosts.openai_scan || '0')
            openaiRecipeCost += parseFloat(dailyCosts.openai_recipes || '0')
          }
          const dailyScans = await kv.get(`stats:scans:daily:${date}`) as number || 0
          const dailyRecipes = await kv.get(`stats:recipes:daily:${date}`) as number || 0
          scanCount += dailyScans
          recipeCount += dailyRecipes
        }
        infrastructureCost = TOTAL_DAILY_INFRASTRUCTURE * 7
      } else if (period === 'month') {
        // This month's costs
        const monthlyCosts = await kv.hgetall(`costs:monthly:${thisMonth}`) as Record<string, string> | null
        if (monthlyCosts) {
          openaiScanCost = parseFloat(monthlyCosts.openai_scan || '0')
          openaiRecipeCost = parseFloat(monthlyCosts.openai_recipes || '0')
        }
        
        // Count days in month
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
        infrastructureCost = TOTAL_DAILY_INFRASTRUCTURE * daysInMonth

        // This month's stats (approximate - would need to sum daily)
        const monthScans = await kv.get(`stats:scans:monthly:${thisMonth}`) as number || 0
        const monthRecipes = await kv.get(`stats:recipes:monthly:${thisMonth}`) as number || 0
        scanCount = monthScans || 0
        recipeCount = monthRecipes || 0
      } else {
        // All time costs
        const alltimeCosts = await kv.hgetall('costs:alltime') as Record<string, string> | null
        if (alltimeCosts) {
          openaiScanCost = parseFloat(alltimeCosts.openai_scan || '0')
          openaiRecipeCost = parseFloat(alltimeCosts.openai_recipes || '0')
        }
        
        // Estimate infrastructure (rough - would need to track actual days)
        const daysSinceLaunch = 30 // Default estimate
        infrastructureCost = TOTAL_DAILY_INFRASTRUCTURE * daysSinceLaunch

        // All time stats
        scanCount = await kv.get('stats:scans:total') as number || 0
        recipeCount = await kv.get('stats:recipes:total') as number || 0
      }

      // Get user stats (all time for now)
      totalUsers = await kv.scard('users:all') || 0
      
      // Estimate user tiers (would need to track in KV)
      freeUsers = totalUsers // Default assumption
      proUsers = 0
      familyUsers = 0

      // Get Instacart clicks (would need to track)
      instacartClicks = await kv.get('affiliate:instacart:clicks') as number || 0
    } catch (kvError) {
      console.warn('[Profit Calculator] KV error:', kvError)
      // Continue with default values
    }

    // Calculate revenue
    const subscriptionRevenue = (proUsers * PRICING.pro) + (familyUsers * PRICING.family)
    
    // Estimate affiliate revenue
    const estimatedConversions = Math.floor(instacartClicks * AFFILIATE_CONVERSION_RATE)
    const affiliateRevenue = estimatedConversions * AFFILIATE_COMMISSION

    const totalRevenue = subscriptionRevenue + affiliateRevenue

    // Calculate costs
    const totalOpenAICost = openaiScanCost + openaiRecipeCost
    const totalCosts = totalOpenAICost + infrastructureCost

    // Calculate profit
    const profit = totalRevenue - totalCosts

    // Calculate per-user metrics
    const avgCostPerUser = totalUsers > 0 ? totalCosts / totalUsers : 0
    const avgRevenuePerUser = totalUsers > 0 ? totalRevenue / totalUsers : 0
    const unitEconomics = avgRevenuePerUser - avgCostPerUser

    // Calculate LTV:CAC
    const avgLTV = 119.88 // $9.99/mo × 12 months (assuming Pro)
    const cac = 0 // Currently $0 (organic growth)
    const ltvCacRatio = cac > 0 ? avgLTV / cac : 0

    // Break-even calculation
    const fixedCosts = infrastructureCost
    const variableCostPerUser = avgCostPerUser
    const breakEvenUsers = subscriptionRevenue > 0 
      ? Math.ceil(fixedCosts / (PRICING.pro - variableCostPerUser))
      : 0

    // Conversion rate
    const conversionRate = totalUsers > 0 ? ((proUsers + familyUsers) / totalUsers) * 100 : 0

    // 30-day projection
    const currentDailyCost = totalOpenAICost / (period === 'today' ? 1 : period === 'week' ? 7 : 30)
    const projected30DayCost = currentDailyCost * 30 + (TOTAL_DAILY_INFRASTRUCTURE * 30)
    const projected30DayRevenue = subscriptionRevenue // Assuming current revenue continues
    const projected30DayProfit = projected30DayRevenue - projected30DayCost

    // Cost breakdown
    const costBreakdown = {
      openai: {
        scan: openaiScanCost,
        recipes: openaiRecipeCost,
        total: totalOpenAICost,
      },
      infrastructure: {
        ...INFRASTRUCTURE_COSTS,
        total: infrastructureCost,
      },
    }

    // Optimization suggestions
    const suggestions = []
    
    if (openaiRecipeCost > 10) {
      suggestions.push({
        type: 'critical',
        title: 'Switch to GPT-4o-mini',
        description: `Save $${(openaiRecipeCost * 0.9).toFixed(2)} (90% reduction)`,
        savings: openaiRecipeCost * 0.9,
      })
    }
    
    if (avgCostPerUser > 0.50) {
      suggestions.push({
        type: 'warning',
        title: 'High per-user cost',
        description: `Current: $${avgCostPerUser.toFixed(2)}/user. Target: <$0.10`,
        savings: 0,
      })
    }
    
    if (conversionRate < 2) {
      suggestions.push({
        type: 'warning',
        title: 'Low conversion rate',
        description: `Current: ${conversionRate.toFixed(1)}%. Target: 3%+`,
        savings: 0,
      })
    }

    return NextResponse.json({
      ok: true,
      period,
      revenue: {
        subscriptions: subscriptionRevenue,
        affiliate: affiliateRevenue,
        total: totalRevenue,
        breakdown: {
          free: freeUsers,
          pro: proUsers,
          family: familyUsers,
        },
      },
      costs: {
        openai: {
          scan: openaiScanCost,
          recipes: openaiRecipeCost,
          total: totalOpenAICost,
        },
        infrastructure: {
          ...INFRASTRUCTURE_COSTS,
          total: infrastructureCost,
        },
        total: totalCosts,
      },
      profit: {
        net: profit,
        margin: totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0,
      },
      metrics: {
        scanCount,
        recipeCount,
        totalUsers,
        avgCostPerUser,
        avgRevenuePerUser,
        unitEconomics,
        ltvCacRatio,
        breakEvenUsers,
        conversionRate,
        instacartClicks,
        estimatedConversions: estimatedConversions,
      },
      projections: {
        next30Days: {
          expectedCost: projected30DayCost,
          expectedRevenue: projected30DayRevenue,
          expectedProfit: projected30DayProfit,
          breakEvenUsers: Math.ceil(projected30DayCost / PRICING.pro),
        },
      },
      suggestions,
      timestamp: new Date().toISOString(),
    })
  } catch (err: any) {
    console.error('[Profit Calculator] Error:', err)
    return NextResponse.json(
      { ok: false, error: 'Failed to calculate profit metrics', details: String(err?.message || err) },
      { status: 500 }
    )
  }
}

