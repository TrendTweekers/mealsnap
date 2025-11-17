import { NextRequest, NextResponse } from 'next/server'

// Simple email storage - in production, use Supabase or Vercel KV
export async function POST(req: NextRequest) {
  try {
    const { email, source, userId } = await req.json()

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { ok: false, error: 'Invalid email address' },
        { status: 400 }
      )
    }

    // Log the email (in production, save to database)
    console.log('[Email Capture]', { email, source, userId, timestamp: new Date().toISOString() })

    // TODO: Save to Supabase or Vercel KV
    // Example with Supabase:
    // const { data, error } = await supabase
    //   .from('waitlist')
    //   .insert([{ email, source, user_id: userId, created_at: new Date() }])

    return NextResponse.json({ ok: true, message: 'Email saved successfully' })
  } catch (err: any) {
    console.error('save-email error:', err)
    return NextResponse.json(
      { ok: false, error: 'Failed to save email' },
      { status: 500 }
    )
  }
}

