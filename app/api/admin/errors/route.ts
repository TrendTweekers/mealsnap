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

    // Get error counts by type
    const scanErrors = await kv.get<number>('stats:errors:scan') || 0
    const recipeErrors = await kv.get<number>('stats:errors:recipes') || 0
    const imageErrors = await kv.get<number>('stats:errors:images') || 0

    // Get recent errors (last 50)
    const errorKeys = await kv.keys('error:*')
    const recentErrors: any[] = []
    
    // Get most recent errors
    const sortedKeys = errorKeys.sort().reverse().slice(0, 50)
    
    for (const key of sortedKeys) {
      try {
        const error = await kv.get(key)
        if (error) {
          recentErrors.push({
            ...error,
            id: key.replace('error:', '')
          })
        }
      } catch (e) {
        // Skip if error record doesn't exist
      }
    }

    // Get error breakdown by type
    const errorTypes: { [key: string]: number } = {}
    for (const error of recentErrors) {
      const type = error.type || 'unknown'
      errorTypes[type] = (errorTypes[type] || 0) + 1
    }

    return NextResponse.json({
      ok: true,
      errors: {
        total: scanErrors + recipeErrors + imageErrors,
        scan: scanErrors,
        recipes: recipeErrors,
        images: imageErrors,
        recent: recentErrors.slice(0, 20), // Last 20 errors
        byType: errorTypes
      }
    })
  } catch (err: any) {
    console.error('Error tracking error:', err)
    return NextResponse.json(
      { ok: false, error: err.message || 'Failed to fetch errors' },
      { status: 500 }
    )
  }
}

