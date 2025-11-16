'use client'

import { useState, useEffect } from 'react'
import CameraCapture from '@/components/camera-capture'
import ExpenseList from '@/components/expense-list'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function Home() {
  const [expenses, setExpenses] = useState<any[]>([])
  const [scanCount, setScanCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('scan')

  // Load data from IndexedDB on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const db = await openIndexedDB()
        const tx = db.transaction('expenses', 'readonly')
        const store = tx.objectStore('expenses')
        const allExpenses = await new Promise((resolve, reject) => {
          const request = store.getAll()
          request.onsuccess = () => resolve(request.result)
          request.onerror = () => reject(request.error)
        })
        setExpenses(allExpenses)

        // Load scan count
        const countTx = db.transaction('metadata', 'readonly')
        const countStore = countTx.objectStore('metadata')
        const scanData = await new Promise<any>((resolve) => {
          const request = countStore.get('scanCount')
          request.onsuccess = () => resolve(request.result)
        })
        if (scanData) {
          setScanCount(scanData.value)
        }
      } catch (error) {
        console.error('Failed to load data:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  const handleExpenseAdded = async (newExpense: any) => {
    try {
      const db = await openIndexedDB()
      
      // Reload expenses
      const tx = db.transaction('expenses', 'readonly')
      const store = tx.objectStore('expenses')
      const allExpenses = await new Promise<any[]>((resolve, reject) => {
        const request = store.getAll()
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
      setExpenses(allExpenses)

      // Reload scan count
      const countTx = db.transaction('metadata', 'readonly')
      const countStore = countTx.objectStore('metadata')
      const scanData = await new Promise<any>((resolve) => {
        const request = countStore.get('scanCount')
        request.onsuccess = () => resolve(request.result)
      })
      setScanCount(scanData?.value || 0)
    } catch (error) {
      console.error('Failed to reload data:', error)
    }
  }

  const handleExpenseDeleted = (id: string) => {
    setExpenses(expenses.filter(e => e.id !== id))
  }

  const handleResetScans = async () => {
    const db = await openIndexedDB()
    const tx = db.transaction('metadata', 'readwrite')
    const store = tx.objectStore('metadata')
    await new Promise<void>((resolve) => {
      const request = store.put({ key: 'scanCount', value: 0 })
      request.onsuccess = () => resolve()
    })
    setScanCount(0)
  }

  const handleProcessingComplete = () => {
    setActiveTab('expenses')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your expenses...</p>
        </div>
      </div>
    )
  }

  const isFreemiumLimited = scanCount >= 10
  const scansRemaining = Math.max(0, 10 - scanCount)

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/10 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground">ReceiptSnap</h1>
              <p className="text-muted-foreground mt-1">AI-powered expense tracking</p>
            </div>
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-right">
              <p className="text-xs text-muted-foreground">Free scans remaining</p>
              <p className="text-2xl font-bold text-primary">{scansRemaining}</p>
              {scanCount > 0 && (
                <button 
                  onClick={handleResetScans}
                  className="text-xs text-primary hover:underline mt-2"
                >
                  Reset (test)
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Freemium Notice */}
        {isFreemiumLimited && (
          <Card className="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800 p-4">
            <p className="text-sm text-amber-900 dark:text-amber-100">
              You've reached your monthly free limit. Upgrade to unlimited scanning for $4.99/month.
            </p>
          </Card>
        )}

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="scan">Scan Receipt</TabsTrigger>
            <TabsTrigger value="expenses">Expenses ({expenses.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="scan" className="space-y-4">
            {isFreemiumLimited ? (
              <Card className="p-8 text-center">
                <p className="text-lg font-semibold text-foreground mb-4">
                  Monthly limit reached
                </p>
                <p className="text-muted-foreground mb-6">
                  You have 10 free scans per month. Upgrade to continue scanning.
                </p>
                <button className="bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors">
                  Upgrade to Pro ($4.99/month)
                </button>
              </Card>
            ) : (
              <CameraCapture 
                onExpenseAdded={handleExpenseAdded}
                onProcessingComplete={handleProcessingComplete}
              />
            )}
          </TabsContent>

          <TabsContent value="expenses" className="space-y-4">
            <ExpenseList
              expenses={expenses}
              onExpenseDeleted={handleExpenseDeleted}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

// IndexedDB initialization
function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ReceiptSnapDB', 1)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains('expenses')) {
        db.createObjectStore('expenses', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('metadata')) {
        db.createObjectStore('metadata', { keyPath: 'key' })
      }
    }
  })
}
