'use client'

import { useState, useEffect } from 'react'
import { MealSnapLogo } from '@/components/mealsnap-logo'
import { Check, X, RefreshCw, TrendingUp, Loader2, BarChart3, Users, Camera, ChefHat, ArrowUpRight, Activity, AlertCircle, Copy, CheckCircle2 } from 'lucide-react'

type IngredientStat = {
  ingredient: string
  count: number
}

type StatsData = {
  totalScans: number
  successfulScans: number
  failedScans: number
  scanSuccessRate: number
  totalRecipeGenerations: number
  successfulRecipeGenerations: number
  failedRecipeGenerations: number
  recipeSuccessRate: number
  totalRecipesGenerated: number
  avgRecipesPerGeneration: number
  uniqueUsers: number
  conversionRate: number
  scansToday: number
  recipesToday: number
  avgIngredientsPerScan: number
  dailyScans: { [key: string]: number }
  dailyRecipes: { [key: string]: number }
  hourlyScans: { [key: string]: number }
  ingredientCountDistribution: { [key: string]: number }
  recipeCountDistribution: { [key: string]: number }
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [password, setPassword] = useState('')
  const [authLoading, setAuthLoading] = useState(true)
  const [loginError, setLoginError] = useState('')
  const [isFounder, setIsFounder] = useState(false)
  const [scanCount, setScanCount] = useState(0)
  const [userPlan, setUserPlan] = useState<'free' | 'pro' | 'family'>('free')
  const [message, setMessage] = useState<string>('')
  const [ingredients, setIngredients] = useState<IngredientStat[]>([])
  const [ingredientsLoading, setIngredientsLoading] = useState(true)
  const [totalManualAdds, setTotalManualAdds] = useState(0)
  const [stats, setStats] = useState<StatsData | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [healthCheck, setHealthCheck] = useState<any>(null)
  const [healthCheckLoading, setHealthCheckLoading] = useState(false)
  const [healthCheckError, setHealthCheckError] = useState<string>('')

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      setAuthLoading(true)
      const res = await fetch('/api/admin/auth')
      const data = await res.json()
      
      if (data.ok && data.authenticated) {
        setIsAuthenticated(true)
        loadAdminData()
      } else {
        setIsAuthenticated(false)
      }
    } catch (err) {
      console.error('Failed to check auth:', err)
      setIsAuthenticated(false)
    } finally {
      setAuthLoading(false)
    }
  }

  const loadAdminData = () => {
    if (typeof window !== 'undefined') {
      const founder = localStorage.getItem('mealsnap_founder') === 'true'
      const count = localStorage.getItem('mealsnap_scan_count')
      const plan = localStorage.getItem('mealsnap_plan') as 'free' | 'pro' | 'family' | null
      
      setIsFounder(founder)
      setScanCount(count ? parseInt(count, 10) : 0)
      setUserPlan(plan || 'free')
    }
    
    // Load ingredient stats and general stats
    fetchIngredientStats()
    fetchStats()
  }

  const fetchStats = async () => {
    try {
      setStatsLoading(true)
      const res = await fetch('/api/admin/stats')
      
      if (res.status === 401) {
        setIsAuthenticated(false)
        return
      }
      
      const data = await res.json()
      if (data.ok) {
        setStats(data.stats)
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err)
    } finally {
      setStatsLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')
    
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      
      const data = await res.json()
      
      if (data.ok) {
        setIsAuthenticated(true)
        setPassword('')
        loadAdminData()
      } else {
        setLoginError(data.error || 'Invalid password')
      }
    } catch (err) {
      setLoginError('Failed to authenticate. Please try again.')
      console.error('Login error:', err)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/auth', { method: 'DELETE' })
      setIsAuthenticated(false)
      setPassword('')
      setMessage('Logged out successfully')
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      console.error('Logout error:', err)
    }
  }

  const fetchIngredientStats = async () => {
    try {
      setIngredientsLoading(true)
      const res = await fetch('/api/admin/ingredients')
      const data = await res.json()
      
      if (res.status === 401) {
        // Unauthorized - logout
        setIsAuthenticated(false)
        return
      }
      
      if (data.ok) {
        setIngredients(data.ingredients || [])
        setTotalManualAdds(data.total || 0)
      }
    } catch (err) {
      console.error('Failed to fetch ingredient stats:', err)
    } finally {
      setIngredientsLoading(false)
    }
  }

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

  const runHealthCheck = async () => {
    try {
      setHealthCheckLoading(true)
      setHealthCheckError('')
      
      const res = await fetch('/api/admin/health-check')
      
      if (res.status === 401) {
        setIsAuthenticated(false)
        return
      }
      
      if (!res.ok) {
        throw new Error(`Health check failed: ${res.status}`)
      }
      
      const data = await res.json()
      
      if (data.ok) {
        setHealthCheck(data)
      } else {
        setHealthCheckError(data.error || 'Health check failed')
      }
    } catch (err: any) {
      console.error('Health check error:', err)
      setHealthCheckError(err.message || 'Failed to run health check. Run `npm run health-check` in terminal.')
    } finally {
      setHealthCheckLoading(false)
    }
  }

  const copyHealthCheckResults = () => {
    if (!healthCheck) return
    
    const text = `MealSnap Health Check Results
Timestamp: ${healthCheck.timestamp}
Overall Status: ${healthCheck.status.toUpperCase()}

Summary:
- Total Checks: ${healthCheck.summary.total}
- Passed: ${healthCheck.summary.passed}
- Failed: ${healthCheck.summary.failed}
- Warnings: ${healthCheck.summary.warnings}

Details:
${healthCheck.checks.map((check: any) => 
  `${check.status === 'pass' ? '✅' : check.status === 'fail' ? '❌' : '⚠️'} ${check.name}: ${check.message}${check.details ? `\n   ${check.details}` : ''}`
).join('\n')}`
    
    navigator.clipboard.writeText(text).then(() => {
      setMessage('Health check results copied to clipboard!')
      setTimeout(() => setMessage(''), 3000)
    }).catch(() => {
      setMessage('Failed to copy results')
      setTimeout(() => setMessage(''), 3000)
    })
  }

  // Password protection screen
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full">
          <div className="flex items-center justify-center mb-6">
            <MealSnapLogo className="w-12 h-12" />
            <h1 className="text-2xl font-extrabold text-gray-900 ml-4">Admin Panel</h1>
          </div>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            <span className="ml-3 text-gray-600">Checking authentication...</span>
          </div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full">
          <div className="flex items-center justify-center mb-8">
            <MealSnapLogo className="w-12 h-12" />
            <h1 className="text-2xl font-extrabold text-gray-900 ml-4">Admin Login</h1>
          </div>
          
          {loginError && (
            <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl text-red-800">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Admin Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-900"
                placeholder="Enter admin password"
                required
                autoFocus
              />
            </div>
            
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-xl px-6 py-3 font-bold transition-all shadow-lg hover:shadow-xl"
            >
              Login
            </button>
          </form>

          <div className="mt-6 text-center">
            <a
              href="/"
              className="text-emerald-600 hover:text-emerald-700 font-semibold hover:underline text-sm"
            >
              ← Back to Home
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-3xl shadow-xl p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center">
              <MealSnapLogo className="w-12 h-12" />
              <h1 className="text-3xl font-extrabold text-gray-900 ml-4">Admin Panel</h1>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold transition-colors text-sm"
            >
              Logout
            </button>
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

            {/* Statistics Dashboard */}
            <div className="bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <BarChart3 className="w-6 h-6 text-emerald-600" />
                  Statistics Dashboard
                </h2>
                <button
                  onClick={fetchStats}
                  className="p-2 hover:bg-white rounded-lg transition-colors"
                  title="Refresh stats"
                >
                  <RefreshCw className={`w-5 h-5 text-emerald-600 ${statsLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {statsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                </div>
              ) : stats ? (
                <div className="space-y-6">
                  {/* Key Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl p-4 border border-emerald-100">
                      <div className="flex items-center gap-2 mb-2">
                        <Camera className="w-5 h-5 text-emerald-600" />
                        <span className="text-sm text-gray-600">Total Scans</span>
                      </div>
                      <div className="text-2xl font-extrabold text-gray-900">{stats.totalScans.toLocaleString()}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {stats.scansToday} today
                      </div>
                    </div>

                    <div className="bg-white rounded-xl p-4 border border-emerald-100">
                      <div className="flex items-center gap-2 mb-2">
                        <ChefHat className="w-5 h-5 text-purple-600" />
                        <span className="text-sm text-gray-600">Recipe Gens</span>
                      </div>
                      <div className="text-2xl font-extrabold text-gray-900">{stats.totalRecipeGenerations.toLocaleString()}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {stats.recipesToday} today
                      </div>
                    </div>

                    <div className="bg-white rounded-xl p-4 border border-emerald-100">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-5 h-5 text-blue-600" />
                        <span className="text-sm text-gray-600">Conversion</span>
                      </div>
                      <div className="text-2xl font-extrabold text-gray-900">{stats.conversionRate.toFixed(1)}%</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Scans → Recipes
                      </div>
                    </div>

                    <div className="bg-white rounded-xl p-4 border border-emerald-100">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="w-5 h-5 text-orange-600" />
                        <span className="text-sm text-gray-600">Unique Users</span>
                      </div>
                      <div className="text-2xl font-extrabold text-gray-900">{stats.uniqueUsers.toLocaleString()}</div>
                    </div>
                  </div>

                  {/* Success Rates */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white rounded-xl p-4 border border-gray-100">
                      <div className="text-sm text-gray-600 mb-1">Scan Success Rate</div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-extrabold text-gray-900">{stats.scanSuccessRate.toFixed(1)}%</span>
                        <span className="text-sm text-gray-500">
                          ({stats.successfulScans}/{stats.totalScans})
                        </span>
                      </div>
                      {stats.failedScans > 0 && (
                        <div className="text-xs text-red-600 mt-1">
                          {stats.failedScans} failed
                        </div>
                      )}
                    </div>

                    <div className="bg-white rounded-xl p-4 border border-gray-100">
                      <div className="text-sm text-gray-600 mb-1">Recipe Gen Success Rate</div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-extrabold text-gray-900">{stats.recipeSuccessRate.toFixed(1)}%</span>
                        <span className="text-sm text-gray-500">
                          ({stats.successfulRecipeGenerations}/{stats.totalRecipeGenerations})
                        </span>
                      </div>
                      {stats.failedRecipeGenerations > 0 && (
                        <div className="text-xs text-red-600 mt-1">
                          {stats.failedRecipeGenerations} failed
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Recipe Stats */}
                  <div className="bg-white rounded-xl p-4 border border-gray-100">
                    <div className="text-sm font-semibold text-gray-700 mb-3">Recipe Statistics</div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-xs text-gray-500">Total Recipes Generated</div>
                        <div className="text-xl font-bold text-gray-900">{stats.totalRecipesGenerated.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Avg Recipes per Gen</div>
                        <div className="text-xl font-bold text-gray-900">{stats.avgRecipesPerGeneration.toFixed(1)}</div>
                      </div>
                    </div>
                  </div>

                  {/* Ingredient Stats */}
                  <div className="bg-white rounded-xl p-4 border border-gray-100">
                    <div className="text-sm font-semibold text-gray-700 mb-3">Ingredient Statistics</div>
                    <div>
                      <div className="text-xs text-gray-500">Avg Ingredients per Scan</div>
                      <div className="text-xl font-bold text-gray-900">{stats.avgIngredientsPerScan.toFixed(1)}</div>
                    </div>
                  </div>

                  {/* Daily Trend (Last 7 Days) */}
                  <div className="bg-white rounded-xl p-4 border border-gray-100">
                    <div className="text-sm font-semibold text-gray-700 mb-3">Daily Activity (Last 7 Days)</div>
                    <div className="space-y-2">
                      {Object.entries(stats.dailyScans)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([date, count]) => (
                        <div key={date} className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">
                            {new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                          </span>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1">
                              <Camera className="w-4 h-4 text-emerald-600" />
                              <span className="font-semibold text-gray-900">{count}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <ChefHat className="w-4 h-4 text-purple-600" />
                              <span className="font-semibold text-gray-900">{stats.dailyRecipes[date] || 0}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Distributions */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white rounded-xl p-4 border border-gray-100">
                      <div className="text-sm font-semibold text-gray-700 mb-3">Ingredient Count Distribution</div>
                      <div className="space-y-2">
                        {Object.entries(stats.ingredientCountDistribution).map(([range, count]) => (
                          <div key={range} className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">{range}</span>
                            <span className="font-semibold text-gray-900">{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white rounded-xl p-4 border border-gray-100">
                      <div className="text-sm font-semibold text-gray-700 mb-3">Recipe Count Distribution</div>
                      <div className="space-y-2">
                        {Object.entries(stats.recipeCountDistribution).map(([range, count]) => (
                          <div key={range} className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">{range}</span>
                            <span className="font-semibold text-gray-900">{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No statistics available yet
                </div>
              )}
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

            {/* Manually Added Ingredients Stats */}
            <div className="bg-white border-2 border-gray-200 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Manual Ingredient Tracking</h2>
                <button
                  onClick={fetchIngredientStats}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Refresh stats"
                >
                  <RefreshCw className={`w-5 h-5 text-gray-600 ${ingredientsLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
              <p className="text-gray-600 mb-4">
                Track which ingredients users manually add most often. This helps improve AI detection over time.
              </p>
              
              {ingredientsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                  <span className="ml-2 text-gray-600">Loading stats...</span>
                </div>
              ) : (
                <>
                  <div className="mb-4 p-4 bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700 font-medium">Total Manual Adds:</span>
                      <span className="text-2xl font-bold text-emerald-600">{totalManualAdds}</span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-gray-700 font-medium">Unique Ingredients:</span>
                      <span className="text-xl font-bold text-gray-900">{ingredients.length}</span>
                    </div>
                  </div>

                  {ingredients.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No manually added ingredients tracked yet.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {ingredients.slice(0, 20).map((item, index) => (
                        <div
                          key={item.ingredient}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                              index === 0 ? 'bg-yellow-400 text-yellow-900' :
                              index === 1 ? 'bg-gray-300 text-gray-700' :
                              index === 2 ? 'bg-orange-300 text-orange-900' :
                              'bg-gray-200 text-gray-600'
                            }`}>
                              {index + 1}
                            </div>
                            <span className="font-medium text-gray-900 capitalize">{item.ingredient}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-emerald-600" />
                            <span className="font-bold text-emerald-600">{item.count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* System Health Check */}
            <div className="bg-white border-2 border-gray-200 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Activity className="w-6 h-6 text-emerald-600" />
                  System Health Check
                </h2>
                {healthCheck && (
                  <button
                    onClick={copyHealthCheckResults}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Copy results"
                  >
                    <Copy className="w-5 h-5 text-gray-600" />
                  </button>
                )}
              </div>
              <p className="text-gray-600 mb-4">
                Run automated checks to verify all systems are operational. This checks API endpoints, environment variables, and system status.
              </p>
              
              <button
                onClick={runHealthCheck}
                disabled={healthCheckLoading}
                className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-xl px-6 py-3 font-bold transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:cursor-not-allowed"
              >
                {healthCheckLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Running checks...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-5 h-5" />
                    <span>Run Health Check Now</span>
                  </>
                )}
              </button>

              {healthCheckError && (
                <div className="mt-4 p-4 bg-red-50 border-2 border-red-200 rounded-xl">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-red-800 mb-1">Health Check Failed</div>
                      <div className="text-sm text-red-700">{healthCheckError}</div>
                      <div className="text-xs text-red-600 mt-2">
                        💡 Tip: Run <code className="bg-red-100 px-1 rounded">npm run health-check</code> in terminal for detailed diagnostics
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {healthCheck && !healthCheckError && (
                <div className="mt-6 space-y-4">
                  {/* Status Summary */}
                  <div className={`p-4 rounded-xl border-2 ${
                    healthCheck.status === 'healthy' 
                      ? 'bg-emerald-50 border-emerald-200' 
                      : healthCheck.status === 'warning'
                      ? 'bg-yellow-50 border-yellow-200'
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {healthCheck.status === 'healthy' ? (
                          <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                        ) : healthCheck.status === 'warning' ? (
                          <AlertCircle className="w-6 h-6 text-yellow-600" />
                        ) : (
                          <X className="w-6 h-6 text-red-600" />
                        )}
                        <span className={`text-lg font-bold ${
                          healthCheck.status === 'healthy' 
                            ? 'text-emerald-800' 
                            : healthCheck.status === 'warning'
                            ? 'text-yellow-800'
                            : 'text-red-800'
                        }`}>
                          Status: {healthCheck.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {new Date(healthCheck.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-sm">
                      <div className="text-center">
                        <div className="font-semibold text-gray-700">Total</div>
                        <div className="text-xl font-bold text-gray-900">{healthCheck.summary.total}</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-emerald-700">Passed</div>
                        <div className="text-xl font-bold text-emerald-600">{healthCheck.summary.passed}</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-red-700">Failed</div>
                        <div className="text-xl font-bold text-red-600">{healthCheck.summary.failed}</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-yellow-700">Warnings</div>
                        <div className="text-xl font-bold text-yellow-600">{healthCheck.summary.warnings}</div>
                      </div>
                    </div>
                  </div>

                  {/* Check Results */}
                  <div className="space-y-2">
                    <div className="text-sm font-semibold text-gray-700 mb-2">Check Details:</div>
                    {healthCheck.checks.map((check: any, index: number) => (
                      <div
                        key={index}
                        className={`p-4 rounded-xl border-2 ${
                          check.status === 'pass'
                            ? 'bg-emerald-50 border-emerald-200'
                            : check.status === 'fail'
                            ? 'bg-red-50 border-red-200'
                            : 'bg-yellow-50 border-yellow-200'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-0.5">
                            {check.status === 'pass' ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                            ) : check.status === 'fail' ? (
                              <X className="w-5 h-5 text-red-600" />
                            ) : (
                              <AlertCircle className="w-5 h-5 text-yellow-600" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-gray-900 mb-1">{check.name}</div>
                            <div className={`text-sm ${
                              check.status === 'pass'
                                ? 'text-emerald-700'
                                : check.status === 'fail'
                                ? 'text-red-700'
                                : 'text-yellow-700'
                            }`}>
                              {check.message}
                            </div>
                            {check.details && (
                              <div className="mt-2 text-xs text-gray-600 bg-white/50 rounded px-2 py-1 font-mono">
                                {check.details}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Refresh Button */}
                  <button
                    onClick={runHealthCheck}
                    disabled={healthCheckLoading}
                    className="w-full bg-gray-100 hover:bg-gray-200 disabled:bg-gray-100 text-gray-700 rounded-xl px-4 py-2 font-semibold transition-colors flex items-center justify-center gap-2 disabled:cursor-not-allowed text-sm"
                  >
                    <RefreshCw className={`w-4 h-4 ${healthCheckLoading ? 'animate-spin' : ''}`} />
                    Refresh Results
                  </button>
                </div>
              )}
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
                <a
                  href="/admin/waitlist"
                  className="block text-emerald-600 hover:text-emerald-700 font-semibold hover:underline"
                >
                  View Waitlist
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

