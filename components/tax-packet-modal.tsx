'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FileText, Loader2 } from 'lucide-react'

interface TaxPacketModalProps {
  expenses: any[]
  onClose: () => void
  onPurchase: () => Promise<void>
}

export function TaxPacketModal({ expenses, onClose, onPurchase }: TaxPacketModalProps) {
  const [isLoading, setIsLoading] = useState(false)

  const totalDeductible = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0)
  const categoryBreakdown = expenses.reduce((acc, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + (exp.amount || 0)
    return acc
  }, {} as Record<string, number>)

  const handlePurchase = async () => {
    setIsLoading(true)
    try {
      await onPurchase()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md p-6 space-y-6">
        <div className="text-center space-y-2">
          <FileText className="h-12 w-12 mx-auto text-primary" />
          <h2 className="text-2xl font-bold">2025 Tax Packet</h2>
          <p className="text-sm text-muted-foreground">IRS-ready deduction bundle</p>
        </div>

        <div className="space-y-3 p-4 bg-primary/5 rounded-lg">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Total Deductible Expenses</p>
            <p className="text-3xl font-bold text-primary">${totalDeductible.toFixed(2)}</p>
          </div>
          
          <div className="border-t pt-3">
            <p className="text-xs font-semibold mb-2">By Category:</p>
            <div className="space-y-1 text-sm">
              {Object.entries(categoryBreakdown).map(([category, amount]) => (
                <div key={category} className="flex justify-between">
                  <span className="text-muted-foreground">{category}</span>
                  <span className="font-medium">${(amount as number).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2 p-4 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
          <p className="text-xs font-semibold text-amber-900 dark:text-amber-100">Includes:</p>
          <ul className="text-xs text-amber-900 dark:text-amber-100 space-y-1">
            <li>✓ IRS-formatted CSV export</li>
            <li>✓ PDF summary with charts</li>
            <li>✓ Deduction breakdown by category</li>
            <li>✓ Apple Wallet receipt pass (for audits)</li>
          </ul>
        </div>

        <div className="space-y-2">
          <Button
            onClick={handlePurchase}
            disabled={isLoading}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>Buy for $4.99</>
            )}
          </Button>
          <Button onClick={onClose} variant="outline" className="w-full">
            Maybe Later
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          Powered by Stripe • Secure checkout
        </p>
      </Card>
    </div>
  )
}
