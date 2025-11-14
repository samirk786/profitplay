import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkChallengeRules, updateChallengeAccountState, calculatePnlFromBet } from '@/lib/rules-engine'
import { createAuditLog, AuditActions } from '@/lib/audit-logger'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
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

    // Calculate P&L
    const pnl = calculatePnlFromBet({
      stake: bet.stake,
      potentialPayout: bet.potentialPayout,
      status: result as 'WON' | 'LOST' | 'PUSH'
    })

    // Update bet status
    const updatedBet = await prisma.bet.update({
      where: { id: betId },
      data: {
        status: result,
        settledAt: new Date()
      }
    })

    // Create settlement record
    await prisma.settlement.create({
      data: {
        betId: bet.id,
        resultJSON: {
          result,
          pnl,
          settledAt: new Date().toISOString()
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
