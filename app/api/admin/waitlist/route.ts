import { NextResponse } from 'next/server'
import { kv } from '@vercel/kv'

export async function GET() {
  try {
    // Get all email keys
    const emailKeys = await kv.keys('email:*')
    
    // Fetch all email data
    const emails = await Promise.all(
      emailKeys.map(async (key: string) => {
        const data = await kv.get(key)
        return data
      })
    )

    // Get waitlist count
    const count = await kv.get<number>('waitlist:count') || 0
    
    // Get waitlist set size
    const setSize = await kv.scard('waitlist:emails') || 0

    // Calculate source breakdown
    const sourceBreakdown = emails.reduce((acc: any, email: any) => {
      if (email && email.source) {
        acc[email.source] = (acc[email.source] || 0) + 1
      }
      return acc
    }, {})

    return NextResponse.json({
      total: emails.length,
      count,
      setSize,
      sourceBreakdown,
      emails: emails.filter(Boolean).sort((a: any, b: any) => 
        (b.createdAt || 0) - (a.createdAt || 0)
      ),
    })
  } catch (err: any) {
    console.error('admin/waitlist error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch waitlist data', details: err.message },
      { status: 500 }
    )
  }
}

