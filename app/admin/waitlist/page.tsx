'use client'

import React, { useState, useEffect } from 'react'
import { Mail, Download, RefreshCw, Users, TrendingUp, Calendar } from 'lucide-react'
import { MealSnapLogo } from '@/components/mealsnap-logo'
import Link from 'next/link'

type EmailData = {
  email: string
  source: 'modal' | 'gate' | 'waitlist'
  userId: string
  timestamp: string
  createdAt: number
}

type WaitlistData = {
  total: number
  count: number
  setSize: number
  sourceBreakdown: {
    modal?: number
    gate?: number
    waitlist?: number
  }
  emails: EmailData[]
}

export default function AdminWaitlistPage() {
  const [data, setData] = useState<WaitlistData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchData = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/waitlist')
      if (res.status === 401) {
        // Unauthorized - redirect to admin login
        window.location.href = '/admin'
        return
      }
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to fetch data')
      }
      const waitlistData = await res.json()
      setData(waitlistData)
    } catch (err: any) {
      setError(err.message || 'Failed to load waitlist data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const exportCSV = () => {
    if (!data) return

    const headers = ['Email', 'Source', 'User ID', 'Timestamp', 'Created At']
    const rows = data.emails.map((email) => [
      email.email,
      email.source,
      email.userId,
      email.timestamp,
      new Date(email.createdAt).toISOString(),
    ])

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `chefai-waitlist-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-green-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-700">Loading waitlist data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-green-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Mail className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={fetchData}
            className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-green-50">
      <header className="bg-white/95 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <MealSnapLogo className="w-12 h-12" />
              <span className="text-xl font-extrabold text-gray-900 tracking-tight hidden sm:inline">
                Meal<span className="text-emerald-600">Snap</span> Admin
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-extrabold text-gray-900">Waitlist Admin</h1>
            <div className="flex gap-3">
              <button
                onClick={fetchData}
                className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
              <button
                onClick={exportCSV}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-lg text-sm font-bold transition-all duration-300 shadow-lg hover:shadow-xl flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Emails</p>
                <p className="text-2xl font-extrabold text-gray-900">{data?.total || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Waitlist Count</p>
                <p className="text-2xl font-extrabold text-gray-900">{data?.count || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <Mail className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Set Size</p>
                <p className="text-2xl font-extrabold text-gray-900">{data?.setSize || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                <Calendar className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Today</p>
                <p className="text-2xl font-extrabold text-gray-900">
                  {data?.emails.filter((e) => {
                    const today = new Date().toDateString()
                    return new Date(e.createdAt).toDateString() === today
                  }).length || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Source Breakdown */}
        {data?.sourceBreakdown && Object.keys(data.sourceBreakdown).length > 0 && (
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-8">
            <h2 className="text-xl font-extrabold text-gray-900 mb-4">Source Breakdown</h2>
            <div className="grid sm:grid-cols-3 gap-4">
              {Object.entries(data.sourceBreakdown).map(([source, count]) => (
                <div key={source} className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-4 border border-emerald-200">
                  <p className="text-sm text-gray-600 mb-1 capitalize">{source}</p>
                  <p className="text-3xl font-extrabold text-emerald-600">{count}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Email List */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-extrabold text-gray-900">All Emails ({data?.emails.length || 0})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Source</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">User ID</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data?.emails.map((email, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">{email.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        email.source === 'waitlist' ? 'bg-purple-100 text-purple-700' :
                        email.source === 'modal' ? 'bg-blue-100 text-blue-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {email.source}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600 font-mono">{email.userId}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        {new Date(email.createdAt).toLocaleString()}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!data || data.emails.length === 0) && (
              <div className="p-12 text-center">
                <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No emails yet</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

