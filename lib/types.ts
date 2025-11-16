export interface ReceiptLineItem {
  description: string
  quantity: number | null
  unitPrice: number | null
  total: number
}

export interface ParsedReceipt {
  merchant: string | null
  merchantNormalized?: string | null
  total: number
  subtotal: number | null
  tax: number | null
  taxRate: number | null
  date: string | null // YYYY-MM-DD
  category:
    | "Meals & Entertainment"
    | "Travel"
    | "Software & Subscriptions"
    | "Office Supplies"
    | "Shopping"
    | "Other"
  emoji: string
  currency: string
  lineItems: ReceiptLineItem[]
  language: string | null
}

export interface Expense {
  id: string
  merchant: string
  merchantNormalized?: string | null
  amount: number
  category: string
  date: string
  currency?: string
  tax?: number
  taxRate?: number | null
  subtotal?: number | null
  emoji?: string
  receipt?: string
  lineItems?: ReceiptLineItem[]
  language?: string | null
}

