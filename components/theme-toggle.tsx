'use client'

import { useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/lib/use-theme'

export function ThemeToggle() {
  const { theme, toggleTheme, mounted } = useTheme()
  const [showTooltip, setShowTooltip] = useState(false)

  if (!mounted) return null

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        className="rounded-full"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        aria-label="Toggle theme"
      >
        {theme === 'light' ? (
          <Moon className="h-5 w-5" />
        ) : (
          <Sun className="h-5 w-5" />
        )}
      </Button>
      {showTooltip && (
        <div
          className="absolute right-0 top-full mt-2 px-2 py-1 text-xs bg-popover text-popover-foreground rounded shadow-lg z-50 whitespace-nowrap"
          role="tooltip"
        >
          Toggle theme
        </div>
      )}
    </div>
  )
}
