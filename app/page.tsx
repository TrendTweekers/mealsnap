'use client'

import React, { useState, useEffect } from 'react'
import { Camera, Upload, X, Plus, ShoppingCart, Loader2, Clock, TrendingUp, AlertCircle, Check, Home, ArrowRight, Heart, User, Share2, Sparkles, Mail, List, Sun, Moon } from 'lucide-react'
import { MealSnapLogo } from '@/components/mealsnap-logo'
import { Button } from '@/components/ui/button'
import imageCompression from 'browser-image-compression'

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
  imageUrl?: string // DALL-E generated image URL
}

type ShoppingItem = {
  name: string
  quantity?: string
}

type View = 'home' | 'ingredients' | 'recipes' | 'favorites'

export default function ChefAI() {
  const [currentView, setCurrentView] = useState<View>('home')
  const [ingredients, setIngredients] = useState<string[]>([])
  const [originalDetectedIngredients, setOriginalDetectedIngredients] = useState<string[]>([]) // Track AI-detected ingredients
  const [currentScanId, setCurrentScanId] = useState<string | null>(null) // Track current scan ID
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
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [showVisibilityModal, setShowVisibilityModal] = useState(false)
  const [pendingIngredient, setPendingIngredient] = useState<{ name: string, scanId?: string } | null>(null)
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [pantryItems, setPantryItems] = useState<string[]>([])
  const [showPantryManager, setShowPantryManager] = useState(false)
  const [newPantryItem, setNewPantryItem] = useState('')
  const [dietaryFilters, setDietaryFilters] = useState<string[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('Analyzing your ingredients...')
  const [showCookieNotice, setShowCookieNotice] = useState(false)

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

    // Initialize dark mode from localStorage or system preference
    const saved = localStorage.getItem('theme')
    let shouldBeDark = false
    
    if (saved === 'dark') {
      shouldBeDark = true
    } else if (saved === 'light') {
      shouldBeDark = false
    } else {
      // No saved preference - use system preference
      shouldBeDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    
    setIsDarkMode(shouldBeDark)
    document.documentElement.classList.toggle('dark', shouldBeDark)
    
    // Load pantry items
    const savedPantry = localStorage.getItem('chefai_pantry')
    if (savedPantry) {
      try {
        setPantryItems(JSON.parse(savedPantry))
      } catch (e) {
        console.error('Failed to load pantry:', e)
      }
    }
    
    // Load dietary filters
    const savedDietary = localStorage.getItem('chefai_dietary')
    if (savedDietary) {
      try {
        setDietaryFilters(JSON.parse(savedDietary))
      } catch (e) {
        console.error('Failed to load dietary filters:', e)
      }
    }
    
    // Show cookie notice if not dismissed
    const cookieConsent = localStorage.getItem('chefai_cookie_consent')
    if (!cookieConsent) {
      setShowCookieNotice(true)
    }
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

  // Check for install prompt on first visit
  useEffect(() => {
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone
    const promptDismissed = localStorage.getItem('mealsnap_install_prompt_dismissed')
    
    // Show install prompt if not installed and not dismissed
    if (!isInstalled && !promptDismissed && typeof window !== 'undefined') {
      // Only show on mobile
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
      if (isMobile) {
        setShowInstallPrompt(true)
      }
    }
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
    
    // Track PWA installation
    if (typeof window !== 'undefined') {
      window.addEventListener('appinstalled', () => {
        try {
          if ((window as any).plausible) {
            (window as any).plausible('PWA Installed')
          }
        } catch (err) {
          console.error('Failed to track PWA Installed:', err)
        }
      })
    }
  }, [])

  const checkScanLimit = (): boolean => {
    // Founder bypass - check for founder mode
    const isFounder = localStorage.getItem('mealsnap_founder') === 'true'
    if (isFounder) return true
    
    if (userPlan === 'pro' || userPlan === 'family') return true
    return scanCount < 3
  }

  const incrementScanCount = (scanMethod?: 'camera' | 'upload', ingredientCount?: number) => {
    const newCount = scanCount + 1
    setScanCount(newCount)
    localStorage.setItem('mealsnap_scan_count', newCount.toString())
    
    // Track scan
    if (typeof window !== 'undefined' && (window as any).plausible) {
      (window as any).plausible('Scan Completed', { 
        props: { 
          scanNumber: newCount,
          ingredientCount: ingredientCount ?? ingredients.length,
          method: scanMethod || 'unknown'
        } 
      })
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
      try {
        if (typeof window !== 'undefined' && (window as any).plausible) {
          (window as any).plausible('Email Captured', { 
            props: { 
              source,
              plan: userPlan,
              scanCount: scanCount
            } 
          })
        }
      } catch (err) {
        console.error('Failed to track Email Captured:', err)
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
      
      // Track favorite
      try {
        if (typeof window !== 'undefined' && (window as any).plausible) {
          (window as any).plausible('Recipe Favorited', {
            props: {
              recipeTitle: recipe.title
            }
          })
        }
        // Also track in KV for admin panel
        fetch('/api/track-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'recipe_favorited',
            recipeTitle: recipe.title,
            userId: userId || 'anonymous'
          })
        }).catch(() => {}) // Silent fail
      } catch (err) {
        console.error('Failed to track Recipe Favorited:', err)
      }
      
      // Auto-trigger native share when saving
        const shareText = `I just made ${recipe.title} from my fridge with ChefAI! Get 5 free scans: https://chefai.app?ref=${userId}`
        const shareUrl = typeof window !== 'undefined' ? window.location.origin : 'https://chefai.app'

      try {
        if (navigator.share) {
          await navigator.share({
            title: 'ChefAI Recipe',
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

    const shareText = `I just made ${sharedRecipe.title} from my fridge with ChefAI! Get 5 free scans: https://chefai.app?ref=${userId}`
    const shareUrl = typeof window !== 'undefined' ? window.location.origin : 'https://chefai.app'

    try {
      if (navigator.share) {
        await navigator.share({
          title: 'ChefAI Recipe',
          text: shareText,
          url: `${shareUrl}?ref=${userId}`,
        })
        console.log('Recipe shared successfully')
        
        // Track share
        try {
          if (typeof window !== 'undefined' && (window as any).plausible) {
            (window as any).plausible('Recipe Shared', {
              props: {
                recipeTitle: sharedRecipe.title,
                method: 'native-share'
              }
            })
          }
          // Also track in KV for admin panel
          fetch('/api/track-event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: 'recipe_shared',
              recipeTitle: sharedRecipe.title,
              method: 'native-share',
              userId: userId || 'anonymous'
            })
          }).catch(() => {}) // Silent fail
        } catch (err) {
          console.error('Failed to track Recipe Shared:', err)
        }
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(shareText)
        alert('Link copied to clipboard! Share it anywhere.')
        
        // Track share (even if clipboard fallback)
        try {
          if (typeof window !== 'undefined' && (window as any).plausible) {
            (window as any).plausible('Recipe Shared', {
              props: {
                recipeTitle: sharedRecipe.title,
                method: 'clipboard'
              }
            })
          }
          // Also track in KV for admin panel
          fetch('/api/track-event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: 'recipe_shared',
              recipeTitle: sharedRecipe.title,
              method: 'clipboard',
              userId: userId || 'anonymous'
            })
          }).catch(() => {}) // Silent fail
        } catch (err) {
          console.error('Failed to track Recipe Shared:', err)
        }
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

  // Compress image using browser-image-compression (faster, better quality)
  const compressImage = async (file: File): Promise<string> => {
    console.log('[ChefAI] compressImage called:', file.name, file.size, 'bytes', isMobile ? '(mobile)' : '(desktop)')
    
    // Check file size first (10MB limit before compression)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      console.error('[ChefAI] File too large:', file.size)
      throw new Error('Image is too large. Please use an image under 10MB.')
    }

    try {
      // Use browser-image-compression for efficient compression
      // Try with web worker first, fallback to no web worker on mobile if it fails
      const options = {
        maxSizeMB: isMobile ? 0.8 : 1, // Max 1MB (smaller for mobile)
        maxWidthOrHeight: isMobile ? 1200 : 1400, // Max dimension (smaller for mobile)
        useWebWorker: !isMobile, // Disable web worker on mobile to avoid issues
        fileType: 'image/jpeg', // Force JPEG for smaller size
      }

      console.log('[ChefAI] Compressing with options:', options)
      let compressedFile
      
      try {
        compressedFile = await imageCompression(file, options)
      } catch (webWorkerError) {
        // Fallback: try without web worker if it fails
        console.warn('[ChefAI] Web worker compression failed, trying without web worker:', webWorkerError)
        const fallbackOptions = { ...options, useWebWorker: false }
        compressedFile = await imageCompression(file, fallbackOptions)
      }
      
      console.log('[ChefAI] Compression complete:', {
        original: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
        compressed: `${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`,
        reduction: `${Math.round((1 - compressedFile.size / file.size) * 100)}%`,
      })

      // Convert compressed file to base64
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => {
          const result = e.target?.result as string
          if (!result) {
            reject(new Error('Failed to read file - empty result'))
            return
          }
          // Remove data:image/jpeg;base64, prefix
          const base64Data = result.split(',')[1]
          if (!base64Data) {
            reject(new Error('Failed to extract base64 data'))
            return
          }
          console.log('[ChefAI] Compression successful, base64 length:', base64Data.length)
          resolve(base64Data)
        }
        reader.onerror = (error) => {
          console.error('[ChefAI] FileReader error:', error)
          reject(new Error('Failed to read compressed image'))
        }
        reader.readAsDataURL(compressedFile)
      })
    } catch (error: any) {
      console.error('[ChefAI] Image compression error:', error)
      // Provide more helpful error message
      if (error.message && error.message.includes('Web Worker')) {
        throw new Error('Image processing failed. Please try a smaller image or different format.')
      }
      throw new Error(error.message || 'Failed to compress image. Please try again.')
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('[ChefAI] handleImageUpload called', e.target.files)
    
    const file = e.target.files?.[0]
    if (!file) {
      console.log('[ChefAI] No file selected')
      return
    }

    console.log('[ChefAI] File selected:', file.name, file.size, 'bytes', 'type:', file.type)

    // Determine scan method BEFORE resetting input
    const scanMethod = (e.target as HTMLInputElement).hasAttribute('capture') ? 'camera' : 'upload'
    
    // Track scan started
    try {
      if (typeof window !== 'undefined' && (window as any).plausible) {
        (window as any).plausible('Scan Started', { props: { method: scanMethod } })
      }
    } catch (err) {
      console.error('Failed to track Scan Started:', err)
    }

    // Check scan limit
    const canScan = checkScanLimit()
    console.log('[ChefAI] Scan limit check:', canScan, 'scanCount:', scanCount, 'userPlan:', userPlan)
    
    if (!canScan) {
      console.log('[ChefAI] Scan limit reached, showing pricing modal')
      // Reset input AFTER checking limit
      e.target.value = ''
      setShowPricingModal(true)
      return
    }

    setIsLoading(true)
    setError('')
    const scanStartTime = Date.now()
    
    // Store input reference for reset later
    const inputElement = e.target
    
    try {
      console.log('[ChefAI] Starting image compression...')
      // Compress image before sending
      const base64Image = await compressImage(file)
      console.log('[ChefAI] Image compressed, size:', base64Image.length, 'chars')
      
      // Reset file input AFTER we've successfully read the file
      inputElement.value = ''
      
      console.log('[ChefAI] Sending to /api/scan-pantry...')
      const response = await fetch('/api/scan-pantry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          imageBase64: base64Image,
          userId: userId || 'anonymous',
        }),
      })

      console.log('[ChefAI] Response status:', response.status, response.ok)

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
        console.error('[ChefAI] API error:', errorData)
        
        // Better error messages for mobile
        let errorMessage = errorData.error || `Server error: ${response.status}`
        if (isMobile && response.status >= 500) {
          errorMessage = 'Network error on mobile. Please check your connection and try again.'
        }
        
        throw new Error(errorMessage)
      }

      const data = await response.json()
      console.log('[ChefAI] API response:', data)
      
      if (!data.ok || data.error) {
        setError(data.error || 'Failed to scan pantry')
        setIsLoading(false)
        return
      }

      const processingTime = Date.now() - scanStartTime
      
      if (data.items && Array.isArray(data.items) && data.items.length > 0) {
        console.log('[ChefAI] Ingredients detected:', data.items.length)
        const detectedItems = data.items
        setIngredients(detectedItems)
        
        // Store original AI-detected ingredients for tracking incorrect detections
        setOriginalDetectedIngredients(detectedItems)
        
        // Generate scan ID for tracking (store timestamp for false negative detection)
        const scanTimestamp = Date.now()
        const scanId = `scan_${scanTimestamp}_${userId || 'anonymous'}`
        setCurrentScanId(scanId)
        
        // Store scan timestamp for false negative tracking (within 120 seconds)
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('lastScanTimestamp', scanTimestamp.toString())
        }
        
        // Set view FIRST to ensure it persists even if modals appear
        setCurrentView('ingredients')
        
        // Use scanMethod determined at the start of the function (e.target might be stale on mobile)
        incrementScanCount(scanMethod, detectedItems.length)
        
        // Track scan completed with processing time
        try {
          if (typeof window !== 'undefined' && (window as any).plausible) {
            (window as any).plausible('Scan Completed', { 
              props: { 
                ingredientCount: data.items.length,
                method: scanMethod,
                processingTime: Math.round(processingTime / 1000) + 's'
              } 
            })
          }
        } catch (err) {
          console.error('Failed to track Scan Completed:', err)
        }
      } else {
        console.log('[ChefAI] No ingredients detected')
        setError('No ingredients detected. Try a clearer photo or add ingredients manually.')
        setIngredients([])
        setOriginalDetectedIngredients([]) // Clear original detected list
        setCurrentScanId(null) // Clear scan ID
        
        // Set view FIRST to ensure it persists even if modals appear
        setCurrentView('ingredients')
        
        // Use scanMethod determined at the start of the function (e.target might be stale on mobile)
        incrementScanCount(scanMethod, 0)
        
        // Track error
        try {
          if (typeof window !== 'undefined' && (window as any).plausible) {
            (window as any).plausible('Error Occurred', {
              props: {
                type: 'no_ingredients_detected',
                location: 'scan'
              }
            })
          }
          // Also track in KV for admin panel
          fetch('/api/track-event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: 'error_occurred',
              type: 'no_ingredients_detected',
              location: 'scan',
              userId: userId || 'anonymous'
            })
          }).catch(() => {}) // Silent fail
        } catch (err) {
          console.error('Failed to track error:', err)
        }
      }
    } catch (err: any) {
      console.error('[ChefAI] Scan error:', err)
      const errorMessage = err.message || 'Failed to scan image. Please try again.'
      setError(errorMessage)
      
      // Reset input on error
      if (e.target) {
        e.target.value = ''
      }
      
      // Track error
      try {
        if (typeof window !== 'undefined' && (window as any).plausible) {
          (window as any).plausible('Error Occurred', {
            props: {
              type: err.message || 'scan_failed',
              location: 'scan',
              method: scanMethod
            }
          })
        }
      } catch (trackErr) {
        console.error('Failed to track error:', trackErr)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleGenerateRecipes = async () => {
    // Combine detected ingredients with pantry items
    const allIngredients = Array.from(new Set([...ingredients, ...pantryItems]))
    
    if (allIngredients.length === 0) {
      setError('Please add at least one ingredient first.')
      return
    }

    setIsGenerating(true)
    setIsLoading(true)
    setError('')
    
    // Rotate loading messages while generating
    const loadingMessages = [
      'Analyzing your ingredients...',
      'Finding perfect flavor combinations...',
      'Calculating cook times...',
      'Generating beautiful images...',
      'Almost ready!'
    ]
    let messageIndex = 0
    const messageInterval = setInterval(() => {
      messageIndex = (messageIndex + 1) % loadingMessages.length
      setLoadingMessage(loadingMessages[messageIndex])
    }, 2000)
    
    try {
      const response = await fetch('/api/generate-recipes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          ingredients: allIngredients,
          dietaryFilters,
          userId: userId || 'anonymous',
          userPlan: userPlan || 'free',
        }),
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

      clearInterval(messageInterval)
      
      if (data.recipes && Array.isArray(data.recipes) && data.recipes.length > 0) {
        setRecipes(data.recipes)
        
        const allNeededItems = data.recipes
          .flatMap((recipe: Recipe) => recipe.youNeedToBuy || [])
          .filter((item: string) => item && item.trim() !== '')
        
        const uniqueItems = Array.from(new Set(allNeededItems)).map((item: string) => ({
          name: item,
        }))
        
        console.log('[ChefAI] Shopping list items:', uniqueItems.length, uniqueItems)
        setShoppingList(uniqueItems)
        setCurrentView('recipes')
        
        // Track recipe generation
        try {
          if (typeof window !== 'undefined' && (window as any).plausible) {
            (window as any).plausible('Recipes Generated', { 
              props: { 
                recipeCount: data.recipes.length,
                cached: data.cached || false,
                ingredientCount: ingredients.length
              } 
            })
          }
        } catch (err) {
          console.error('Failed to track Recipes Generated:', err)
        }
        
        // Show email capture modal after FIRST recipe generation (if email not submitted)
        const hasSubmittedEmail = localStorage.getItem('mealsnap_email_submitted')
        const recipeGenerationCount = parseInt(localStorage.getItem('mealsnap_recipe_generation_count') || '0', 10)
        
        // Always show after first recipe generation
        if (recipeGenerationCount === 0 && !hasSubmittedEmail) {
          localStorage.setItem('mealsnap_recipe_generation_count', '1')
          setShowEmailModal(true)
        }
        
        // Increment count
        localStorage.setItem('mealsnap_recipe_generation_count', (recipeGenerationCount + 1).toString())
      } else {
        setError('No recipes generated. Try adding more ingredients.')
      }
    } catch (err: any) {
      clearInterval(messageInterval)
      console.error('Recipe generation error:', err)
      setError(err.message || 'Failed to generate recipes. Please try again.')
    } finally {
      setIsLoading(false)
      setIsGenerating(false)
    }
  }
  
  // Pantry management functions
  const addPantryItem = (item: string) => {
    const cleanItem = item.trim().toLowerCase()
    if (cleanItem && !pantryItems.includes(cleanItem)) {
      const updated = [...pantryItems, cleanItem]
      setPantryItems(updated)
      localStorage.setItem('chefai_pantry', JSON.stringify(updated))
    }
  }
  
  const removePantryItem = (item: string) => {
    const updated = pantryItems.filter(i => i !== item)
    setPantryItems(updated)
    localStorage.setItem('chefai_pantry', JSON.stringify(updated))
  }
  
  const toggleDietaryFilter = (filter: string) => {
    const updated = dietaryFilters.includes(filter)
      ? dietaryFilters.filter(f => f !== filter)
      : [...dietaryFilters, filter]
    setDietaryFilters(updated)
    localStorage.setItem('chefai_dietary', JSON.stringify(updated))
  }

  const addIngredient = async (wasVisible?: boolean, reason?: string, isManualAdd?: boolean) => {
    if (newIngredient.trim()) {
      const cleanIngredient = newIngredient.trim().toLowerCase()
      if (!ingredients.includes(cleanIngredient)) {
        setIngredients([...ingredients, cleanIngredient])
        
        // If we have a scan (from image upload), ask for visibility feedback
        // Otherwise, track immediately (user is adding separately)
        const hasRecentScan = ingredients.length > 0 || isLoading
        
        if (hasRecentScan && wasVisible === undefined) {
          // Show modal to ask if ingredient was visible
          setPendingIngredient({ 
            name: cleanIngredient,
            scanId: userId + '_' + Date.now(), // Generate a simple scan ID
          })
          setShowVisibilityModal(true)
          setNewIngredient('')
          return
        }
        
        // Track manually added ingredient for AI training
        const scanIdToUse = wasVisible !== undefined ? (pendingIngredient?.scanId || null) : currentScanId
        
        // Track false negative if ingredient was added within 120 seconds of scan
        // and it wasn't in the original detected ingredients
        let wasMissedByAI = false
        if (currentScanId && typeof window !== 'undefined') {
          const lastScanTimestamp = sessionStorage.getItem('lastScanTimestamp')
          if (lastScanTimestamp) {
            const timeSinceScan = Date.now() - parseInt(lastScanTimestamp)
            wasMissedByAI = timeSinceScan < 120000 && // Within 120 seconds
                           !originalDetectedIngredients.includes(cleanIngredient)
          }
        }
        
        if (wasMissedByAI) {
          // Track as missed detection (false negative)
          try {
            await fetch('/api/track-missed-detection', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ingredient: cleanIngredient,
                userId: userId || 'anonymous',
                scanId: currentScanId,
                timestamp: new Date().toISOString(),
              }),
            }).catch(() => {}) // Silent fail
          } catch (err) {
            console.warn('Failed to track missed detection:', err)
          }
        }
        
        try {
          await fetch('/api/track-ingredient', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ingredient: cleanIngredient,
              userId: userId,
              wasVisible: wasVisible !== undefined ? wasVisible : false,
              scanId: scanIdToUse,
              reason: reason || null,
            }),
          }).catch(err => {
            // Silently fail - tracking shouldn't block user experience
            console.warn('Failed to track ingredient:', err)
          })
        } catch (err) {
          // Silent fail
        }
        setPendingIngredient(null)
      }
      setNewIngredient('')
    }
  }

  const handleVisibilityFeedback = async (wasVisible: boolean, reason?: string) => {
    if (pendingIngredient) {
      await addIngredient(wasVisible, reason)
      setShowVisibilityModal(false)
    }
  }

  const removeIngredient = async (ingredient: string) => {
    // Check if this was originally AI-detected (not manually added)
    const wasAIDetected = originalDetectedIngredients.includes(ingredient)
    
    // Remove from state
    setIngredients(ingredients.filter(i => i !== ingredient))
    
    // Track as incorrectly detected if it was AI-detected
    if (wasAIDetected) {
      try {
        await fetch('/api/track-incorrect-detection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ingredient: ingredient.toLowerCase().trim(),
            userId: userId || 'anonymous',
            scanId: currentScanId || null,
          }),
        }).catch(() => {}) // Silent fail - don't block UI
      } catch (err) {
        console.warn('Failed to track incorrect detection:', err)
      }
    }
  }

  const copyShoppingList = () => {
    const listToCopy = shoppingList.length > 0
      ? shoppingList.map((item, i) => `${i + 1}. ${item.name}`).join('\n')
      : recipes
          .flatMap(r => r.youNeedToBuy || [])
          .filter((item: string, index: number, self: string[]) => item && self.indexOf(item) === index)
          .map((item: string, i: number) => `${i + 1}. ${item}`)
          .join('\n')
    navigator.clipboard.writeText(listToCopy).then(() => {
      alert('Shopping list copied to clipboard!')
    }).catch((err) => {
      console.error('Failed to copy:', err)
    })
  }

  // Sticky Header Component - Matching Lovable Navbar
  const StickyHeader = () => {
    const scansRemaining = userPlan === 'free' ? Math.max(0, 3 - scanCount) : '∞'
    
    return (
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault()
              setCurrentView('home')
            }}
            className="flex items-center gap-2 hover:opacity-90 transition-all duration-200 hover:scale-[1.02]"
          >
            <img 
              src="/apple-icon.png" 
              alt="ChefAI Logo" 
              className="h-7 w-7 object-contain"
              style={{ minWidth: '28px', minHeight: '28px' }}
            />
            <span className="text-xl font-bold text-gradient" style={{ fontWeight: 700 }}>ChefAI</span>
          </a>

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
                console.log('[ChefAI] Upgrade to Pro clicked, showing pricing modal')
                
                // Track upgrade click
                try {
                  if (typeof window !== 'undefined' && (window as any).plausible) {
                    (window as any).plausible('Upgrade Clicked', {
                      props: {
                        location: 'menu',
                        currentPlan: userPlan
                      }
                    })
                    // Also track in KV for admin panel
                    fetch('/api/track-event', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        event: 'upgrade_clicked',
                        location: 'menu',
                        currentPlan: userPlan,
                        userId: userId || 'anonymous'
                      })
                    }).catch(() => {}) // Silent fail
                  }
                } catch (err) {
                  console.error('Failed to track Upgrade Clicked:', err)
                }
                
                setShowPricingModal(true)
              }}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold shadow-lg"
            >
              Upgrade to Pro
            </Button>
            )}
            
            <Button
              variant="hero"
              size="sm"
              onClick={() => setCurrentView('home')}
              className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-bold shadow-lg"
            >
              <Camera className="w-4 h-4 mr-1" />
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
            <Button 
              variant="glass" 
              size="icon" 
              className="md:hidden touch-manipulation"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setShowMobileMenu(true)
              }}
            >
              <List className="w-5 h-5" />
            </Button>
            <Button 
              variant="glass" 
              size="icon"
              className="hidden sm:flex"
            >
              <User className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </nav>
    )
  }

  // Mobile Menu Component
  const MobileMenu = () => {
    if (!showMobileMenu) return null

  return (
      <>
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80] md:hidden"
          onClick={() => setShowMobileMenu(false)}
        />
        
        {/* Slide-in Menu */}
        <div className={`fixed top-0 right-0 bottom-0 w-80 bg-[#151828] border-l border-[#1F2332] z-[81] shadow-2xl transform transition-transform duration-300 ease-out md:hidden ${
          showMobileMenu ? 'translate-x-0' : 'translate-x-full'
        }`}>
          <div className="flex flex-col h-full pt-16 pb-20">
            {/* Close Button */}
            <button
              onClick={() => setShowMobileMenu(false)}
              className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center text-[#B8D4D4] hover:text-[#E6FFFF] transition-colors touch-manipulation"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Menu Items */}
            <div className="flex-1 px-6 py-4 space-y-2">
              <button
                onClick={() => {
                  setCurrentView('home')
                  setShowMobileMenu(false)
                }}
                className={`w-full text-left px-4 py-3 rounded-xl transition-all touch-manipulation flex items-center gap-3 ${
                  currentView === 'home' 
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                    : 'text-[#B8D4D4] hover:bg-[#1F2332] hover:text-[#E6FFFF]'
                }`}
              >
                <Home className="w-5 h-5" />
                <span className="font-semibold">Home</span>
              </button>

              <button
                onClick={() => {
                  setCurrentView('favorites')
                  setShowMobileMenu(false)
                }}
                className={`w-full text-left px-4 py-3 rounded-xl transition-all touch-manipulation flex items-center gap-3 relative ${
                  currentView === 'favorites' 
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                    : 'text-[#B8D4D4] hover:bg-[#1F2332] hover:text-[#E6FFFF]'
                }`}
              >
                <Heart className={`w-5 h-5 ${favorites.length > 0 && currentView === 'favorites' ? 'fill-current' : ''}`} />
                <span className="font-semibold">Favorites</span>
                {favorites.length > 0 && (
                  <span className="ml-auto bg-emerald-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-semibold">
                    {favorites.length}
                  </span>
                )}
              </button>

              <a
                href="/waitlist"
                onClick={() => setShowMobileMenu(false)}
                className="w-full text-left px-4 py-3 rounded-xl transition-all touch-manipulation flex items-center gap-3 text-[#B8D4D4] hover:bg-[#1F2332] hover:text-[#E6FFFF]"
              >
                <Mail className="w-5 h-5" />
                <span className="font-semibold">Waitlist</span>
              </a>

              <a
                href="/about"
                onClick={() => setShowMobileMenu(false)}
                className="w-full text-left px-4 py-3 rounded-xl transition-all touch-manipulation flex items-center gap-3 text-[#B8D4D4] hover:bg-[#1F2332] hover:text-[#E6FFFF]"
              >
                <Sparkles className="w-5 h-5" />
                <span className="font-semibold">About</span>
              </a>
            </div>

            {/* User Info */}
            <div className="px-6 py-4 border-t border-[#1F2332]">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500/20 to-green-500/20 rounded-xl flex items-center justify-center border border-emerald-500/30">
                  <User className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#E6FFFF]">
                    {userPlan === 'pro' ? 'Pro Member' : userPlan === 'family' ? 'Family Plan' : 'Free Plan'}
                  </p>
                  <p className="text-xs text-[#B8D4D4]">
                    {userPlan === 'free' ? `${Math.max(0, 3 - scanCount)}/3 scans remaining` : 'Unlimited scans'}
                  </p>
                </div>
              </div>
              {userPlan === 'free' && (
                  <button 
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setShowMobileMenu(false)
                    
                    // Track upgrade click
                    try {
                      if (typeof window !== 'undefined' && (window as any).plausible) {
                        (window as any).plausible('Upgrade Clicked', {
                          props: {
                            location: 'menu',
                            currentPlan: userPlan
                          }
                        })
                      }
                    } catch (err) {
                      console.error('Failed to track Upgrade Clicked:', err)
                    }
                    
                    setShowPricingModal(true)
                  }}
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl px-4 py-3 font-bold transition-all shadow-lg hover:shadow-xl touch-manipulation"
                >
                  Upgrade to Pro
                  </button>
                )}
              </div>
          </div>
        </div>
      </>
    )
  }

  // Bottom Navigation Component
  const BottomNav = () => {
    const navItems = [
      { id: 'home', label: 'Home', icon: Home, view: 'home' as View },
      { id: 'scan', label: 'Scan', icon: Camera, view: 'home' as View, action: () => {
        setCurrentView('home')
        // Scroll to scan card
        setTimeout(() => {
          const scanCard = document.querySelector('[data-scan-card]')
          scanCard?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 100)
      }},
      { id: 'favorites', label: 'Favorites', icon: Heart, view: 'favorites' as View, badge: favorites.length },
      { id: 'profile', label: 'Profile', icon: User, view: 'home' as View, action: () => {
        // For now, just show pricing or scroll to top
        if (userPlan === 'free') {
          // Track upgrade click
          try {
            if (typeof window !== 'undefined' && (window as any).plausible) {
              (window as any).plausible('Upgrade Clicked', {
                props: {
                  location: 'menu',
                  currentPlan: userPlan
                }
              })
            }
          } catch (err) {
            console.error('Failed to track Upgrade Clicked:', err)
          }
          
          setShowPricingModal(true)
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }
      }},
    ]

    return (
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#151828]/95 backdrop-blur-md border-t border-[#1F2332] md:hidden safe-area-inset-bottom">
        <div className="flex items-center justify-around px-2 py-2 pb-safe">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = item.view === currentView || (item.id === 'home' && currentView === 'home')
            
            return (
              <button
                key={item.id}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  // Haptic feedback
                  if ('vibrate' in navigator) {
                    navigator.vibrate(10)
                  }
                  if (item.action) {
                    item.action()
                  } else {
                    setCurrentView(item.view)
                  }
                }}
                className={`flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl transition-all touch-manipulation min-w-[64px] min-h-[64px] ${
                  isActive 
                    ? 'text-emerald-400 bg-emerald-500/10' 
                    : 'text-[#B8D4D4] active:bg-[#1F2332]'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-6 h-6 ${item.id === 'favorites' && item.badge && item.badge > 0 && isActive ? 'fill-current' : ''}`} />
                  {item.badge && item.badge > 0 && (
                    <span className="absolute -top-1 -right-1 bg-emerald-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className={`text-xs font-semibold ${isActive ? 'text-emerald-400' : 'text-[#B8D4D4]'}`}>
                  {item.label}
                </span>
              </button>
            )
          })}
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

  // Install Prompt Component
  const InstallPrompt = () => {
    if (!showInstallPrompt) return null

    const handleInstall = () => {
      // Track install prompt interaction
      if (typeof window !== 'undefined' && (window as any).plausible) {
        (window as any).plausible('Install Prompt Clicked')
      }
      
      // Dismiss prompt
      setShowInstallPrompt(false)
      localStorage.setItem('mealsnap_install_prompt_dismissed', 'true')
      
      // Instructions for iOS
      if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        alert('To install ChefAI:\n1. Tap the Share button (bottom of screen)\n2. Select "Add to Home Screen"\n3. Tap "Add"')
      } else if (/Android/i.test(navigator.userAgent)) {
        // Android PWA install prompt
        const deferredPrompt = (window as any).deferredPrompt
        if (deferredPrompt) {
          deferredPrompt.prompt()
          deferredPrompt.userChoice.then(() => {
            (window as any).deferredPrompt = null
          })
        }
      }
    }

    const handleDismiss = () => {
      setShowInstallPrompt(false)
      localStorage.setItem('mealsnap_install_prompt_dismissed', 'true')
    }

    return (
      <div className="fixed top-20 left-0 right-0 z-[70] px-4 md:hidden animate-fade-in">
        <div className="max-w-md mx-auto glass border border-emerald-500/30 rounded-2xl p-4 shadow-2xl">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500/20 to-green-500/20 rounded-xl flex items-center justify-center border border-emerald-500/30 flex-shrink-0">
              <Sparkles className="w-6 h-6 text-emerald-400" />
          </div>
            <div className="flex-1">
              <h3 className="font-bold text-[#E6FFFF] mb-1">📱 Install ChefAI</h3>
              <p className="text-sm text-[#B8D4D4] mb-3">
                Add to your home screen for the best experience
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleInstall}
                  className="flex-1 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-xl px-4 py-2 font-semibold transition-all shadow-lg hover:shadow-xl touch-manipulation text-sm"
                >
                  Install
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-4 py-2 bg-[#1F2332] hover:bg-[#2A2F45] text-[#B8D4D4] rounded-xl font-semibold transition-colors touch-manipulation text-sm"
                >
                  Later
                </button>
        </div>
            </div>
            <button
              onClick={handleDismiss}
              className="w-8 h-8 flex items-center justify-center text-[#B8D4D4] hover:text-[#E6FFFF] transition-colors touch-manipulation flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // HOME VIEW
  if (currentView === 'home') {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <StickyHeader />
        <MobileMenu />
        <BottomNav />
        <InstallPrompt />
        
        {/* Hero Section - Matching Lovable Design */}
        <section className="relative min-h-[calc(100vh-5rem)] flex items-center justify-center overflow-hidden pt-20">
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
                    ChefAI – Your AI Chef{" "}
                    <span className="text-gradient">for Instant Recipes</span>
                  </h1>
                  
                  <p className="text-lg text-muted-foreground max-w-xl">
                    Snap a photo of your fridge, get instant recipe ideas powered by AI. Your personal chef that turns ingredients into delicious meals.{" "}
                    <span className="text-primary font-semibold">5-7 recipes</span> in seconds.{" "}
                    Missing ingredients? Add to Instacart in <span className="text-accent font-semibold">1 tap</span>.
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
                      Start Free – 3 Scans
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

          {/* Social Proof Section */}
          <section className="py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              <div className="bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-500/20 rounded-3xl p-8 backdrop-blur-sm">
                <div className="text-center mb-6">
                  <p className="text-3xl font-bold text-emerald-400 mb-2">
                    Join 1,000+ home cooks saving money
                  </p>
                  <p className="text-lg text-[#B8D4D4]">
                    Real ChefAI users, real results
                  </p>
                </div>
                
                <div className="grid sm:grid-cols-3 gap-6 mb-6">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-emerald-400 mb-1">$200</div>
                    <div className="text-sm text-[#B8D4D4]">Avg saved per month</div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-emerald-400 mb-1">40%</div>
                    <div className="text-sm text-[#B8D4D4]">Less food waste</div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-emerald-400 mb-1">10s</div>
                    <div className="text-sm text-[#B8D4D4]">Photo to recipe</div>
                  </div>
                </div>

                <div className="border-t border-emerald-500/20 pt-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center text-white font-bold text-lg">
                      SM
                    </div>
                    <div className="flex-1">
                      <p className="text-[#E6FFFF] font-semibold mb-1">Sarah M.</p>
                      <p className="text-[#B8D4D4] text-sm italic">
                        "Saved me $200/month on food waste. I used to throw away so much produce, now I actually use everything I buy!"
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 text-center">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/20 rounded-full border border-emerald-500/30">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm text-emerald-300 font-semibold">As seen on Product Hunt</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
                  id="camera-input"
                />
                <div className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-2xl px-8 py-5 font-bold text-lg cursor-pointer transition-all duration-300 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 min-h-[56px]">
                  {isLoading ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" />
                      <span>🔍 Looking for ingredients...</span>
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
                    setOriginalDetectedIngredients([]) // Clear original detected list
                    setCurrentScanId(null) // Clear scan ID
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
                    Receive 5-7 personalized recipes you can make right now with what you have
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
                  ChefAI combines cutting-edge AI with beautiful design to revolutionize your cooking experience
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
                    Get 5-7 personalized recipes based on your available ingredients in seconds.
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
      <div className="min-h-screen bg-[#0B0E1E] pb-20 md:pb-0">
        <StickyHeader />
        <MobileMenu />
        <BottomNav />
        
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
      <div className="min-h-screen bg-[#0B0E1E] pb-20 md:pb-0">
        <StickyHeader />
        <MobileMenu />
        <BottomNav />
        
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

          {/* Dietary Filters */}
          <div className="bg-[#151828]/40 backdrop-blur-sm rounded-3xl border border-[#1F2332] shadow-xl p-6 mb-6">
            <h3 className="text-lg font-semibold text-[#E6FFFF] mb-4 flex items-center gap-2">
              🥗 Dietary Preferences
            </h3>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'vegetarian', label: 'Vegetarian', icon: '🥬' },
                { id: 'vegan', label: 'Vegan', icon: '🌱' },
                { id: 'gluten-free', label: 'Gluten-Free', icon: '🌾' },
                { id: 'dairy-free', label: 'Dairy-Free', icon: '🥛' },
                { id: 'keto', label: 'Keto', icon: '🥑' },
                { id: 'paleo', label: 'Paleo', icon: '🍖' },
              ].map(diet => (
                <button
                  key={diet.id}
                  onClick={() => toggleDietaryFilter(diet.id)}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    dietaryFilters.includes(diet.id)
                      ? 'bg-emerald-600 border-emerald-500 text-white'
                      : 'bg-[#1F2332] border-[#2A2F45] text-[#B8D4D4] hover:border-emerald-500/50'
                  }`}
                >
                  {diet.icon} {diet.label}
                </button>
              ))}
            </div>
            {dietaryFilters.length > 0 && (
              <div className="mt-3 text-sm text-emerald-400">
                ✓ Recipes will match your preferences
              </div>
            )}
          </div>

          {/* Persistent Pantry */}
          <div className="bg-[#151828]/40 backdrop-blur-sm rounded-3xl border border-[#1F2332] shadow-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#E6FFFF] flex items-center gap-2">
                🏠 My Pantry
              </h3>
              <button
                onClick={() => setShowPantryManager(true)}
                className="text-emerald-400 text-sm hover:text-emerald-300"
              >
                Manage
              </button>
            </div>
            {pantryItems.length > 0 ? (
              <div className="flex flex-wrap gap-2 mb-3">
                {pantryItems.map(item => (
                  <div
                    key={item}
                    className="px-3 py-1.5 bg-emerald-900/30 border border-emerald-700 rounded-full text-sm text-emerald-400 flex items-center gap-2"
                  >
                    {item}
                    <button
                      onClick={() => removePantryItem(item)}
                      className="text-emerald-600 hover:text-emerald-400"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[#B8D4D4] text-sm mb-3">
                Add ingredients you always have at home (chicken, eggs, rice, etc)
              </div>
            )}
            <button
              onClick={() => {
                const item = prompt('Add pantry item:')
                if (item) addPantryItem(item)
              }}
              className="text-sm text-emerald-400 hover:text-emerald-300"
            >
              + Add pantry item
            </button>
            {pantryItems.length > 0 && (
              <div className="mt-2 text-xs text-[#B8D4D4]">
                + {pantryItems.length} item{pantryItems.length !== 1 ? 's' : ''} will be included in recipes
              </div>
            )}
          </div>

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
    <div className="min-h-screen bg-[#0B0E1E] pb-20 md:pb-0">
      <StickyHeader />
      <MobileMenu />
      <BottomNav />
      
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
        <BreadcrumbNav />
        
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setCurrentView('home')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-xl font-bold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 text-base"
          >
            <Camera className="w-5 h-5" />
            <span>New Scan</span>
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

        {/* Shopping List - Show if there are missing ingredients OR if user has items to buy */}
        {(shoppingList.length > 0 || recipes.some(r => r.youNeedToBuy && r.youNeedToBuy.length > 0)) && (
          <div className="mt-8 bg-[#151828]/40 backdrop-blur-sm rounded-3xl border border-[#1F2332] shadow-xl p-6 sm:p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-2xl flex items-center justify-center shadow-md border border-blue-500/30">
                <ShoppingCart className="w-7 h-7 text-blue-400" />
              </div>
            <div>
                <h3 className="text-2xl font-bold text-[#E6FFFF]">Shopping List</h3>
                <p className="text-[#B8D4D4]">
                  Missing {shoppingList.length > 0 
                    ? `${shoppingList.length} ingredient${shoppingList.length !== 1 ? 's' : ''}`
                    : `${recipes.flatMap(r => r.youNeedToBuy || []).filter((item, index, self) => item && self.indexOf(item) === index).length} ingredient${recipes.flatMap(r => r.youNeedToBuy || []).filter((item, index, self) => item && self.indexOf(item) === index).length !== 1 ? 's' : ''}`
                  }
                </p>
              </div>
      </div>

            <div className="bg-[#1F2332] rounded-2xl p-6 mb-6 border border-[#2A2F45]">
              <ul className="space-y-3">
                {shoppingList.length > 0 ? (
                  shoppingList.map((item, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-sm"></div>
                      <span className="font-semibold text-[#E6FFFF] capitalize text-base">{item.name}</span>
                    </li>
                  ))
                ) : (
                  // Fallback: show missing ingredients from recipes
                  recipes
                    .flatMap(r => r.youNeedToBuy || [])
                    .filter((item, index, self) => item && self.indexOf(item) === index)
                    .map((item, i) => (
                      <li key={i} className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-sm"></div>
                        <span className="font-semibold text-[#E6FFFF] capitalize text-base">{item}</span>
                      </li>
                    ))
                )}
              </ul>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <button 
                onClick={() => {
                  const listToCopy = shoppingList.length > 0
                    ? shoppingList.map((item, i) => `${i + 1}. ${item.name}`).join('\n')
                    : recipes
                        .flatMap(r => r.youNeedToBuy || [])
                        .filter((item, index, self) => item && self.indexOf(item) === index)
                        .map((item, i) => `${i + 1}. ${item}`)
                        .join('\n')
                  navigator.clipboard.writeText(listToCopy).then(() => {
                    alert('Shopping list copied to clipboard!')
                  }).catch((err) => {
                    console.error('Failed to copy:', err)
                  })
                }}
                className="w-full bg-[#1F2332] hover:bg-[#2A2F45] text-[#E6FFFF] rounded-2xl px-6 py-4 font-bold transition-all duration-300 border-2 border-[#2A2F45] hover:border-[#3A3F55] hover:shadow-md"
              >
                Copy List
              </button>
              <a
                href={`https://www.instacart.com/store?search=${encodeURIComponent(
                  shoppingList.length > 0 
                    ? shoppingList.map(item => item.name).join(' ')
                    : recipes.flatMap(r => r.youNeedToBuy || []).filter((item, index, self) => item && self.indexOf(item) === index).join(' ')
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  const missingIngredients = shoppingList.length > 0 
                    ? shoppingList.map(item => item.name)
                    : recipes.flatMap(r => r.youNeedToBuy || []).filter((item, index, self) => item && self.indexOf(item) === index)
                  
                  // Track Instacart click
                  try {
                    if (typeof window !== 'undefined' && (window as any).plausible) {
                      (window as any).plausible('Instacart Clicked', {
                        props: {
                          itemCount: missingIngredients.length
                        }
                      })
                    }
                    // Also track in KV for admin panel
                    fetch('/api/track-event', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        event: 'instacart_clicked',
                        itemCount: missingIngredients.length,
                        userId: userId || 'anonymous'
                      })
                    }).catch(() => {}) // Silent fail
                  } catch (err) {
                    console.error('Failed to track Instacart Clicked:', err)
                  }
                }}
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
                  
                  // Track upgrade click
                  try {
                    if (typeof window !== 'undefined' && (window as any).plausible) {
                      (window as any).plausible('Upgrade Clicked', {
                        props: {
                          location: 'gate',
                          currentPlan: userPlan
                        }
                      })
                    }
                  } catch (err) {
                    console.error('Failed to track Upgrade Clicked:', err)
                  }
                  
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
              console.log('[ChefAI] Closing pricing modal via backdrop click')
              setShowPricingModal(false)
            }
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="pricing-modal-title"
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

      {/* Visibility Feedback Modal */}
      {showVisibilityModal && pendingIngredient && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleVisibilityFeedback(false)
            }
          }}
          role="dialog"
          aria-modal="true"
        >
          <div 
            className="bg-[#151828] border border-[#1F2332] rounded-2xl shadow-2xl max-w-md w-full p-6 relative z-[71]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => handleVisibilityFeedback(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-[#B8D4D4] hover:text-[#E6FFFF] transition-colors rounded-full hover:bg-[#1F2332] z-[72] touch-manipulation"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="mb-4">
              <h3 className="text-xl font-bold text-[#E6FFFF] mb-2">Help Improve AI</h3>
              <p className="text-sm text-[#B8D4D4]">
                Was <span className="font-semibold text-emerald-400 capitalize">{pendingIngredient.name}</span> visible in your photo?
              </p>
            </div>

            <div className="space-y-3 mb-6">
              <button
                onClick={() => handleVisibilityFeedback(true)}
                className="w-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 rounded-xl px-6 py-3 font-semibold transition-all flex items-center justify-center gap-2 touch-manipulation"
              >
                <Check className="w-5 h-5" />
                Yes, AI missed it
              </button>
              
              <button
                onClick={() => handleVisibilityFeedback(false)}
                className="w-full bg-[#1F2332] hover:bg-[#2A2F45] border border-[#2A2F45] text-[#B8D4D4] rounded-xl px-6 py-3 font-semibold transition-all flex items-center justify-center gap-2 touch-manipulation"
              >
                <X className="w-5 h-5" />
                No, I added it separately
              </button>
            </div>

            <p className="text-xs text-[#B8D4D4] text-center">
              This helps us improve ingredient detection ✨
            </p>
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
    const shareText = `I just made ${recipe.title} from my fridge with ChefAI! Try it free: https://chefai.app?ref=${userId}`
    const shareUrl = `https://chefai.app?ref=${userId}`

    try {
      if (navigator.share) {
        await navigator.share({
          title: 'ChefAI Recipe',
          text: shareText,
          url: shareUrl,
        })
        
        // Track share
        try {
          if (typeof window !== 'undefined' && (window as any).plausible) {
            (window as any).plausible('Recipe Shared', {
              props: {
                recipeTitle: recipe.title,
                method: 'native-share'
              }
            })
          }
        } catch (err) {
          console.error('Failed to track Recipe Shared:', err)
        }
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(shareText)
        alert('Link copied to clipboard! Share it anywhere.')
        
        // Track share (even if clipboard fallback)
        try {
          if (typeof window !== 'undefined' && (window as any).plausible) {
            (window as any).plausible('Recipe Shared', {
              props: {
                recipeTitle: recipe.title,
                method: 'clipboard'
              }
            })
          }
        } catch (err) {
          console.error('Failed to track Recipe Shared:', err)
        }
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
  
  // Fallback image if recipe doesn't have one
  const getFallbackImage = (mealType: string): string => {
    const fallbacks: Record<string, string> = {
      breakfast: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=800&q=80',
      lunch: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80',
      dinner: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80',
      snack: 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=800&q=80',
    }
    return fallbacks[mealType.toLowerCase()] || fallbacks.lunch
  }

  const imageUrl = recipe.imageUrl || getFallbackImage(recipe.mealType)

  return (
    <div className="group relative overflow-hidden rounded-3xl bg-[#151828]/40 backdrop-blur-sm border border-[#1F2332] shadow-xl hover:border-[#2A2F45] transition-all duration-300 hover:-translate-y-1">
      {/* Recipe Image */}
      <div className="relative h-64 overflow-hidden">
        <img 
          src={imageUrl}
          alt={recipe.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        
        {/* Overlay gradient for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        
        {/* Meal type badge */}
        <div className="absolute top-4 left-4">
          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide bg-white/90 text-gray-800 backdrop-blur-sm border border-white/50 shadow-md">
            {recipe.mealType}
          </span>
        </div>
        
        {/* Favorite button */}
        <button 
          onClick={() => onToggleFavorite(recipe)}
          className="absolute top-4 right-4 p-2.5 rounded-full bg-white/90 backdrop-blur-sm hover:bg-white transition-all duration-300 hover:scale-110 shadow-md z-10"
          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Heart className={`w-5 h-5 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
        </button>
        
        {/* Title overlay at bottom of image */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <h3 className="text-2xl sm:text-3xl font-bold text-white line-clamp-2 leading-tight drop-shadow-lg">
            {recipe.title}
          </h3>
          
          {/* Time and difficulty badges */}
          <div className="flex items-center gap-3 mt-3">
            <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/30">
              <Clock className="w-4 h-4 text-white" />
              <span className="text-sm font-semibold text-white">{recipe.timeMinutes} min</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/30">
              <TrendingUp className="w-4 h-4 text-white" />
              <span className="text-sm font-semibold text-white capitalize">{recipe.difficulty}</span>
            </div>
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

        {/* Action Buttons */}
        {hasMissingItems ? (
          <div className="mb-4 space-y-3">
            {/* Instacart Button - Prominent when items needed */}
            <a
              href={`https://www.instacart.com/store?search=${encodeURIComponent(needToBuy.join(' '))}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                // Track Instacart click
                try {
                  if (typeof window !== 'undefined' && (window as any).plausible) {
                    (window as any).plausible('Instacart Clicked', {
                      props: {
                        itemCount: needToBuy.length
                      }
                    })
                  }
                } catch (err) {
                  console.error('Failed to track Instacart Clicked:', err)
                }
              }}
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-2xl px-6 py-3.5 font-bold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 flex items-center justify-center gap-2"
            >
              <ShoppingCart className="w-5 h-5" />
              Add Missing Items to Instacart →
            </a>
            <div className="grid sm:grid-cols-2 gap-3">
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
          </div>
        ) : (
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
        )}

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
