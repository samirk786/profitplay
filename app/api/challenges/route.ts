import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAuditLog, AuditActions } from '@/lib/audit-logger'
import { handleError } from '@/lib/error-handler'

export async function POST(request: NextRequest) {
  try {
    const { userId, plan } = await request.json()

    if (!userId || !plan) {
      return NextResponse.json(
        { error: 'User ID and plan are required' },
        { status: 400 }
      )
    }

    // Check if user already has an active challenge
    const existingChallenge = await prisma.challengeAccount.findFirst({
      where: {
        userId,
        state: 'ACTIVE'
      }
    })

    if (existingChallenge) {
      return NextResponse.json(
        { error: 'User already has an active challenge' },
        { status: 409 }
      )
    }

    // Get the ruleset for the plan
    const ruleset = await prisma.ruleset.findUnique({
      where: { plan: plan.toUpperCase() }
    })

    if (!ruleset) {
      return NextResponse.json(
        { error: 'Invalid subscription plan' },
        { status: 400 }
      )
    }

    // Create challenge account
    const startBalance = 10000 // Default starting balance
    const challengeAccount = await prisma.challengeAccount.create({
      data: {
        userId,
        rulesetId: ruleset.id,
        startBalance,
        equity: startBalance,
        highWaterMark: startBalance,
        state: 'ACTIVE'
      },
      include: {
        ruleset: true,
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })

    // Create audit log
    await createAuditLog({
      userId,
      action: AuditActions.CHALLENGE_ACCOUNT_CREATED,
      payload: {
        challengeAccountId: challengeAccount.id,
        plan: plan.toUpperCase(),
        startBalance,
        rulesetId: ruleset.id
      }
    })

    return NextResponse.json({ 
      challengeAccount,
      message: 'Challenge account created successfully'
    }, { status: 201 })
  } catch (error) {
    return handleError(error)
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const state = searchParams.get('state')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const where: any = { userId }
    
    if (state) {
      where.state = state
    }

    const challenges = await prisma.challengeAccount.findMany({
      where,
      include: {
        ruleset: true,
        user: {
          select: {
            name: true,
            email: true
          }
        },
        bets: {
          select: {
            id: true,
            status: true,
            stake: true,
            potentialPayout: true,
            placedAt: true
          },
          orderBy: { placedAt: 'desc' },
          take: 10
        }
      },
      orderBy: { startedAt: 'desc' }
    })

    return NextResponse.json({ challenges })
  } catch (error) {
    return handleError(error)
  }
}
