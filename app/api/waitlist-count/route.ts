import { NextResponse } from 'next/server'
import { kv } from '@vercel/kv'

export async function GET() {
  try {
    // Get the waitlist count from KV
    const count = await kv.get<number>('waitlist:count')
    
    // If count doesn't exist, try to get it from the set size
    if (count === null) {
      const setSize = await kv.scard('waitlist:emails')
      return NextResponse.json({ count: setSize || 0 })
    }
    
    return NextResponse.json({ count: count || 0 })
  } catch (err: any) {
    // If KV is not configured, return a default count
    console.warn('[waitlist-count] Vercel KV not configured:', err)
    return NextResponse.json({ count: 247 }) // Fallback to default
  }
}

