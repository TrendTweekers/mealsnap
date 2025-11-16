'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Camera, Loader2, AlertCircle, Upload } from 'lucide-react'
import { saveExpenseToIndexedDB } from '@/lib/db-utils'
import { applyReceiptRules } from '@/lib/receipt-rules'

interface CameraCaptureProps {
  onExpenseAdded: (expense: any) => void
  onProcessingComplete?: () => void
}

export default function CameraCapture({ onExpenseAdded, onProcessingComplete }: CameraCaptureProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
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

  const handleProcessReceipt = async () => {
    if (!selectedFile) return
    setIsProcessing(true)
    setError(null)

    try {
      console.log('[v0] Starting receipt processing...')
      
      const form = new FormData();
      form.append("file", selectedFile);

      const res = await fetch('/api/process-receipt', {
        method: 'POST',
        body: form, // multipart/form-data automatically set
      })
      
      const result = await res.json()
      
      if (!result.ok) {
        setError(result.error || 'Failed to process receipt')
        return
      }
      
      console.log('[v0] Receipt processed successfully:', result.data)
      
      // Apply receipt rules to override category if rule exists
      result.data.category = await applyReceiptRules(result.data.merchant, result.data.category)
      
      const expense = await saveExpenseToIndexedDB(result.data)
      onExpenseAdded(expense)
      setPreviewImage(null)
      setSelectedFile(null)
      onProcessingComplete?.()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process receipt'
      console.error('[v0] Processing failed:', errorMessage)
      setError(errorMessage)
    } finally {
      setIsProcessing(false)
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
          <Button onClick={() => { setPreviewImage(null); setSelectedFile(null); }} variant="outline" className="flex-1">
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
