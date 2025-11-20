import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { ThemeProvider } from './providers'
import { Analytics } from '@vercel/analytics/react'

const inter = Inter({ 
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'ChefAI – Your AI Chef for Instant Recipes',
  description: 'Snap a photo of your fridge, get instant recipe ideas powered by AI. Your personal chef that turns ingredients into delicious meals.',
  generator: 'v0.app',
  openGraph: {
    title: 'ChefAI – Your AI Chef for Instant Recipes',
    description: 'Snap a photo of your fridge, get instant recipe ideas powered by AI. Your personal chef that turns ingredients into delicious meals.',
    url: 'https://chefai.app',
    siteName: 'ChefAI',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ChefAI – Your AI Chef for Instant Recipes',
    description: 'Snap a photo of your fridge, get instant recipe ideas powered by AI. Your personal chef that turns ingredients into delicious meals.',
  },
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <head>
        <meta name="theme-color" content="#10b981" />
        {/* Favicon - multiple sizes for browser compatibility */}
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512x512.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="ChefAI" />
        {/* iOS camera permissions prompt */}
        <meta name="format-detection" content="telephone=no" />
        {/* PWA install prompt */}
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
        {/* Hide Safari UI on scroll */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <Analytics />
        {/* Privacy-friendly analytics by Plausible */}
        <Script
          strategy="afterInteractive"
          async
          defer
          data-domain="mealsnap-chi.vercel.app"
          src="https://plausible.io/js/pa-z7_ASH-zwutJ1BlKFBYt6.js"
        />
        <Script
          id="plausible-init"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.plausible=window.plausible||function(){(plausible.q=plausible.q||[]).push(arguments)},plausible.init=plausible.init||function(i){plausible.o=i||{}};
              plausible.init()
            `,
          }}
        />
      </body>
    </html>
  )
}
