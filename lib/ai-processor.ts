'use client'

import { processReceiptAction } from '@/app/actions/process-receipt'

// API key is now exclusively on the server via the server action

interface ExtractedReceipt {
  merchant: string
  amount: number
  category: string
  items?: string[]
}

export async function processReceiptWithAI(imageData: string): Promise<ExtractedReceipt> {
  // Delegate to server action - keeps API key secure
  return processReceiptAction(imageData)
}
