import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from './providers'
import { Analytics } from '@vercel/analytics/react'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'SnapLedger — AI Receipt & Mileage Tracker',
  description: 'Scan receipts, auto-log IRS mileage, export tax-ready CSV/PDF in seconds. 10 free scans/month.',
  generator: 'v0.app',
  openGraph: {
    title: 'SnapLedger',
    description: 'AI-powered receipt scanner + IRS mileage calculator',
    url: 'https://v0-receipt-scanner-app.vercel.app',
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
    title: 'SnapLedger',
    description: 'AI receipt scanner + IRS mileage calculator',
    creator: '@TrendTweekers',
    images: ['/og-card.png'],
  },
  manifest: '/manifest.json',
  icons: {
    icon: '/icon.png',
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#0ea5e9" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="SnapLedger" />
      </head>
      <body className={`font-sans antialiased`}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
