// Default expense categories
export const DEFAULT_CATEGORIES = [
  'Meals & Entertainment',
  'Travel',
  'Software & Subscriptions',
  'Office Supplies',
  'Shopping',
  'Other'
] as const

export type Category = typeof DEFAULT_CATEGORIES[number]

// Category color mapping for UI
export const categoryColors: Record<string, string> = {
  'Meals & Entertainment': 'bg-orange-100 text-orange-900 dark:bg-orange-900/30 dark:text-orange-200',
  'Travel': 'bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-200',
  'Software & Subscriptions': 'bg-purple-100 text-purple-900 dark:bg-purple-900/30 dark:text-purple-200',
  'Office Supplies': 'bg-green-100 text-green-900 dark:bg-green-900/30 dark:text-green-200',
  'Shopping': 'bg-pink-100 text-pink-900 dark:bg-pink-900/30 dark:text-pink-200',
  'Other': 'bg-gray-100 text-gray-900 dark:bg-gray-900/30 dark:text-gray-200',
}

// Mileage rate settings
export interface MileageSettings {
  rateType: 'irs' | 'custom'
  customRate: number
  customCurrency: string
}

const DEFAULT_MILEAGE_SETTINGS: MileageSettings = {
  rateType: 'irs',
  customRate: 0.67,
  customCurrency: 'PLN/km',
}

const MILEAGE_SETTINGS_KEY = 'snapledger_mileage_settings'

export function getMileageSettings(): MileageSettings {
  if (typeof window === 'undefined') return DEFAULT_MILEAGE_SETTINGS
  
  try {
    const stored = localStorage.getItem(MILEAGE_SETTINGS_KEY)
    if (stored) {
      return { ...DEFAULT_MILEAGE_SETTINGS, ...JSON.parse(stored) }
    }
  } catch (e) {
    console.error('Failed to load mileage settings:', e)
  }
  
  return DEFAULT_MILEAGE_SETTINGS
}

export function saveMileageSettings(settings: MileageSettings): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem(MILEAGE_SETTINGS_KEY, JSON.stringify(settings))
  } catch (e) {
    console.error('Failed to save mileage settings:', e)
  }
}

