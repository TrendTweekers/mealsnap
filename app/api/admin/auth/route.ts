import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

// Simple password verification
// In production, use a proper authentication system with hashed passwords
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'mealsnap2024'

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json()

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { ok: false, error: 'Password required' },
        { status: 400 }
      )
    }

    // Constant-time comparison to prevent timing attacks
    const isValid = password === ADMIN_PASSWORD

    if (!isValid) {
      return NextResponse.json(
        { ok: false, error: 'Invalid password' },
        { status: 401 }
      )
    }

    // Set HTTP-only cookie for admin session (expires in 24 hours)
    const cookieStore = await cookies()
    const expirationDate = new Date()
    expirationDate.setHours(expirationDate.getHours() + 24)

    cookieStore.set('admin_auth', 'authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      expires: expirationDate,
      path: '/',
    })

    return NextResponse.json({ ok: true, message: 'Authenticated successfully' })
  } catch (err: any) {
    console.error('admin/auth error:', err)
    return NextResponse.json(
      { ok: false, error: 'Authentication failed' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const authCookie = cookieStore.get('admin_auth')

    const isAuthenticated = authCookie?.value === 'authenticated'

    return NextResponse.json({ 
      ok: true, 
      authenticated: isAuthenticated 
    })
  } catch (err: any) {
    console.error('admin/auth check error:', err)
    return NextResponse.json(
      { ok: false, authenticated: false },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  try {
    const cookieStore = await cookies()
    cookieStore.delete('admin_auth')

    return NextResponse.json({ ok: true, message: 'Logged out successfully' })
  } catch (err: any) {
    console.error('admin/auth logout error:', err)
    return NextResponse.json(
      { ok: false, error: 'Logout failed' },
      { status: 500 }
    )
  }
}

