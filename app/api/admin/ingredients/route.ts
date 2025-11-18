import { NextRequest, NextResponse } from 'next/server'
import { kv } from '@vercel/kv'

export async function GET(req: NextRequest) {
  try {
    // Get all manually added ingredient keys
    const allIngredients = await kv.smembers('manual_ingredients:all') || []
    
    // Get counts for each ingredient
    const ingredientsWithCounts = await Promise.all(
      allIngredients.map(async (ingredient: string) => {
        const count = await kv.get<number>(`manual_ingredient:${ingredient}`) || 0
        return {
          ingredient,
          count,
        }
      })
    )

    // Sort by count (highest first)
    const sorted = ingredientsWithCounts
      .sort((a, b) => b.count - a.count)
      .filter(item => item.count > 0)

    const totalManualAdds = sorted.reduce((sum, item) => sum + item.count, 0)

    return NextResponse.json({
      ok: true,
      ingredients: sorted,
      total: totalManualAdds,
      uniqueCount: sorted.length,
    })
  } catch (err: any) {
    console.error('admin/ingredients error:', err)
    // If KV is not configured, return empty data
    return NextResponse.json({
      ok: true,
      ingredients: [],
      total: 0,
      uniqueCount: 0,
    })
  }
}

