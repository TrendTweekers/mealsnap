'use client'

import React from 'react'

export function MealSnapLogo({ className = "w-10 h-10", showText = false }: { className?: string; showText?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <svg
        viewBox="0 0 64 64"
        className={className}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Rounded square background - light blue with dark teal border */}
        <rect
          x="4"
          y="4"
          width="56"
          height="56"
          rx="12"
          fill="#E0F2FE"
          stroke="#0D9488"
          strokeWidth="2"
        />
        
        {/* Leafy vegetable - multiple rounded lobes with highlights */}
        <path
          d="M20 18C18 20 16 24 18 28C20 32 22 36 24 40C26 44 28 48 30 50C32 52 34 50 36 46C38 42 40 38 42 34C44 30 46 26 44 22C42 18 38 16 34 16C30 16 26 18 24 20C22 18 20 18 20 18Z"
          fill="#059669"
        />
        <path
          d="M24 20C22 22 20 26 22 30C24 34 26 38 28 42C30 46 32 48 34 46C36 44 38 40 40 36C42 32 44 28 42 24C40 20 36 18 32 18C28 18 26 20 24 20Z"
          fill="#10B981"
        />
        <path
          d="M28 22C26 24 24 28 26 32C28 36 30 40 32 44C34 48 36 50 38 48C40 46 42 42 44 38C46 34 48 30 46 26C44 22 40 20 36 20C32 20 30 22 28 22Z"
          fill="#34D399"
        />
        
        {/* Tomato - lower right, overlapping */}
        <circle cx="48" cy="48" r="10" fill="#EF4444" />
        <circle cx="48" cy="48" r="7" fill="#DC2626" opacity="0.6" />
        
        {/* Tomato stem/calyx */}
        <path
          d="M48 38L50 42L46 42Z"
          fill="#059669"
        />
        <path
          d="M48 38L46 40L50 40Z"
          fill="#047857"
        />
      </svg>
      
      {showText && (
        <span className="text-2xl font-bold text-gray-900 tracking-tight">
          Meal<span className="text-emerald-600">Snap</span>
        </span>
      )}
    </div>
  )
}

