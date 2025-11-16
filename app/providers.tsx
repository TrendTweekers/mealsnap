'use client'

import { useEffect } from 'react'
import posthog from 'posthog-js'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Apply saved theme immediately on mount before any render
    const saved = localStorage.getItem('theme') || 'light'
    document.documentElement.classList.toggle('dark', saved === 'dark')
    document.documentElement.style.colorScheme = saved

    // Initialize PostHog analytics (browser only)
    if (typeof window !== 'undefined' && !posthog.__loaded) {
      posthog.init('phc_iK3CHhIXbLvshj9Ebb78QXyCNAou7nLD35cLwU9IaCH', {
        api_host: 'https://app.posthog.com',
        capture_pageview: true,
        person_profiles: 'identified_only',
      })
    }
  }, [])

  return <>{children}</>
}
