'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Camera, Loader2, AlertCircle, Upload } from 'lucide-react'
import { saveExpenseToIndexedDB } from '@/lib/db-utils'
import { applyReceiptRules } from '@/lib/receipt-rules'
import { toast } from 'sonner'
import { track } from '@/lib/analytics'

interface CameraCaptureProps {
  onExpenseAdded: (expense: any) => void
  onProcessingComplete?: () => void
}

export default function CameraCapture({ onExpenseAdded, onProcessingComplete }: CameraCaptureProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const isCancelledRef = useRef(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      setError('File too large. Please use an image under 10MB.')
      return
    }

    setSelectedFile(file)
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreviewImage(e.target?.result as string)
      setError(null)
    }
    reader.onerror = () => setError('Failed to read file.')
    reader.readAsDataURL(file)
  }

  const handleSampleReceipt = async () => {
    setIsProcessing(true)
    setError(null)
    isCancelledRef.current = false

    try {
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 800))
      
      // Hardcoded sample receipt data
      const sampleData = {
        merchant: 'COS',
        merchantNormalized: 'COS',
        total: 450,
        subtotal: null,
        tax: null,
        taxRate: null,
        date: new Date().toISOString().split('T')[0],
        category: 'Shopping',
        currency: 'PLN',
        emoji: '🛍️',
        lineItems: [],
        language: null
      }
      
      // Guard: Don't add expense if user clicked Retake during processing
      if (isCancelledRef.current) {
        console.log('[v0] Processing cancelled - user clicked Retake')
        return
      }
      
      // Apply receipt rules to override category if rule exists
      sampleData.category = await applyReceiptRules(sampleData.merchant, sampleData.category)
      
      const expense = await saveExpenseToIndexedDB(sampleData)
      onExpenseAdded(expense)
      onProcessingComplete?.()
      
      track('sample_receipt_used', { merchant: expense.merchant, amount: expense.amount })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process sample receipt'
      console.error('[v0] Sample receipt processing failed:', errorMessage)
      setError(errorMessage)
      toast.error('Couldn\'t process this receipt. Please try again or use a clearer photo.')
    } finally {
      setIsProcessing(false)
      isCancelledRef.current = false
    }
  }

  const handleProcessReceipt = async () => {
    if (!previewImage) return
    setIsProcessing(true)
    setError(null)
    isCancelledRef.current = false

    try {
      console.log('[v0] Starting receipt processing...')
      
      // Extract base64 from data URL
      const match = previewImage.match(/base64,(.+)$/)
      const imageBase64 = match ? match[1] : previewImage
      
      // convert base64 to real File so FormData works
      const byteString = atob(imageBase64);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
      const file = new File([ia], "receipt.jpg", { type: "image/jpeg" });

      const form = new FormData();
      form.append("file", file);
      
      const response = await fetch('/api/process-receipt', {
        method: 'POST',
        body: form // multipart/form-data automatically set
      })
      
      const result = await response.json()
      
      if (!result.ok) {
        const errorMsg = result.error || 'Failed to process receipt'
        setError(errorMsg)
        toast.error('Couldn\'t process this receipt. Please try again or use a clearer photo.')
        track('scan_error', { error: errorMsg })
        return
      }
      
      console.log('[v0] Receipt processed successfully:', result.data)
      
      // Guard: Don't add expense if user clicked Retake during processing
      if (isCancelledRef.current || !previewImage) {
        console.log('[v0] Processing cancelled - user clicked Retake')
        return
      }
      
      // Apply receipt rules to override category if rule exists
      result.data.category = await applyReceiptRules(result.data.merchant, result.data.category)
      
      const expense = await saveExpenseToIndexedDB(result.data)
      onExpenseAdded(expense)
      setPreviewImage(null)
      setSelectedFile(null)
      onProcessingComplete?.()
      
      track('scan_success', { merchant: expense.merchant, total: expense.amount, category: expense.category })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process receipt'
      console.error('[v0] Processing failed:', errorMessage)
      setError(errorMessage)
      toast.error('Couldn\'t process this receipt. Please try again or use a clearer photo.')
      track('scan_error', { error: errorMessage })
    } finally {
      setIsProcessing(false)
      isCancelledRef.current = false
    }
  }

  if (previewImage) {
    return (
      <div className="space-y-4">
        <Card className="overflow-hidden">
          <img
            src={previewImage || "/placeholder.svg"}
            alt="Receipt"
            className="w-full h-96 object-cover"
          />
        </Card>

        {error && (
          <Card className="bg-red-50 dark:bg-red-950 border-red-200 p-4 flex gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-900">{error}</p>
          </Card>
        )}

        <div className="flex gap-3">
          <Button onClick={() => { 
            setPreviewImage(null); 
            setSelectedFile(null); 
            if (isProcessing) {
              isCancelledRef.current = true;
            }
          }} variant="outline" className="flex-1" disabled={isProcessing}>
            Retake
          </Button>
          <Button onClick={handleProcessReceipt} disabled={isProcessing} className="flex-1">
            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isProcessing ? 'Processing...' : 'Process'}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Card className="p-8">
      <div className="flex flex-col items-center justify-center space-y-6">
        <div className="bg-primary/10 p-4 rounded-full">
          <Camera className="h-12 w-12 text-primary" />
        </div>

        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold">Snap & Save Tax</h3>
          <p className="text-sm text-muted-foreground">
            Instantly extract merchant, amount & category. Build your audit trail.
          </p>
        </div>

        <div className="w-full space-y-3">
          <Button onClick={() => cameraInputRef.current?.click()} className="w-full" size="lg">
            <Camera className="mr-2 h-4 w-4" />
            Take Photo with Camera
          </Button>

          <Button onClick={() => galleryInputRef.current?.click()} variant="outline" className="w-full" size="lg">
            <Upload className="mr-2 h-4 w-4" />
            Choose from Gallery
          </Button>

          <Button 
            onClick={handleSampleReceipt} 
            variant="outline" 
            className="w-full" 
            size="lg"
            disabled={isProcessing}
          >
            Try Sample Receipt
          </Button>
        </div>

        {/* Camera input - opens native camera */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileUpload}
          className="hidden"
        />

        {/* Gallery input - opens photo gallery */}
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 dark:bg-red-950 border border-red-200 rounded-lg flex gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-900">{error}</p>
        </div>
      )}
    </Card>
  )
}
