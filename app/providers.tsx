'use client'

import { useEffect } from 'react'
// import posthog from 'posthog-js' // Temporarily disabled for deployment

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Apply saved theme immediately on mount before any render
    const saved = localStorage.getItem('theme') || 'light'
    document.documentElement.classList.toggle('dark', saved === 'dark')
    document.documentElement.style.colorScheme = saved

    // Initialize PostHog analytics (browser only) - TEMPORARILY DISABLED
    // const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
    // const host = process.env.NEXT_PUBLIC_POSTHOG_HOST
    // if (key && host && !posthog.__loaded) {
    //   posthog.init(key, {
    //     api_host: host,
    //     capture_pageview: true,
    //     person_profiles: 'identified_only',
    //   })
    // }
  }, [])

  return <>{children}</>
}
