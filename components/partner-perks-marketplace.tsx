'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export function PartnerPerksMarketplace() {
  const perks = [
    {
      name: "Wise (TransferWise)",
      tagline: "First transfer free",
      savings: "Save up to $30",
      url: "https://wise.com/invite/dic/peterh561",
      cta: "Claim Free Transfer",
    },
    {
      name: "Gusto Payroll",
      tagline: "1-month free trial",
      savings: "Test payroll free",
      url: "https://gusto.com/r/matspetere00b4470",
      cta: "Start Free Trial",
    },
    {
      name: "QuickBooks Online",
      tagline: "30% off annual subscription",
      savings: "Save $120/year",
      url: "https://quickbooks.intuit.com/oa/?offer=30off", // replace with your affiliate link once approved
      cta: "Get 30% Off",
    },
    {
      name: "Stripe for Freelancers",
      tagline: "First $1k volume free",
      savings: "No fees on early revenue",
      url: "https://stripe.com", // update when you get referral link
      cta: "Explore Payments",
    },
  ]

  return (
    <Card className="p-6 space-y-4">
      <h3 className="text-lg font-semibold">Exclusive Partner Perks</h3>
      <p className="text-sm text-muted-foreground">
        Special deals for freelancers & small-business owners
      </p>

      {perks.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-4">
          <div>
            <p className="font-medium">{p.name}</p>
            <p className="text-xs text-muted-foreground">{p.tagline}</p>
            <p className="text-xs text-green-600">{p.savings}</p>
          </div>
          <Button
            size="sm"
            onClick={() =>
              window.open(p.url, "_blank", "noopener,noreferrer")
            }
          >
            {p.cta}
          </Button>
        </div>
      ))}

      <p className="text-xs text-muted-foreground pt-2 border-t">
        We earn a small commission when you sign up—at no extra cost to you.
        Helps keep SnapLedger free!
      </p>
    </Card>
  )
}
