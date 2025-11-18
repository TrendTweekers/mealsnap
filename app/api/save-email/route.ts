import { NextRequest, NextResponse } from 'next/server'
import { kv } from '@vercel/kv'

export async function POST(req: NextRequest) {
  try {
    // Limit request body size
    const contentLength = req.headers.get('content-length')
    if (contentLength && parseInt(contentLength, 10) > 10 * 1024) {
      return NextResponse.json(
        { ok: false, error: 'Request too large' },
        { status: 413 }
      )
    }

    const { email, source, userId } = await req.json()

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { ok: false, error: 'Invalid email address' },
        { status: 400 }
      )
    }

    // Validate email length
    if (email.length > 254) {
      return NextResponse.json(
        { ok: false, error: 'Email address too long' },
        { status: 400 }
      )
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.toLowerCase())) {
      return NextResponse.json(
        { ok: false, error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Validate source if provided
    if (source && typeof source === 'string' && source.length > 50) {
      return NextResponse.json(
        { ok: false, error: 'Invalid source' },
        { status: 400 }
      )
    }

    // Validate userId if provided
    if (userId && typeof userId === 'string' && userId.length > 200) {
      return NextResponse.json(
        { ok: false, error: 'Invalid user ID' },
        { status: 400 }
      )
    }

    const timestamp = new Date().toISOString()
    const emailKey = `email:${email.toLowerCase()}`
    const emailData = {
      email: email.toLowerCase(),
      source,
      userId: userId || 'unknown',
      timestamp,
      createdAt: Date.now(),
    }

    // Save to Vercel KV
    try {
      // Store individual email record
      await kv.set(emailKey, emailData, { ex: 60 * 60 * 24 * 365 }) // Expire after 1 year
      
      // Add to waitlist set (for counting)
      await kv.sadd('waitlist:emails', email.toLowerCase())
      
      // Increment waitlist counter
      await kv.incr('waitlist:count')
      
      console.log('[Email Capture]', { email, source, userId, timestamp })
    } catch (kvError) {
      // If KV is not configured, just log (graceful degradation)
      console.warn('[Email Capture] Vercel KV not configured, logging only:', kvError)
      console.log('[Email Capture]', { email, source, userId, timestamp })
    }

    return NextResponse.json({ ok: true, message: 'Email saved successfully' })
  } catch (err: any) {
    console.error('save-email error:', err)
    return NextResponse.json(
      { ok: false, error: 'Failed to save email' },
      { status: 500 }
    )
  }
}

