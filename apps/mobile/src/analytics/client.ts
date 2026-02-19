export type AnalyticsEvent = {
  name: string
  properties?: Record<string, string | number | boolean | null>
}

export function trackEvent(event: AnalyticsEvent) {
  if (__DEV__) {
    console.log('[analytics]', event.name, event.properties || {})
  }
}

export function trackError(error: unknown, context?: Record<string, string>) {
  if (__DEV__) {
    console.error('[error]', error, context || {})
  }
}
