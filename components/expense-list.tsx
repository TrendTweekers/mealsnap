'use client'

import { useState, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Trash2, Download, Camera } from 'lucide-react'
import { deleteExpenseFromIndexedDB, saveExpenseToIndexedDB } from '@/lib/db-utils'
import { exportToCSV, exportToPDF } from '@/lib/export-utils'
import { categoryColors } from '@/lib/constants'
import { toast } from 'sonner'
import { track } from '@/lib/analytics'
import type { Expense } from '@/lib/types'

interface ExpenseListProps {
  expenses: Expense[]
  onExpenseDeleted: (id: string) => void
  onExpenseRestored?: (expense: Expense) => void
  onNavigateToScan?: () => void
}

export default function ExpenseList({ expenses, onExpenseDeleted, onExpenseRestored, onNavigateToScan }: ExpenseListProps) {
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null)
  const deletedExpenseRef = useRef<Expense | null>(null)
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleDeleteClick = (id: string) => {
    setConfirmingDelete(id)
  }

  const handleDeleteCancel = () => {
    setConfirmingDelete(null)
  }

  const handleDeleteConfirm = async (expense: Expense) => {
    try {
      // Store expense for undo
      deletedExpenseRef.current = { ...expense }
      setConfirmingDelete(null)
      
      await deleteExpenseFromIndexedDB(expense.id)
      onExpenseDeleted(expense.id)
      
      track('expense_deleted', { merchant: expense.merchant, amount: expense.amount })
      
      // Show toast with undo
      toast.success('Expense deleted', {
        action: {
          label: 'Undo',
          onClick: handleUndo
        },
        duration: 15000
      })
      
      // Clear undo after 15 seconds
      undoTimeoutRef.current = setTimeout(() => {
        deletedExpenseRef.current = null
      }, 15000)
    } catch (error) {
      console.error('Failed to delete expense:', error)
      toast.error('Failed to delete expense. Please try again.')
    }
  }

  const handleUndo = async () => {
    if (!deletedExpenseRef.current) return
    
    try {
      const restored = await saveExpenseToIndexedDB(deletedExpenseRef.current)
      if (onExpenseRestored) {
        onExpenseRestored(restored)
      }
      deletedExpenseRef.current = null
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current)
      }
      track('expense_undo', { merchant: restored.merchant, amount: restored.amount })
      toast.success('Expense restored')
    } catch (error) {
      console.error('Failed to restore expense:', error)
      toast.error('Failed to restore expense. Please try again.')
    }
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
        <div className="space-y-4">
          <div className="text-6xl">📋</div>
          <h3 className="text-lg font-semibold text-foreground">No expenses yet</h3>
          <p className="text-sm text-muted-foreground">
            Track mileage or add expenses manually to see them here.
          </p>
          {onNavigateToScan && (
            <Button onClick={onNavigateToScan} className="mt-4">
              <Camera className="mr-2 h-4 w-4" />
              Go to Scan
            </Button>
          )}
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
          <p className="text-sm text-muted-foreground">Avg. Per Transaction</p>
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
          onClick={() => exportToCSV(expenses)}
          variant="outline"
          className="flex-1"
        >
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
        <Button
          onClick={() => exportToPDF(expenses)}
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
          const isConfirming = confirmingDelete === expense.id
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
                  {isConfirming && (
                    <div className="mt-3 p-3 bg-muted rounded-lg space-y-2">
                      <p className="text-sm font-medium text-foreground">Delete this expense?</p>
                      <div className="flex gap-2">
                        <Button
                          onClick={handleDeleteCancel}
                          variant="outline"
                          size="sm"
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={() => handleDeleteConfirm(expense)}
                          variant="destructive"
                          size="sm"
                          className="flex-1"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="text-right space-y-2">
                  <p className="text-lg font-bold text-primary">
                    {currencySymbol(expense.currency)}
                    {isFinite(amount) ? amount.toFixed(2) : '0.00'}
                  </p>
                  {!isConfirming && (
                    <Button
                      onClick={() => handleDeleteClick(expense.id)}
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
