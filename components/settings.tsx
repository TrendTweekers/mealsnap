'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Mail } from 'lucide-react'

interface SettingsProps {
  expenses: any[]
  onClose: () => void
}

export function Settings({ expenses, onClose }: SettingsProps) {
  const [emailDigestEnabled, setEmailDigestEnabled] = useState(false)

  // Load setting from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('emailDigestEnabled')
    setEmailDigestEnabled(stored === 'true')
  }, [])

  const handleEmailDigestToggle = () => {
    const newValue = !emailDigestEnabled
    setEmailDigestEnabled(newValue)
    localStorage.setItem('emailDigestEnabled', String(newValue))
  }

  const handleShareDigest = async () => {
    try {
      const thisWeek = expenses.filter(exp => {
        const expDate = new Date(exp.date)
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        return expDate > weekAgo
      })

      const totalThisWeek = thisWeek.reduce((sum, exp) => sum + (exp.amount || 0), 0)
      const subject = `SnapLedger Weekly Summary - $${totalThisWeek.toFixed(2)}`
      const body = `
Weekly Expense Summary from SnapLedger
======================

${thisWeek.map(e => `- ${e.merchant} (${e.category}): $${e.amount.toFixed(2)}`).join('\n')}

Total: $${totalThisWeek.toFixed(2)}

Export your full data at: ${typeof window !== 'undefined' ? window.location.origin : 'https://snapledger.app'}
      `.trim()

      // Use native share API
      if (navigator.share) {
        await navigator.share({
          title: 'SnapLedger Weekly Summary',
          text: body,
        })
      } else if (navigator.canShare && navigator.canShare({ url: '', title: '' })) {
        // Fallback: open mail client
        const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
        window.location.href = mailtoLink
      }
    } catch (error) {
      console.error('Share failed:', error)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md p-6 space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Settings</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <label className="text-sm font-medium cursor-pointer flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Weekly Email Digest
            </label>
            <input
              type="checkbox"
              checked={emailDigestEnabled}
              onChange={handleEmailDigestToggle}
              className="h-4 w-4 cursor-pointer"
            />
          </div>

          {emailDigestEnabled && (
            <div className="p-3 bg-primary/10 rounded-lg space-y-2">
              <p className="text-xs text-muted-foreground">
                Every Sunday at 19:00, you can share your weekly summary via email.
              </p>
              <Button
                onClick={handleShareDigest}
                size="sm"
                className="w-full"
              >
                Share This Week's Summary
              </Button>
            </div>
          )}
        </div>

        <Button onClick={onClose} variant="outline" className="w-full">
          Close
        </Button>
      </Card>
    </div>
  )
}
