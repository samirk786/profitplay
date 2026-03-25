import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/prisma'
import { authOptions } from '../auth/[...nextauth]/route'
import { SubscriptionPlan } from '@prisma/client'
import { createAuditLog, AuditActions } from '@/lib/audit-logger'
import { createCheckoutSession, PLAN_START_BALANCE, StripePlan } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { plan } = await request.json()

    if (!plan) {
      return NextResponse.json(
        { error: 'Plan is required' },
        { status: 400 }
      )
    }

    // Validate plan
    const validPlans = ['STARTER', 'STANDARD', 'PRO']
    const planUpper = plan.toUpperCase()
    if (!validPlans.includes(planUpper)) {
      return NextResponse.json(
        { error: 'Invalid plan. Must be one of: STARTER, STANDARD, PRO' },
        { status: 400 }
      )
    }

    // Only STARTER is available for purchase right now (admin can use any)
    const isAdmin = session.user.email === 'admin@profitplay.com' && session.user.role === 'ADMIN'
    if (!isAdmin && planUpper !== 'STARTER') {
      return NextResponse.json(
        { error: 'Only the Starter plan is available right now.' },
        { status: 403 }
      )
    }

    // Check if user already has an active challenge account
    const existingChallenge = await prisma.challengeAccount.findFirst({
      where: {
        userId: session.user.id,
        state: 'ACTIVE'
      }
    })

    if (existingChallenge) {
      return NextResponse.json(
        { error: 'You already have an active evaluation. Complete or reset it before purchasing a new one.' },
        { status: 400 }
      )
    }

    // Check if Stripe is configured (has real keys, not placeholder)
    const stripeConfigured = process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.includes('...')

    if (stripeConfigured) {
      // Create Stripe checkout session and return the URL
      const checkoutSession = await createCheckoutSession(
        planUpper as StripePlan,
        session.user.id,
        session.user.email || ''
      )

      return NextResponse.json({
        checkoutUrl: checkoutSession.url,
        message: 'Redirecting to payment'
      })
    }

    // Fallback: direct creation without Stripe (for admin/dev)
    const ruleset = await prisma.ruleset.findUnique({
      where: { plan: planUpper as SubscriptionPlan }
    })

    if (!ruleset) {
      return NextResponse.json(
        { error: 'Ruleset not found for plan' },
        { status: 404 }
      )
    }

    // Ensure all plans support the same market features we currently expose
    const requiredMarkets = ['MONEYLINE', 'SPREAD', 'TOTAL', 'PROPS']
    const currentMarkets = ruleset.allowedMarkets || []
    const missingMarkets = requiredMarkets.filter(m => !currentMarkets.includes(m))
    if (missingMarkets.length > 0) {
      await prisma.ruleset.update({
        where: { id: ruleset.id },
        data: {
          allowedMarkets: [...new Set([...currentMarkets, ...requiredMarkets])]
        }
      })
    }

    // Check if user already has an active subscription
    const existingSubscription = await prisma.subscription.findFirst({
      where: {
        userId: session.user.id,
        status: 'ACTIVE'
      }
    })

    const startBalance = PLAN_START_BALANCE[planUpper] || 10000

    if (existingSubscription) {
      const updatedSubscription = await prisma.subscription.update({
        where: { id: existingSubscription.id },
        data: {
          plan: planUpper as SubscriptionPlan,
          status: 'ACTIVE',
          renewAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        }
      })

      const challengeAccount = await prisma.challengeAccount.create({
        data: {
          userId: session.user.id,
          rulesetId: ruleset.id,
          startBalance,
          equity: startBalance,
          highWaterMark: startBalance,
          state: 'ACTIVE'
        }
      })

      await createAuditLog({
        userId: session.user.id,
        action: AuditActions.CHALLENGE_ACCOUNT_CREATED,
        payload: {
          challengeAccountId: challengeAccount.id,
          plan: planUpper,
          startBalance,
          rulesetId: ruleset.id
        }
      })

      await createAuditLog({
        userId: session.user.id,
        action: AuditActions.SUBSCRIPTION_CREATED,
        payload: {
          subscriptionId: updatedSubscription.id,
          plan: planUpper,
          stripeCustomerId: updatedSubscription.stripeCustomerId || 'none'
        }
      })

      return NextResponse.json({
        subscription: updatedSubscription,
        message: 'Subscription updated successfully'
      })
    }

    // Create new subscription (without Stripe for dev/admin)
    const subscription = await prisma.subscription.create({
      data: {
        userId: session.user.id,
        stripeCustomerId: `temp_${session.user.id}_${Date.now()}`,
        status: 'ACTIVE',
        plan: planUpper as SubscriptionPlan,
        renewAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      }
    })

    const challengeAccount = await prisma.challengeAccount.create({
      data: {
        userId: session.user.id,
        rulesetId: ruleset.id,
        startBalance,
        equity: startBalance,
        highWaterMark: startBalance,
        state: 'ACTIVE'
      }
    })

    await createAuditLog({
      userId: session.user.id,
      action: AuditActions.SUBSCRIPTION_CREATED,
      payload: {
        subscriptionId: subscription.id,
        plan: planUpper,
        stripeCustomerId: subscription.stripeCustomerId
      }
    })

    await createAuditLog({
      userId: session.user.id,
      action: AuditActions.CHALLENGE_ACCOUNT_CREATED,
      payload: {
        challengeAccountId: challengeAccount.id,
        plan: planUpper,
        startBalance,
        rulesetId: ruleset.id
      }
    })

    return NextResponse.json({
      subscription,
      challengeAccount,
      message: 'Subscription created successfully'
    }, { status: 201 })
  } catch (error: any) {
    console.error('Subscription creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create subscription', details: error.message },
      { status: 500 }
    )
  }
}
