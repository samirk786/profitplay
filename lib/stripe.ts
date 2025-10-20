import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
})

export const STRIPE_PLANS = {
  STARTER: {
    priceId: process.env.STRIPE_STARTER_PRICE_ID || 'price_starter',
    amount: 2900, // $29.00 in cents
    name: 'Starter Plan',
  },
  STANDARD: {
    priceId: process.env.STRIPE_STANDARD_PRICE_ID || 'price_standard',
    amount: 5900, // $59.00 in cents
    name: 'Standard Plan',
  },
  PRO: {
    priceId: process.env.STRIPE_PRO_PRICE_ID || 'price_pro',
    amount: 9900, // $99.00 in cents
    name: 'Pro Plan',
  },
} as const

export type StripePlan = keyof typeof STRIPE_PLANS

export async function createCheckoutSession(
  plan: StripePlan,
  userId: string,
  userEmail: string
) {
  const stripePlan = STRIPE_PLANS[plan]

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: stripePlan.priceId,
        quantity: 1,
      },
    ],
    customer_email: userEmail,
    metadata: {
      userId,
      plan,
    },
    success_url: `${process.env.NEXTAUTH_URL}/dashboard?success=true`,
    cancel_url: `${process.env.NEXTAUTH_URL}/pricing?canceled=true`,
  })

  return session
}

export async function createCustomer(email: string, name?: string) {
  return await stripe.customers.create({
    email,
    name,
  })
}

export async function getSubscription(subscriptionId: string) {
  return await stripe.subscriptions.retrieve(subscriptionId)
}

export async function cancelSubscription(subscriptionId: string) {
  return await stripe.subscriptions.cancel(subscriptionId)
}

export async function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
) {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not set')
  }

  return stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET
  )
}
