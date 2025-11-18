import { NextRequest, NextResponse } from 'next/server'
import { kv } from '@vercel/kv'

type PromptType = 'scan' | 'recipes'

// POST: Rollback to previous version
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { type = 'scan', target_version } = body

    const promptType = type as PromptType

    // Get current version
    const currentVersion = await kv.get<number>(`prompts:${promptType}:current_version`) || 0

    if (currentVersion <= 1) {
      return NextResponse.json(
        { ok: false, error: 'Cannot rollback from version 1' },
        { status: 400 }
      )
    }

    // Determine target version
    const rollbackVersion = target_version || (currentVersion - 1)

    if (rollbackVersion >= currentVersion) {
      return NextResponse.json(
        { ok: false, error: 'Target version must be lower than current' },
        { status: 400 }
      )
    }

    // Verify target version exists
    const targetKey = `prompts:${promptType}:v${rollbackVersion}`
    const targetData = await kv.get<any>(targetKey)

    if (!targetData) {
      return NextResponse.json(
        { ok: false, error: 'Target version not found' },
        { status: 404 }
      )
    }

    // Store current version as backup before rollback
    const currentKey = `prompts:${promptType}:v${currentVersion}`
    const currentData = await kv.get<any>(currentKey)
    if (currentData) {
      await kv.set(`prompts:${promptType}:rollback_backup:${currentVersion}`, {
        ...currentData,
        rolled_back_at: new Date().toISOString(),
      })
    }

    // Update current version
    await kv.set(`prompts:${promptType}:current_version`, rollbackVersion)

    // Mark target as active
    targetData.is_active = true
    await kv.set(targetKey, { ...targetData, is_active: true })

    // Mark current as inactive
    if (currentData) {
      currentData.is_active = false
      await kv.set(currentKey, currentData)
    }

    // Log rollback
    await kv.set(`prompts:${promptType}:rollback:${Date.now()}`, {
      from_version: currentVersion,
      to_version: rollbackVersion,
      rolled_back_at: new Date().toISOString(),
      reason: body.reason || 'Manual rollback',
    })

    return NextResponse.json({
      ok: true,
      rolled_back_from: currentVersion,
      rolled_back_to: rollbackVersion,
      message: 'Successfully rolled back',
    })
  } catch (err: any) {
    console.error('Prompt rollback API error:', err)
    return NextResponse.json(
      { ok: false, error: 'Failed to rollback prompt', details: err.message },
      { status: 500 }
    )
  }
}

