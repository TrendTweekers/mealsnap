import { Card } from '@/components/ui/card'
import { Info } from 'lucide-react'

export function TaxDisclaimer() {
  return (
    <Card className="p-4 bg-muted/50 border-muted">
      <div className="flex gap-3">
        <Info className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          SnapLedger helps you organize receipts and mileage, but does not provide tax or legal advice. 
          Always confirm deductions with your accountant or local regulations.
        </p>
      </div>
    </Card>
  )
}

