'use client'

import React, { useState, useEffect } from 'react'
import { Mail, ArrowRight, Share2, Check } from 'lucide-react'
import { MealSnapLogo } from '@/components/mealsnap-logo'
import Link from 'next/link'

export default function WaitlistPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [waitlistCount, setWaitlistCount] = useState(247)
  const [userId, setUserId] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const id = localStorage.getItem('mealsnap_user_id')
    if (id) setUserId(id)
    
    // Fetch real waitlist count from API
    const fetchCount = async () => {
      try {
        const res = await fetch('/api/waitlist-count')
        const data = await res.json()
        if (data.count !== undefined) {
          setWaitlistCount(data.count)
        }
      } catch (err) {
        console.error('Failed to fetch waitlist count:', err)
        // Keep default count if fetch fails
      }
    }
    
    fetchCount()
    
    // Refresh count every 30 seconds
    const interval = setInterval(fetchCount, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address')
      return
    }

    try {
      await fetch('/api/save-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'waitlist', userId }),
      })

      localStorage.setItem('mealsnap_email', email)
      localStorage.setItem('mealsnap_email_submitted', 'true')
      setSubmitted(true)
      
      // Refresh the count from the server
      const res = await fetch('/api/waitlist-count')
      const data = await res.json()
      if (data.count !== undefined) {
        setWaitlistCount(data.count)
      } else {
        // Fallback: increment locally
        setWaitlistCount(prev => prev + 1)
      }

      // Track signup
      if (typeof window !== 'undefined' && (window as any).plausible) {
        (window as any).plausible('Waitlist Signup', { props: { source: 'waitlist' } })
      }
    } catch (err) {
      console.error('Failed to submit email:', err)
      setError('Failed to submit. Please try again.')
    }
  }

  const handleShare = async () => {
    const shareText = `Skip the line - refer 3 friends, get free month! Join MealSnap waitlist: https://mealsnap-o6mndxvie-peter-hallanders-projects.vercel.app/waitlist?ref=${userId}`
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'MealSnap Waitlist',
          text: shareText,
          url: `https://mealsnap-o6mndxvie-peter-hallanders-projects.vercel.app/waitlist?ref=${userId}`,
        })
      } else {
        await navigator.clipboard.writeText(shareText)
        alert('Link copied! Share it with 3 friends to skip the line.')
      }
    } catch (err) {
      // User cancelled or error
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-green-50">
      <header className="bg-white/95 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <MealSnapLogo className="w-12 h-12" />
              <span className="text-xl font-extrabold text-gray-900 tracking-tight hidden sm:inline">
                Meal<span className="text-emerald-600">Snap</span>
              </span>
            </Link>
            <Link
              href="/"
              className="px-4 py-2 text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center mb-6">
            <MealSnapLogo className="w-20 h-20" />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">
            Join the MealSnap Waitlist
          </h1>
          <p className="text-xl text-gray-700 mb-6">
            Join <span className="font-bold text-emerald-600">{waitlistCount}+</span> people waiting for MealSnap Pro
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-full">
            <span className="text-sm font-semibold text-emerald-700">
              Skip the line - refer 3 friends, get free month
            </span>
          </div>
        </div>

        {!submitted ? (
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 sm:p-12">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-900 mb-2">
                  Email Address
                </label>
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none text-base"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-xl font-bold text-lg transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 flex items-center gap-2"
                  >
                    Join Waitlist
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
                {error && (
                  <p className="mt-2 text-sm text-red-600">{error}</p>
                )}
              </div>
            </form>

            <div className="mt-8 pt-8 border-t border-gray-200">
              <button
                onClick={handleShare}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-colors"
              >
                <Share2 className="w-5 h-5" />
                Share with Friends
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 sm:p-12 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full mx-auto mb-6 flex items-center justify-center">
              <Check className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900 mb-2">You're on the list! 🎉</h2>
            <p className="text-gray-700 mb-6">
              We'll notify you when MealSnap Pro launches. Share with 3 friends to skip the line!
            </p>
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-xl font-bold transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              <Share2 className="w-5 h-5" />
              Share with Friends
            </button>
          </div>
        )}

        <div className="mt-12 grid sm:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h3 className="font-extrabold text-gray-900 mb-2">Early Access</h3>
            <p className="text-sm text-gray-600">Get MealSnap Pro before public launch</p>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h3 className="font-extrabold text-gray-900 mb-2">Special Pricing</h3>
            <p className="text-sm text-gray-600">Lock in launch pricing forever</p>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h3 className="font-extrabold text-gray-900 mb-2">Free Month</h3>
            <p className="text-sm text-gray-600">Refer 3 friends, get 1 month free</p>
          </div>
        </div>
      </main>
    </div>
  )
}

