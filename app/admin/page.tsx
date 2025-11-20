'use client'

import { useState, useEffect } from 'react'
import { MealSnapLogo } from '@/components/mealsnap-logo'
import { Check, X, RefreshCw, TrendingUp, Loader2, BarChart3, Users, Camera, ChefHat, ArrowUpRight, Activity, AlertCircle, Copy, CheckCircle2, Brain, FileText, Download, Sparkles, DollarSign, TrendingDown, Zap, Target } from 'lucide-react'

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
  const [trainingData, setTrainingData] = useState<any>(null)
  const [trainingDataLoading, setTrainingDataLoading] = useState(false)
  const [improvedPrompt, setImprovedPrompt] = useState<any>(null)
  const [promptLoading, setPromptLoading] = useState(false)
  const [promptGeneratorLoading, setPromptGeneratorLoading] = useState(false)
  const [profitData, setProfitData] = useState<any>(null)
  const [profitLoading, setProfitLoading] = useState(false)
  const [profitPeriod, setProfitPeriod] = useState<'today' | 'week' | 'month' | 'alltime'>('today')
  const [costData, setCostData] = useState<any>(null)
  const [costLoading, setCostLoading] = useState(false)
  const [userAnalytics, setUserAnalytics] = useState<any>(null)
  const [userAnalyticsLoading, setUserAnalyticsLoading] = useState(false)
  const [recipePerformance, setRecipePerformance] = useState<any>(null)
  const [recipePerformanceLoading, setRecipePerformanceLoading] = useState(false)
  const [errorData, setErrorData] = useState<any>(null)
  const [errorDataLoading, setErrorDataLoading] = useState(false)
  const [customerData, setCustomerData] = useState<any>(null)
  const [customerDataLoading, setCustomerDataLoading] = useState(false)
  const [incorrectDetections, setIncorrectDetections] = useState<any>(null)
  const [incorrectDetectionsLoading, setIncorrectDetectionsLoading] = useState(false)
  const [promptVersions, setPromptVersions] = useState<any[]>([])
  const [promptVersionsLoading, setPromptVersionsLoading] = useState(false)
  const [activePromptVersion, setActivePromptVersion] = useState<string | null>(null)
  const [selectedPromptVersion, setSelectedPromptVersion] = useState<string | null>(null)

  useEffect(() => {
    // Only check localStorage on mount - no API call to avoid race condition
    setAuthLoading(true)
    if (typeof window !== 'undefined') {
      const authed = localStorage.getItem('admin_authenticated') === 'true'
      setIsAuthenticated(authed)
      if (authed) {
        loadAdminData()
      }
    }
    setAuthLoading(false)
  }, [])

  const loadAdminData = () => {
    if (typeof window !== 'undefined') {
      const founder = localStorage.getItem('mealsnap_founder') === 'true'
      const count = localStorage.getItem('mealsnap_scan_count')
      const plan = localStorage.getItem('mealsnap_plan') as 'free' | 'pro' | 'family' | null
      
      setIsFounder(founder)
      setScanCount(count ? parseInt(count, 10) : 0)
      setUserPlan(plan || 'free')
    }
    
    // Load ingredient stats, general stats, profit data, and cost data
    fetchIngredientStats()
    fetchStats()
    fetchProfitData('today')
    fetchCostData()
    fetchUserAnalytics()
    fetchRecipePerformance()
    fetchErrorData()
    fetchCustomerData()
    fetchIncorrectDetections()
    fetchPromptVersions()
  }

  const fetchStats = async () => {
    try {
      setStatsLoading(true)
      const res = await fetch('/api/admin/stats')
      
      if (res.status === 401) {
        // Clear localStorage on 401
        if (typeof window !== 'undefined') {
          localStorage.removeItem('admin_authenticated')
        }
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
      
      if (res.ok && data.ok) {
        // Store in localStorage ONLY - simple and reliable
        if (typeof window !== 'undefined') {
          localStorage.setItem('admin_authenticated', 'true')
        }
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

  const handleLogout = () => {
    // Remove from localStorage - simple and reliable
    if (typeof window !== 'undefined') {
      localStorage.removeItem('admin_authenticated')
    }
    
    // Also clear server-side cookie (non-blocking)
    fetch('/api/admin/auth', { method: 'DELETE' }).catch(() => {
      // Ignore errors - logout should work even if API fails
    })
    
    setIsAuthenticated(false)
    setPassword('')
    setMessage('Logged out successfully')
    setTimeout(() => setMessage(''), 3000)
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
        // Clear localStorage on 401
        if (typeof window !== 'undefined') {
          localStorage.removeItem('admin_authenticated')
        }
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
    
    const text = `ChefAI Health Check Results
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

  const fetchTrainingData = async () => {
    try {
      setTrainingDataLoading(true)
      const res = await fetch('/api/admin/training-data')
      
      if (res.status === 401) {
        // Clear localStorage on 401
        if (typeof window !== 'undefined') {
          localStorage.removeItem('admin_authenticated')
        }
        setIsAuthenticated(false)
        return
      }
      
      if (!res.ok) {
        throw new Error(`Training data fetch failed: ${res.status}`)
      }
      
      const data = await res.json()
      
      if (data.ok) {
        setTrainingData(data)
      }
    } catch (err: any) {
      console.error('Training data error:', err)
      setMessage('Failed to load training data')
      setTimeout(() => setMessage(''), 3000)
    } finally {
      setTrainingDataLoading(false)
    }
  }

  const generateImprovedPrompt = async () => {
    try {
      setPromptLoading(true)
      const res = await fetch('/api/admin/generate-prompt')
      
      if (res.status === 401) {
        // Clear localStorage on 401
        if (typeof window !== 'undefined') {
          localStorage.removeItem('admin_authenticated')
        }
        setIsAuthenticated(false)
        return
      }
      
      if (!res.ok) {
        throw new Error(`Prompt generation failed: ${res.status}`)
      }
      
      const data = await res.json()
      
      if (data.ok) {
        setImprovedPrompt(data)
      }
    } catch (err: any) {
      console.error('Prompt generation error:', err)
      setMessage('Failed to generate improved prompt')
      setTimeout(() => setMessage(''), 3000)
    } finally {
      setPromptLoading(false)
    }
  }

  const exportTrainingDataCSV = () => {
    if (!trainingData || !trainingData.missedIngredients) return
    
    const csv = [
      ['Ingredient', 'Missed Count', 'Miss Rate (%)', 'Common Issues'].join(','),
      ...trainingData.missedIngredients.map((item: any) => 
        [
          item.ingredient,
          item.count,
          item.missRate,
          item.commonIssues.join('; ')
        ].join(',')
      ),
    ].join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `chefai-training-data-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    
    setMessage('Training data exported!')
    setTimeout(() => setMessage(''), 3000)
  }

  const copyImprovedPrompt = () => {
    if (!improvedPrompt) return
    
    navigator.clipboard.writeText(improvedPrompt.improvedPrompt).then(() => {
      setMessage('Improved prompt copied to clipboard!')
      setTimeout(() => setMessage(''), 3000)
    }).catch(() => {
      setMessage('Failed to copy prompt')
      setTimeout(() => setMessage(''), 3000)
    })
  }

  const fetchProfitData = async (period: 'today' | 'week' | 'month' | 'alltime') => {
    try {
      setProfitLoading(true)
      const res = await fetch(`/api/admin/profit-calculator?period=${period}`)
      
      if (res.status === 401) {
        // Clear localStorage on 401
        if (typeof window !== 'undefined') {
          localStorage.removeItem('admin_authenticated')
        }
        setIsAuthenticated(false)
        return
      }
      
      if (!res.ok) {
        throw new Error(`Profit calculator failed: ${res.status}`)
      }
      
      const data = await res.json()
      
      if (data.ok) {
        setProfitData(data)
      }
    } catch (err: any) {
      console.error('Profit calculator error:', err)
      setMessage('Failed to load profit data')
      setTimeout(() => setMessage(''), 3000)
    } finally {
      setProfitLoading(false)
    }
  }

  const handleProfitPeriodChange = (period: 'today' | 'week' | 'month' | 'alltime') => {
    setProfitPeriod(period)
    fetchProfitData(period)
  }

  const exportProfitCSV = () => {
    if (!profitData) return
    
    const csv = [
      ['Date', 'Period', 'Revenue', 'Costs', 'Profit', 'Users', 'Conversion Rate (%)'].join(','),
      [
        new Date().toISOString().split('T')[0],
        profitPeriod,
        profitData.revenue?.total || 0,
        profitData.costs?.total || 0,
        profitData.profit?.net || 0,
        profitData.metrics?.totalUsers || 0,
        profitData.metrics?.conversionRate || 0,
      ].join(','),
    ].join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `chefai-profit-${profitPeriod}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    
    setMessage('Profit report exported!')
    setTimeout(() => setMessage(''), 3000)
  }

  const fetchCostData = async () => {
    try {
      setCostLoading(true)
      const res = await fetch('/api/admin/costs?localAuth=true')
      
      if (res.status === 401) {
        // Clear localStorage on 401
        if (typeof window !== 'undefined') {
          localStorage.removeItem('admin_authenticated')
        }
        setIsAuthenticated(false)
        return
      }
      
      if (!res.ok) {
        throw new Error(`Cost data fetch failed: ${res.status}`)
      }
      
      const data = await res.json()
      
      if (data.ok) {
        setCostData(data)
      } else {
        throw new Error(data.error || 'Failed to fetch cost data')
      }
    } catch (err: any) {
      console.error('Cost data error:', err)
      // Set fallback data instead of crashing
      setCostData({
        costs: {
          today: { openai_scan: 0, openai_recipes: 0, openai_images: 0, infrastructure: 3.23, total: 3.23 },
          week: { openai_scan: 0, openai_recipes: 0, openai_images: 0, infrastructure: 22.61, total: 22.61 },
          month: { openai_scan: 0, openai_recipes: 0, openai_images: 0, infrastructure: 96.9, total: 96.9 },
          alltime: { openai_scan: 0, openai_recipes: 0, openai_images: 0, infrastructure: 0, total: 0 }
        },
        imageStats: {
          generated: 0,
          cached: 0,
          cacheHitRate: 0,
          estimatedSavings: 0
        }
      })
      setMessage('Cost data unavailable - showing placeholder data')
      setTimeout(() => setMessage(''), 3000)
    } finally {
      setCostLoading(false)
    }
  }
  
  const fetchUserAnalytics = async () => {
    try {
      setUserAnalyticsLoading(true)
      const res = await fetch('/api/admin/user-analytics?localAuth=true')
      if (!res.ok) throw new Error(`User analytics fetch failed: ${res.status}`)
      const data = await res.json()
      if (data.ok) {
        setUserAnalytics(data.analytics)
      } else {
        throw new Error(data.error || 'Failed to fetch user analytics')
      }
    } catch (err) {
      console.error('User analytics error:', err)
      setUserAnalytics(null)
    } finally {
      setUserAnalyticsLoading(false)
    }
  }
  
  const fetchRecipePerformance = async () => {
    try {
      setRecipePerformanceLoading(true)
      const res = await fetch('/api/admin/recipe-performance?localAuth=true')
      if (!res.ok) throw new Error(`Recipe performance fetch failed: ${res.status}`)
      const data = await res.json()
      if (data.ok) {
        setRecipePerformance(data.performance)
      } else {
        throw new Error(data.error || 'Failed to fetch recipe performance')
      }
    } catch (err) {
      console.error('Recipe performance error:', err)
      setRecipePerformance(null)
    } finally {
      setRecipePerformanceLoading(false)
    }
  }
  
  const fetchErrorData = async () => {
    try {
      setErrorDataLoading(true)
      const res = await fetch('/api/admin/errors?localAuth=true')
      if (!res.ok) throw new Error(`Error data fetch failed: ${res.status}`)
      const data = await res.json()
      if (data.ok) {
        setErrorData(data.errors)
      } else {
        throw new Error(data.error || 'Failed to fetch error data')
      }
    } catch (err) {
      console.error('Error data error:', err)
      setErrorData(null)
    } finally {
      setErrorDataLoading(false)
    }
  }
  
  const fetchCustomerData = async () => {
    try {
      setCustomerDataLoading(true)
      const res = await fetch('/api/admin/customers?localAuth=true')
      if (!res.ok) throw new Error(`Customer data fetch failed: ${res.status}`)
      const data = await res.json()
      if (data.ok) {
        setCustomerData(data.customers)
      } else {
        throw new Error(data.error || 'Failed to fetch customer data')
      }
    } catch (err) {
      console.error('Customer data error:', err)
      setCustomerData(null)
    } finally {
      setCustomerDataLoading(false)
    }
  }
  
  const fetchIncorrectDetections = async () => {
    try {
      setIncorrectDetectionsLoading(true)
      const res = await fetch('/api/admin/incorrect-detections?localAuth=true')
      if (!res.ok) throw new Error(`Incorrect detections fetch failed: ${res.status}`)
      const data = await res.json()
      if (data.ok) {
        setIncorrectDetections(data)
      } else {
        throw new Error(data.error || 'Failed to fetch incorrect detections')
      }
    } catch (err) {
      console.error('Incorrect detections error:', err)
      setIncorrectDetections(null)
    } finally {
      setIncorrectDetectionsLoading(false)
    }
  }

  const fetchPromptVersions = async () => {
    try {
      setPromptVersionsLoading(true)
      const res = await fetch('/api/admin/prompts?localAuth=true')
      if (!res.ok) throw new Error(`Prompt versions fetch failed: ${res.status}`)
      const data = await res.json()
      if (data.ok) {
        setPromptVersions(data.versions || [])
        setActivePromptVersion(data.activeVersion || null)
      }
    } catch (err) {
      console.error('Prompt versions error:', err)
      setPromptVersions([])
    } finally {
      setPromptVersionsLoading(false)
    }
  }

  const generateAndSavePrompt = async () => {
    try {
      setPromptGeneratorLoading(true)
      // First generate improved prompt
      const generateRes = await fetch('/api/admin/generate-prompt-improvement?localAuth=true', {
        method: 'POST',
      })
      if (!generateRes.ok) throw new Error('Failed to generate prompt')
      const generateData = await generateRes.json()
      
      if (!generateData.ok) throw new Error(generateData.error || 'Failed to generate prompt')
      
      // Then save as new version
      const saveRes = await fetch('/api/admin/prompts?localAuth=true', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: generateData.improvedPrompt,
          telemetry: generateData.telemetry,
          source: 'ai-generated',
          notes: `Generated from FP/FN telemetry: FP ${generateData.telemetry?.fpRate}%, FN ${generateData.telemetry?.fnRate}%`,
        }),
      })
      
      if (!saveRes.ok) throw new Error('Failed to save prompt version')
      const saveData = await saveRes.json()
      
      if (saveData.ok) {
        setImprovedPrompt({
          improvedPrompt: generateData.improvedPrompt,
          telemetry: generateData.telemetry,
          version: saveData.version,
        })
        setSelectedPromptVersion(saveData.version)
        await fetchPromptVersions()
        setMessage('✅ Improved prompt generated and saved as new version!')
        setTimeout(() => setMessage(''), 5000)
      }
    } catch (err: any) {
      console.error('Prompt generation error:', err)
      setMessage('Failed to generate prompt: ' + (err.message || 'Unknown error'))
      setTimeout(() => setMessage(''), 5000)
    } finally {
      setPromptGeneratorLoading(false)
    }
  }

  const activatePromptVersion = async (version: string) => {
    try {
      const res = await fetch('/api/admin/prompts?localAuth=true', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version }),
      })
      
      if (!res.ok) throw new Error('Failed to activate prompt')
      const data = await res.json()
      
      if (data.ok) {
        setActivePromptVersion(version)
        await fetchPromptVersions()
        setMessage(`✅ Prompt version ${version} activated!`)
        setTimeout(() => setMessage(''), 5000)
      }
    } catch (err: any) {
      console.error('Activate prompt error:', err)
      setMessage('Failed to activate prompt: ' + (err.message || 'Unknown error'))
      setTimeout(() => setMessage(''), 5000)
    }
  }

  const deployPromptVersion = async (version: string) => {
    try {
      const res = await fetch('/api/admin/deploy-prompt?localAuth=true', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version, autoActivate: true }),
      })
      
      if (!res.ok) throw new Error('Failed to deploy prompt')
      const data = await res.json()
      
      if (data.ok) {
        setMessage(`✅ Prompt version ${version} deployed! Copy the prompt and update app/api/scan-pantry/route.ts`)
        setTimeout(() => setMessage(''), 10000)
        // Copy prompt to clipboard
        if (data.prompt) {
          navigator.clipboard.writeText(data.prompt).then(() => {
            setMessage(`✅ Prompt copied to clipboard! Update app/api/scan-pantry/route.ts and deploy.`)
            setTimeout(() => setMessage(''), 10000)
          })
        }
      }
    } catch (err: any) {
      console.error('Deploy prompt error:', err)
      setMessage('Failed to deploy prompt: ' + (err.message || 'Unknown error'))
      setTimeout(() => setMessage(''), 5000)
    }
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
    <div className="min-h-screen bg-[#0F172A] p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Sticky Header */}
        <div className="sticky top-0 z-50 bg-[#1E293B] bg-opacity-95 backdrop-blur-sm border-b border-slate-700 rounded-t-2xl px-6 py-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MealSnapLogo className="w-10 h-10" />
              <h1 className="text-2xl font-bold text-[#F1F5F9]">Admin Panel</h1>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-[#F1F5F9] rounded-lg font-semibold transition-all duration-200 text-sm"
            >
              Logout
            </button>
          </div>
        </div>

          {message && (
            <div className={`mb-6 p-4 rounded-xl border ${
              message.includes('✅') 
              ? 'bg-emerald-500 bg-opacity-10 border-emerald-500 border-opacity-30 text-emerald-400' 
                : 'bg-slate-800 border-slate-700 text-slate-300'
            }`}>
              {message}
            </div>
          )}

          <div className="space-y-6">
            {/* Key Metrics Grid */}
            {stats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-[#1E293B] border border-slate-700 rounded-xl p-4 hover:border-emerald-500 hover:border-opacity-50 transition-all duration-200 hover:shadow-lg hover:shadow-emerald-500 hover:shadow-opacity-10">
                  <div className="flex items-center gap-2 mb-2">
                    <Camera className="w-5 h-5 text-emerald-400" />
                    <span className="text-xs uppercase tracking-wide text-slate-400">Scans</span>
                  </div>
                  <div className="text-2xl font-mono font-bold text-[#F1F5F9]">{stats.totalScans.toLocaleString()}</div>
                  <div className="text-xs text-slate-400 mt-1">{stats.scansToday} today</div>
                </div>

              <div className="bg-[#1E293B] border border-slate-700 rounded-xl p-4 hover:border-emerald-500 hover:border-opacity-50 transition-all duration-200 hover:shadow-lg hover:shadow-emerald-500 hover:shadow-opacity-10">
                  <div className="flex items-center gap-2 mb-2">
                    <ChefHat className="w-5 h-5 text-purple-400" />
                    <span className="text-xs uppercase tracking-wide text-slate-400">Recipes</span>
                  </div>
                  <div className="text-2xl font-mono font-bold text-[#F1F5F9]">{stats.totalRecipeGenerations.toLocaleString()}</div>
                  <div className="text-xs text-slate-400 mt-1">{stats.recipesToday} today</div>
                </div>

              <div className="bg-[#1E293B] border border-slate-700 rounded-xl p-4 hover:border-emerald-500 hover:border-opacity-50 transition-all duration-200 hover:shadow-lg hover:shadow-emerald-500 hover:shadow-opacity-10">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-5 h-5 text-blue-400" />
                    <span className="text-xs uppercase tracking-wide text-slate-400">Convert</span>
                  </div>
                  <div className="text-2xl font-mono font-bold text-[#F1F5F9]">{stats.conversionRate.toFixed(1)}%</div>
                  <div className="text-xs text-slate-400 mt-1">Success rate</div>
                </div>

              <div className="bg-[#1E293B] border border-slate-700 rounded-xl p-4 hover:border-emerald-500 hover:border-opacity-50 transition-all duration-200 hover:shadow-lg hover:shadow-emerald-500 hover:shadow-opacity-10">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-5 h-5 text-cyan-400" />
                    <span className="text-xs uppercase tracking-wide text-slate-400">Users</span>
                  </div>
                  <div className="text-2xl font-mono font-bold text-[#F1F5F9]">{stats.uniqueUsers.toLocaleString()}</div>
                  <div className="text-xs text-slate-400 mt-1">Total unique</div>
                </div>
              </div>
            )}

          {/* Cost Tracking Dashboard */}
            <div className="bg-[#1E293B] border border-slate-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-[#F1F5F9] flex items-center gap-2">
                  <DollarSign className="w-6 h-6 text-emerald-400" />
                Cost Tracking
                </h2>
                <button
                onClick={fetchCostData}
                  className="p-2 hover:bg-slate-700 rounded-lg transition-all duration-200"
                title="Refresh cost data"
                >
                <RefreshCw className={`w-5 h-5 text-emerald-400 ${costLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>

            {costLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
                </div>
            ) : costData ? (
              <div className="space-y-6">
                {/* Today's Costs */}
                    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                  <div className="text-sm font-semibold text-[#F1F5F9] mb-3">Today's Costs</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">Scans (GPT-4 Vision)</div>
                      <div className="text-xl font-mono font-bold text-[#F1F5F9]">${costData.costs.today.openai_scan.toFixed(4)}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">Recipes (GPT-4o)</div>
                      <div className="text-xl font-mono font-bold text-[#F1F5F9]">${costData.costs.today.openai_recipes.toFixed(4)}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">Images (DALL-E)</div>
                      <div className="text-xl font-mono font-bold text-[#F1F5F9]">${costData.costs.today.openai_images.toFixed(4)}</div>
                      </div>
                    <div>
                      <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">Infrastructure</div>
                      <div className="text-xl font-mono font-bold text-[#F1F5F9]">${costData.costs.today.infrastructure.toFixed(2)}</div>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-700">
                      <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-300">Total Today</span>
                      <span className="text-2xl font-mono font-bold text-emerald-400">${costData.costs.today.total.toFixed(2)}</span>
                      </div>
                        </div>
                        </div>

                {/* This Month's Costs */}
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                  <div className="text-sm font-semibold text-[#F1F5F9] mb-3">This Month's Costs</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">Scans</div>
                      <div className="text-xl font-mono font-bold text-[#F1F5F9]">${costData.costs.month.openai_scan.toFixed(2)}</div>
                        </div>
                    <div>
                      <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">Recipes</div>
                      <div className="text-xl font-mono font-bold text-[#F1F5F9]">${costData.costs.month.openai_recipes.toFixed(2)}</div>
                      </div>
                    <div>
                      <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">Images</div>
                      <div className="text-xl font-mono font-bold text-[#F1F5F9]">${costData.costs.month.openai_images.toFixed(2)}</div>
                      </div>
                    <div>
                      <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">Infrastructure</div>
                      <div className="text-xl font-mono font-bold text-[#F1F5F9]">${costData.costs.month.infrastructure.toFixed(2)}</div>
                        </div>
                        </div>
                  <div className="mt-4 pt-4 border-t border-slate-700">
                      <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-300">Total This Month</span>
                      <span className="text-2xl font-mono font-bold text-emerald-400">${costData.costs.month.total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                {/* DALL-E Image Stats */}
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                  <div className="text-sm font-semibold text-[#F1F5F9] mb-3 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                    DALL-E Image Generation Stats
                      </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div>
                      <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">Images Generated</div>
                      <div className="text-xl font-mono font-bold text-[#F1F5F9]">{costData.imageStats.generated}</div>
                      </div>
                      <div>
                      <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">Images Cached</div>
                      <div className="text-xl font-mono font-bold text-emerald-400">{costData.imageStats.cached}</div>
                        </div>
                      <div>
                      <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">Cache Hit Rate</div>
                      <div className="text-xl font-mono font-bold text-emerald-400">{costData.imageStats.cacheHitRate.toFixed(0)}%</div>
                      </div>
                      <div>
                      <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">Est. Savings</div>
                      <div className="text-xl font-mono font-bold text-emerald-400">${costData.imageStats.estimatedSavings.toFixed(2)}</div>
                      </div>
                        </div>
                  <div className="mt-3 text-xs text-slate-400">
                    💡 All generated images are cached, so subsequent requests use cached images (saving $0.04 per reuse)
                      </div>
                    </div>

                {/* Cost Breakdown */}
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                  <div className="text-sm font-semibold text-[#F1F5F9] mb-3">Cost Breakdown</div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">OpenAI API (Scans + Recipes + Images):</span>
                      <span className="font-mono font-bold text-[#F1F5F9]">
                        ${(costData.costs.month.openai_scan + costData.costs.month.openai_recipes + costData.costs.month.openai_images).toFixed(2)}
                      </span>
                    </div>
                    <div className="pl-4 space-y-1 text-xs text-slate-500">
                      <div className="flex justify-between">
                        <span>Scans (GPT-4 Vision):</span>
                        <span className="font-mono">${costData.costs.month.openai_scan.toFixed(4)}</span>
                  </div>
                      <div className="flex justify-between">
                        <span>Recipes (GPT-4o):</span>
                        <span className="font-mono">${costData.costs.month.openai_recipes.toFixed(4)}</span>
                              </div>
                      <div className="flex justify-between">
                        <span>Images (DALL-E 3):</span>
                        <span className="font-mono">${costData.costs.month.openai_images.toFixed(4)}</span>
                            </div>
                          </div>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-700">
                      <span className="text-slate-400">Infrastructure (Vercel Pro + KV):</span>
                      <span className="font-mono font-bold text-[#F1F5F9]">${costData.costs.month.infrastructure.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                No cost data available yet
                </div>
              )}
            </div>

            {/* Statistics Dashboard */}
            <div className="bg-[#1E293B] border border-slate-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-[#F1F5F9] flex items-center gap-2">
                  <BarChart3 className="w-6 h-6 text-emerald-400" />
                  Statistics Dashboard
                </h2>
                <button
                  onClick={fetchStats}
                  className="p-2 hover:bg-slate-700 rounded-lg transition-all duration-200"
                  title="Refresh stats"
                >
                  <RefreshCw className={`w-5 h-5 text-emerald-400 ${statsLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {statsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
                </div>
              ) : stats ? (
                <div className="space-y-6">
                  {/* Success Rates */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                      <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">Scan Success Rate</div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-mono font-bold text-emerald-400">{stats.scanSuccessRate.toFixed(1)}%</span>
                        <span className="text-sm text-slate-400">
                          ({stats.successfulScans}/{stats.totalScans})
                        </span>
                      </div>
                      {stats.failedScans > 0 && (
                        <div className="text-xs text-red-400 mt-1">
                          {stats.failedScans} failed
                        </div>
                      )}
                    </div>

                    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                      <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">Recipe Gen Success Rate</div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-mono font-bold text-emerald-400">{stats.recipeSuccessRate.toFixed(1)}%</span>
                        <span className="text-sm text-slate-400">
                          ({stats.successfulRecipeGenerations}/{stats.totalRecipeGenerations})
                        </span>
                      </div>
                      {stats.failedRecipeGenerations > 0 && (
                        <div className="text-xs text-red-400 mt-1">
                          {stats.failedRecipeGenerations} failed
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Recipe Stats */}
                  <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                    <div className="text-sm font-semibold text-[#F1F5F9] mb-3">Recipe Statistics</div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">Total Generated</div>
                        <div className="text-xl font-mono font-bold text-[#F1F5F9]">{stats.totalRecipesGenerated.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">Avg per Gen</div>
                        <div className="text-xl font-mono font-bold text-[#F1F5F9]">{stats.avgRecipesPerGeneration.toFixed(1)}</div>
                      </div>
                    </div>
                  </div>

                  {/* Ingredient Stats */}
                  <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                    <div className="text-sm font-semibold text-[#F1F5F9] mb-3">Ingredient Statistics</div>
                    <div>
                      <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">Avg per Scan</div>
                      <div className="text-xl font-mono font-bold text-[#F1F5F9]">{stats.avgIngredientsPerScan.toFixed(1)}</div>
                    </div>
                  </div>

                  {/* Daily Trend (Last 7 Days) */}
                  <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                    <div className="text-sm font-semibold text-[#F1F5F9] mb-3">Daily Activity (Last 7 Days)</div>
                    <div className="space-y-2">
                      {Object.entries(stats.dailyScans)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([date, count]) => (
                        <div key={date} className="flex items-center justify-between text-sm py-1 border-b border-slate-700 last:border-0">
                          <span className="text-slate-400">
                            {new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                          </span>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1">
                              <Camera className="w-4 h-4 text-emerald-400" />
                              <span className="font-mono font-semibold text-[#F1F5F9]">{count}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <ChefHat className="w-4 h-4 text-purple-400" />
                              <span className="font-mono font-semibold text-[#F1F5F9]">{stats.dailyRecipes[date] || 0}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Distributions */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                      <div className="text-sm font-semibold text-[#F1F5F9] mb-3">Ingredient Count Distribution</div>
                      <div className="space-y-2">
                        {Object.entries(stats.ingredientCountDistribution).map(([range, count]) => (
                          <div key={range} className="flex items-center justify-between text-sm">
                            <span className="text-slate-400">{range}</span>
                            <span className="font-mono font-semibold text-[#F1F5F9]">{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                      <div className="text-sm font-semibold text-[#F1F5F9] mb-3">Recipe Count Distribution</div>
                      <div className="space-y-2">
                        {Object.entries(stats.recipeCountDistribution).map(([range, count]) => (
                          <div key={range} className="flex items-center justify-between text-sm">
                            <span className="text-slate-400">{range}</span>
                            <span className="font-mono font-semibold text-[#F1F5F9]">{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  No statistics available yet
                </div>
              )}
            </div>

            {/* Founder Mode Controls */}
            <div className="bg-[#1E293B] border border-slate-700 rounded-xl p-6">
              <h2 className="text-xl font-bold text-[#F1F5F9] mb-4">Founder Mode</h2>
              <p className="text-slate-400 mb-4 text-sm">
                Enable unlimited scans for testing. This bypasses all scan limits.
              </p>
              {isFounder ? (
                <button
                  onClick={disableFounderMode}
                className="w-full bg-red-500 bg-opacity-20 hover:bg-red-500 hover:bg-opacity-30 border border-red-500 border-opacity-50 text-red-400 rounded-xl px-6 py-3 font-bold transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <X className="w-5 h-5" />
                  Disable Founder Mode
                </button>
              ) : (
                <button
                  onClick={enableFounderMode}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl px-6 py-3 font-bold transition-all duration-200 shadow-lg shadow-emerald-500 shadow-opacity-30 hover:shadow-xl hover:shadow-emerald-500 hover:shadow-opacity-40 flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  Enable Founder Mode
                </button>
              )}
            </div>

            {/* Reset Scan Count */}
            <div className="bg-[#1E293B] border border-slate-700 rounded-xl p-6">
              <h2 className="text-xl font-bold text-[#F1F5F9] mb-4">Reset Scan Count</h2>
              <p className="text-slate-400 mb-4 text-sm">
                Reset your scan count back to 0. Useful for testing the scan limit flow.
              </p>
              <button
                onClick={resetScanCount}
                className="w-full bg-slate-700 hover:bg-slate-600 text-[#F1F5F9] rounded-xl px-6 py-3 font-semibold transition-all duration-200 flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-5 h-5" />
                Reset to 0
              </button>
            </div>

            {/* Manually Added Ingredients Stats */}
            <div className="bg-[#1E293B] border border-slate-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-[#F1F5F9]">Manual Ingredient Tracking</h2>
                <button
                  onClick={fetchIngredientStats}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                  title="Refresh stats"
                >
                <RefreshCw className={`w-5 h-5 text-emerald-400 ${ingredientsLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            <p className="text-slate-400 mb-4">
                Track which ingredients users manually add most often. This helps improve AI detection over time.
              </p>
              
              {ingredientsLoading ? (
                <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                <span className="ml-2 text-slate-400">Loading stats...</span>
                </div>
              ) : (
                <>
                <div className="mb-4 p-4 bg-gradient-to-br from-emerald-500 from-opacity-10 to-green-500 to-opacity-10 rounded-xl">
                    <div className="flex items-center justify-between">
                    <span className="text-slate-300 font-medium">Total Manual Adds:</span>
                    <span className="text-2xl font-bold text-emerald-400">{totalManualAdds}</span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                    <span className="text-slate-300 font-medium">Unique Ingredients:</span>
                    <span className="text-xl font-bold text-[#F1F5F9]">{ingredients.length}</span>
                    </div>
                  </div>

                  {ingredients.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                      No manually added ingredients tracked yet.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {ingredients.slice(0, 20).map((item, index) => (
                        <div
                          key={item.ingredient}
                        className="flex items-center justify-between p-3 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
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
                          <span className="font-medium text-[#F1F5F9] capitalize">{item.ingredient}</span>
                          </div>
                          <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-emerald-400" />
                          <span className="font-bold text-emerald-400">{item.count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* System Health Check */}
          <div className="bg-[#1E293B] border border-slate-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-[#F1F5F9] flex items-center gap-2">
                <Activity className="w-6 h-6 text-emerald-400" />
                  System Health Check
                </h2>
                {healthCheck && (
                  <button
                    onClick={copyHealthCheckResults}
                  className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                    title="Copy results"
                  >
                  <Copy className="w-5 h-5 text-emerald-400" />
                  </button>
                )}
              </div>
            <p className="text-slate-400 mb-4">
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
              <div className="mt-4 p-4 bg-red-500 bg-opacity-10 border-2 border-red-500 border-opacity-30 rounded-xl">
                  <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                    <div className="font-semibold text-red-400 mb-1">Health Check Failed</div>
                    <div className="text-sm text-red-300">{healthCheckError}</div>
                    <div className="text-xs text-red-400 mt-2">
                      💡 Tip: Run <code className="bg-red-500 bg-opacity-20 px-1 rounded">npm run health-check</code> in terminal for detailed diagnostics
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
                    ? 'bg-emerald-500 bg-opacity-10 border-emerald-500 border-opacity-30' 
                      : healthCheck.status === 'warning'
                    ? 'bg-yellow-500 bg-opacity-10 border-yellow-500 border-opacity-30'
                    : 'bg-red-500 bg-opacity-10 border-red-500 border-opacity-30'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {healthCheck.status === 'healthy' ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                        ) : healthCheck.status === 'warning' ? (
                        <AlertCircle className="w-6 h-6 text-yellow-400" />
                        ) : (
                        <X className="w-6 h-6 text-red-400" />
                        )}
                        <span className={`text-lg font-bold ${
                          healthCheck.status === 'healthy' 
                          ? 'text-emerald-400' 
                            : healthCheck.status === 'warning'
                          ? 'text-yellow-400'
                          : 'text-red-400'
                        }`}>
                          Status: {healthCheck.status.toUpperCase()}
                        </span>
                      </div>
                    <div className="text-sm text-slate-400">
                        {new Date(healthCheck.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-sm">
                      <div className="text-center">
                      <div className="font-semibold text-slate-300">Total</div>
                      <div className="text-xl font-bold text-[#F1F5F9]">{healthCheck.summary.total}</div>
                      </div>
                      <div className="text-center">
                      <div className="font-semibold text-emerald-400">Passed</div>
                      <div className="text-xl font-bold text-emerald-400">{healthCheck.summary.passed}</div>
                      </div>
                      <div className="text-center">
                      <div className="font-semibold text-red-400">Failed</div>
                      <div className="text-xl font-bold text-red-400">{healthCheck.summary.failed}</div>
                      </div>
                      <div className="text-center">
                      <div className="font-semibold text-yellow-400">Warnings</div>
                      <div className="text-xl font-bold text-yellow-400">{healthCheck.summary.warnings}</div>
                      </div>
                    </div>
                  </div>

                  {/* Check Results */}
                  <div className="space-y-2">
                  <div className="text-sm font-semibold text-slate-300 mb-2">Check Details:</div>
                    {healthCheck.checks.map((check: any, index: number) => (
                      <div
                        key={index}
                        className={`p-4 rounded-xl border-2 ${
                          check.status === 'pass'
                          ? 'bg-emerald-500 bg-opacity-10 border-emerald-500 border-opacity-30'
                            : check.status === 'fail'
                          ? 'bg-red-500 bg-opacity-10 border-red-500 border-opacity-30'
                          : 'bg-yellow-500 bg-opacity-10 border-yellow-500 border-opacity-30'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-0.5">
                            {check.status === 'pass' ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                            ) : check.status === 'fail' ? (
                            <X className="w-5 h-5 text-red-400" />
                            ) : (
                            <AlertCircle className="w-5 h-5 text-yellow-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                          <div className="font-semibold text-[#F1F5F9] mb-1">{check.name}</div>
                            <div className={`text-sm ${
                              check.status === 'pass'
                              ? 'text-emerald-300'
                                : check.status === 'fail'
                              ? 'text-red-300'
                              : 'text-yellow-300'
                            }`}>
                              {check.message}
                            </div>
                            {check.details && (
                            <div className="mt-2 text-xs text-slate-400 bg-slate-800 bg-opacity-50 rounded px-2 py-1 font-mono">
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
                  className="w-full bg-slate-700 hover:bg-slate-600 disabled:bg-slate-700 text-[#F1F5F9] rounded-xl px-4 py-2 font-semibold transition-colors flex items-center justify-center gap-2 disabled:cursor-not-allowed text-sm"
                  >
                    <RefreshCw className={`w-4 h-4 ${healthCheckLoading ? 'animate-spin' : ''}`} />
                    Refresh Results
                  </button>
                </div>
              )}
            </div>

          {/* AI Improvement Engine - Unified */}
          <div className="bg-[#1E293B] border border-slate-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-[#F1F5F9] flex items-center gap-2">
                <Zap className="w-6 h-6 text-purple-400" />
                AI Improvement Engine
                </h2>
                <button
                onClick={() => {
                  fetchIncorrectDetections()
                  fetchTrainingData()
                  fetchPromptVersions()
                }}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                title="Refresh all data"
              >
                <RefreshCw className={`w-5 h-5 text-purple-400 ${incorrectDetectionsLoading || trainingDataLoading || promptVersionsLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            <p className="text-slate-400 mb-6 text-sm">
              Unified system to analyze AI accuracy, generate improved prompts, and manage prompt versions with auto-deployment.
            </p>

            {/* Current Accuracy Metrics */}
            {incorrectDetections && incorrectDetections.incorrectDetections && (
              <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                  <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">Overall Accuracy</div>
                  <div className={`text-2xl font-mono font-bold ${
                    (incorrectDetections.incorrectDetections.overallAccuracy || 0) >= 90 ? 'text-emerald-400' :
                    (incorrectDetections.incorrectDetections.overallAccuracy || 0) >= 80 ? 'text-yellow-400' :
                    'text-red-400'
                  }`}>
                    {(incorrectDetections.incorrectDetections.overallAccuracy || 100).toFixed(1)}%
                  </div>
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                  <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">False Positive Rate</div>
                  <div className={`text-2xl font-mono font-bold ${
                    (incorrectDetections.incorrectDetections.overallFalsePositiveRate || 0) < 5 ? 'text-emerald-400' :
                    (incorrectDetections.incorrectDetections.overallFalsePositiveRate || 0) < 10 ? 'text-yellow-400' :
                    'text-red-400'
                  }`}>
                    {(incorrectDetections.incorrectDetections.overallFalsePositiveRate || 0).toFixed(1)}%
                  </div>
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                  <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">False Negative Rate</div>
                  <div className={`text-2xl font-mono font-bold ${
                    (incorrectDetections.incorrectDetections.overallFalseNegativeRate || 0) < 5 ? 'text-emerald-400' :
                    (incorrectDetections.incorrectDetections.overallFalseNegativeRate || 0) < 10 ? 'text-yellow-400' :
                    'text-red-400'
                  }`}>
                    {(incorrectDetections.incorrectDetections.overallFalseNegativeRate || 0).toFixed(1)}%
                  </div>
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                  <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">Total Scans</div>
                  <div className="text-2xl font-mono font-bold text-[#F1F5F9]">
                    {stats?.totalScans || 0}
                  </div>
                </div>
              </div>
            )}

            {/* Generate Improved Prompt */}
            <div className="mb-6">
              <button
                onClick={generateAndSavePrompt}
                disabled={promptGeneratorLoading || incorrectDetectionsLoading}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-xl px-6 py-3 font-bold transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:cursor-not-allowed"
              >
                {promptGeneratorLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Generating improved prompt...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>Generate & Save Improved Prompt</span>
                  </>
                )}
              </button>
            </div>

            {/* Generated Prompt Display */}
            {improvedPrompt && improvedPrompt.improvedPrompt && (
              <div className="mb-6 bg-slate-800 border-2 border-purple-500 border-opacity-30 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-semibold text-purple-400">Generated Prompt (Version {improvedPrompt.version || 'new'})</div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const promptText = improvedPrompt.improvedPrompt
                        navigator.clipboard.writeText(promptText).then(() => {
                          setMessage('✅ Prompt copied to clipboard!')
                          setTimeout(() => setMessage(''), 3000)
                        })
                      }}
                      className="p-1 hover:bg-slate-700 rounded transition-colors"
                      title="Copy prompt"
                    >
                      <Copy className="w-4 h-4 text-emerald-400" />
                    </button>
                    {improvedPrompt.version && (
                      <button
                        onClick={() => deployPromptVersion(improvedPrompt.version)}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded transition-colors"
                        title="Deploy this version"
                      >
                        Deploy
                      </button>
                    )}
                  </div>
                </div>
                {improvedPrompt.telemetry && (
                  <div className="mb-3 text-xs text-slate-400 space-y-1">
                    <div>Based on: {improvedPrompt.telemetry.totalScans || 0} scans</div>
                    <div>FP Rate: {improvedPrompt.telemetry.fpRate || '0.0'}% | FN Rate: {improvedPrompt.telemetry.fnRate || '0.0'}%</div>
                  </div>
                )}
                <pre className="text-xs text-slate-300 bg-slate-900 rounded p-3 overflow-x-auto max-h-64 overflow-y-auto border border-slate-700 font-mono whitespace-pre-wrap">
                  {improvedPrompt.improvedPrompt}
                </pre>
              </div>
            )}

            {/* Prompt Version History */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-300">Prompt Versions</h3>
                {activePromptVersion && (
                  <span className="text-xs text-emerald-400">Active: {activePromptVersion}</span>
                )}
              </div>
              {promptVersionsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
                </div>
              ) : promptVersions.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {promptVersions.slice(0, 10).map((version: any) => (
                    <div
                      key={version.version}
                      className={`p-3 rounded-lg border-2 ${
                        version.isActive
                          ? 'bg-emerald-500 bg-opacity-10 border-emerald-500 border-opacity-30'
                          : 'bg-slate-800 border-slate-700'
                      }`}
                    >
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-[#F1F5F9]">{version.version}</span>
                            {version.isActive && (
                              <span className="text-xs px-2 py-0.5 bg-emerald-500 bg-opacity-20 text-emerald-400 rounded">Active</span>
                            )}
                            {version.source && (
                              <span className="text-xs text-slate-400">({version.source})</span>
                            )}
                          </div>
                          {version.notes && (
                            <div className="text-xs text-slate-400 mt-1">{version.notes}</div>
                          )}
                          {version.createdAtISO && (
                            <div className="text-xs text-slate-500 mt-1">
                              {new Date(version.createdAtISO).toLocaleString()}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {!version.isActive && (
                            <>
                              <button
                                onClick={() => activatePromptVersion(version.version)}
                                className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded transition-colors"
                                title="Activate this version"
                              >
                                Activate
                              </button>
                              <button
                                onClick={() => deployPromptVersion(version.version)}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded transition-colors"
                                title="Deploy this version"
                              >
                                Deploy
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-slate-500 text-sm">
                  No prompt versions yet. Generate an improved prompt to get started.
                </div>
              )}
            </div>

            {/* Export & Actions */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={exportTrainingDataCSV}
                disabled={!trainingData || !trainingData.missedIngredients || trainingData.missedIngredients.length === 0}
                className="flex-1 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500 text-[#F1F5F9] rounded-xl px-4 py-3 font-semibold transition-colors flex items-center justify-center gap-2 disabled:cursor-not-allowed text-sm"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>
          </div>

          {/* User Behavior Analytics */}
          <div className="bg-[#1E293B] border border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[#F1F5F9] flex items-center gap-2">
                <Activity className="w-6 h-6 text-blue-400" />
                User Behavior Analytics
              </h2>
              <button
                onClick={fetchUserAnalytics}
                className="p-2 hover:bg-slate-700 rounded-lg transition-all duration-200"
                title="Refresh analytics"
              >
                <RefreshCw className={`w-5 h-5 text-blue-400 ${userAnalyticsLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            
            {userAnalyticsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
              </div>
            ) : userAnalytics ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                  <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">Favorites</div>
                  <div className="text-2xl font-mono font-bold text-[#F1F5F9]">{userAnalytics.favorites.total}</div>
                  <div className="text-xs text-slate-400 mt-1">{userAnalytics.favorites.today} today ({userAnalytics.favorites.rate}%)</div>
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                  <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">Shares</div>
                  <div className="text-2xl font-mono font-bold text-[#F1F5F9]">{userAnalytics.shares.total}</div>
                  <div className="text-xs text-slate-400 mt-1">{userAnalytics.shares.today} today ({userAnalytics.shares.rate}%)</div>
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                  <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">Instacart</div>
                  <div className="text-2xl font-mono font-bold text-[#F1F5F9]">{userAnalytics.instacart.total}</div>
                  <div className="text-xs text-slate-400 mt-1">{userAnalytics.instacart.today} today ({userAnalytics.instacart.rate}%)</div>
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                  <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">Emails</div>
                  <div className="text-2xl font-mono font-bold text-[#F1F5F9]">{userAnalytics.emails.total}</div>
                  <div className="text-xs text-slate-400 mt-1">{userAnalytics.emails.today} today ({userAnalytics.emails.captureRate}%)</div>
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                  <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">PWA Installs</div>
                  <div className="text-2xl font-mono font-bold text-[#F1F5F9]">{userAnalytics.pwa.total}</div>
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                  <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">Upgrade Clicks</div>
                  <div className="text-2xl font-mono font-bold text-[#F1F5F9]">{userAnalytics.upgrades.total}</div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400">
                No analytics data available yet
              </div>
            )}
          </div>

          {/* Recipe Performance */}
          <div className="bg-[#1E293B] border border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[#F1F5F9] flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-purple-400" />
                Recipe Performance
              </h2>
              <button
                onClick={fetchRecipePerformance}
                className="p-2 hover:bg-slate-700 rounded-lg transition-all duration-200"
                title="Refresh performance"
              >
                <RefreshCw className={`w-5 h-5 text-purple-400 ${recipePerformanceLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            
            {recipePerformanceLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
              </div>
            ) : recipePerformance ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                    <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">Cache Hits</div>
                    <div className="text-2xl font-mono font-bold text-emerald-400">{recipePerformance.totalCacheHits}</div>
                  </div>
                  <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                    <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">Unique Recipes</div>
                    <div className="text-2xl font-mono font-bold text-[#F1F5F9]">{recipePerformance.totalUniqueRecipes}</div>
                  </div>
                </div>
                
                {recipePerformance.mostFavorited && recipePerformance.mostFavorited.length > 0 && (
                      <div>
                    <div className="text-sm font-semibold text-slate-300 mb-3">Most Favorited Recipes</div>
                    <div className="space-y-2">
                      {recipePerformance.mostFavorited.slice(0, 5).map((recipe: any, index: number) => (
                        <div key={index} className="bg-slate-800 border border-slate-700 rounded-lg p-3 flex items-center justify-between">
                          <span className="text-[#F1F5F9] capitalize">{recipe.title}</span>
                          <span className="text-emerald-400 font-mono font-bold">{recipe.favorites} ❤️</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {recipePerformance.mostShared && recipePerformance.mostShared.length > 0 && (
                  <div>
                    <div className="text-sm font-semibold text-slate-300 mb-3 mt-4">Most Shared Recipes</div>
                    <div className="space-y-2">
                      {recipePerformance.mostShared.slice(0, 5).map((recipe: any, index: number) => (
                        <div key={index} className="bg-slate-800 border border-slate-700 rounded-lg p-3 flex items-center justify-between">
                          <span className="text-[#F1F5F9] capitalize">{recipe.title}</span>
                          <span className="text-blue-400 font-mono font-bold">{recipe.shares} 🔗</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400">
                No recipe performance data available yet
              </div>
            )}
          </div>

          {/* Error Tracking */}
          <div className="bg-[#1E293B] border border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[#F1F5F9] flex items-center gap-2">
                <AlertCircle className="w-6 h-6 text-red-400" />
                Error Tracking
              </h2>
              <button
                onClick={fetchErrorData}
                className="p-2 hover:bg-slate-700 rounded-lg transition-all duration-200"
                title="Refresh errors"
              >
                <RefreshCw className={`w-5 h-5 text-red-400 ${errorDataLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            
            {errorDataLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-red-400" />
              </div>
            ) : errorData ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                    <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">Total Errors</div>
                    <div className="text-2xl font-mono font-bold text-red-400">{errorData.total}</div>
                  </div>
                  <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                    <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">Scan Errors</div>
                    <div className="text-2xl font-mono font-bold text-[#F1F5F9]">{errorData.scan}</div>
                  </div>
                  <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                    <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">Recipe Errors</div>
                    <div className="text-2xl font-mono font-bold text-[#F1F5F9]">{errorData.recipes}</div>
                  </div>
                </div>
                
                {errorData.recent && errorData.recent.length > 0 && (
                  <div>
                    <div className="text-sm font-semibold text-slate-300 mb-3">Recent Errors</div>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {errorData.recent.map((error: any, index: number) => (
                        <div key={index} className="bg-slate-800 border border-slate-700 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-red-400 font-semibold text-sm">{error.type || 'Unknown'}</span>
                            <span className="text-xs text-slate-400">{new Date(error.timestamp).toLocaleString()}</span>
                          </div>
                          <div className="text-xs text-slate-400">Location: {error.location || 'unknown'}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400">
                No errors tracked yet
              </div>
            )}
          </div>

          {/* AI Accuracy Widget */}
          {incorrectDetections && typeof incorrectDetections.overallAccuracy === 'number' && (
            <div className="bg-[#1E293B] border border-slate-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-[#F1F5F9] flex items-center gap-2">
                  <Target className="w-6 h-6 text-emerald-400" />
                  AI Detection Accuracy
                </h2>
                <button
                  onClick={fetchIncorrectDetections}
                  className="p-2 hover:bg-slate-700 rounded-lg transition-all duration-200"
                  title="Refresh accuracy"
                >
                  <RefreshCw className={`w-5 h-5 text-emerald-400 ${incorrectDetectionsLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                  <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">Overall Accuracy</div>
                  <div className={`text-3xl font-mono font-bold ${
                    (incorrectDetections.overallAccuracy || 0) >= 90 ? 'text-emerald-400' :
                    (incorrectDetections.overallAccuracy || 0) >= 80 ? 'text-yellow-400' :
                    'text-red-400'
                  }`}>
                    {incorrectDetections.overallAccuracy || 0}%
                        </div>
                      </div>
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                  <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">False Positive Rate</div>
                  <div className="text-2xl font-mono font-bold text-orange-400">{incorrectDetections.overallFalsePositiveRate || 0}%</div>
                    </div>
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                  <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">False Negative Rate</div>
                  <div className="text-2xl font-mono font-bold text-blue-400">{incorrectDetections.overallFalseNegativeRate || 0}%</div>
                    </div>
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                  <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">Total Scans</div>
                  <div className="text-2xl font-mono font-bold text-[#F1F5F9]">{stats?.totalScans || 0}</div>
                  </div>
              </div>
            </div>
          )}

          {/* Incorrect Detections Dashboard */}
          <div className="bg-[#1E293B] border border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[#F1F5F9] flex items-center gap-2">
                <AlertCircle className="w-6 h-6 text-orange-400" />
                Detection Analytics (False Positives & Negatives)
              </h2>
              <button
                onClick={fetchIncorrectDetections}
                className="p-2 hover:bg-slate-700 rounded-lg transition-all duration-200"
                title="Refresh incorrect detections"
              >
                <RefreshCw className={`w-5 h-5 text-orange-400 ${incorrectDetectionsLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            
            {incorrectDetectionsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-orange-400" />
              </div>
            ) : incorrectDetections ? (
              <div className="space-y-6">
                {/* Summary Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                    <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">False Positives</div>
                    <div className="text-2xl font-mono font-bold text-orange-400">{incorrectDetections.total}</div>
                    <div className="text-xs text-slate-400 mt-1">{incorrectDetections.overallFalsePositiveRate}% rate</div>
                  </div>
                  <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                    <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">False Negatives</div>
                    <div className="text-2xl font-mono font-bold text-blue-400">
                      {Array.isArray(incorrectDetections.topMissed) 
                        ? incorrectDetections.topMissed.reduce((sum: number, item: any) => sum + (item.missedCount || 0), 0)
                        : 0}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">{incorrectDetections.overallFalseNegativeRate || 0}% rate</div>
                  </div>
                  <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                    <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">Top FP Ingredients</div>
                    <div className="text-2xl font-mono font-bold text-[#F1F5F9]">{Array.isArray(incorrectDetections.topIncorrect) ? incorrectDetections.topIncorrect.length : 0}</div>
                  </div>
                  <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                    <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">Top FN Ingredients</div>
                    <div className="text-2xl font-mono font-bold text-[#F1F5F9]">{Array.isArray(incorrectDetections.topMissed) ? incorrectDetections.topMissed.length : 0}</div>
                  </div>
                </div>

                {/* Top False Negatives (Missed Detections) */}
                {incorrectDetections.topMissed && Array.isArray(incorrectDetections.topMissed) && incorrectDetections.topMissed.length > 0 && (
                    <div>
                    <div className="text-sm font-semibold text-[#F1F5F9] mb-3">Most Missed Ingredients (False Negatives)</div>
                    <div className="space-y-2 mb-6">
                      {incorrectDetections.topMissed.map((item: any, index: number) => (
                          <div
                            key={item.ingredient}
                            className={`p-4 rounded-xl border-2 ${
                            item.falseNegativeRate > 10
                              ? 'bg-blue-500 bg-opacity-10 border-blue-500 border-opacity-30'
                              : item.falseNegativeRate > 5
                              ? 'bg-cyan-500 bg-opacity-10 border-cyan-500 border-opacity-30'
                              : 'bg-slate-800 border-slate-700'
                            }`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                                index === 0 ? 'bg-blue-400 text-blue-900' :
                                index === 1 ? 'bg-cyan-400 text-cyan-900' :
                                index === 2 ? 'bg-teal-400 text-teal-900' :
                                  'bg-gray-200 text-gray-600'
                                }`}>
                                  {index + 1}
                                </div>
                                <div>
                                <div className="font-bold text-[#F1F5F9] capitalize">{item.ingredient}</div>
                                <div className="text-xs text-slate-400">
                                  Missed {item.missedCount}x ({item.falseNegativeRate}% false negative rate)
                                  </div>
                                </div>
                              </div>
                            {item.falseNegativeRate > 10 && (
                              <AlertCircle className="w-5 h-5 text-blue-400" />
                              )}
                            </div>
                        </div>
                      ))}
                    </div>
                              </div>
                            )}

                {/* Top Incorrectly Detected Ingredients */}
                {incorrectDetections.topIncorrect && Array.isArray(incorrectDetections.topIncorrect) && incorrectDetections.topIncorrect.length > 0 && (
                  <div>
                    <div className="text-sm font-semibold text-[#F1F5F9] mb-3">Most Incorrectly Detected Ingredients (False Positives)</div>
                    <div className="space-y-2">
                      {incorrectDetections.topIncorrect.map((item: any, index: number) => (
                        <div
                          key={item.ingredient}
                          className={`p-4 rounded-xl border-2 ${
                            item.falsePositiveRate > 10
                              ? 'bg-red-500 bg-opacity-10 border-red-500 border-opacity-30'
                              : item.falsePositiveRate > 5
                              ? 'bg-orange-500 bg-opacity-10 border-orange-500 border-opacity-30'
                              : 'bg-slate-800 border-slate-700'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                                index === 0 ? 'bg-red-400 text-red-900' :
                                index === 1 ? 'bg-orange-400 text-orange-900' :
                                index === 2 ? 'bg-yellow-400 text-yellow-900' :
                                'bg-gray-200 text-gray-600'
                              }`}>
                                {index + 1}
                          </div>
                              <div>
                                <div className="font-bold text-[#F1F5F9] capitalize">{item.ingredient}</div>
                                <div className="text-xs text-slate-400">
                                  Incorrectly detected {item.incorrectCount}x ({item.falsePositiveRate}% false positive rate)
                      </div>
                    </div>
                            </div>
                            {item.falsePositiveRate > 10 && (
                              <AlertCircle className="w-5 h-5 text-red-400" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    </div>
                  )}

                  {/* Improvement Suggestions */}
                {incorrectDetections.improvementSuggestions && Array.isArray(incorrectDetections.improvementSuggestions) && incorrectDetections.improvementSuggestions.length > 0 && (
                  <div className="bg-orange-500 bg-opacity-10 border-2 border-orange-500 border-opacity-30 rounded-xl p-4">
                    <div className="text-sm font-semibold text-orange-400 mb-2 flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                      Prompt Improvement Suggestions
                      </div>
                      <ul className="space-y-1">
                      {incorrectDetections.improvementSuggestions.map((suggestion: string, index: number) => (
                        <li key={index} className="text-sm text-orange-300 flex items-start gap-2">
                          <span className="text-orange-400 mt-1">•</span>
                            <span>{suggestion}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                {/* Daily Breakdown */}
                {incorrectDetections.dailyBreakdown && typeof incorrectDetections.dailyBreakdown === 'object' && Object.keys(incorrectDetections.dailyBreakdown).length > 0 && (
                  <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                    <div className="text-sm font-semibold text-[#F1F5F9] mb-3">Daily False Positives (Last 7 Days)</div>
                    <div className="space-y-2">
                      {Object.entries(incorrectDetections.dailyBreakdown)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([date, count]: [string, any]) => (
                        <div key={date} className="flex items-center justify-between text-sm py-1 border-b border-slate-700 last:border-0">
                          <span className="text-slate-400">
                            {new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                          </span>
                          <span className="font-mono font-semibold text-orange-400">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <div className="mb-2">No incorrect detections tracked yet</div>
                <div className="text-xs text-slate-500">
                  This data will appear when users remove AI-detected ingredients
                </div>
              </div>
            )}
                  </div>

          {/* Customer & Revenue Dashboard */}
          <div className="bg-[#1E293B] border border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[#F1F5F9] flex items-center gap-2">
                <DollarSign className="w-6 h-6 text-emerald-400" />
                Customers & Revenue
              </h2>
                        <button
                onClick={fetchCustomerData}
                className="p-2 hover:bg-slate-700 rounded-lg transition-all duration-200"
                title="Refresh customer data"
              >
                <RefreshCw className={`w-5 h-5 text-emerald-400 ${customerDataLoading ? 'animate-spin' : ''}`} />
                        </button>
                      </div>
            
            {customerDataLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
              </div>
            ) : customerData ? (
              <div className="space-y-6">
                {/* Revenue Overview */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                    <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">Total Customers</div>
                    <div className="text-2xl font-mono font-bold text-[#F1F5F9]">{customerData.total}</div>
                    <div className="text-xs text-slate-400 mt-1">
                      {customerData.pro} Pro + {customerData.family} Family
                    </div>
                  </div>
                  <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                    <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">Monthly Revenue</div>
                    <div className="text-2xl font-mono font-bold text-emerald-400">${customerData.revenue.monthly.toFixed(2)}</div>
                    <div className="text-xs text-slate-400 mt-1">${customerData.revenue.annual.toFixed(2)}/year</div>
                  </div>
                  <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                    <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">Avg Revenue/Customer</div>
                    <div className="text-2xl font-mono font-bold text-[#F1F5F9]">${customerData.revenue.perCustomer.toFixed(2)}</div>
                    <div className="text-xs text-slate-400 mt-1">per month</div>
                  </div>
                  <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                    <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">Conversion Rate</div>
                    <div className="text-2xl font-mono font-bold text-blue-400">{customerData.metrics.conversionRate}%</div>
                    <div className="text-xs text-slate-400 mt-1">{customerData.total} / {customerData.metrics.totalUsers} users</div>
                  </div>
                </div>

                {/* Customer Usage */}
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                  <div className="text-sm font-semibold text-[#F1F5F9] mb-3">Paying Customer Usage</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">Scans</div>
                      <div className="text-xl font-mono font-bold text-[#F1F5F9]">{customerData.usage.scans.toLocaleString()}</div>
                      <div className="text-xs text-slate-400 mt-1">{customerData.usage.avgScansPerCustomer.toFixed(1)} avg/customer</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">Recipes</div>
                      <div className="text-xl font-mono font-bold text-[#F1F5F9]">{customerData.usage.recipes.toLocaleString()}</div>
                      <div className="text-xs text-slate-400 mt-1">{customerData.usage.avgRecipesPerCustomer.toFixed(1)} avg/customer</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">Favorites</div>
                      <div className="text-xl font-mono font-bold text-emerald-400">{customerData.usage.favorites.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">Shares</div>
                      <div className="text-xl font-mono font-bold text-blue-400">{customerData.usage.shares.toLocaleString()}</div>
                    </div>
                  </div>
                </div>

                {/* Top Customers */}
                {customerData.sample && customerData.sample.length > 0 && (
                  <div>
                    <div className="text-sm font-semibold text-[#F1F5F9] mb-3">Top Customers (Sample)</div>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {customerData.sample
                        .sort((a: any, b: any) => (b.scans + b.recipes) - (a.scans + a.recipes))
                        .slice(0, 10)
                        .map((customer: any, index: number) => (
                        <div key={index} className="bg-slate-800 border border-slate-700 rounded-lg p-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                              index === 0 ? 'bg-yellow-400 text-yellow-900' :
                              index === 1 ? 'bg-gray-300 text-gray-700' :
                              index === 2 ? 'bg-orange-300 text-orange-900' :
                              'bg-gray-200 text-gray-600'
                            }`}>
                              {index + 1}
                            </div>
                            <div>
                              <div className="font-semibold text-[#F1F5F9]">
                                {customer.id.substring(0, 8)}...
                                <span className={`ml-2 text-xs px-2 py-0.5 rounded ${
                                  customer.plan === 'pro' ? 'bg-blue-500 bg-opacity-20 text-blue-400' : 'bg-purple-500 bg-opacity-20 text-purple-400'
                                }`}>
                                  {customer.plan.toUpperCase()}
                                </span>
                              </div>
                              <div className="text-xs text-slate-400">
                                {customer.scans} scans • {customer.recipes} recipes
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-emerald-400">${customer.revenue.toFixed(2)}/mo</div>
                            {customer.lastActive && (
                              <div className="text-xs text-slate-400">
                                Active {new Date(customer.lastActive).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
              <div className="text-center py-8 text-slate-400">
                <div className="mb-2">No paying customers yet</div>
                <div className="text-xs text-slate-500">
                  Revenue dashboard will appear once customers upgrade to Pro or Family plans
                </div>
              </div>
              )}
            </div>

            {/* Quick Links */}
          <div className="bg-emerald-900 bg-opacity-20 rounded-lg p-6 border border-emerald-800">
              <h3 className="text-lg font-semibold text-white mb-4">Quick Links</h3>
              <div className="space-y-2">
                <a href="/" className="block text-emerald-400 hover:text-emerald-300">
                  Back to Home
                </a>
                <a href="/?founder=true" className="block text-emerald-400 hover:text-emerald-300">
                  Enable Founder Mode via URL (?founder=true)
                </a>
                <a href="/waitlist" className="block text-emerald-400 hover:text-emerald-300">
                  View Waitlist
                </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
