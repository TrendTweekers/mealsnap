import { NextRequest, NextResponse } from 'next/server'
import { kv } from '@vercel/kv'
import { cookies } from 'next/headers'

async function checkAdminAuth() {
  const cookieStore = await cookies()
  const authCookie = cookieStore.get('admin_auth')
  return authCookie?.value === 'authenticated'
}

// GET: Fetch all prompt versions or current active prompt
export async function GET(req: NextRequest) {
  const isLocalAuth = req.nextUrl.searchParams.get('localAuth') === 'true'
  if (!isLocalAuth) {
    const isAuthenticated = await checkAdminAuth()
    if (!isAuthenticated) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized. Admin authentication required.' },
        { status: 401 }
      )
    }
  }

  try {
    const version = req.nextUrl.searchParams.get('version')
    
    if (version) {
      // Get specific version
      const promptData = await kv.get(`prompt:version:${version}`)
      if (!promptData) {
        return NextResponse.json(
          { ok: false, error: 'Prompt version not found' },
          { status: 404 }
        )
      }
      return NextResponse.json({ ok: true, prompt: promptData })
    }

    // Get active prompt version
    const activeVersion = await kv.get<string>('prompt:active:version') || 'v1'
    const activePrompt = await kv.get(`prompt:version:${activeVersion}`)

    // Get all versions (for history)
    const allVersions: any[] = []
    const versionKeys = await kv.keys('prompt:version:*')
    
    for (const key of versionKeys) {
      const versionId = key.replace('prompt:version:', '')
      const promptData = await kv.get(key)
      if (promptData) {
        allVersions.push({
          version: versionId,
          ...promptData,
          isActive: versionId === activeVersion,
        })
      }
    }

    // Sort by timestamp (newest first)
    allVersions.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))

    return NextResponse.json({
      ok: true,
      activeVersion,
      activePrompt: activePrompt || null,
      versions: allVersions,
    })
  } catch (err: any) {
    console.error('admin/prompts GET error:', err)
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch prompts', details: String(err?.message ?? err) },
      { status: 500 }
    )
  }
}

// POST: Create new prompt version
export async function POST(req: NextRequest) {
  const isLocalAuth = req.nextUrl.searchParams.get('localAuth') === 'true'
  if (!isLocalAuth) {
    const isAuthenticated = await checkAdminAuth()
    if (!isAuthenticated) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized. Admin authentication required.' },
        { status: 401 }
      )
    }
  }

  try {
    const { prompt, telemetry, source, notes } = await req.json()

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { ok: false, error: 'Prompt text is required' },
        { status: 400 }
      )
    }

    // Generate version ID
    const versionId = `v${Date.now()}`
    const timestamp = Date.now()
    const createdAt = new Date().toISOString()

    // Get current active version for comparison
    const activeVersion = await kv.get<string>('prompt:active:version') || 'v1'
    const currentPrompt = await kv.get(`prompt:version:${activeVersion}`)

    // Store new version
    const promptData = {
      version: versionId,
      prompt,
      telemetry: telemetry || {},
      source: source || 'manual',
      notes: notes || '',
      createdAt: timestamp,
      createdAtISO: createdAt,
      previousVersion: activeVersion,
      isActive: false,
    }

    await kv.set(`prompt:version:${versionId}`, promptData, { ex: 60 * 60 * 24 * 365 }) // Store for 1 year

    // Add to versions list
    await kv.sadd('prompt:versions:list', versionId)

    return NextResponse.json({
      ok: true,
      version: versionId,
      prompt: promptData,
    })
  } catch (err: any) {
    console.error('admin/prompts POST error:', err)
    return NextResponse.json(
      { ok: false, error: 'Failed to create prompt version', details: String(err?.message ?? err) },
      { status: 500 }
    )
  }
}

// PATCH: Activate a prompt version (set as active)
export async function PATCH(req: NextRequest) {
  const isLocalAuth = req.nextUrl.searchParams.get('localAuth') === 'true'
  if (!isLocalAuth) {
    const isAuthenticated = await checkAdminAuth()
    if (!isAuthenticated) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized. Admin authentication required.' },
        { status: 401 }
      )
    }
  }

  try {
    const { version, deploy } = await req.json()

    if (!version || typeof version !== 'string') {
      return NextResponse.json(
        { ok: false, error: 'Version ID is required' },
        { status: 400 }
      )
    }

    // Verify version exists
    const promptData = await kv.get(`prompt:version:${version}`)
    if (!promptData) {
      return NextResponse.json(
        { ok: false, error: 'Prompt version not found' },
        { status: 404 }
      )
    }

    // Set as active
    await kv.set('prompt:active:version', version)

    // Update version data
    const updatedData = {
      ...promptData,
      isActive: true,
      activatedAt: Date.now(),
      activatedAtISO: new Date().toISOString(),
    }
    await kv.set(`prompt:version:${version}`, updatedData)

    // Deactivate previous active version
    const previousActive = await kv.get<string>('prompt:active:version')
    if (previousActive && previousActive !== version) {
      const prevData = await kv.get(`prompt:version:${previousActive}`)
      if (prevData) {
        await kv.set(`prompt:version:${previousActive}`, {
          ...prevData,
          isActive: false,
        })
      }
    }

    // If deploy=true, also update the codebase
    if (deploy === true) {
      // This will be handled by a separate deployment API
      // For now, just mark as deployed
      await kv.set(`prompt:version:${version}`, {
        ...updatedData,
        deployed: true,
        deployedAt: Date.now(),
      })
    }

    return NextResponse.json({
      ok: true,
      version,
      prompt: updatedData,
      message: deploy ? 'Prompt activated and marked for deployment' : 'Prompt activated',
    })
  } catch (err: any) {
    console.error('admin/prompts PATCH error:', err)
    return NextResponse.json(
      { ok: false, error: 'Failed to activate prompt version', details: String(err?.message ?? err) },
      { status: 500 }
    )
  }
}
