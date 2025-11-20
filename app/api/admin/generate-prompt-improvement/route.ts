import { NextRequest, NextResponse } from 'next/server'
import { kv } from '@vercel/kv'

const apiKey = process.env.OPENAI_API_KEY

export async function POST(req: NextRequest) {
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

    if (!apiKey) {
      return NextResponse.json(
        { ok: false, error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    // Get current base prompt
    const basePrompt = `
You are an expert at identifying food items in fridge/pantry photos.

TASK:
Analyze the image and list ALL visible food ingredients with high confidence (80%+).

RULES:
1. Include items you can clearly see or identify from packaging/labels
2. Use simple, generic names (English, singular unless naturally plural)
3. Avoid brand names → use generic terms
4. For unclear items: If 80%+ confident → include it, If less than 80% → skip it
5. DO NOT infer hidden contents (closed boxes, drawers, cabinets)
6. DO NOT add staples not visible (salt, pepper, oil, sugar unless clearly visible)

SPECIAL CASES:
- Eggs, olives, berries, chips → keep plural (naturally plural items)
- Partial bottles/containers → include if you can identify them (80%+ confidence)
- Multiple of same item → list once
- Condiments in standard bottles → include if identifiable
- Clear containers → include if contents are visible

WHAT TO SKIP:
- Blurry/obscured items
- Unclear packages with no visible labels
- Items you're less than 80% confident about
- Non-food items (dishes, containers, decorations)
- Hidden items (inside drawers, behind other items)
`

    // Get FP/FN stats
    const incorrectIngredients = await kv.smembers('incorrect_detections:all') || []
    const missedIngredients = await kv.smembers('missed_detections:all') || []
    
    const falsePositives = await Promise.all(
      incorrectIngredients.slice(0, 10).map(async (ingredient: string) => {
        const count = await kv.get<number>(`incorrect_detection:${ingredient}`) || 0
        return { ingredient, count }
      })
    )
    const topFalsePositives = falsePositives
      .filter(item => item.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    const falseNegatives = await Promise.all(
      missedIngredients.slice(0, 10).map(async (ingredient: string) => {
        const count = await kv.get<number>(`missed_detection:${ingredient}`) || 0
        return { ingredient, count }
      })
    )
    const topFalseNegatives = falseNegatives
      .filter(item => item.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    const totalScans = await kv.get<number>('stats:scans:success') || 0
    const totalFalsePositives = await kv.get<number>('incorrect_detections:total') || 0
    const totalFalseNegatives = await kv.get<number>('missed_detections:total') || 0
    
    const fpRate = totalScans > 0 ? (totalFalsePositives / totalScans) * 100 : 0
    const fnRate = totalScans > 0 ? (totalFalseNegatives / totalScans) * 100 : 0

    // Call GPT-4o to generate improved prompt
    const improvementPrompt = `
You are an expert prompt engineer. I have a prompt for detecting food ingredients in fridge photos, and I have telemetry data showing where it makes mistakes.

CURRENT PROMPT:
${basePrompt}

TELEMETRY DATA:
- Total scans: ${totalScans}
- False positive rate: ${fpRate.toFixed(1)}%
- False negative rate: ${fnRate.toFixed(1)}%

TOP FALSE POSITIVES (incorrectly detected):
${topFalsePositives.map((fp, i) => `${i + 1}. "${fp.ingredient}" - detected incorrectly ${fp.count} times`).join('\n')}

TOP FALSE NEGATIVES (missed detections):
${topFalseNegatives.map((fn, i) => `${i + 1}. "${fn.ingredient}" - missed ${fn.count} times`).join('\n')}

TASK:
Based on this telemetry data, revise the prompt to:
1. Reduce false positives for the top problematic ingredients
2. Improve detection of frequently missed ingredients
3. Adjust confidence thresholds if needed
4. Add specific rules for problematic items
5. Keep the same structure and format

Return ONLY the improved prompt text (no explanations, no markdown, just the prompt itself).
Make it more specific and actionable based on the mistakes shown in the telemetry.
`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: improvementPrompt,
          },
        ],
        max_tokens: 2000,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[generate-prompt-improvement] OpenAI error:', response.status, errorText)
      return NextResponse.json(
        { ok: false, error: `OpenAI API error: ${response.status}` },
        { status: 500 }
      )
    }

    const data = await response.json()
    const improvedPrompt = data.choices?.[0]?.message?.content || ''

    if (!improvedPrompt) {
      return NextResponse.json(
        { ok: false, error: 'No response from OpenAI' },
        { status: 500 }
      )
    }

    // Store improved prompt in KV (for review/approval)
    const promptVersion = `prompt_v${Date.now()}`
    await kv.set(`prompt:improved:${promptVersion}`, {
      prompt: improvedPrompt,
      basePrompt,
      telemetry: {
        totalScans,
        fpRate,
        fnRate,
        topFalsePositives,
        topFalseNegatives,
      },
      createdAt: Date.now(),
      timestamp: new Date().toISOString(),
    }, { ex: 60 * 60 * 24 * 30 }) // Store for 30 days

    return NextResponse.json({
      ok: true,
      improvedPrompt,
      version: promptVersion,
      telemetry: {
        totalScans,
        fpRate: fpRate.toFixed(1),
        fnRate: fnRate.toFixed(1),
        topFalsePositives,
        topFalseNegatives,
      },
    })

  } catch (err: any) {
    console.error('Admin generate-prompt-improvement route error:', err)
    return NextResponse.json(
      { ok: false, error: 'Failed to generate prompt improvement' },
      { status: 500 }
    )
  }
}

