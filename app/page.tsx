'use client'

import React, { useState, useEffect } from 'react'
import { Camera, Upload, X, Plus, ShoppingCart, Loader2, Clock, TrendingUp, AlertCircle, Check, Home, ArrowRight, Heart, User, Share2, Sparkles, Mail } from 'lucide-react'
import { MealSnapLogo } from '@/components/mealsnap-logo'

type Recipe = {
  id?: string
  title: string
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  timeMinutes: number
  difficulty: 'easy' | 'medium' | 'hard'
  servings: number
  youAlreadyHave: string[]
  youNeedToBuy: string[]
  steps: string[]
}

type ShoppingItem = {
  name: string
  quantity?: string
}

type View = 'home' | 'ingredients' | 'recipes' | 'favorites'

export default function MealSnap() {
  const [currentView, setCurrentView] = useState<View>('home')
  const [ingredients, setIngredients] = useState<string[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [favorites, setFavorites] = useState<Recipe[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [newIngredient, setNewIngredient] = useState('')
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([])
  const [error, setError] = useState('')
  const [userId, setUserId] = useState<string>('')
  const [showShareCard, setShowShareCard] = useState(false)
  const [sharedRecipe, setSharedRecipe] = useState<Recipe | null>(null)
  const [showPricingModal, setShowPricingModal] = useState(false)
  const [scanCount, setScanCount] = useState(0)
  const [userPlan, setUserPlan] = useState<'free' | 'pro' | 'family'>('free')
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [emailInput, setEmailInput] = useState('')
  const [emailSubmitted, setEmailSubmitted] = useState(false)
  const [showEmailGate, setShowEmailGate] = useState(false)
  const [waitlistCount, setWaitlistCount] = useState(247)

  // Generate or load user ID for referrals
  useEffect(() => {
    // Check for referral parameter in URL
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const refId = urlParams.get('ref')
      
      if (refId) {
        // Track referral (you can add analytics here)
        console.log('Referral detected:', refId)
        // Store referral for later use (e.g., give both users 5 free scans)
        localStorage.setItem('mealsnap_referrer', refId)
      }
    }

    let id = localStorage.getItem('mealsnap_user_id')
    if (!id) {
      id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      localStorage.setItem('mealsnap_user_id', id)
    }
    setUserId(id)
  }, [])

  // Load user plan and scan count with weekly reset
  useEffect(() => {
    // Check for founder mode
    const isFounder = localStorage.getItem('mealsnap_founder') === 'true'
    if (isFounder) {
      setUserPlan('pro')
      localStorage.setItem('mealsnap_plan', 'pro')
    }
    
    const plan = localStorage.getItem('mealsnap_plan') as 'free' | 'pro' | 'family' | null
    const lastReset = localStorage.getItem('mealsnap_last_reset')
    const now = Date.now()
    const weekInMs = 7 * 24 * 60 * 60 * 1000
    
    // Reset scan count weekly (unless founder)
    if (!isFounder && (!lastReset || (now - parseInt(lastReset, 10)) > weekInMs)) {
      localStorage.setItem('mealsnap_scan_count', '0')
      localStorage.setItem('mealsnap_last_reset', now.toString())
      setScanCount(0)
    } else {
      const count = localStorage.getItem('mealsnap_scan_count')
      if (count) setScanCount(parseInt(count, 10))
    }
    
    if (plan) setUserPlan(plan)
  }, [])

  // Load favorites and email status from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('mealsnap_favorites')
    if (saved) {
      try {
        setFavorites(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to load favorites:', e)
      }
    }
    
    // Check if email already submitted
    const emailSubmitted = localStorage.getItem('mealsnap_email_submitted')
    if (emailSubmitted) {
      setEmailSubmitted(true)
    }
  }, [])

  const checkScanLimit = (): boolean => {
    // Founder bypass - check for founder mode
    const isFounder = localStorage.getItem('mealsnap_founder') === 'true'
    if (isFounder) return true
    
    if (userPlan === 'pro' || userPlan === 'family') return true
    return scanCount < 3
  }

  const incrementScanCount = () => {
    const newCount = scanCount + 1
    setScanCount(newCount)
    localStorage.setItem('mealsnap_scan_count', newCount.toString())
    
    // Track scan
    if (typeof window !== 'undefined' && (window as any).plausible) {
      (window as any).plausible('Scan Completed', { props: { scanNumber: newCount } })
    }
    
    if (newCount >= 3 && userPlan === 'free') {
      // Check if email submitted - if not, show email gate first
      const hasSubmittedEmail = localStorage.getItem('mealsnap_email_submitted')
      if (!hasSubmittedEmail) {
        setShowEmailGate(true)
      } else {
        setShowPricingModal(true)
      }
    }
  }

  const handleEmailSubmit = async (email: string, source: 'modal' | 'gate' | 'waitlist') => {
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address')
      return
    }

    try {
      // Store in localStorage
      localStorage.setItem('mealsnap_email', email)
      localStorage.setItem('mealsnap_email_submitted', 'true')
      setEmailSubmitted(true)
      
      // Send to API (we'll create this endpoint)
      await fetch('/api/save-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source, userId }),
      })
      
      // Track email capture
      if (typeof window !== 'undefined' && (window as any).plausible) {
        (window as any).plausible('Email Captured', { props: { source } })
      }
      
      // Close modals
      setShowEmailModal(false)
      setShowEmailGate(false)
      
      // If at scan limit, give 2 more scans
      if (source === 'gate' && scanCount >= 3) {
        setScanCount(scanCount - 2) // Give 2 more scans
        localStorage.setItem('mealsnap_scan_count', (scanCount - 2).toString())
      }
    } catch (err) {
      console.error('Failed to save email:', err)
      // Still mark as submitted locally
      setEmailSubmitted(true)
      setShowEmailModal(false)
      setShowEmailGate(false)
    }
  }

  // Save favorites to localStorage
  const saveFavorites = (newFavorites: Recipe[]) => {
    setFavorites(newFavorites)
    localStorage.setItem('mealsnap_favorites', JSON.stringify(newFavorites))
  }

  const toggleFavorite = async (recipe: Recipe) => {
    const isFavorite = favorites.some(f => f.title === recipe.title)
    if (isFavorite) {
      saveFavorites(favorites.filter(f => f.title !== recipe.title))
    } else {
      saveFavorites([...favorites, recipe])
      
      // Auto-trigger native share when saving
      const shareText = `I just made ${recipe.title} from my fridge with MealSnap! Get 5 free scans: https://mealsnap-chi.vercel.app?ref=${userId}`
      const shareUrl = typeof window !== 'undefined' ? window.location.origin : 'https://mealsnap-chi.vercel.app'

      try {
        if (navigator.share) {
          await navigator.share({
            title: 'MealSnap Recipe',
            text: shareText,
            url: `${shareUrl}?ref=${userId}`,
          })
          console.log('Recipe shared successfully')
        } else {
          // Fallback: show share card for manual sharing
          setSharedRecipe(recipe)
          setShowShareCard(true)
        }
      } catch (err) {
        // User cancelled - show share card as fallback
        if (err instanceof Error && err.name === 'AbortError') {
          // User cancelled, don't show anything
        } else {
          // Error occurred - show share card
          setSharedRecipe(recipe)
          setShowShareCard(true)
        }
      }
    }
  }

  const handleShare = async () => {
    if (!sharedRecipe || !userId) return

    const shareText = `I just made ${sharedRecipe.title} from my fridge with MealSnap! Get 5 free scans: https://mealsnap-chi.vercel.app?ref=${userId}`
    const shareUrl = typeof window !== 'undefined' ? window.location.origin : 'https://mealsnap-chi.vercel.app'

    try {
      if (navigator.share) {
        await navigator.share({
          title: 'MealSnap Recipe',
          text: shareText,
          url: `${shareUrl}?ref=${userId}`,
        })
        console.log('Recipe shared successfully')
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(shareText)
        alert('Link copied to clipboard! Share it anywhere.')
      }
      setShowShareCard(false)
    } catch (err) {
      // User cancelled or error occurred
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error('Share error:', err)
        // Fallback to clipboard
        try {
          await navigator.clipboard.writeText(shareText)
          alert('Link copied to clipboard!')
        } catch (clipboardErr) {
          console.error('Clipboard error:', clipboardErr)
        }
      }
    }
  }

  const isFavorite = (recipe: Recipe) => {
    return favorites.some(f => f.title === recipe.title)
  }

  // Compress and resize image before upload
  const compressImage = (file: File, maxWidth: number = 1920, maxHeight: number = 1920, quality: number = 0.8): Promise<string> => {
    return new Promise((resolve, reject) => {
      console.log('[MealSnap] compressImage called:', file.name, file.size, 'bytes')
      
      // Check file size first (10MB limit)
      const maxSize = 10 * 1024 * 1024 // 10MB
      if (file.size > maxSize) {
        console.error('[MealSnap] File too large:', file.size)
        reject(new Error('Image is too large. Please use an image under 10MB.'))
        return
      }

      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = (e) => {
        console.log('[MealSnap] FileReader loaded, creating image...')
        const img = new Image()
        img.onload = () => {
          console.log('[MealSnap] Image loaded, dimensions:', img.width, 'x', img.height)
          const canvas = document.createElement('canvas')
          let width = img.width
          let height = img.height

          // Calculate new dimensions
          if (width > height) {
            if (width > maxWidth) {
              height = (height * maxWidth) / width
              width = maxWidth
            }
          } else {
            if (height > maxHeight) {
              width = (width * maxHeight) / height
              height = maxHeight
            }
          }

          console.log('[MealSnap] Resizing to:', width, 'x', height)

          canvas.width = width
          canvas.height = height

          const ctx = canvas.getContext('2d')
          if (!ctx) {
            console.error('[MealSnap] Could not get canvas context')
            reject(new Error('Could not get canvas context'))
            return
          }

          ctx.drawImage(img, 0, 0, width, height)
          
          // Convert to base64 with compression
          const base64 = canvas.toDataURL('image/jpeg', quality)
          const base64Data = base64.split(',')[1]
          
          // Check if compressed size is still too large (4.5MB limit for base64)
          const sizeInBytes = (base64Data.length * 3) / 4
          console.log('[MealSnap] Compressed size:', sizeInBytes, 'bytes (', (sizeInBytes / 1024 / 1024).toFixed(2), 'MB)')
          
          if (sizeInBytes > 4.5 * 1024 * 1024) {
            // Try again with lower quality
            if (quality > 0.5) {
              console.log('[MealSnap] Still too large, retrying with quality:', quality - 0.1)
              resolve(compressImage(file, maxWidth, maxHeight, quality - 0.1))
            } else {
              console.error('[MealSnap] Image too large even after compression')
              reject(new Error('Image is too large even after compression. Please use a smaller image.'))
            }
          } else {
            console.log('[MealSnap] Compression successful')
            resolve(base64Data)
          }
        }
        img.onerror = (error) => {
          console.error('[MealSnap] Image load error:', error)
          reject(new Error('Failed to load image'))
        }
        img.src = e.target?.result as string
      }
      reader.onerror = (error) => {
        console.error('[MealSnap] FileReader error:', error)
        reject(error)
      }
    })
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('[MealSnap] handleImageUpload called', e.target.files)
    
    const file = e.target.files?.[0]
    if (!file) {
      console.log('[MealSnap] No file selected')
      return
    }

    console.log('[MealSnap] File selected:', file.name, file.size, 'bytes')

    // Reset file input
    e.target.value = ''

    // Check scan limit
    const canScan = checkScanLimit()
    console.log('[MealSnap] Scan limit check:', canScan, 'scanCount:', scanCount, 'userPlan:', userPlan)
    
    if (!canScan) {
      console.log('[MealSnap] Scan limit reached, showing pricing modal')
      setShowPricingModal(true)
      return
    }

    setIsLoading(true)
    setError('')
    
    try {
      console.log('[MealSnap] Starting image compression...')
      // Compress image before sending
      const base64Image = await compressImage(file)
      console.log('[MealSnap] Image compressed, size:', base64Image.length, 'chars')
      
      console.log('[MealSnap] Sending to /api/scan-pantry...')
      const response = await fetch('/api/scan-pantry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageBase64: base64Image }),
      })

      console.log('[MealSnap] Response status:', response.status, response.ok)

      if (!response.ok) {
        // Handle 413 specifically
        if (response.status === 413) {
          setError('Image is too large. Please try a smaller image or take a new photo.')
          setIsLoading(false)
          return
        }
        
        const errorData = await response.json().catch(() => ({}))
        console.error('[MealSnap] API error:', errorData)
        throw new Error(errorData.error || `Server error: ${response.status}`)
      }

      const data = await response.json()
      console.log('[MealSnap] API response:', data)
      
      if (!data.ok || data.error) {
        setError(data.error || 'Failed to scan pantry')
        setIsLoading(false)
        return
      }

      if (data.items && Array.isArray(data.items) && data.items.length > 0) {
        console.log('[MealSnap] Ingredients detected:', data.items.length)
        setIngredients(data.items)
        incrementScanCount()
        setCurrentView('ingredients')
        
        // Track pantry scan
        if (typeof window !== 'undefined' && (window as any).plausible) {
          (window as any).plausible('Pantry Scanned', { props: { ingredientCount: data.items.length } })
        }
      } else {
        console.log('[MealSnap] No ingredients detected')
        setError('No ingredients detected. Try a clearer photo or add ingredients manually.')
        setIngredients([])
        incrementScanCount()
        setCurrentView('ingredients')
      }
    } catch (err: any) {
      console.error('[MealSnap] Scan error:', err)
      setError(err.message || 'Failed to scan image. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGenerateRecipes = async () => {
    if (ingredients.length === 0) {
      setError('Please add at least one ingredient first.')
      return
    }

    setIsLoading(true)
    setError('')
    
    try {
      const response = await fetch('/api/generate-recipes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ingredients }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Server error: ${response.status}`)
      }

      const data = await response.json()
      
      if (!data.ok || data.error) {
        setError(data.error || 'Failed to generate recipes')
        return
      }

      if (data.recipes && Array.isArray(data.recipes) && data.recipes.length > 0) {
        setRecipes(data.recipes)
        
        const allNeededItems = data.recipes
          .flatMap((recipe: Recipe) => recipe.youNeedToBuy || [])
          .filter((item: string) => item && item.trim() !== '')
        
        const uniqueItems = Array.from(new Set(allNeededItems)).map((item: string) => ({
          name: item,
        }))
        
        setShoppingList(uniqueItems)
        setCurrentView('recipes')
        
        // Track recipe generation
        if (typeof window !== 'undefined' && (window as any).plausible) {
          (window as any).plausible('Recipes Generated', { props: { count: data.recipes.length } })
        }
        
        // Show email capture modal after first recipe generation (if email not submitted)
        const hasSubmittedEmail = localStorage.getItem('mealsnap_email_submitted')
        if (!hasSubmittedEmail) {
          setShowEmailModal(true)
        }
      } else {
        setError('No recipes generated. Try adding more ingredients.')
      }
    } catch (err: any) {
      console.error('Recipe generation error:', err)
      setError(err.message || 'Failed to generate recipes. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const addIngredient = () => {
    if (newIngredient.trim()) {
      const cleanIngredient = newIngredient.trim().toLowerCase()
      if (!ingredients.includes(cleanIngredient)) {
        setIngredients([...ingredients, cleanIngredient])
      }
      setNewIngredient('')
    }
  }

  const removeIngredient = (ingredient: string) => {
    setIngredients(ingredients.filter(i => i !== ingredient))
  }

  const copyShoppingList = () => {
    const listText = shoppingList.map((item, i) => `${i + 1}. ${item.name}`).join('\n')
    navigator.clipboard.writeText(listText).catch((err) => {
      console.error('Failed to copy:', err)
    })
  }

  // Sticky Header Component
  const StickyHeader = () => {
    const scansRemaining = userPlan === 'free' ? Math.max(0, 3 - scanCount) : '∞'
    
    return (
      <header className="bg-white/95 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => setCurrentView('home')}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity group"
            >
              <div className="transform transition-transform duration-300 group-hover:scale-110">
                <MealSnapLogo className="w-12 h-12" />
        </div>
              <span className="text-xl font-extrabold text-gray-900 tracking-tight hidden sm:inline">
                Meal<span className="text-emerald-600">Snap</span>
              </span>
            </button>

            <div className="flex items-center gap-3">
              {userPlan === 'free' && (
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <span className="text-xs font-semibold text-emerald-700">
                    {scansRemaining}/3 scans remaining
                  </span>
      </div>
              )}
              
              {userPlan === 'free' && (
                <button
                  onClick={() => setShowPricingModal(true)}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-lg text-sm font-bold transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  Upgrade to Pro
                </button>
              )}

              <nav className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => setCurrentView('home')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentView === 'home'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <span className="hidden sm:inline">New Scan</span>
              <Camera className="w-4 h-4 sm:hidden" />
            </button>
            <button
              onClick={() => setCurrentView('favorites')}
              className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentView === 'favorites'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <span className="hidden sm:inline">Favorites</span>
              <Heart className={`w-4 h-4 sm:hidden ${currentView === 'favorites' ? 'fill-current' : ''}`} />
              {favorites.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-emerald-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
                  {favorites.length}
                </span>
              )}
            </button>
            <a
              href="/waitlist"
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
            >
              <span className="hidden sm:inline">Waitlist</span>
              <Mail className="w-4 h-4 sm:hidden" />
            </a>
            <button
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
            >
              <span className="hidden sm:inline">Profile</span>
              <User className="w-4 h-4 sm:hidden" />
            </button>
          </nav>
            </div>
          </div>
        </div>
      </header>
    )
  }

  // Breadcrumb Navigation Component
  const BreadcrumbNav = () => {
    const breadcrumbs = {
      home: { label: 'Home', view: 'home' as const },
      ingredients: { label: 'Ingredients', view: 'ingredients' as const },
      recipes: { label: 'Recipes', view: 'recipes' as const },
      favorites: { label: 'Favorites', view: 'favorites' as const },
    }

    if (currentView === 'home' || currentView === 'favorites') return null

  return (
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <button
          onClick={() => setCurrentView('home')}
          className="hover:text-emerald-600 transition-colors"
        >
          {breadcrumbs.home.label}
        </button>
        {currentView !== 'home' && (
          <>
            <ArrowRight className="w-4 h-4" />
                  <button 
              onClick={() => setCurrentView('ingredients')}
              className={`hover:text-emerald-600 transition-colors ${
                currentView === 'ingredients' ? 'text-emerald-600 font-semibold' : ''
              }`}
            >
              {breadcrumbs.ingredients.label}
                  </button>
          </>
        )}
        {currentView === 'recipes' && (
          <>
            <ArrowRight className="w-4 h-4" />
            <span className="text-emerald-600 font-semibold">{breadcrumbs.recipes.label}</span>
          </>
        )}
      </nav>
    )
  }

  // HOME VIEW
  if (currentView === 'home') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-green-50">
        <StickyHeader />
        
        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <section className="text-center py-16 px-6">
            <div className="inline-flex items-center justify-center mb-6">
              <MealSnapLogo className="w-16 h-16" />
              </div>
            
            <h1 className="text-4xl md:text-5xl font-extrabold text-emerald-600">
              Stop wasting food. Start cooking what you have.
            </h1>
            
            <p className="mt-4 text-lg text-gray-700 max-w-2xl mx-auto">
              Snap your fridge, get 3 recipes you can make tonight. Missing something? Add to cart in 1 tap.
            </p>
            
            <ul className="mt-6 space-y-2 text-left max-w-md mx-auto">
              <li className="flex items-start">
                <span className="text-emerald-500 mr-2">✅</span>
                <span>No more "what's for dinner?" stress</span>
              </li>
              <li className="flex items-start">
                <span className="text-emerald-500 mr-2">✅</span>
                <span>Use ingredients before they expire</span>
              </li>
              <li className="flex items-start">
                <span className="text-emerald-500 mr-2">✅</span>
                <span>Save $200/month on food waste</span>
              </li>
              <li className="flex items-start">
                <span className="text-emerald-500 mr-2">✅</span>
                <span>One-tap grocery delivery for anything missing</span>
              </li>
            </ul>
          </section>

          {error && (
            <div className="max-w-2xl mx-auto mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-900">{error}</p>
              </div>
              <button onClick={() => setError('')} className="text-red-400 hover:text-red-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-2xl border border-gray-100 p-8 sm:p-12 mb-12 transform transition-all duration-300 hover:shadow-3xl hover:-translate-y-1">
            <div className="text-center mb-8">
              <div className="w-24 h-24 bg-gradient-to-br from-emerald-100 to-green-100 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-lg transform transition-transform duration-300 hover:scale-110">
                <Camera className="w-12 h-12 text-emerald-600" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-2">Scan Your Pantry</h2>
              <p className="text-gray-700">Take a photo or upload an image of your ingredients</p>
            </div>

            <div className="space-y-4">
              <label className="block">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={isLoading}
                />
                <div className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-2xl px-8 py-5 font-bold text-lg cursor-pointer transition-all duration-300 flex items-center justify-center gap-3 shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 min-h-[56px]">
                  {isLoading ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" />
                      <span>Analyzing ingredients...</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-6 h-6" />
                      <span>Take Photo with Camera</span>
                    </>
                  )}
                </div>
              </label>

              <label className="block">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={isLoading}
                />
                <div className="w-full bg-white border-2 border-gray-200 hover:border-emerald-400 hover:bg-emerald-50 text-gray-700 rounded-2xl px-8 py-5 font-semibold text-lg cursor-pointer transition-all duration-300 flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] min-h-[56px]">
                  <Upload className="w-6 h-6" />
                  <span>Choose from Gallery</span>
                </div>
              </label>

              <div className="text-center pt-4">
              <button
                  onClick={() => {
                    setIngredients([])
                    setCurrentView('ingredients')
                  }}
                  className="text-sm text-emerald-600 hover:text-emerald-700 font-semibold hover:underline"
                >
                  Or add ingredients manually →
              </button>
            </div>
          </div>
        </div>

          <div className="grid sm:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-100 to-green-100 rounded-2xl flex items-center justify-center mb-4 transform transition-transform duration-300 hover:scale-110">
                <ShoppingCart className="w-7 h-7 text-emerald-600" />
              </div>
              <h3 className="font-extrabold text-gray-900 text-lg mb-2">Smart Recipes</h3>
              <p className="text-sm text-gray-700 leading-relaxed">Get personalized recipes based on what you have</p>
            </div>
            
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-2xl flex items-center justify-center mb-4 transform transition-transform duration-300 hover:scale-110">
                <ShoppingCart className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="font-extrabold text-gray-900 text-lg mb-2">Auto Shopping List</h3>
              <p className="text-sm text-gray-700 leading-relaxed">Missing ingredients? We'll create your list instantly</p>
            </div>
            
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl flex items-center justify-center mb-4 transform transition-transform duration-300 hover:scale-110">
                <Clock className="w-7 h-7 text-purple-600" />
              </div>
              <h3 className="font-extrabold text-gray-900 text-lg mb-2">Save Time</h3>
              <p className="text-sm text-gray-700 leading-relaxed">No more meal planning stress or food waste</p>
            </div>
        </div>
        </main>
      </div>
    )
  }

  // FAVORITES VIEW
  if (currentView === 'favorites') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-green-50">
        <StickyHeader />
        
        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-2">My Favorites</h1>
            <p className="text-gray-700">
              {favorites.length === 0
                ? "You haven't saved any recipes yet"
                : `${favorites.length} saved recipe${favorites.length !== 1 ? 's' : ''}`}
              </p>
            </div>

          {favorites.length === 0 ? (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-xl p-12 text-center">
              <div className="inline-flex items-center justify-center mb-6">
                <MealSnapLogo className="w-20 h-20 opacity-50" />
              </div>
              <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-2xl font-extrabold text-gray-900 mb-2">No favorites yet</h3>
              <p className="text-gray-700 mb-6 text-lg">Save recipes you love!</p>
              <button
                onClick={() => setCurrentView('home')}
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-2xl font-bold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
              >
                <Camera className="w-5 h-5" />
                Start Scanning
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {favorites.map((recipe, index) => (
                <RecipeCard key={index} recipe={recipe} onToggleFavorite={toggleFavorite} isFavorite={true} />
              ))}
            </div>
          )}
        </main>
      </div>
    )
  }

  // INGREDIENTS VIEW
  if (currentView === 'ingredients') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-green-50">
        <StickyHeader />
        
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <BreadcrumbNav />
          
          <div className="mb-6">
            <button
              onClick={() => setCurrentView('home')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 rounded-xl font-medium transition-all duration-300 border border-gray-200 mb-4 hover:shadow-md"
            >
              <Home className="w-4 h-4" />
              Back to Home
            </button>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-2">Your Ingredients</h1>
            <p className="text-gray-700">Review and edit detected items</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-900">{error}</p>
              </div>
              <button onClick={() => setError('')} className="text-red-400 hover:text-red-600">
                <X className="w-4 h-4" />
              </button>
        </div>
          )}

          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 sm:p-10">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-100 to-green-100 rounded-2xl flex items-center justify-center shadow-md">
                <ShoppingCart className="w-7 h-7 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-extrabold text-gray-900 text-xl">
                  {ingredients.length > 0 ? `Detected ${ingredients.length} ingredients` : 'No ingredients yet'}
                </h3>
                <p className="text-sm text-gray-700">
                  {ingredients.length > 0 ? 'Tap × to remove or add more below' : 'Add ingredients to get started'}
                </p>
              </div>
            </div>

            {ingredients.length > 0 && (
              <div className="flex flex-wrap gap-3 mb-8">
                {ingredients.map((ingredient) => (
                  <div
                    key={ingredient}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-full"
                  >
                    <span className="text-sm font-medium text-emerald-900 capitalize">{ingredient}</span>
                    <button
                      onClick={() => removeIngredient(ingredient)}
                      className="w-5 h-5 bg-emerald-200 hover:bg-emerald-300 rounded-full flex items-center justify-center transition-colors"
                    >
                      <X className="w-3 h-3 text-emerald-800" />
                </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3 mb-8">
              <input
                type="text"
                value={newIngredient}
                onChange={(e) => setNewIngredient(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addIngredient()}
                placeholder='Add ingredient manually (e.g., "garlic", "pasta")'
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none text-base"
              />
              <button
                onClick={addIngredient}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-colors flex items-center gap-2 min-w-[100px] justify-center"
              >
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">Add</span>
              </button>
            </div>

            <button
              onClick={handleGenerateRecipes}
              disabled={isLoading || ingredients.length === 0}
              className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed text-white rounded-2xl px-6 py-4 font-bold text-lg transition-all duration-300 flex items-center justify-center gap-3 shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] min-h-[56px]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span>Generating recipes...</span>
                </>
              ) : (
                <>
                  <ShoppingCart className="w-6 h-6" />
                  <span>Generate Recipes ({ingredients.length} ingredient{ingredients.length !== 1 ? 's' : ''})</span>
                </>
              )}
            </button>
          </div>
        </main>
      </div>
    )
  }

  // RECIPES VIEW
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-green-50 pb-20">
      <StickyHeader />
      
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <BreadcrumbNav />
        
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setCurrentView('home')}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-xl font-bold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
          >
            <Camera className="w-4 h-4" />
            <span className="hidden sm:inline">New Scan</span>
          </button>
          <button
            onClick={() => setCurrentView('ingredients')}
            className="text-sm text-emerald-600 hover:text-emerald-700 font-semibold hover:underline transition-colors"
          >
            ← Edit ingredients
          </button>
        </div>
        
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-2">Your Recipes</h1>
          <p className="text-gray-700 text-lg">Found {recipes.length} delicious recipe{recipes.length !== 1 ? 's' : ''} you can make</p>
        </div>

        <div className="space-y-6">
          {recipes.map((recipe, index) => (
            <RecipeCard
              key={index}
              recipe={recipe}
              onToggleFavorite={toggleFavorite}
              isFavorite={isFavorite(recipe)}
            />
          ))}
        </div>

        {shoppingList.length > 0 && (
          <div className="mt-8 bg-white rounded-3xl shadow-xl border border-gray-100 p-6 sm:p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-2xl flex items-center justify-center shadow-md">
                <ShoppingCart className="w-7 h-7 text-blue-600" />
              </div>
            <div>
                <h3 className="text-2xl font-extrabold text-gray-900">Shopping List</h3>
                <p className="text-gray-700">Missing {shoppingList.length} ingredient{shoppingList.length !== 1 ? 's' : ''}</p>
              </div>
      </div>

            <div className="bg-gradient-to-br from-gray-50 to-emerald-50 rounded-2xl p-6 mb-6 border border-gray-100">
              <ul className="space-y-3">
                {shoppingList.map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 bg-emerald-600 rounded-full shadow-sm"></div>
                    <span className="font-semibold text-gray-900 capitalize text-base">{item.name}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <button 
                onClick={copyShoppingList}
                className="w-full bg-white hover:bg-gray-50 text-gray-900 rounded-2xl px-6 py-4 font-bold transition-all duration-300 border-2 border-gray-200 hover:border-gray-300 hover:shadow-md"
              >
                Copy List
              </button>
              <a
                href={`https://www.instacart.com/store/partner?ingredients=${encodeURIComponent(shoppingList.map(item => item.name).join(','))}&ref=mealsnap`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-2xl px-6 py-4 font-bold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 text-center block"
              >
                Add to Instacart
              </a>
            </div>
          </div>
        )}
      </main>

      {/* Floating Action Button */}
      <button
        onClick={() => setCurrentView('home')}
        className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 z-50"
        aria-label="New Scan"
      >
        <Camera className="w-7 h-7" />
      </button>

      {/* Share Card Modal */}
      {showShareCard && sharedRecipe && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 relative animate-in fade-in zoom-in duration-300">
                  <button 
              onClick={() => setShowShareCard(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-100"
                  >
              <X className="w-5 h-5" />
                  </button>
            
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-green-100 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <Heart className="w-8 h-8 text-emerald-600 fill-current" />
              </div>
              <h3 className="text-2xl font-extrabold text-gray-900 mb-2">Recipe Saved! 🎉</h3>
              <p className="text-gray-700 mb-1">Share and get <span className="font-bold text-emerald-600">5 free scans</span> for you and your friend!</p>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-4 mb-6 border-2 border-emerald-200">
              <p className="text-sm text-gray-600 mb-2 font-semibold">Share this recipe:</p>
              <p className="text-base font-bold text-gray-900">{sharedRecipe.title}</p>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleShare}
                className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-2xl px-6 py-4 font-bold text-lg transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 flex items-center justify-center gap-2"
              >
                <span>Share Recipe</span>
              </button>
              <button
                onClick={() => setShowShareCard(false)}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl px-6 py-3 font-semibold transition-colors"
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Capture Modal (after first recipe) */}
      {showEmailModal && !emailSubmitted && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 relative">
            <button
              onClick={() => setShowEmailModal(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-green-100 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <Mail className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-2xl font-extrabold text-gray-900 mb-2">Love it? Get your recipes emailed to you</h3>
              <p className="text-gray-700">We'll send you a copy of these recipes plus new ones weekly</p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleEmailSubmit(emailInput, 'modal')
              }}
              className="space-y-4"
            >
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none text-base"
                required
              />
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-xl px-6 py-3 font-bold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
              >
                Get Recipes Emailed
              </button>
              <button
                type="button"
                onClick={() => setShowEmailModal(false)}
                className="w-full text-gray-600 hover:text-gray-700 text-sm font-medium"
              >
                Maybe Later
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Email Gate Modal (after 3 scans) */}
      {showEmailGate && !emailSubmitted && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4"
          onClick={(e) => {
            // Close modal when clicking backdrop
            if (e.target === e.currentTarget) {
              setShowEmailGate(false)
            }
          }}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 relative z-[71]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowEmailGate(false)
              }}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-100 z-[72]"
              type="button"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-green-100 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <Mail className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-2xl font-extrabold text-gray-900 mb-2">You've used your free scans!</h3>
              <p className="text-gray-700 mb-1">Enter your email to get <span className="font-bold text-emerald-600">2 more free scans</span></p>
      </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleEmailSubmit(emailInput, 'gate')
              }}
              className="space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="email"
                value={emailInput}
                onChange={(e) => {
                  e.stopPropagation()
                  setEmailInput(e.target.value)
                }}
                placeholder="your@email.com"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none text-base z-[72] relative"
                required
                autoFocus
              />
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-xl px-6 py-3 font-bold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 z-[72] relative"
              >
                Get 2 More Scans
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowEmailGate(false)
                  setShowPricingModal(true)
                }}
                className="w-full text-gray-600 hover:text-gray-700 text-sm font-medium z-[72] relative"
              >
                Or upgrade to Pro
              </button>
              {/* Founder bypass - hidden button that can be triggered */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  // Enable founder mode (unlimited scans)
                  localStorage.setItem('mealsnap_founder', 'true')
                  setUserPlan('pro')
                  localStorage.setItem('mealsnap_plan', 'pro')
                  setShowEmailGate(false)
                  alert('Founder mode enabled! Unlimited scans activated.')
                }}
                className="w-full text-xs text-gray-400 hover:text-gray-500 mt-2 opacity-0 hover:opacity-100 transition-opacity"
                title="Founder bypass - double click to enable"
                onDoubleClick={(e) => {
                  e.stopPropagation()
                  localStorage.setItem('mealsnap_founder', 'true')
                  setUserPlan('pro')
                  localStorage.setItem('mealsnap_plan', 'pro')
                  setShowEmailGate(false)
                  alert('Founder mode enabled! Unlimited scans activated.')
                }}
              >
                Founder? Double-click here
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Pricing Modal */}
      {showPricingModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-8 relative">
            <button
              onClick={() => setShowPricingModal(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-green-100 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <MealSnapLogo className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-extrabold text-gray-900 mb-2">Upgrade to Pro</h3>
              <p className="text-gray-700">You've used your 3 free scans this week</p>
            </div>

            <div className="space-y-3 mb-6">
              {/* Free Plan */}
              <div className={`border-2 rounded-2xl p-4 ${userPlan === 'free' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="font-extrabold text-gray-900">Free</h4>
                    <p className="text-sm text-gray-600">3 meal plans/week</p>
                  </div>
                  <span className="text-2xl font-extrabold text-gray-900">$0</span>
                </div>
                {userPlan === 'free' && (
                  <span className="text-xs font-semibold text-emerald-600">Current Plan</span>
                )}
              </div>

              {/* Pro Plan */}
              <div className={`border-2 rounded-2xl p-4 ${userPlan === 'pro' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-emerald-300 cursor-pointer'} transition-colors`}
                onClick={() => {
                  setUserPlan('pro')
                  localStorage.setItem('mealsnap_plan', 'pro')
                  setShowPricingModal(false)
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="font-extrabold text-gray-900">Pro</h4>
                    <p className="text-sm text-gray-600">Unlimited scans + affiliate links</p>
                  </div>
                  <span className="text-2xl font-extrabold text-emerald-600">$3.99<span className="text-sm font-normal text-gray-600">/mo</span></span>
                </div>
                {userPlan === 'pro' && (
                  <span className="text-xs font-semibold text-emerald-600">Current Plan</span>
                )}
              </div>

              {/* Family Plan */}
              <div className={`border-2 rounded-2xl p-4 ${userPlan === 'family' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-emerald-300 cursor-pointer'} transition-colors`}
                onClick={() => {
                  setUserPlan('family')
                  localStorage.setItem('mealsnap_plan', 'family')
                  setShowPricingModal(false)
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="font-extrabold text-gray-900">Family</h4>
                    <p className="text-sm text-gray-600">5 people + shared lists</p>
                  </div>
                  <span className="text-2xl font-extrabold text-emerald-600">$7.99<span className="text-sm font-normal text-gray-600">/mo</span></span>
                </div>
                {userPlan === 'family' && (
                  <span className="text-xs font-semibold text-emerald-600">Current Plan</span>
                )}
              </div>
            </div>

            <button
              onClick={() => setShowPricingModal(false)}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl px-6 py-3 font-semibold transition-colors"
            >
              Maybe Later
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function RecipeCard({ 
  recipe, 
  onToggleFavorite, 
  isFavorite 
}: { 
  recipe: Recipe
  onToggleFavorite: (recipe: Recipe) => void
  isFavorite: boolean
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [userId, setUserId] = useState<string>('')

  React.useEffect(() => {
    const id = localStorage.getItem('mealsnap_user_id')
    if (id) setUserId(id)
  }, [])

  const handleShareRecipe = async () => {
    const shareText = `I just made ${recipe.title} from my fridge with MealSnap! Try it free: https://mealsnap-o6mndxvie-peter-hallanders-projects.vercel.app?ref=${userId}`
    const shareUrl = `https://mealsnap-o6mndxvie-peter-hallanders-projects.vercel.app?ref=${userId}`

    try {
      if (navigator.share) {
        await navigator.share({
          title: 'MealSnap Recipe',
          text: shareText,
          url: shareUrl,
        })
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(shareText)
        alert('Link copied to clipboard! Share it anywhere.')
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        // Fallback to clipboard on error
        try {
          await navigator.clipboard.writeText(shareText)
          alert('Link copied to clipboard!')
        } catch (clipboardErr) {
          console.error('Clipboard error:', clipboardErr)
        }
      }
    }
  }
  
  const mealColors: Record<string, string> = {
    breakfast: 'from-orange-400 to-amber-500',
    lunch: 'from-emerald-400 to-green-500',
    dinner: 'from-purple-500 to-indigo-600',
    snack: 'from-pink-400 to-rose-500'
  }

  const needToBuy = recipe.youNeedToBuy || []
  const hasMissingItems = needToBuy.length > 0

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
      <div className={`bg-gradient-to-r ${mealColors[recipe.mealType] || mealColors.lunch} p-6 sm:p-8 text-white relative`}>
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
          backgroundSize: '24px 24px'
        }}></div>
        
        <button
          onClick={() => onToggleFavorite(recipe)}
          className="absolute top-4 right-4 w-11 h-11 bg-white/25 hover:bg-white/35 backdrop-blur-sm rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 z-10"
          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''} transition-all duration-300`} />
        </button>
        
        <div className="mb-4 relative z-10">
          <span className="inline-block px-4 py-1.5 bg-white/30 backdrop-blur-sm rounded-full text-xs font-extrabold uppercase tracking-wide mb-4 border border-white/40 shadow-sm">
            {recipe.mealType}
          </span>
          <h3 className="text-2xl sm:text-3xl font-extrabold leading-tight">{recipe.title}</h3>
        </div>
        
        <div className="flex items-center gap-4 flex-wrap relative z-10">
          <div className="flex items-center gap-2 bg-white/25 backdrop-blur-sm px-4 py-2.5 rounded-xl border border-white/30 shadow-sm">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-bold">{recipe.timeMinutes} min</span>
          </div>
          <div className="flex items-center gap-2 bg-white/25 backdrop-blur-sm px-4 py-2.5 rounded-xl border border-white/30 shadow-sm">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm font-bold capitalize">{recipe.difficulty}</span>
          </div>
        </div>
      </div>

      <div className="p-6 sm:p-8">
        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-5 border-2 border-emerald-200 shadow-sm">
            <h4 className="font-extrabold text-emerald-900 mb-2 flex items-center gap-2 text-base">
              <Check className="w-5 h-5 text-emerald-600" />
              You have ({recipe.youAlreadyHave?.length || 0})
            </h4>
            <p className="text-sm text-emerald-800 capitalize leading-relaxed font-medium">
              {recipe.youAlreadyHave?.join(', ') || 'None'}
            </p>
          </div>
          
          {hasMissingItems ? (
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-5 border-2 border-orange-200 shadow-sm">
              <h4 className="font-extrabold text-orange-900 mb-2 flex items-center gap-2 text-base">
                <ShoppingCart className="w-5 h-5 text-orange-600" />
                You need ({needToBuy.length})
              </h4>
              <p className="text-sm text-orange-800 capitalize leading-relaxed font-medium">{needToBuy.join(', ')}</p>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-5 border-2 border-green-200 flex items-center justify-center shadow-sm">
              <p className="text-green-700 font-extrabold flex items-center gap-2 text-base">
                <Check className="w-5 h-5" />
                Everything ready!
              </p>
            </div>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-3 mb-4">
          <button
            onClick={handleShareRecipe}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-2xl px-6 py-3.5 font-bold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 flex items-center justify-center gap-2"
          >
            <Share2 className="w-4 h-4" />
            Share Recipe 🔗
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 rounded-2xl px-6 py-3.5 font-bold text-gray-700 transition-all duration-300 border-2 border-gray-200 hover:border-gray-300 hover:shadow-md"
          >
            {isExpanded ? 'Hide' : 'Show'} cooking steps
          </button>
        </div>

        {isExpanded && recipe.steps && (
          <div className="mt-6 space-y-4">
            {recipe.steps.map((step, i) => (
              <div key={i} className="flex gap-4">
                <div className="flex-shrink-0 w-11 h-11 bg-gradient-to-br from-emerald-100 to-green-100 rounded-2xl flex items-center justify-center border-2 border-emerald-200 shadow-sm">
                  <span className="text-base font-extrabold text-emerald-700">{i + 1}</span>
                </div>
                <p className="text-gray-700 pt-2 leading-relaxed font-medium">{step}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
