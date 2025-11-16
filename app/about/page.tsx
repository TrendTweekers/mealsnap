import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'
import { TaxDisclaimer } from '@/components/tax-disclaimer'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About SnapLedger – AI Receipt & Mileage Tracker',
  description: 'Learn how SnapLedger helps freelancers and small business owners manage receipts and mileage without logins or subscriptions.',
  openGraph: {
    title: 'About SnapLedger – AI Receipt & Mileage Tracker',
    description: 'Learn how SnapLedger helps freelancers and small business owners manage receipts and mileage without logins or subscriptions.',
    url: 'https://v0-receipt-scanner-app.vercel.app/about',
    siteName: 'SnapLedger',
    images: [
      {
        url: '/og-card.png',
        width: 1200,
        height: 630,
        alt: 'SnapLedger - Receipt Scanner & Mileage Tracker'
      }
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About SnapLedger – AI Receipt & Mileage Tracker',
    description: 'Learn how SnapLedger helps freelancers and small business owners manage receipts and mileage without logins or subscriptions.',
    images: ['/og-card.png'],
  },
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/10 p-4 sm:p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to SnapLedger
        </Link>

        <Card className="p-8 space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-4">About SnapLedger</h1>
            <p className="text-muted-foreground leading-relaxed">
              SnapLedger is a free, no-login AI-powered receipt and mileage tracker designed for freelancers and small business owners. 
              Instantly extract merchant, amount, and category from receipts, track business mileage, and export everything to tax-ready CSV/PDF formats.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">Features</h2>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Scan receipts with AI (merchant, amount, category)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Track mileage and export CSV/PDF</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Enjoy optional partner perks (Wise, Gusto, etc.)</span>
              </li>
            </ul>
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-4">
              Built with privacy in mind. All data stays in your browser—no accounts, no servers, no tracking.
            </p>
            <TaxDisclaimer />
          </div>
        </Card>
      </div>
    </div>
  )
}

