import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/prisma'
import { authOptions } from '../../auth/[...nextauth]/route'
import { SubscriptionPlan } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // Only allow admin users to run this
    if (!session || !session.user?.id || session.user?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      )
    }

    // Find admin user
    const adminUser = await prisma.user.findUnique({
      where: { email: 'admin@profitplay.com' }
    })

    if (!adminUser) {
      return NextResponse.json(
        { error: 'Admin user not found' },
        { status: 404 }
      )
    }

    // Get STANDARD ruleset
    const standardRuleset = await prisma.ruleset.findUnique({
      where: { plan: SubscriptionPlan.STANDARD }
    })

    if (!standardRuleset) {
      return NextResponse.json(
        { error: 'STANDARD ruleset not found' },
        { status: 404 }
      )
    }

    // Check if admin already has a subscription
    let adminSubscription = await prisma.subscription.findFirst({
      where: { userId: adminUser.id }
    })
    
    if (!adminSubscription) {
      // Create subscription for admin
      adminSubscription = await prisma.subscription.create({
        data: {
          userId: adminUser.id,
          stripeCustomerId: `admin_${adminUser.id}`,
          status: 'ACTIVE',
          plan: SubscriptionPlan.STANDARD,
          renewAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        },
      })
    }

    // Check if admin already has a challenge account
    let adminChallenge = await prisma.challengeAccount.findFirst({
      where: { userId: adminUser.id, state: 'ACTIVE' }
    })

    if (!adminChallenge) {
      // Create challenge account for admin with some progress
      adminChallenge = await prisma.challengeAccount.create({
        data: {
          userId: adminUser.id,
          rulesetId: standardRuleset.id,
          startBalance: 10000,
          equity: 10750, // Some profit to show progress
          highWaterMark: 10750,
          state: 'ACTIVE',
        },
        include: {
          ruleset: true
        }
      })
    } else {
      // Update existing challenge account with mock progress
      adminChallenge = await prisma.challengeAccount.update({
        where: { id: adminChallenge.id },
        data: {
          equity: 10750,
          highWaterMark: 10750,
        },
        include: {
          ruleset: true
        }
      })
    }

    return NextResponse.json({ 
      success: true,
      message: 'Admin account data seeded successfully',
      subscription: {
        id: adminSubscription.id,
        plan: adminSubscription.plan,
        status: adminSubscription.status
      },
      challengeAccount: {
        id: adminChallenge.id,
        equity: adminChallenge.equity,
        startBalance: adminChallenge.startBalance,
        state: adminChallenge.state
      }
    })
  } catch (error) {
    console.error('Error seeding admin data:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

