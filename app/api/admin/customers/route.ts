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

    // Get customer counts by plan
    const proUsers = await kv.scard('customers:pro') || 0
    const familyUsers = await kv.scard('customers:family') || 0
    const totalPayingCustomers = proUsers + familyUsers

    // Get all customer IDs
    const proCustomerIds = await kv.smembers('customers:pro') || []
    const familyCustomerIds = await kv.smembers('customers:family') || []
    const allCustomerIds = [...proCustomerIds, ...familyCustomerIds]

    // Get usage stats for paying customers
    let payingCustomerScans = 0
    let payingCustomerRecipes = 0
    let payingCustomerFavorites = 0
    let payingCustomerShares = 0

    // Sample a few customers to get usage (for performance)
    const sampleSize = Math.min(100, allCustomerIds.length)
    const sampledCustomers = allCustomerIds.slice(0, sampleSize)

    for (const customerId of sampledCustomers) {
      const scans = await kv.get<number>(`customer:${customerId}:scans`) || 0
      const recipes = await kv.get<number>(`customer:${customerId}:recipes`) || 0
      const favorites = await kv.get<number>(`customer:${customerId}:favorites`) || 0
      const shares = await kv.get<number>(`customer:${customerId}:shares`) || 0
      
      payingCustomerScans += scans
      payingCustomerRecipes += recipes
      payingCustomerFavorites += favorites
      payingCustomerShares += shares
    }

    // Scale up if we sampled
    const scaleFactor = allCustomerIds.length > 0 ? allCustomerIds.length / sampleSize : 1
    payingCustomerScans = Math.round(payingCustomerScans * scaleFactor)
    payingCustomerRecipes = Math.round(payingCustomerRecipes * scaleFactor)
    payingCustomerFavorites = Math.round(payingCustomerFavorites * scaleFactor)
    payingCustomerShares = Math.round(payingCustomerShares * scaleFactor)

    // Calculate revenue
    const PRICING = {
      pro: 9.99,
      family: 19.99
    }
    const monthlyRevenue = (proUsers * PRICING.pro) + (familyUsers * PRICING.family)
    const annualRevenue = monthlyRevenue * 12

    // Get customer acquisition dates (sample)
    const customerDetails: any[] = []
    for (const customerId of sampledCustomers.slice(0, 20)) {
      const plan = proCustomerIds.includes(customerId) ? 'pro' : 'family'
      const joinedAt = await kv.get<string>(`customer:${customerId}:joined_at`)
      const lastActive = await kv.get<string>(`customer:${customerId}:last_active`)
      const scans = await kv.get<number>(`customer:${customerId}:scans`) || 0
      const recipes = await kv.get<number>(`customer:${customerId}:recipes`) || 0
      
      customerDetails.push({
        id: customerId,
        plan,
        joinedAt: joinedAt || null,
        lastActive: lastActive || null,
        scans,
        recipes,
        revenue: plan === 'pro' ? PRICING.pro : PRICING.family
      })
    }

    // Calculate averages
    const avgScansPerCustomer = totalPayingCustomers > 0 ? payingCustomerScans / totalPayingCustomers : 0
    const avgRecipesPerCustomer = totalPayingCustomers > 0 ? payingCustomerRecipes / totalPayingCustomers : 0
    const avgRevenuePerCustomer = totalPayingCustomers > 0 ? monthlyRevenue / totalPayingCustomers : 0

    // Get total users for comparison
    const totalUsers = await kv.scard('stats:users:unique') || 0
    const conversionRate = totalUsers > 0 ? (totalPayingCustomers / totalUsers) * 100 : 0

    return NextResponse.json({
      ok: true,
      customers: {
        total: totalPayingCustomers,
        pro: proUsers,
        family: familyUsers,
        revenue: {
          monthly: monthlyRevenue,
          annual: annualRevenue,
          perCustomer: avgRevenuePerCustomer
        },
        usage: {
          scans: payingCustomerScans,
          recipes: payingCustomerRecipes,
          favorites: payingCustomerFavorites,
          shares: payingCustomerShares,
          avgScansPerCustomer: Math.round(avgScansPerCustomer * 10) / 10,
          avgRecipesPerCustomer: Math.round(avgRecipesPerCustomer * 10) / 10
        },
        metrics: {
          totalUsers,
          conversionRate: Math.round(conversionRate * 10) / 10
        },
        sample: customerDetails
      }
    })
  } catch (err: any) {
    console.error('Customer analytics error:', err)
    return NextResponse.json(
      { ok: false, error: err.message || 'Failed to fetch customer data' },
      { status: 500 }
    )
  }
}

