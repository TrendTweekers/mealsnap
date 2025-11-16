import { DEFAULT_CATEGORIES } from './constants'
import type { Expense, ReceiptLineItem } from './types'

function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    // Bump version to 2 so browsers that created v1 without 'metadata' get upgraded
    const request = indexedDB.open('SnapLedgerDB', 2)
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
      if (!db.objectStoreNames.contains('rules')) {
        db.createObjectStore('rules', { keyPath: 'id' })
      }
    }
  })
}

export async function saveExpenseToIndexedDB(data: any): Promise<Expense> {
  const db = await openIndexedDB()
  
  // Use 'total' from AI or fallback to 'amount'
  let amount = data.total || data.amount || 0
  
  // Ensure it's a valid number
  if (typeof amount === 'string') {
    amount = parseFloat(amount.replace(/[^0-9.-]/g, '')) || 0
  } else {
    amount = Number(amount) || 0
  }
  
  // Ensure it's finite
  if (!isFinite(amount)) {
    amount = 0
  }
  
  // Ensure category is one of the default categories
  const validCategory = DEFAULT_CATEGORIES.includes(data.category as any) 
    ? data.category 
    : 'Other'
  
  const expense: Expense = {
    id: crypto.randomUUID(),
    merchant: data.merchant || 'Unknown', // Handle null merchant from AI
    merchantNormalized: data.merchantNormalized || null,
    amount: Math.abs(amount), // Ensure positive
    category: validCategory,
    date: data.date || new Date().toISOString().split('T')[0],
    currency: data.currency || 'USD',
    tax: data.tax === null ? undefined : (typeof data.tax === 'number' ? data.tax : Number(data.tax) || undefined),
    taxRate: data.taxRate === null || data.taxRate === undefined ? null : (typeof data.taxRate === 'number' ? data.taxRate : Number(data.taxRate) || null),
    subtotal: data.subtotal === null || data.subtotal === undefined ? null : (typeof data.subtotal === 'number' ? data.subtotal : Number(data.subtotal) || null),
    emoji: data.emoji,
    lineItems: Array.isArray(data.lineItems) ? data.lineItems : undefined,
    language: data.language || null,
  }

  // Save expense
  await new Promise((resolve, reject) => {
    const tx = db.transaction('expenses', 'readwrite')
    const store = tx.objectStore('expenses')
    const request = store.add(expense)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(null)
  })

  // Update scan count
  const tx = db.transaction('metadata', 'readwrite')
  const store = tx.objectStore('metadata')
  await new Promise((resolve) => {
    const request = store.get('scanCount')
    request.onsuccess = () => {
      const current = request.result?.value || 0
      const updateRequest = store.put({ key: 'scanCount', value: current + 1 })
      updateRequest.onsuccess = () => resolve(null)
    }
  })

  return expense
}

export async function deleteExpenseFromIndexedDB(id: string): Promise<void> {
  const db = await openIndexedDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('expenses', 'readwrite')
    const store = tx.objectStore('expenses')
    const request = store.delete(id)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}
