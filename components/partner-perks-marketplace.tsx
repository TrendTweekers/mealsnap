'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronRight, ExternalLink } from 'lucide-react'

interface Partner {
  id: string
  name: string
  icon: string
  deal: string
  value: string
  link: string
  cta: string
}

const PARTNERS: Partner[] = [
  {
    id: 'quickbooks',
    name: 'QuickBooks Online',
    icon: '📊',
    deal: '30% off annual subscription',
    value: 'Save $120/year',
    link: 'https://impact.com/quickbooks-ref',
    cta: 'Get Deal'
  },
  {
    id: 'wise',
    name: 'Wise (TransferWise)',
    icon: '💳',
    deal: 'First transfer free',
    value: 'Save up to $30',
    link: 'https://impact.com/wise-ref',
    cta: 'Claim Free Transfer'
  },
  {
    id: 'gusto',
    name: 'Gusto Payroll',
    icon: '💰',
    deal: '1 month free trial',
    value: 'Test payroll free',
    link: 'https://impact.com/gusto-ref',
    cta: 'Start Free Trial'
  },
  {
    id: 'stripe',
    name: 'Stripe for Freelancers',
    icon: '🔗',
    deal: 'First $1k volume free',
    value: 'No fees on early revenue',
    link: 'https://impact.com/stripe-ref',
    cta: 'Explore Payments'
  },
  {
    id: 'notion',
    name: 'Notion Premium',
    icon: '📝',
    deal: 'Exclusive 1yr discount code',
    value: 'Work smarter, organized',
    link: 'https://impact.com/notion-ref',
    cta: 'Get Discount'
  },
  {
    id: 'freshbooks',
    name: 'FreshBooks Invoicing',
    icon: '🧾',
    deal: '40% off first 6 months',
    value: 'Professional invoices',
    link: 'https://impact.com/freshbooks-ref',
    cta: 'Save 40%'
  }
]

export function PartnerPerksMarketplace() {
  const handlePartnerClick = (partner: Partner) => {
    // Track click for analytics
    localStorage.setItem(`partner_click_${partner.id}`, new Date().toISOString())
    // Open affiliate link in new tab
    window.open(partner.link, '_blank')
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xl font-bold">💎 Exclusive Partner Perks</h3>
        <p className="text-sm text-muted-foreground">
          Special deals for freelancers & small business owners
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {PARTNERS.map(partner => (
          <Card
            key={partner.id}
            className="p-4 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer"
            onClick={() => handlePartnerClick(partner)}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-start gap-3 flex-1">
                <span className="text-3xl">{partner.icon}</span>
                <div>
                  <h4 className="font-semibold text-sm">{partner.name}</h4>
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                    {partner.deal}
                  </p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground mt-1" />
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-green-600">{partner.value}</p>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={(e) => {
                  e.stopPropagation()
                  handlePartnerClick(partner)
                }}
              >
                {partner.cta}
                <ExternalLink className="ml-1 h-3 w-3" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded text-sm text-blue-900 dark:text-blue-100">
        💡 <strong>We earn a small commission</strong> when you sign up through these links—
        at no extra cost to you. Helps us keep SnapLedger free!
      </div>
    </div>
  )
}
