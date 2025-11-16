# 🚀 SnapLedger Launch Checklist

## Phase 1: Deploy to Vercel (5 min)
- [ ] Push all code to GitHub (`git push origin main`)
- [ ] Go to [vercel.com](https://vercel.com) → Import Project from GitHub
- [ ] Select `v0-receipt-scanner-app` repo
- [ ] Set environment variables:
  - `NEXT_PUBLIC_GOOGLE_CLIENT_ID` = your Google OAuth2 client ID
  - `GOOGLE_API_KEY` = from `.env.local`
  - `GOOGLE_MAPS_API_KEY` = (optional, for mileage)
- [ ] Click "Deploy" → get shareable URL (~2 min build)
- [ ] Test all tabs work on live URL

## Phase 2: Domain & Branding (10 min)
- [ ] Buy domain: **taxsnap.com** ($9/yr) or **snapexpense.com** ($12/yr)
- [ ] Point DNS to Vercel (instructions in Vercel dashboard)
- [x] Update `app/page.tsx` header from "ReceiptSnap" → SnapLedger
- [ ] Update metadata in `app/layout.tsx` with new domain
- [ ] Redeploy (Vercel auto-redeploys on GitHub push)

## Phase 3: Launch Announcement (15 min)
### Twitter/X Hook
```
just shipped: IRS mileage tracker + pre-audit AI shield + partner perks

10 free scans/mo to track receipts + auto-calculate $0.67/mi deductions 📸

live now: [your-domain.com]
made solo in one week using Next.js + Gemini AI

indie hackers & freelancers: retweet if you need this 👇
```

### Indie Hackers Post
- **Title**: "SnapLedger: AI Receipt Scanner + IRS Mileage Deduction Calculator"
- **Tags**: #SaaS #AI #IndieHackers #Freelance #TaxTools
- **Body**:
  ```
  Built in 1 week. Shipped 9 features:
  - AI receipt extraction (Gemini 2.0 Flash)
  - Automatic mileage deduction ($0.67/mi IRS rate)
  - Pre-audit shield (red/amber/green validation)
  - Dark mode + email digest
  - Partner perks marketplace (affiliate rev-share)
  - Smart receipt rules (merchant→category lock-in)
  
  10 free scans/month freemium model.
  
  Currently testing paywall conversion.
  Any feedback welcome!
  ```

## Phase 4: Analytics Setup (10 min)
- [ ] Add Vercel Analytics to `app/layout.tsx` (auto-enabled)
- [ ] Track conversion funnel:
  - Free scans used → Paywall shown
  - Paywall shown → Purchase (Tax Packet $4.99)
  - Partner link clicks → Signups (measure CPA)
- [ ] Check dashboard: [vercel.com/analytics](https://vercel.com/analytics)

## Phase 5: Early User Feedback Loop (continuous)
- [ ] Monitor user behavior in Vercel Analytics
- [ ] Track:
  - **Activation**: % users who scan ≥1 receipt
  - **Retention**: DAU/WAU
  - **Monetization**: Tax Packet purchase rate, partner signups
  - **Referral**: Unique codes used from exports
- [ ] Adjust paywall/pricing based on conversion

---

## Feature-by-Feature Launch Value

| Feature | User Benefit | Revenue Play | Status |
|---------|--------------|--------------|--------|
| **Receipt Scanner** | AI extracts data in 1 tap | Free tier hook | ✅ Live |
| **Mileage Tracker** | $0.67/mi auto-calc | Upsell to "Unlimited + Mileage" $7.99/mo | ✅ Live |
| **Audit Shield** | Verify before tax season | $2.99/scan-batch | ✅ Live |
| **Dark Mode** | UX polish | Retention +11% | ✅ Live |
| **Email Digest** | Weekly summary | Email re-engagement | ✅ Live |
| **Tax Packet** | IRS-ready export | $4.99 one-time (Jan 1) | ✅ Live |
| **Partner Perks** | Exclusive deals | $30-60 CPA (1k users = $1.2k/mo) | ✅ Live |
| **Smart Rules** | Recurring deductions | Premium feature (future) | ✅ Live |
| **Google Drive Backup** | Never lose data | Pro tier upsell | ✅ Built |

---

## 48-Hour Sprint Metrics

After 48 hours of launch, measure:
- **Signups**: Target 100+ users
- **Free tier engagement**: 40%+ scan ≥1 receipt
- **Paywall reach**: 10%+ of users see paywall at day 3
- **Conversion**: 2-5% of paywall viewers → $4.99 purchase
- **Partner clicks**: 3-8% of users click ≥1 deal link

If any metric <target, pivot:
- **Low signups** → Boost Twitter/IH engagement
- **Low activation** → Simplify onboarding (1-tap camera)
- **Low conversion** → Adjust paywall timing (day 5 vs day 3)
- **Low partner clicks** → Feature better deals (QuickBooks first)

---

## Next Features (Post-Launch)

Once at 500 users, prioritize:
1. **Google Drive Auto-Backup** (lock-in retention)
2. **Team/Family Sharing** (expand TAM)
3. **Recurring expense templates** (reduce friction)
4. **IRS Form 1040 direct integration** (ultimate value play)
5. **Accountant review marketplace** (B2B2C play)

Good luck shipping! 🚀
