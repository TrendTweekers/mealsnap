import { NextRequest, NextResponse } from 'next/server'
import { kv } from '@vercel/kv'

export async function GET(req: NextRequest) {
  try {
    // Basic authentication
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

    // Get top false positives (incorrectly detected)
    const incorrectIngredients = await kv.smembers('incorrect_detections:all') || []
    const falsePositives = await Promise.all(
      incorrectIngredients.map(async (ingredient: string) => {
        const count = await kv.get<number>(`incorrect_detection:${ingredient}`) || 0
        return { ingredient, count }
      })
    )
    const topFalsePositives = falsePositives
      .filter(item => item.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(item => item.ingredient)

    // Get top false negatives (missed detections)
    const missedIngredients = await kv.smembers('missed_detections:all') || []
    const falseNegatives = await Promise.all(
      missedIngredients.map(async (ingredient: string) => {
        const count = await kv.get<number>(`missed_detection:${ingredient}`) || 0
        return { ingredient, count }
      })
    )
    const topFalseNegatives = falseNegatives
      .filter(item => item.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(item => item.ingredient)

    // Calculate adaptive confidence thresholds per ingredient
    const totalScans = await kv.get<number>('stats:scans:success') || 0
    const adaptiveRules: { ingredient: string; threshold: number; rule: string }[] = []
    
    // For ingredients with high FP rate, suggest higher confidence
    for (const fp of topFalsePositives.slice(0, 5)) {
      const fpCount = await kv.get<number>(`incorrect_detection:${fp}`) || 0
      const fpRate = totalScans > 0 ? (fpCount / totalScans) * 100 : 0
      
      if (fpRate > 10) {
        adaptiveRules.push({
          ingredient: fp,
          threshold: 95,
          rule: `For "${fp}", only include if you are almost certain (95%+ confidence). This item is frequently incorrectly detected.`
        })
      } else if (fpRate > 5) {
        adaptiveRules.push({
          ingredient: fp,
          threshold: 90,
          rule: `For "${fp}", be extra conservative (90%+ confidence).`
        })
      }
    }

    // For ingredients with high FN rate, suggest lower threshold (more attentive)
    for (const fn of topFalseNegatives.slice(0, 5)) {
      const fnCount = await kv.get<number>(`missed_detection:${fn}`) || 0
      const fnRate = totalScans > 0 ? (fnCount / totalScans) * 100 : 0
      
      if (fnRate > 5) {
        adaptiveRules.push({
          ingredient: fn,
          threshold: 75,
          rule: `Pay extra attention to "${fn}" - include it when reasonably confident (75%+). This item is often missed.`
        })
      }
    }

    // Generate dynamic prompt sections
    let falsePositiveSection = ''
    if (topFalsePositives.length > 0) {
      falsePositiveSection = `
INGREDIENTS THAT ARE FREQUENTLY MISDETECTED (FALSE POSITIVES):
These items were often incorrectly detected in past scans.
Be extra conservative when detecting them. Only include them if you are 95%+ sure:
${topFalsePositives.map(ing => `- ${ing}`).join('\n')}
`
    }

    let falseNegativeSection = ''
    if (topFalseNegatives.length > 0) {
      falseNegativeSection = `
INGREDIENTS THAT ARE FREQUENTLY MISSED (FALSE NEGATIVES):
These items are often present but not detected.
Pay extra attention and include them when you are reasonably confident (75%+):
${topFalseNegatives.map(ing => `- ${ing}`).join('\n')}
`
    }

    let adaptiveRulesSection = ''
    if (adaptiveRules.length > 0) {
      adaptiveRulesSection = `
SPECIAL CONFIDENCE RULES (based on previous mistakes):
${adaptiveRules.map(rule => `- ${rule.rule}`).join('\n')}
`
    }

    return NextResponse.json({
      ok: true,
      promptExtras: {
        falsePositiveSection,
        falseNegativeSection,
        adaptiveRulesSection,
        topFalsePositives,
        topFalseNegatives,
        adaptiveRules,
      }
    })

  } catch (err: any) {
    console.error('Admin prompt-extras route error:', err)
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch prompt extras' },
      { status: 500 }
    )
  }
}

