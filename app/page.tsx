'use client'

import React, { useState, useEffect } from 'react'
import { Camera, Upload, X, Plus, ShoppingCart, Loader2, Clock, TrendingUp, AlertCircle, Check, Home, ArrowRight, Heart, User, Share2, Sparkles, Mail, List } from 'lucide-react'
import { MealSnapLogo } from '@/components/mealsnap-logo'
import { Button } from '@/components/ui/button'

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
      const founderMode = urlParams.get('founder')
      
      // Admin bypass: ?founder=true enables unlimited scans
      if (founderMode === 'true') {
        localStorage.setItem('mealsnap_founder', 'true')
        localStorage.setItem('mealsnap_plan', 'pro')
        setUserPlan('pro')
        console.log('✅ Founder mode enabled via URL parameter')
        // Remove the parameter from URL for cleaner sharing
        window.history.replaceState({}, '', window.location.pathname)
      }
      
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

  // Detect mobile device
  const isMobile = typeof window !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

  // Compress and resize image before upload - more aggressive on mobile
  const compressImage = (file: File, maxWidth?: number, maxHeight?: number, quality?: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      // Mobile devices need more aggressive compression
      const defaultMaxWidth = isMobile ? 1280 : 1920
      const defaultMaxHeight = isMobile ? 1280 : 1920
      const defaultQuality = isMobile ? 0.7 : 0.8
      const maxSizeLimit = isMobile ? 3 * 1024 * 1024 : 4.5 * 1024 * 1024 // 3MB for mobile, 4.5MB for desktop
      
      const finalMaxWidth = maxWidth ?? defaultMaxWidth
      const finalMaxHeight = maxHeight ?? defaultMaxHeight
      const finalQuality = quality ?? defaultQuality
      
      console.log('[MealSnap] compressImage called:', file.name, file.size, 'bytes', isMobile ? '(mobile)' : '(desktop)')
      
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
            if (width > finalMaxWidth) {
              height = (height * finalMaxWidth) / width
              width = finalMaxWidth
            }
          } else {
            if (height > finalMaxHeight) {
              width = (width * finalMaxHeight) / height
              height = finalMaxHeight
            }
          }

          console.log('[MealSnap] Resizing to:', width, 'x', height, 'quality:', finalQuality)

          canvas.width = width
          canvas.height = height

          const ctx = canvas.getContext('2d')
          if (!ctx) {
            console.error('[MealSnap] Could not get canvas context')
            reject(new Error('Could not get canvas context'))
            return
          }

          // Better image quality settings for compression
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = 'high'
          ctx.drawImage(img, 0, 0, width, height)
          
          // Convert to base64 with compression
          const base64 = canvas.toDataURL('image/jpeg', finalQuality)
          const base64Data = base64.split(',')[1]
          
          // Check if compressed size is still too large
          const sizeInBytes = (base64Data.length * 3) / 4
          console.log('[MealSnap] Compressed size:', sizeInBytes, 'bytes (', (sizeInBytes / 1024 / 1024).toFixed(2), 'MB)', 'limit:', (maxSizeLimit / 1024 / 1024).toFixed(2), 'MB')
          
          if (sizeInBytes > maxSizeLimit) {
            // Try again with lower quality or smaller dimensions
            if (finalQuality > 0.5) {
              console.log('[MealSnap] Still too large, retrying with lower quality:', finalQuality - 0.1)
              resolve(compressImage(file, finalMaxWidth, finalMaxHeight, finalQuality - 0.1))
            } else if (finalMaxWidth > 800) {
              // If quality is already low, try smaller dimensions
              console.log('[MealSnap] Still too large, retrying with smaller dimensions')
              resolve(compressImage(file, finalMaxWidth * 0.8, finalMaxHeight * 0.8, 0.6))
            } else {
              console.error('[MealSnap] Image too large even after compression')
              reject(new Error('Image is too large even after compression. Please use a smaller image or take a new photo.'))
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
        // Handle 413 specifically with better mobile messaging
        if (response.status === 413) {
          const errorMsg = isMobile 
            ? 'Image is too large for mobile upload. Try taking a new photo or use a smaller image from your gallery.'
            : 'Image is too large. Please try a smaller image or take a new photo.'
          setError(errorMsg)
          setIsLoading(false)
          
          // Track 413 errors
          if (typeof window !== 'undefined' && (window as any).plausible) {
            (window as any).plausible('Upload Error 413', { props: { device: isMobile ? 'mobile' : 'desktop', fileSize: file.size } })
          }
          return
        }
        
        const errorData = await response.json().catch(() => ({}))
        console.error('[MealSnap] API error:', errorData)
        
        // Better error messages for mobile
        let errorMessage = errorData.error || `Server error: ${response.status}`
        if (isMobile && response.status >= 500) {
          errorMessage = 'Network error on mobile. Please check your connection and try again.'
        }
        
        throw new Error(errorMessage)
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

  // Sticky Header Component - Matching Lovable Navbar
  const StickyHeader = () => {
    const scansRemaining = userPlan === 'free' ? Math.max(0, 3 - scanCount) : '∞'
    
    return (
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => setCurrentView('home')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-cyan to-teal rounded-xl flex items-center justify-center shadow-lg">
              <Camera className="w-6 h-6 text-white" />
        </div>
            <span className="text-xl font-bold text-gradient">MealSnap</span>
          </button>

          <div className="hidden md:flex items-center gap-6">
            {userPlan === 'free' && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/20 border border-primary/30 rounded-lg">
                <span className="text-xs font-semibold text-primary">
                  {scansRemaining}/3 scans
                </span>
      </div>
            )}
            
            {userPlan === 'free' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setShowPricingModal(true)
                }}
              >
                Upgrade to Pro
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentView('home')}
            >
              New Scan
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentView('favorites')}
              className="relative"
            >
              Favorites
              {favorites.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-emerald-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
                  {favorites.length}
                </span>
              )}
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <a href="/waitlist">Waitlist</a>
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="glass" size="icon" className="md:hidden">
              <List className="w-5 h-5" />
            </Button>
            <Button variant="glass" size="icon">
              <User className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </nav>
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
      <nav className="flex items-center gap-2 text-sm text-[#B8D4D4] mb-4">
        <button
          onClick={() => setCurrentView('home')}
          className="hover:text-emerald-400 transition-colors"
        >
          {breadcrumbs.home.label}
        </button>
        {currentView !== 'home' && (
          <>
            <ArrowRight className="w-4 h-4" />
                  <button 
              onClick={() => setCurrentView('ingredients')}
              className={`hover:text-emerald-400 transition-colors ${
                currentView === 'ingredients' ? 'text-emerald-400 font-semibold' : ''
              }`}
            >
              {breadcrumbs.ingredients.label}
                  </button>
          </>
        )}
        {currentView === 'recipes' && (
          <>
            <ArrowRight className="w-4 h-4" />
            <span className="text-emerald-400 font-semibold">{breadcrumbs.recipes.label}</span>
          </>
        )}
      </nav>
    )
  }

  // HOME VIEW
  if (currentView === 'home') {
    return (
      <div className="min-h-screen bg-background">
        <StickyHeader />
        
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20">
          {/* Hero Section - Matching Lovable Design */}
          <section className="relative min-h-[calc(100vh-5rem)] flex items-center justify-center overflow-hidden">
            {/* Background gradient glow */}
            <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/30 to-background" />
            <div 
              className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-96 opacity-30"
              style={{ 
                background: 'radial-gradient(circle at 50% 0%, hsl(185 100% 50% / 0.2), transparent 70%)' 
              }}
            />
            
            <div className="container mx-auto px-4 py-32 relative z-10">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                {/* Left content */}
                <div className="space-y-8 animate-fade-in">
                  <div className="inline-block glass px-4 py-2 rounded-full text-sm text-primary animate-glow-pulse">
                    ✨ Powered by AI
                  </div>
                  
                  <h1 className="text-5xl lg:text-7xl font-bold leading-tight">
                    Stop wasting food.{" "}
                    <span className="text-gradient">Start cooking</span>{" "}
                    what you have.
                  </h1>
                  
                  <p className="text-lg text-muted-foreground max-w-xl">
                    Snap your fridge, get <span className="text-primary font-semibold">6-8 recipes</span> you can make tonight. 
                    Missing something? Add to cart in <span className="text-accent font-semibold">1 tap</span>.
                  </p>
                  
                  <div className="grid sm:grid-cols-2 gap-4">
                    {[
                      "No more \"what's for dinner?\" stress",
                      "Use ingredients before they expire",
                      "Save $200/month on food waste",
                      "One-tap grocery delivery for anything missing"
                    ].map((benefit, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="w-4 h-4 text-primary" />
            </div>
                        <span className="text-sm text-foreground/90">{benefit}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex flex-wrap gap-4">
                    <Button 
                      variant="hero" 
                      size="lg" 
                      className="group"
                      onClick={() => {
                        const scanCard = document.querySelector('[data-scan-card]');
                        scanCard?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }}
                    >
                      Get Started
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="lg"
                      onClick={() => {
                        const stepsSection = document.querySelector('[data-steps-section]');
                        stepsSection?.scrollIntoView({ behavior: 'smooth' });
                      }}
                    >
                      See How It Works
                    </Button>
                  </div>
                </div>
                
                {/* Right image */}
                <div className="relative animate-fade-in" style={{ animationDelay: '0.2s' }}>
                  <div className="relative rounded-3xl overflow-hidden shadow-2xl glow">
                    <img 
                      src="https://futuro-meal-muse.lovable.app/assets/hero-image-BzJPPt3O.jpg" 
                      alt="Fresh colorful ingredients in space"
                      className="w-full h-auto"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/50 to-transparent" />
                  </div>
                  
                  {/* Floating stats card */}
                  <div className="absolute -bottom-6 -left-6 glass p-6 rounded-2xl shadow-xl max-w-xs">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <Camera className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-gradient">10s</div>
                        <div className="text-sm text-muted-foreground">Photo to Recipe</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {error && (
            <div className="max-w-2xl mx-auto mb-6 bg-red-500/20 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-300">{error}</p>
              </div>
              <button onClick={() => setError('')} className="text-red-400 hover:text-red-300">
                <X className="w-4 h-4" />
                  </button>
            </div>
          )}

          {/* Scan Card - Dark Theme */}
          <div data-scan-card className="relative max-w-2xl mx-auto bg-[#151828]/40 backdrop-blur-sm rounded-3xl border border-[#1F2332] p-10 sm:p-14 mb-20 transform transition-all duration-300 hover:border-[#2A2F45]">
            <div className="text-center mb-10">
              <div className="w-24 h-24 bg-gradient-to-br from-emerald-500 to-green-500 rounded-3xl mx-auto mb-8 flex items-center justify-center shadow-lg transform transition-transform duration-300 hover:scale-110">
                <Camera className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-[#E6FFFF] mb-3 tracking-tight">Scan Your Pantry</h2>
              <p className="text-lg text-[#B8D4D4] font-medium">Take a photo or upload an image of your ingredients</p>
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
                <div className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-2xl px-8 py-5 font-bold text-lg cursor-pointer transition-all duration-300 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 min-h-[56px]">
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
                <div className="w-full bg-[#1F2332] border-2 border-[#2A2F45] hover:border-emerald-500/50 hover:bg-[#2A2F45] text-[#E6FFFF] rounded-2xl px-8 py-5 font-semibold text-lg cursor-pointer transition-all duration-300 flex items-center justify-center gap-3 shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] min-h-[56px]">
                  <Upload className="w-6 h-6 text-emerald-400" />
                  <span>Choose from Gallery</span>
                </div>
              </label>

              <div className="text-center pt-4">
              <button
                  onClick={() => {
                    setIngredients([])
                    setCurrentView('ingredients')
                  }}
                  className="text-sm text-emerald-400 hover:text-emerald-300 font-semibold hover:underline transition-colors"
                >
                  Or add ingredients manually →
              </button>
            </div>
          </div>
        </div>

          {/* Three Steps Section - Dark Theme */}
          <section data-steps-section className="relative py-24 px-6 overflow-hidden">
            <div className="relative z-10 max-w-6xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#E6FFFF] mb-4 tracking-tight">
                  Three Steps to Your Perfect Meal
                </h2>
                <p className="text-xl text-[#B8D4D4] font-medium max-w-2xl mx-auto">
                  It's as simple as snap, detect, and cook
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                {/* Step 01: Snap Your Pantry */}
                <div className="bg-[#151828]/40 backdrop-blur-sm rounded-2xl p-8 border border-[#1F2332] hover:border-[#2A2F45] transition-all duration-300 hover:-translate-y-2 group">
                  <div className="text-6xl font-black bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent mb-4">01</div>
                  <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-green-500 rounded-2xl flex items-center justify-center mb-6 transform transition-transform duration-300 group-hover:scale-110 shadow-md">
                    <Camera className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-[#E6FFFF] mb-3 tracking-tight">Snap Your Pantry</h3>
                  <p className="text-[#B8D4D4] leading-relaxed font-medium">
                    Take a quick photo of your fridge or pantry shelves with your phone camera
                  </p>
                </div>

                {/* Step 02: AI Detection */}
                <div className="bg-[#151828]/40 backdrop-blur-sm rounded-2xl p-8 border border-[#1F2332] hover:border-[#2A2F45] transition-all duration-300 hover:-translate-y-2 group">
                  <div className="text-6xl font-black bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent mb-4">02</div>
                  <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-green-500 rounded-2xl flex items-center justify-center mb-6 transform transition-transform duration-300 group-hover:scale-110 shadow-md">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-[#E6FFFF] mb-3 tracking-tight">AI Detection</h3>
                  <p className="text-[#B8D4D4] leading-relaxed font-medium">
                    Our AI analyzes your photo and automatically identifies all available ingredients
                  </p>
                </div>

                {/* Step 03: Get Recipes */}
                <div className="bg-[#151828]/40 backdrop-blur-sm rounded-2xl p-8 border border-[#1F2332] hover:border-[#2A2F45] transition-all duration-300 hover:-translate-y-2 group">
                  <div className="text-6xl font-black bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent mb-4">03</div>
                  <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-green-500 rounded-2xl flex items-center justify-center mb-6 transform transition-transform duration-300 group-hover:scale-110 shadow-md">
                    <MealSnapLogo className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-bold text-[#E6FFFF] mb-3 tracking-tight">Get Recipes</h3>
                  <p className="text-[#B8D4D4] leading-relaxed font-medium">
                    Receive 6-8 personalized recipes you can make right now with what you have
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Features Section - Dark Theme */}
          <section className="relative py-24 px-6 mb-16">
            <div className="relative z-10 max-w-7xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#E6FFFF] mb-4 tracking-tight">
                  Everything You Need to Cook Smarter
                </h2>
                <p className="text-xl text-[#B8D4D4] max-w-3xl mx-auto font-medium">
                  MealSnap combines cutting-edge AI with beautiful design to revolutionize your cooking experience
                </p>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                {/* Smart Pantry Scanning */}
                <div className="bg-[#151828]/40 backdrop-blur-sm rounded-2xl p-8 border border-[#1F2332] hover:border-[#2A2F45] transition-all duration-300 hover:-translate-y-1 group">
                  <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-green-500 rounded-2xl flex items-center justify-center mb-6 transform transition-transform duration-300 group-hover:scale-110 shadow-md">
                    <Camera className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="font-bold text-[#E6FFFF] text-xl mb-3 tracking-tight">Smart Pantry Scanning</h3>
                  <p className="text-base text-[#B8D4D4] leading-relaxed font-medium">
                    Take a photo or upload an image of your ingredients. Our AI instantly detects what you have.
                  </p>
                </div>

                {/* AI Recipe Generation */}
                <div className="bg-[#151828]/40 backdrop-blur-sm rounded-2xl p-8 border border-[#1F2332] hover:border-[#2A2F45] transition-all duration-300 hover:-translate-y-1 group">
                  <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-2xl flex items-center justify-center mb-6 transform transition-transform duration-300 group-hover:scale-110 shadow-md">
                    <Sparkles className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="font-bold text-[#E6FFFF] text-xl mb-3 tracking-tight">AI Recipe Generation</h3>
                  <p className="text-base text-[#B8D4D4] leading-relaxed font-medium">
                    Get 6-8 personalized recipes based on your available ingredients in seconds.
                  </p>
                </div>

                {/* Save Your Favorites */}
                <div className="bg-[#151828]/40 backdrop-blur-sm rounded-2xl p-8 border border-[#1F2332] hover:border-[#2A2F45] transition-all duration-300 hover:-translate-y-1 group">
                  <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-green-500 rounded-2xl flex items-center justify-center mb-6 transform transition-transform duration-300 group-hover:scale-110 shadow-md">
                    <Heart className="w-7 h-7 text-white fill-white" />
                  </div>
                  <h3 className="font-bold text-[#E6FFFF] text-xl mb-3 tracking-tight">Save Your Favorites</h3>
                  <p className="text-base text-[#B8D4D4] leading-relaxed font-medium">
                    Love a recipe? Save it to your favorites and access it anytime you want.
                  </p>
                </div>

                {/* Smart Shopping Lists */}
                <div className="bg-[#151828]/40 backdrop-blur-sm rounded-2xl p-8 border border-[#1F2332] hover:border-[#2A2F45] transition-all duration-300 hover:-translate-y-1 group">
                  <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-2xl flex items-center justify-center mb-6 transform transition-transform duration-300 group-hover:scale-110 shadow-md">
                    <ShoppingCart className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="font-bold text-[#E6FFFF] text-xl mb-3 tracking-tight">Smart Shopping Lists</h3>
                  <p className="text-base text-[#B8D4D4] leading-relaxed font-medium">
                    Missing ingredients? We automatically generate a shopping list for you.
                  </p>
                </div>

                {/* Quick & Easy */}
                <div className="bg-[#151828]/40 backdrop-blur-sm rounded-2xl p-8 border border-[#1F2332] hover:border-[#2A2F45] transition-all duration-300 hover:-translate-y-1 group">
                  <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-green-500 rounded-2xl flex items-center justify-center mb-6 transform transition-transform duration-300 group-hover:scale-110 shadow-md">
                    <Clock className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="font-bold text-[#E6FFFF] text-xl mb-3 tracking-tight">Quick & Easy</h3>
                  <p className="text-base text-[#B8D4D4] leading-relaxed font-medium">
                    From photo to recipe in under 10 seconds. Cooking has never been this fast.
                  </p>
                </div>

                {/* Community Recipes */}
                <div className="bg-[#151828]/40 backdrop-blur-sm rounded-2xl p-8 border border-[#1F2332] hover:border-[#2A2F45] transition-all duration-300 hover:-translate-y-1 group">
                  <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-2xl flex items-center justify-center mb-6 transform transition-transform duration-300 group-hover:scale-110 shadow-md">
                    <User className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="font-bold text-[#E6FFFF] text-xl mb-3 tracking-tight">Community Recipes</h3>
                  <p className="text-base text-[#B8D4D4] leading-relaxed font-medium">
                    Share your creations and discover recipes from our growing community.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    )
  }

  // FAVORITES VIEW
  if (currentView === 'favorites') {
    return (
      <div className="min-h-screen bg-[#0B0E1E]">
        <StickyHeader />
        
        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-[#E6FFFF] mb-2">My Favorites</h1>
            <p className="text-[#B8D4D4]">
              {favorites.length === 0
                ? "You haven't saved any recipes yet"
                : `${favorites.length} saved recipe${favorites.length !== 1 ? 's' : ''}`}
              </p>
            </div>

          {favorites.length === 0 ? (
            <div className="bg-[#151828]/40 backdrop-blur-sm rounded-3xl border border-[#1F2332] shadow-xl p-12 text-center">
              <div className="inline-flex items-center justify-center mb-6">
                <MealSnapLogo className="w-20 h-20 opacity-50" />
              </div>
              <Heart className="w-16 h-16 text-[#B8D4D4] mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-[#E6FFFF] mb-2">No favorites yet</h3>
              <p className="text-[#B8D4D4] mb-6 text-lg">Save recipes you love!</p>
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
      <div className="min-h-screen bg-[#0B0E1E]">
        <StickyHeader />
        
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
          <BreadcrumbNav />
          
          <div className="mb-6">
            <button
              onClick={() => setCurrentView('home')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#151828]/40 hover:bg-[#1F2332] text-[#E6FFFF] rounded-xl font-medium transition-all duration-300 border border-[#1F2332] mb-4 hover:border-[#2A2F45]"
            >
              <Home className="w-4 h-4" />
              Back to Home
            </button>
            <h1 className="text-3xl sm:text-4xl font-bold text-[#E6FFFF] mb-2">Your Ingredients</h1>
            <p className="text-[#B8D4D4]">Review and edit detected items</p>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 mb-6 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-300">{error}</p>
              </div>
              <button onClick={() => setError('')} className="text-red-400 hover:text-red-300">
                <X className="w-4 h-4" />
              </button>
        </div>
          )}

          <div className="bg-[#151828]/40 backdrop-blur-sm rounded-3xl border border-[#1F2332] shadow-xl p-6 sm:p-10">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-500/20 to-green-500/20 rounded-2xl flex items-center justify-center shadow-md border border-emerald-500/30">
                <ShoppingCart className="w-7 h-7 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-bold text-[#E6FFFF] text-xl">
                  {ingredients.length > 0 ? `Detected ${ingredients.length} ingredients` : 'No ingredients yet'}
                </h3>
                <p className="text-sm text-[#B8D4D4]">
                  {ingredients.length > 0 ? 'Tap × to remove or add more below' : 'Add ingredients to get started'}
                </p>
              </div>
            </div>

            {ingredients.length > 0 && (
              <div className="flex flex-wrap gap-3 mb-8">
                {ingredients.map((ingredient) => (
                  <div
                    key={ingredient}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-full"
                  >
                    <span className="text-sm font-medium text-emerald-300 capitalize">{ingredient}</span>
                    <button
                      onClick={() => removeIngredient(ingredient)}
                      className="w-5 h-5 bg-emerald-500/30 hover:bg-emerald-500/40 rounded-full flex items-center justify-center transition-colors"
                    >
                      <X className="w-3 h-3 text-emerald-300" />
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
                className="flex-1 px-4 py-3 bg-[#1F2332] border border-[#2A2F45] rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 focus:outline-none text-base text-[#E6FFFF] placeholder:text-[#B8D4D4]"
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
    <div className="min-h-screen bg-[#0B0E1E] pb-20">
      <StickyHeader />
      
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
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
            className="text-sm text-emerald-400 hover:text-emerald-300 font-semibold hover:underline transition-colors"
          >
            ← Edit ingredients
          </button>
        </div>
        
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-[#E6FFFF] mb-2">Your Recipes</h1>
          <p className="text-[#B8D4D4] text-lg">Found {recipes.length} delicious recipe{recipes.length !== 1 ? 's' : ''} you can make</p>
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
          <div className="mt-8 bg-[#151828]/40 backdrop-blur-sm rounded-3xl border border-[#1F2332] shadow-xl p-6 sm:p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-2xl flex items-center justify-center shadow-md border border-blue-500/30">
                <ShoppingCart className="w-7 h-7 text-blue-400" />
              </div>
            <div>
                <h3 className="text-2xl font-bold text-[#E6FFFF]">Shopping List</h3>
                <p className="text-[#B8D4D4]">Missing {shoppingList.length} ingredient{shoppingList.length !== 1 ? 's' : ''}</p>
              </div>
      </div>

            <div className="bg-[#1F2332] rounded-2xl p-6 mb-6 border border-[#2A2F45]">
              <ul className="space-y-3">
                {shoppingList.map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-sm"></div>
                    <span className="font-semibold text-[#E6FFFF] capitalize text-base">{item.name}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <button 
                onClick={copyShoppingList}
                className="w-full bg-[#1F2332] hover:bg-[#2A2F45] text-[#E6FFFF] rounded-2xl px-6 py-4 font-bold transition-all duration-300 border-2 border-[#2A2F45] hover:border-[#3A3F55] hover:shadow-md"
              >
                Copy List
              </button>
              <a
                href={`https://www.instacart.com/store?search=${encodeURIComponent(shoppingList.map(item => item.name).join(' '))}`}
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
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4"
          onClick={(e) => {
            // Close modal when clicking backdrop
            if (e.target === e.currentTarget) {
              setShowPricingModal(false)
            }
          }}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-8 relative z-[71] max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setShowPricingModal(false)
              }}
              className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-100 z-[72] touch-manipulation"
              type="button"
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
              <div className={`border-2 rounded-2xl p-4 ${userPlan === 'pro' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-emerald-300 cursor-pointer'} transition-colors touch-manipulation`}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
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
              <div className={`border-2 rounded-2xl p-4 ${userPlan === 'family' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-emerald-300 cursor-pointer'} transition-colors touch-manipulation`}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
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
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setShowPricingModal(false)
              }}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl px-6 py-3 font-semibold transition-colors touch-manipulation min-h-[48px]"
              type="button"
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
    <div className="bg-[#151828]/40 backdrop-blur-sm rounded-3xl border border-[#1F2332] shadow-xl overflow-hidden hover:border-[#2A2F45] transition-all duration-300 hover:-translate-y-1">
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
          <span className="inline-block px-4 py-1.5 bg-white/30 backdrop-blur-sm rounded-full text-xs font-bold uppercase tracking-wide mb-4 border border-white/40 shadow-sm">
            {recipe.mealType}
          </span>
          <h3 className="text-2xl sm:text-3xl font-bold leading-tight">{recipe.title}</h3>
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
          <div className="bg-emerald-500/20 border-2 border-emerald-500/30 rounded-2xl p-5 shadow-sm">
            <h4 className="font-bold text-emerald-300 mb-2 flex items-center gap-2 text-base">
              <Check className="w-5 h-5 text-emerald-400" />
              You have ({recipe.youAlreadyHave?.length || 0})
            </h4>
            <p className="text-sm text-emerald-200 capitalize leading-relaxed font-medium">
              {recipe.youAlreadyHave?.join(', ') || 'None'}
            </p>
          </div>
          
          {hasMissingItems ? (
            <div className="bg-orange-500/20 border-2 border-orange-500/30 rounded-2xl p-5 shadow-sm">
              <h4 className="font-bold text-orange-300 mb-2 flex items-center gap-2 text-base">
                <ShoppingCart className="w-5 h-5 text-orange-400" />
                You need ({needToBuy.length})
              </h4>
              <p className="text-sm text-orange-200 capitalize leading-relaxed font-medium">{needToBuy.join(', ')}</p>
            </div>
          ) : (
            <div className="bg-green-500/20 border-2 border-green-500/30 rounded-2xl p-5 flex items-center justify-center shadow-sm">
              <p className="text-green-300 font-bold flex items-center gap-2 text-base">
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
            className="w-full bg-[#1F2332] hover:bg-[#2A2F45] rounded-2xl px-6 py-3.5 font-bold text-[#E6FFFF] transition-all duration-300 border-2 border-[#2A2F45] hover:border-[#3A3F55] hover:shadow-md"
          >
            {isExpanded ? 'Hide' : 'Show'} cooking steps
          </button>
        </div>

        {isExpanded && recipe.steps && (
          <div className="mt-6 space-y-4">
            {recipe.steps.map((step, i) => (
              <div key={i} className="flex gap-4">
                <div className="flex-shrink-0 w-11 h-11 bg-emerald-500/20 border-2 border-emerald-500/30 rounded-2xl flex items-center justify-center shadow-sm">
                  <span className="text-base font-bold text-emerald-300">{i + 1}</span>
                </div>
                <p className="text-[#B8D4D4] pt-2 leading-relaxed font-medium">{step}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
