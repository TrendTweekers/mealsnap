'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Trash2, Download } from 'lucide-react'
import { deleteExpenseFromIndexedDB } from '@/lib/db-utils'
import { exportToCSV, exportToPDF } from '@/lib/export-utils'
import posthog from 'posthog-js'

interface Expense {
  id: string
  merchant: string
  amount: number
  category: string
  date: string
  receipt?: string
}

interface ExpenseListProps {
  expenses: Expense[]
  onExpenseDeleted: (id: string) => void
}

const categoryColors: Record<string, string> = {
  'Food': 'bg-orange-100 text-orange-900 dark:bg-orange-900/30 dark:text-orange-200',
  'Travel': 'bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-200',
  'Office': 'bg-purple-100 text-purple-900 dark:bg-purple-900/30 dark:text-purple-200',
  'Other': 'bg-gray-100 text-gray-900 dark:bg-gray-900/30 dark:text-gray-200',
}

export default function ExpenseList({ expenses, onExpenseDeleted }: ExpenseListProps) {
  const [selectedExpenses, setSelectedExpenses] = useState<string[]>([])

  const handleDelete = async (id: string) => {
    await deleteExpenseFromIndexedDB(id)
    onExpenseDeleted(id)
  }

  // Filter out invalid expenses and ensure amounts are valid
  const validExpenses = expenses.filter(exp => {
    const amount = Number(exp.amount)
    return isFinite(amount) && amount >= 0
  })

  const totalAmount = validExpenses.reduce((sum, exp) => {
    const amount = Number(exp.amount)
    return sum + (isFinite(amount) ? amount : 0)
  }, 0)

  const currencySymbol = (currency?: string) => {
    if (!currency) return '$'
    const map: Record<string, string> = {
      USD: '$',
      PLN: 'zł',
      EUR: '€',
      GBP: '£',
      JPY: '¥',
    }
    return map[currency] || currency
  }
  
  const categoryBreakdown = validExpenses.reduce((acc, exp) => {
    const amount = Number(exp.amount)
    if (isFinite(amount)) {
      acc[exp.category] = (acc[exp.category] || 0) + amount
    }
    return acc
  }, {} as Record<string, number>)

  if (expenses.length === 0) {
    return (
      <Card className="p-8 text-center">
        <div className="space-y-3">
          <div className="text-6xl">📋</div>
          <h3 className="text-lg font-semibold text-foreground">No expenses yet</h3>
          <p className="text-sm text-muted-foreground">
            Start scanning receipts to track your expenses
          </p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-primary/5 border-primary/20">
          <p className="text-sm text-muted-foreground">Total Spent</p>
          <p className="text-2xl font-bold text-primary">
            {currencySymbol(validExpenses[0]?.currency)}
            {totalAmount.toFixed(2)}
          </p>
        </Card>
        <Card className="p-4 bg-accent/5 border-accent/20">
          <p className="text-sm text-muted-foreground">Transactions</p>
          <p className="text-2xl font-bold text-accent">{validExpenses.length}</p>
        </Card>
        <Card className="p-4 bg-secondary/10 border-secondary/20">
          <p className="text-sm text-muted-foreground">Avg. Per Receipt</p>
          <p className="text-2xl font-bold text-foreground">${validExpenses.length > 0 ? (totalAmount / validExpenses.length).toFixed(2) : '0.00'}</p>
        </Card>
      </div>

      {/* Category Breakdown */}
      {Object.keys(categoryBreakdown).length > 0 && (
        <Card className="p-4">
          <h4 className="font-semibold text-foreground mb-3">By Category</h4>
          <div className="space-y-2">
            {Object.entries(categoryBreakdown).map(([category, amount]) => (
              <div key={category} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{category}</span>
                <span className="font-medium text-foreground">
                  {currencySymbol(validExpenses[0]?.currency)}
                  {amount.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Export Options */}
      <div className="flex gap-2">
        <Button
          onClick={() => {
            posthog.capture('export_csv', { count: expenses.length })
            exportToCSV(expenses)
          }}
          variant="outline"
          className="flex-1"
        >
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
        <Button
          onClick={() => {
            posthog.capture('export_pdf', { count: expenses.length })
            exportToPDF(expenses)
          }}
          variant="outline"
          className="flex-1"
        >
          <Download className="mr-2 h-4 w-4" />
          Export PDF
        </Button>
      </div>

      {/* Expense List */}
      <div className="space-y-3">
        <h3 className="font-semibold text-foreground">Recent Expenses</h3>
        {validExpenses.map((expense) => {
          const amount = Number(expense.amount)
          return (
            <Card key={expense.id} className="p-4 hover:bg-secondary/50 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-foreground">{expense.merchant}</h4>
                    <span className={`text-xs px-2 py-1 rounded-full ${categoryColors[expense.category] || categoryColors['Other']}`}>
                      {expense.category}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {new Date(expense.date).toLocaleDateString()} at {new Date(expense.date).toLocaleTimeString()}
                  </p>
                </div>
                <div className="text-right space-y-2">
                  <p className="text-lg font-bold text-primary">
                    {currencySymbol(expense.currency)}
                    {isFinite(amount) ? amount.toFixed(2) : '0.00'}
                  </p>
                  <Button
                    onClick={() => handleDelete(expense.id)}
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
