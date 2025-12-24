import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/prisma'
import { createAuditLog, AuditActions } from '@/lib/audit-logger'
import { handleError } from '@/lib/error-handler'
import { authOptions } from '../auth/[...nextauth]/route'

export const dynamic = 'force-dynamic'

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
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')
    const state = searchParams.get('state')

    // Ensure user can only access their own data
    const authenticatedUserId = session.user.id
    const requestedUserId = userId || authenticatedUserId

    if (requestedUserId !== authenticatedUserId) {
      return NextResponse.json(
        { error: 'Forbidden: You can only access your own data' },
        { status: 403 }
      )
    }

    const where: any = { userId: authenticatedUserId }
    
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
