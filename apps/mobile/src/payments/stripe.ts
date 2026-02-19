import Constants from 'expo-constants'

const extra = Constants.expoConfig?.extra as { stripePublishableKey?: string } | undefined

export const STRIPE_PUBLISHABLE_KEY =
  process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
  extra?.stripePublishableKey ||
  ''

export function getStripePublishableKey() {
  if (!STRIPE_PUBLISHABLE_KEY) {
    if (__DEV__) {
      console.warn('Missing EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY for Stripe.')
    }
  }
  return STRIPE_PUBLISHABLE_KEY
}
