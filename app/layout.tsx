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
  title: 'MealSnap – AI Recipe Generator from Your Pantry',
  description: 'Snap a photo of your fridge, get instant recipe ideas, and never wonder "what\'s for dinner" again.',
  generator: 'v0.app',
  openGraph: {
    title: 'MealSnap – AI Recipe Generator from Your Pantry',
    description: 'Snap a photo of your fridge, get instant recipe ideas, and never wonder "what\'s for dinner" again.',
    url: 'https://mealsnap.app',
    siteName: 'MealSnap',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MealSnap – AI Recipe Generator from Your Pantry',
    description: 'Snap a photo of your fridge, get instant recipe ideas, and never wonder "what\'s for dinner" again.',
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
        <meta name="theme-color" content="#10B981" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="MealSnap" />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <Analytics />
        {/* Privacy-friendly analytics by Plausible */}
        <Script
          strategy="afterInteractive"
          data-domain="mealsnap-chi.vercel.app"
        >
          {`
            (function() {
              var script = document.createElement('script');
              script.async = true;
              script.defer = true;
              script.src = 'https://plausible.io/js/pa-z7_ASH-zwutJ1BlKFBYt6.js';
              document.head.appendChild(script);
              
              window.plausible = window.plausible || function() {
                (plausible.q = plausible.q || []).push(arguments);
              };
              plausible.init = plausible.init || function(i) {
                plausible.o = i || {};
              };
              plausible.init();
            })();
          `}
        </Script>
      </body>
    </html>
  )
}
