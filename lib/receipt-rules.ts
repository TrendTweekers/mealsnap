import { DEFAULT_CATEGORIES, type Category } from './constants'

export interface ReceiptRule {
  id: string
  merchant: string
  category: Category
}

export async function getReceiptRules(): Promise<ReceiptRule[]> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('SnapLedgerDB', 1)
    request.onsuccess = () => {
      const db = request.result
      const tx = db.transaction('rules', 'readonly')
      const store = tx.objectStore('rules')
      const getAllRequest = store.getAll()
      getAllRequest.onsuccess = () => resolve(getAllRequest.result || [])
      getAllRequest.onerror = () => reject(getAllRequest.error)
    }
    request.onerror = () => reject(request.error)
  })
}

export async function addReceiptRule(merchant: string, category: ReceiptRule['category']): Promise<ReceiptRule> {
  const rule: ReceiptRule = {
    id: crypto.randomUUID(),
    merchant: merchant.toLowerCase().trim(),
    category,
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ReceiptSnapDB', 1)
    request.onsuccess = () => {
      const db = request.result
      const tx = db.transaction('rules', 'readwrite')
      const store = tx.objectStore('rules')
      const addRequest = store.add(rule)
      addRequest.onsuccess = () => resolve(rule)
      addRequest.onerror = () => reject(addRequest.error)
    }
    request.onerror = () => reject(request.error)
  })
}

export async function deleteReceiptRule(id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('SnapLedgerDB', 1)
    request.onsuccess = () => {
      const db = request.result
      const tx = db.transaction('rules', 'readwrite')
      const store = tx.objectStore('rules')
      const deleteRequest = store.delete(id)
      deleteRequest.onsuccess = () => resolve()
      deleteRequest.onerror = () => reject(deleteRequest.error)
    }
    request.onerror = () => reject(request.error)
  })
}

export async function applyReceiptRules(merchant: string, category: string): Promise<string> {
  try {
    const rules = await getReceiptRules()
    const merchantLower = merchant.toLowerCase()
    const matchedRule = rules.find(r => merchantLower.includes(r.merchant) || r.merchant.includes(merchantLower))
    return matchedRule ? matchedRule.category : category
  } catch (e) {
    return category
  }
}

export function exportRulesToJSON(rules: ReceiptRule[]): string {
  return JSON.stringify(rules)
}

export function importRulesFromJSON(jsonStr: string): ReceiptRule[] {
  return JSON.parse(jsonStr)
}
