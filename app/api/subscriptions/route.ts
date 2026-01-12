import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/prisma'
import { authOptions } from '../auth/[...nextauth]/route'
import { SubscriptionPlan } from '@prisma/client'
import { createAuditLog, AuditActions } from '@/lib/audit-logger'

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

    // Get the ruleset for the plan
    const ruleset = await prisma.ruleset.findUnique({
      where: { plan: planUpper as SubscriptionPlan }
    })

    if (!ruleset) {
      return NextResponse.json(
        { error: 'Ruleset not found for plan' },
        { status: 404 }
      )
    }

    // Check if user already has an active subscription
    const existingSubscription = await prisma.subscription.findFirst({
      where: {
        userId: session.user.id,
        status: 'ACTIVE'
      }
    })

    if (existingSubscription) {
      // Update existing subscription
      const updatedSubscription = await prisma.subscription.update({
        where: { id: existingSubscription.id },
        data: {
          plan: planUpper as SubscriptionPlan,
          status: 'ACTIVE',
          renewAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        }
      })

      // Check if user has an active challenge account, if not create one
      const existingChallenge = await prisma.challengeAccount.findFirst({
        where: {
          userId: session.user.id,
          state: 'ACTIVE'
        }
      })

      if (!existingChallenge) {
        const challengeAccount = await prisma.challengeAccount.create({
          data: {
            userId: session.user.id,
            rulesetId: ruleset.id,
            startBalance: 10000,
            equity: 10000,
            highWaterMark: 10000,
            state: 'ACTIVE'
          }
        })

        await createAuditLog({
          userId: session.user.id,
          action: AuditActions.CHALLENGE_ACCOUNT_CREATED,
          payload: {
            challengeAccountId: challengeAccount.id,
            plan: planUpper,
            startBalance: 10000,
            rulesetId: ruleset.id
          }
        })
      } else {
        // Update challenge account ruleset if needed
        await prisma.challengeAccount.update({
          where: { id: existingChallenge.id },
          data: {
            rulesetId: ruleset.id
          }
        })
      }

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

    // Create new subscription (without Stripe for now)
    const subscription = await prisma.subscription.create({
      data: {
        userId: session.user.id,
        stripeCustomerId: `temp_${session.user.id}_${Date.now()}`, // Temporary ID
        status: 'ACTIVE',
        plan: planUpper as SubscriptionPlan,
        renewAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      }
    })

    // Create challenge account
    const challengeAccount = await prisma.challengeAccount.create({
      data: {
        userId: session.user.id,
        rulesetId: ruleset.id,
        startBalance: 10000,
        equity: 10000,
        highWaterMark: 10000,
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
        startBalance: 10000,
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
