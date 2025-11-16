export type AnalyticsEvent =
  | "scan_success"
  | "scan_error"
  | "sample_receipt_used"
  | "expense_deleted"
  | "expense_undo"
  | "mileage_calculated"

/**
 * Track analytics events. In production, this can be connected to
 * Vercel Analytics or any other provider. For now, it's a no-op
 * in production and logs in development.
 */
export function track(event: AnalyticsEvent, payload?: Record<string, any>): void {
  // In development, log to console
  if (process.env.NODE_ENV === 'development') {
    console.log('[Analytics]', event, payload)
  }
  
  // In production, this can be connected to Vercel Analytics or other providers
  // Example:
  // if (typeof window !== 'undefined' && window.va) {
  //   window.va('event', event, payload)
  // }
}

