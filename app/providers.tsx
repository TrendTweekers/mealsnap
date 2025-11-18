'use client'

import { useEffect } from 'react'
import { Toaster } from 'sonner'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Apply saved theme immediately on mount before any render
    // Default to dark theme to match Lovable design
    const saved = localStorage.getItem('theme') || 'dark'
    document.documentElement.classList.toggle('dark', saved === 'dark')
    document.documentElement.style.colorScheme = saved
  }, [])

  return (
    <>
      {children}
      <Toaster position="top-center" richColors />
    </>
  )
}
