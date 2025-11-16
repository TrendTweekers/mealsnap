'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Loader2, MapPin, DollarSign } from 'lucide-react'
import { getMileageSettings, saveMileageSettings, type MileageSettings } from '@/lib/constants'

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
  const [settings, setSettings] = useState<MileageSettings>(getMileageSettings())

  useEffect(() => {
    setSettings(getMileageSettings())
  }, [])

  const updateSettings = (updates: Partial<MileageSettings>) => {
    const newSettings = { ...settings, ...updates }
    setSettings(newSettings)
    saveMileageSettings(newSettings)
  }

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

      // Convert meters to miles (for IRS) or km (for custom)
      const distanceInMeters = data.distance
      const distance = settings.rateType === 'irs' 
        ? distanceInMeters / 1609.34 // Convert to miles
        : distanceInMeters / 1000     // Convert to km
      setDistance(distance)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Calculation failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateExpense = async () => {
    if (distance === null) return

    const rate = settings.rateType === 'irs' ? IRS_RATE : settings.customRate
    const rateLabel = settings.rateType === 'irs' ? '$/mile' : settings.customCurrency
    const deduction = distance * rate
    
    const expense = {
      merchant: `Trip: ${from} → ${to}`,
      amount: deduction,
      category: 'Travel',
      date: new Date().toISOString().split('T')[0],
      receipt: `Mileage: ${distance.toFixed(1)} ${settings.rateType === 'irs' ? 'mi' : 'km'} @ ${rate.toFixed(2)} ${rateLabel} = ${settings.rateType === 'irs' ? '$' : ''}${deduction.toFixed(2)}${settings.rateType === 'custom' ? ' ' + settings.customCurrency.split('/')[0] : ''}`
    }

    onExpenseCreated(expense)

    // Reset form
    setFrom('')
    setTo('')
    setDistance(null)
  }

  const currentRate = settings.rateType === 'irs' ? IRS_RATE : settings.customRate
  const rateLabel = settings.rateType === 'irs' ? '$/mile' : settings.customCurrency

  return (
    <Card className="p-6 space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Mileage Tracker</h3>
        <p className="text-sm text-muted-foreground">
          {settings.rateType === 'irs' 
            ? `IRS Rate: $${IRS_RATE}/mile` 
            : `Custom Rate: ${currentRate.toFixed(2)} ${settings.customCurrency}`}
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium">Rate Type</label>
          <select
            value={settings.rateType}
            onChange={(e) => updateSettings({ rateType: e.target.value as 'irs' | 'custom' })}
            className="w-full px-3 py-2 border rounded-lg bg-background"
          >
            <option value="irs">IRS rate (0.67 $/mile)</option>
            <option value="custom">Custom rate</option>
          </select>
        </div>

        {settings.rateType === 'custom' && (
          <>
            <div>
              <label className="text-sm font-medium">Rate per unit</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={settings.customRate}
                onChange={(e) => updateSettings({ customRate: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border rounded-lg bg-background"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Currency/unit label</label>
              <input
                type="text"
                value={settings.customCurrency}
                onChange={(e) => updateSettings({ customCurrency: e.target.value })}
                placeholder="PLN/km"
                className="w-full px-3 py-2 border rounded-lg bg-background"
              />
            </div>
          </>
        )}

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
              <span className="font-semibold">
                {distance.toFixed(1)} {settings.rateType === 'irs' ? 'miles' : 'km'}
              </span>
            </div>
            <div className="flex items-center justify-between text-lg font-bold text-primary">
              <span className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Tax Deduction
              </span>
              <span>
                {settings.rateType === 'irs' ? '$' : ''}
                {(distance * currentRate).toFixed(2)}
                {settings.rateType === 'custom' ? ' ' + settings.customCurrency.split('/')[0] : ''}
              </span>
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
