'use client'

import { useState, useEffect } from 'react'
import { MealSnapLogo } from '@/components/mealsnap-logo'
import { Check, X, RefreshCw } from 'lucide-react'

export default function AdminPage() {
  const [isFounder, setIsFounder] = useState(false)
  const [scanCount, setScanCount] = useState(0)
  const [userPlan, setUserPlan] = useState<'free' | 'pro' | 'family'>('free')
  const [message, setMessage] = useState<string>('')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const founder = localStorage.getItem('mealsnap_founder') === 'true'
      const count = localStorage.getItem('mealsnap_scan_count')
      const plan = localStorage.getItem('mealsnap_plan') as 'free' | 'pro' | 'family' | null
      
      setIsFounder(founder)
      setScanCount(count ? parseInt(count, 10) : 0)
      setUserPlan(plan || 'free')
    }
  }, [])

  const enableFounderMode = () => {
    localStorage.setItem('mealsnap_founder', 'true')
    localStorage.setItem('mealsnap_plan', 'pro')
    setIsFounder(true)
    setUserPlan('pro')
    setMessage('✅ Founder mode enabled! Unlimited scans activated.')
    setTimeout(() => setMessage(''), 3000)
  }

  const disableFounderMode = () => {
    localStorage.removeItem('mealsnap_founder')
    localStorage.setItem('mealsnap_plan', 'free')
    setIsFounder(false)
    setUserPlan('free')
    setMessage('Founder mode disabled. Back to free plan.')
    setTimeout(() => setMessage(''), 3000)
  }

  const resetScanCount = () => {
    localStorage.setItem('mealsnap_scan_count', '0')
    setScanCount(0)
    setMessage('Scan count reset to 0.')
    setTimeout(() => setMessage(''), 3000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-3xl shadow-xl p-8">
          <div className="flex items-center justify-center mb-8">
            <MealSnapLogo className="w-12 h-12" />
            <h1 className="text-3xl font-extrabold text-gray-900 ml-4">Admin Panel</h1>
          </div>

          {message && (
            <div className={`mb-6 p-4 rounded-xl ${
              message.includes('✅') 
                ? 'bg-emerald-50 border-2 border-emerald-200 text-emerald-800' 
                : 'bg-gray-50 border-2 border-gray-200 text-gray-800'
            }`}>
              {message}
            </div>
          )}

          <div className="space-y-6">
            {/* Current Status */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Current Status</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700 font-medium">Founder Mode:</span>
                  <span className={`font-bold ${isFounder ? 'text-emerald-600' : 'text-gray-400'}`}>
                    {isFounder ? '✅ Enabled' : '❌ Disabled'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700 font-medium">User Plan:</span>
                  <span className="font-bold text-emerald-600 capitalize">{userPlan}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700 font-medium">Scan Count:</span>
                  <span className="font-bold text-gray-900">{scanCount}/3</span>
                </div>
              </div>
            </div>

            {/* Founder Mode Controls */}
            <div className="bg-white border-2 border-gray-200 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Founder Mode</h2>
              <p className="text-gray-600 mb-4">
                Enable unlimited scans for testing. This bypasses all scan limits.
              </p>
              {isFounder ? (
                <button
                  onClick={disableFounderMode}
                  className="w-full bg-red-500 hover:bg-red-600 text-white rounded-xl px-6 py-3 font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <X className="w-5 h-5" />
                  Disable Founder Mode
                </button>
              ) : (
                <button
                  onClick={enableFounderMode}
                  className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-xl px-6 py-3 font-bold transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  Enable Founder Mode
                </button>
              )}
            </div>

            {/* Reset Scan Count */}
            <div className="bg-white border-2 border-gray-200 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Reset Scan Count</h2>
              <p className="text-gray-600 mb-4">
                Reset your scan count back to 0. Useful for testing the scan limit flow.
              </p>
              <button
                onClick={resetScanCount}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl px-6 py-3 font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-5 h-5" />
                Reset to 0
              </button>
            </div>

            {/* Quick Links */}
            <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-6 border-2 border-emerald-200">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Links</h2>
              <div className="space-y-2">
                <a
                  href="/"
                  className="block text-emerald-600 hover:text-emerald-700 font-semibold hover:underline"
                >
                  ← Back to Home
                </a>
                <a
                  href="/?founder=true"
                  className="block text-emerald-600 hover:text-emerald-700 font-semibold hover:underline"
                >
                  Enable Founder Mode via URL (?founder=true)
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

