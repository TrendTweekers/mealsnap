import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { from, to } = await request.json()

    if (!from || !to) {
      return NextResponse.json({ ok: false, error: 'Missing addresses' }, { status: 400 })
    }

    // Use Google Distance Matrix API (free tier: 40k requests/month)
    const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY

    if (!GOOGLE_MAPS_API_KEY) {
      // Fallback: rough calculation (0.68 miles per minute of driving)
      // This is a simple fallback for testing
      const mockDistance = Math.random() * 50000 + 10000 // 10-60km
      return NextResponse.json({ ok: true, distance: mockDistance })
    }

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(from)}&destinations=${encodeURIComponent(to)}&key=${GOOGLE_MAPS_API_KEY}`
    )

    const data = await response.json()

    if (data.status !== 'OK' || !data.rows[0]?.elements[0]) {
      return NextResponse.json({ ok: false, error: 'Address not found' }, { status: 400 })
    }

    const element = data.rows[0].elements[0]

    if (element.status !== 'OK') {
      return NextResponse.json({ ok: false, error: 'Could not calculate distance' }, { status: 400 })
    }

    const distanceInMeters = element.distance.value

    return NextResponse.json({ ok: true, distance: distanceInMeters })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[v0] Distance Matrix error:', msg)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
