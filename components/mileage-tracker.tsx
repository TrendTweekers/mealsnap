'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Loader2, MapPin, DollarSign } from 'lucide-react'

const IRS_RATE = 0.67 // 2025 IRS mileage rate

interface MileageTrackerProps {
  onExpenseCreated: (expense: any) => void
}

export function MileageTracker({ onExpenseCreated }: MileageTrackerProps) {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [distance, setDistance] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const calculateMileage = async () => {
    if (!from.trim() || !to.trim()) {
      setError('Please enter both addresses')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Use Google Maps Distance Matrix API
      const response = await fetch('/api/distance-matrix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to })
      })

      const data = await response.json()

      if (!data.ok) {
        throw new Error(data.error || 'Failed to calculate distance')
      }

      const miles = data.distance / 1609.34 // Convert meters to miles
      setDistance(miles)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Calculation failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateExpense = async () => {
    if (distance === null) return

    const deduction = distance * IRS_RATE
    const expense = {
      merchant: `Trip: ${from} → ${to}`,
      amount: deduction,
      category: 'Travel',
      date: new Date().toISOString().split('T')[0],
      receipt: `Mileage: ${distance.toFixed(1)} mi @ $${IRS_RATE}/mi = $${deduction.toFixed(2)}`
    }

    onExpenseCreated(expense)

    // Reset form
    setFrom('')
    setTo('')
    setDistance(null)
  }

  return (
    <Card className="p-6 space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Mileage Tracker</h3>
        <p className="text-sm text-muted-foreground">IRS Rate: ${IRS_RATE}/mile</p>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium">From Address</label>
          <input
            type="text"
            placeholder="e.g., 123 Main St, New York"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg bg-background"
          />
        </div>

        <div>
          <label className="text-sm font-medium">To Address</label>
          <input
            type="text"
            placeholder="e.g., 456 Park Ave, Boston"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg bg-background"
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 rounded-lg text-sm text-red-900 dark:text-red-100">
            {error}
          </div>
        )}

        {distance !== null && (
          <div className="p-4 bg-primary/10 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Distance</span>
              <span className="font-semibold">{distance.toFixed(1)} miles</span>
            </div>
            <div className="flex items-center justify-between text-lg font-bold text-primary">
              <span className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Tax Deduction
              </span>
              <span>${(distance * IRS_RATE).toFixed(2)}</span>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={calculateMileage}
            disabled={isLoading || !from.trim() || !to.trim()}
            variant="outline"
            className="flex-1"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Calculating...
              </>
            ) : (
              <>
                <MapPin className="mr-2 h-4 w-4" />
                Calculate
              </>
            )}
          </Button>

          {distance !== null && (
            <Button
              onClick={handleCreateExpense}
              className="flex-1"
            >
              Log Deduction
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}
