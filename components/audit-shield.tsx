'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { AlertCircle, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react'
// import posthog from 'posthog-js' // TEMPORARILY DISABLED

interface AuditResult {
  merchant: { status: 'green' | 'amber' | 'red'; message: string }
  total: { status: 'green' | 'amber' | 'red'; message: string }
  tax: { status: 'green' | 'amber' | 'red'; message: string }
  date: { status: 'green' | 'amber' | 'red'; message: string }
  overallStatus: 'green' | 'amber' | 'red'
}

interface AuditShieldProps {
  expenses: any[]
  onAuditComplete: (result: AuditResult) => void
}

export function AuditShield({ expenses, onAuditComplete }: AuditShieldProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null)
  const [monthStats, setMonthStats] = useState<Record<string, 'green' | 'amber' | 'red'>>({})

  const handlePreAuditScan = async () => {
    setIsScanning(true)
    // posthog.capture('audit_scan_started', { expenseCount: expenses.length }) // TEMPORARILY DISABLED

    try {
      // Analyze current month expenses
      const thisMonth = expenses.filter(exp => {
        const expDate = new Date(exp.date)
        const now = new Date()
        return expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear()
      })

      // Run audit on batch
      const result = await auditExpenses(thisMonth)
      setAuditResult(result)
      onAuditComplete(result)

      // Store monthly audit
      const monthKey = new Date().toISOString().slice(0, 7) // YYYY-MM
      setMonthStats(prev => ({ ...prev, [monthKey]: result.overallStatus }))
    } catch (error) {
      console.error('Audit failed:', error)
    } finally {
      setIsScanning(false)
    }
  }

  const getStatusIcon = (status: 'green' | 'amber' | 'red') => {
    switch (status) {
      case 'green':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'amber':
        return <AlertTriangle className="h-5 w-5 text-amber-600" />
      case 'red':
        return <AlertCircle className="h-5 w-5 text-red-600" />
    }
  }

  return (
    <Card className="p-6 space-y-4 border-primary/20 bg-primary/5">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          🛡️ Pre-Audit Shield
        </h3>
        <p className="text-sm text-muted-foreground">
          Verify your receipts before tax season. $2.99/scan-batch.
        </p>
      </div>

      {auditResult ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2 p-2 rounded bg-background">
              {getStatusIcon(auditResult.merchant.status)}
              <div>
                <p className="font-medium">Merchant</p>
                <p className="text-xs text-muted-foreground">{auditResult.merchant.message}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 rounded bg-background">
              {getStatusIcon(auditResult.total.status)}
              <div>
                <p className="font-medium">Total</p>
                <p className="text-xs text-muted-foreground">{auditResult.total.message}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 rounded bg-background">
              {getStatusIcon(auditResult.tax.status)}
              <div>
                <p className="font-medium">Tax</p>
                <p className="text-xs text-muted-foreground">{auditResult.tax.message}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 rounded bg-background">
              {getStatusIcon(auditResult.date.status)}
              <div>
                <p className="font-medium">Date</p>
                <p className="text-xs text-muted-foreground">{auditResult.date.message}</p>
              </div>
            </div>
          </div>

          {auditResult.overallStatus === 'green' && (
            <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 rounded text-sm text-green-900 dark:text-green-100">
              ✅ All receipts audit-ready! Safe to export for tax filing.
            </div>
          )}
          {auditResult.overallStatus === 'amber' && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 rounded text-sm text-amber-900 dark:text-amber-100">
              ⚠️ Some receipts need review before filing. Check highlighted fields.
            </div>
          )}
          {auditResult.overallStatus === 'red' && (
            <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 rounded text-sm text-red-900 dark:text-red-100">
              ❌ Critical data missing. Fill in red fields before export.
            </div>
          )}

          <Button onClick={handlePreAuditScan} className="w-full">
            Scan Again
          </Button>
        </div>
      ) : (
        <Button
          onClick={handlePreAuditScan}
          disabled={isScanning || expenses.length === 0}
          className="w-full"
        >
          {isScanning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Auditing...
            </>
          ) : (
            '🔍 Start Pre-Audit Scan'
          )}
        </Button>
      )}
    </Card>
  )
}

async function auditExpenses(expenses: any[]): Promise<AuditResult> {
  const getFieldStatus = (value: any): 'green' | 'amber' | 'red' => {
    if (!value || value === undefined || value === null || value === '') return 'red'
    if (typeof value === 'number' && value === 0) return 'amber'
    return 'green'
  }

  const merchantStatus = getFieldStatus(expenses[0]?.merchant)
  const totalStatus = getFieldStatus(expenses[0]?.amount)
  const taxStatus = expenses[0]?.tax ? 'green' : 'amber'
  const dateStatus = getFieldStatus(expenses[0]?.date)

  const statuses = [merchantStatus, totalStatus, taxStatus, dateStatus]
  const overallStatus: 'green' | 'amber' | 'red' =
    statuses.every(s => s === 'green') ? 'green' :
    statuses.some(s => s === 'red') ? 'red' : 'amber'

  return {
    merchant: { status: merchantStatus, message: merchantStatus === 'green' ? 'Detected' : 'Missing' },
    total: { status: totalStatus, message: totalStatus === 'green' ? 'Clear' : 'Missing/Zero' },
    tax: { status: taxStatus, message: taxStatus === 'green' ? 'Included' : 'Not found' },
    date: { status: dateStatus, message: dateStatus === 'green' ? 'Valid' : 'Missing' },
    overallStatus
  }
}
