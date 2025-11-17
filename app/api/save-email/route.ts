import { NextRequest, NextResponse } from 'next/server'
import { kv } from '@vercel/kv'

export async function POST(req: NextRequest) {
  try {
    const { email, source, userId } = await req.json()

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { ok: false, error: 'Invalid email address' },
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

