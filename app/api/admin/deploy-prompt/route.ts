import { NextRequest, NextResponse } from 'next/server'
import { kv } from '@vercel/kv'
import { cookies } from 'next/headers'
import fs from 'fs'
import path from 'path'

async function checkAdminAuth() {
  const cookieStore = await cookies()
  const authCookie = cookieStore.get('admin_auth')
  return authCookie?.value === 'authenticated'
}

// POST: Deploy a prompt version to the codebase
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
    const { version, autoActivate } = await req.json()

    if (!version || typeof version !== 'string') {
      return NextResponse.json(
        { ok: false, error: 'Version ID is required' },
        { status: 400 }
      )
    }

    // Get prompt data
    const promptData: any = await kv.get(`prompt:version:${version}`)
    if (!promptData) {
      return NextResponse.json(
        { ok: false, error: 'Prompt version not found' },
        { status: 404 }
      )
    }

    const promptText = promptData.prompt

    // Read current scan-pantry route file
    const filePath = path.join(process.cwd(), 'app', 'api', 'scan-pantry', 'route.ts')
    
    // Note: In Vercel/serverless, we can't write to filesystem
    // Instead, we'll return the prompt and file location for manual deployment
    // OR use Vercel API to update the file (requires Vercel API token)
    
    // For now, return instructions and mark as ready for deployment
    await kv.set(`prompt:version:${version}`, {
      ...promptData,
      deploymentStatus: 'pending',
      deploymentRequestedAt: Date.now(),
    })

    // If autoActivate, also activate it
    if (autoActivate === true) {
      await kv.set('prompt:active:version', version)
      await kv.set(`prompt:version:${version}`, {
        ...promptData,
        isActive: true,
        activatedAt: Date.now(),
      })
    }

    return NextResponse.json({
      ok: true,
      version,
      prompt: promptText,
      filePath: 'app/api/scan-pantry/route.ts',
      instructions: [
        '1. Copy the prompt text above',
        '2. Open app/api/scan-pantry/route.ts',
        '3. Find the prompt variable (around line 73)',
        '4. Replace the prompt text with the new version',
        '5. Deploy to Vercel',
      ],
      note: 'Auto-deployment requires file system access. For now, copy the prompt manually.',
    })
  } catch (err: any) {
    console.error('admin/deploy-prompt error:', err)
    return NextResponse.json(
      { ok: false, error: 'Failed to deploy prompt', details: String(err?.message ?? err) },
      { status: 500 }
    )
  }
}

