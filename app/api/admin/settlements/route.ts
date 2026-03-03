import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { checkChallengeRules, updateChallengeAccountState, calculatePnlFromBet } from '@/lib/rules-engine'
import { createAuditLog, AuditActions } from '@/lib/audit-logger'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN' || session.user.email !== 'admin@profitplay.com') {
    return null
  }
  return session
}

export async function GET(request: NextRequest) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') || 'OPEN'
    const marketId = searchParams.get('marketId')

    const where: any = { status }
    
    if (marketId) {
      where.marketId = marketId
    }

    const bets = await prisma.bet.findMany({
      where,
      include: {
        market: true,
        challengeAccount: {
          include: {
            user: true,
            ruleset: true
          }
        },
        oddsSnapshot: true
      },
      orderBy: { placedAt: 'desc' }
    })

    return NextResponse.json({ bets })
  } catch (error) {
    console.error('Settlements fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { betId, result, adminUserId } = await request.json()

    if (!betId || !result || !['WON', 'LOST', 'PUSH'].includes(result)) {
      return NextResponse.json(
        { error: 'Invalid settlement data' },
        { status: 400 }
      )
    }

    // Get the bet with related data
    const bet = await prisma.bet.findUnique({
      where: { id: betId },
      include: {
        market: true,
        challengeAccount: {
          include: {
            ruleset: true
          }
        },
        oddsSnapshot: true
      }
    })

    if (!bet) {
      return NextResponse.json(
        { error: 'Bet not found' },
        { status: 404 }
      )
    }

    if (bet.status !== 'OPEN') {
      return NextResponse.json(
        { error: 'Bet is already settled' },
        { status: 400 }
      )
    }

    // Update bet status
    const updatedBet = await prisma.bet.update({
      where: { id: betId },
      data: {
        status: result,
        settledAt: new Date()
      }
    })

    // Calculate P&L - parlay-aware logic
    let pnl = 0

    if (bet.parlayId) {
      // This bet is part of a parlay - check sibling legs
      const siblingBets = await prisma.bet.findMany({
        where: { parlayId: bet.parlayId }
      })

      const allSettled = siblingBets.every(b => b.status !== 'OPEN')
      const anyLost = siblingBets.some(b => b.status === 'LOST')
      const allWon = siblingBets.every(b => b.status === 'WON' || b.status === 'PUSH')

      if (result === 'LOST') {
        // First LOST leg in this parlay - deduct stake once
        const previouslyLost = siblingBets.some(b => b.id !== betId && b.status === 'LOST')
        if (!previouslyLost) {
          pnl = -bet.stake // Deduct stake only once for the entire parlay
        } else {
          pnl = 0 // Stake already deducted by a previous LOST leg
        }
      } else if (result === 'WON' && allSettled && allWon) {
        // Last leg settled and all legs won (or pushed) - award full parlay payout
        // Only count WON legs for payout (PUSH legs reduce the parlay but don't lose)
        pnl = bet.potentialPayout - bet.stake
      } else if (result === 'PUSH') {
        pnl = 0 // Push doesn't affect P&L
      } else {
        // WON but not all legs settled yet - no P&L change yet
        pnl = 0
      }
    } else {
      // Single bet (not a parlay) - standard P&L
      pnl = calculatePnlFromBet({
        stake: bet.stake,
        potentialPayout: bet.potentialPayout,
        status: result as 'WON' | 'LOST' | 'PUSH'
      })
    }

    // Create settlement record
    await prisma.settlement.create({
      data: {
        betId: bet.id,
        resultJSON: {
          result,
          pnl,
          settledAt: new Date().toISOString(),
          isParlay: !!bet.parlayId,
          parlayId: bet.parlayId
        },
        source: 'manual',
        ts: new Date()
      }
    })

    // Update challenge account equity
    const newEquity = bet.challengeAccount.equity + pnl
    const newHighWaterMark = Math.max(bet.challengeAccount.highWaterMark, newEquity)

    await prisma.challengeAccount.update({
      where: { id: bet.challengeAccountId },
      data: {
        equity: newEquity,
        highWaterMark: newHighWaterMark
      }
    })

    // Check rules after settlement
    const ruleCheck = await checkChallengeRules(bet.challengeAccountId, pnl)
    
    if (ruleCheck.newState) {
      await updateChallengeAccountState(
        bet.challengeAccountId,
        ruleCheck.newState,
        ruleCheck.newState === 'PASSED' ? new Date() : undefined
      )
    }

    // Create audit log
    await createAuditLog({
      userId: adminUserId,
      action: AuditActions.ADMIN_ACTION,
      payload: {
        action: 'BET_SETTLED',
        betId: bet.id,
        result,
        pnl,
        newEquity,
        ruleViolations: ruleCheck.violations
      }
    })

    return NextResponse.json({ 
      success: true,
      bet: updatedBet,
      pnl,
      newEquity,
      ruleCheck
    })
  } catch (error) {
    console.error('Settlement error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { betId, newResult, adminUserId } = await request.json()

    if (!betId || !newResult || !['WON', 'LOST', 'PUSH'].includes(newResult)) {
      return NextResponse.json(
        { error: 'Invalid settlement data' },
        { status: 400 }
      )
    }

    // Get the bet with related data
    const bet = await prisma.bet.findUnique({
      where: { id: betId },
      include: {
        market: true,
        challengeAccount: {
          include: {
            ruleset: true
          }
        },
        oddsSnapshot: true
      }
    })

    if (!bet) {
      return NextResponse.json(
        { error: 'Bet not found' },
        { status: 404 }
      )
    }

    if (bet.status === 'OPEN') {
      return NextResponse.json(
        { error: 'Bet is not settled yet' },
        { status: 400 }
      )
    }

    // Calculate the difference in P&L
    const oldPnl = calculatePnlFromBet({
      stake: bet.stake,
      potentialPayout: bet.potentialPayout,
      status: bet.status as 'WON' | 'LOST' | 'PUSH'
    })

    const newPnl = calculatePnlFromBet({
      stake: bet.stake,
      potentialPayout: bet.potentialPayout,
      status: newResult as 'WON' | 'LOST' | 'PUSH'
    })

    const pnlDifference = newPnl - oldPnl

    // Update bet status
    const updatedBet = await prisma.bet.update({
      where: { id: betId },
      data: {
        status: newResult
      }
    })

    // Update settlement record
    await prisma.settlement.updateMany({
      where: { betId: bet.id },
      data: {
        resultJSON: {
          result: newResult,
          pnl: newPnl,
          settledAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      }
    })

    // Update challenge account equity
    const newEquity = bet.challengeAccount.equity + pnlDifference
    const newHighWaterMark = Math.max(bet.challengeAccount.highWaterMark, newEquity)

    await prisma.challengeAccount.update({
      where: { id: bet.challengeAccountId },
      data: {
        equity: newEquity,
        highWaterMark: newHighWaterMark
      }
    })

    // Check rules after settlement
    const ruleCheck = await checkChallengeRules(bet.challengeAccountId, pnlDifference)
    
    if (ruleCheck.newState) {
      await updateChallengeAccountState(
        bet.challengeAccountId,
        ruleCheck.newState,
        ruleCheck.newState === 'PASSED' ? new Date() : undefined
      )
    }

    // Create audit log
    await createAuditLog({
      userId: adminUserId,
      action: AuditActions.ADMIN_ACTION,
      payload: {
        action: 'BET_SETTLEMENT_UPDATED',
        betId: bet.id,
        oldResult: bet.status,
        newResult,
        pnlDifference,
        newEquity,
        ruleViolations: ruleCheck.violations
      }
    })

    return NextResponse.json({ 
      success: true,
      bet: updatedBet,
      pnlDifference,
      newEquity,
      ruleCheck
    })
  } catch (error) {
    console.error('Settlement update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
