import { NextRequest, NextResponse } from 'next/server'
import { kv } from '@vercel/kv'

type PromptType = 'scan' | 'recipes'

// POST: Test prompt on sample scans
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { type = 'scan', version, sample_count = 10 } = body

    if (!version || typeof version !== 'number') {
      return NextResponse.json(
        { ok: false, error: 'Version number is required' },
        { status: 400 }
      )
    }

    const promptType = type as PromptType

    // Get prompt version
    const versionKey = `prompts:${promptType}:v${version}`
    const versionData = await kv.get<any>(versionKey)

    if (!versionData) {
      return NextResponse.json(
        { ok: false, error: 'Version not found' },
        { status: 404 }
      )
    }

    // Get current version for comparison
    const currentVersion = await kv.get<number>(`prompts:${promptType}:current_version`) || 0
    const currentKey = `prompts:${promptType}:v${currentVersion}`
    const currentData = await kv.get<any>(currentKey)

    // TODO: Implement actual testing logic
    // For now, return mock results
    // In production, this would:
    // 1. Get sample scans from KV
    // 2. Test new prompt on samples
    // 3. Test current prompt on same samples
    // 4. Compare results

    const mockResults = {
      tested_version: version,
      current_version: currentVersion,
      samples_tested: sample_count,
      new_accuracy: 85.5,
      current_accuracy: 78.2,
      improvement: 7.3,
      details: {
        chicken_detected: { new: 8, current: 3, total: 10 },
        garlic_detected: { new: 7, current: 5, total: 10 },
        butter_detected: { new: 6, current: 4, total: 10 },
      },
      recommendation: 'deploy', // 'deploy' | 'discard' | 'test_more'
    }

    // Store test results
    await kv.set(`prompts:${promptType}:test:${version}`, {
      ...mockResults,
      tested_at: new Date().toISOString(),
    })

    return NextResponse.json({
      ok: true,
      results: mockResults,
    })
  } catch (err: any) {
    console.error('Prompt test API error:', err)
    return NextResponse.json(
      { ok: false, error: 'Failed to test prompt', details: err.message },
      { status: 500 }
    )
  }
}

