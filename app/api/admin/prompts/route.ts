import { NextRequest, NextResponse } from 'next/server'
import { kv } from '@vercel/kv'

type PromptType = 'scan' | 'recipes'

type PromptVersion = {
  version: number
  prompt: string
  created_at: string
  created_by: string
  accuracy?: number
  test_results?: {
    scans_tested?: number
    success_rate?: number
  }
  notes?: string
  is_active?: boolean
}

// GET: List all prompt versions
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const type = (searchParams.get('type') || 'scan') as PromptType

    // Get current version number
    const currentVersion = await kv.get<number>(`prompts:${type}:current_version`) || 1

    // Get all versions
    const versions: PromptVersion[] = []
    let versionNum = currentVersion
    let found = true

    while (found && versionNum > 0) {
      const versionKey = `prompts:${type}:v${versionNum}`
      const version = await kv.get<PromptVersion>(versionKey)

      if (version) {
        versions.push({ ...version, is_active: versionNum === currentVersion })
        versionNum--
      } else {
        found = false
      }
    }

    return NextResponse.json({
      ok: true,
      type,
      current_version: currentVersion,
      versions: versions.reverse(), // Oldest first
    })
  } catch (err: any) {
    console.error('Prompts API error:', err)
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch prompts', details: err.message },
      { status: 500 }
    )
  }
}

// POST: Create new prompt version
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { type = 'scan', prompt, notes, created_by = 'admin' } = body

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { ok: false, error: 'Prompt is required' },
        { status: 400 }
      )
    }

    const promptType = type as PromptType

    // Get current version
    const currentVersion = await kv.get<number>(`prompts:${promptType}:current_version`) || 0
    const newVersion = currentVersion + 1

    // Create new version
    const versionData: PromptVersion = {
      version: newVersion,
      prompt,
      created_at: new Date().toISOString(),
      created_by,
      notes: notes || '',
      is_active: false, // Not active until explicitly deployed
    }

    const versionKey = `prompts:${promptType}:v${newVersion}`
    await kv.set(versionKey, versionData)

    return NextResponse.json({
      ok: true,
      version: newVersion,
      prompt: versionData,
    })
  } catch (err: any) {
    console.error('Prompts API error:', err)
    return NextResponse.json(
      { ok: false, error: 'Failed to create prompt version', details: err.message },
      { status: 500 }
    )
  }
}

// PATCH: Update current version (deploy)
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { type = 'scan', version, strategy = 'safe' } = body

    if (!version || typeof version !== 'number') {
      return NextResponse.json(
        { ok: false, error: 'Version number is required' },
        { status: 400 }
      )
    }

    const promptType = type as PromptType

    // Verify version exists
    const versionKey = `prompts:${promptType}:v${version}`
    const versionData = await kv.get<PromptVersion>(versionKey)

    if (!versionData) {
      return NextResponse.json(
        { ok: false, error: 'Version not found' },
        { status: 404 }
      )
    }

    // Get current version
    const currentVersion = await kv.get<number>(`prompts:${promptType}:current_version`) || 0

    // Store previous version as backup
    if (currentVersion > 0) {
      const oldVersionKey = `prompts:${promptType}:v${currentVersion}`
      const oldVersion = await kv.get<PromptVersion>(oldVersionKey)
      if (oldVersion) {
        await kv.set(`prompts:${promptType}:v${currentVersion}:backup`, oldVersion)
      }
    }

    // Update current version
    await kv.set(`prompts:${promptType}:current_version`, version)

    // Mark as active
    versionData.is_active = true
    await kv.set(versionKey, { ...versionData, is_active: true })

    // Mark old version as inactive
    if (currentVersion > 0) {
      const oldVersionKey = `prompts:${promptType}:v${currentVersion}`
      const oldVersion = await kv.get<PromptVersion>(oldVersionKey)
      if (oldVersion) {
        oldVersion.is_active = false
        await kv.set(oldVersionKey, oldVersion)
      }
    }

    // Store deployment info
    await kv.set(`prompts:${promptType}:deployment:${version}`, {
      deployed_at: new Date().toISOString(),
      strategy,
      previous_version: currentVersion,
    })

    return NextResponse.json({
      ok: true,
      deployed_version: version,
      previous_version: currentVersion,
      strategy,
    })
  } catch (err: any) {
    console.error('Prompts API error:', err)
    return NextResponse.json(
      { ok: false, error: 'Failed to deploy prompt', details: err.message },
      { status: 500 }
    )
  }
}

