import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateBetPlacement, calculatePotentialPayout } from '@/lib/rules-engine'
import { createAuditLog, AuditActions } from '@/lib/audit-logger'

export async function POST(request: NextRequest) {
  try {
    const { challengeAccountId, marketId, selection, stake } = await request.json()

    // Validate required fields
    if (!challengeAccountId || !marketId || !selection || !stake) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get market and odds
    const market = await prisma.market.findUnique({
      where: { id: marketId },
      include: {
        oddsSnapshots: {
          orderBy: { ts: 'desc' },
          take: 1
        }
      }
    })

    if (!market) {
      return NextResponse.json(
        { error: 'Market not found' },
        { status: 404 }
      )
    }

    if (!market.oddsSnapshots[0]) {
      return NextResponse.json(
        { error: 'No odds available for this market' },
        { status: 400 }
      )
    }

    const oddsSnapshot = market.oddsSnapshots[0]
    const oddsData = oddsSnapshot.lineJSON as any

    // Calculate odds based on selection
    let odds: number
    if (market.marketType === 'MONEYLINE') {
      odds = selection === market.participants[0] ? oddsData.home : oddsData.away
    } else if (market.marketType === 'SPREAD') {
      odds = selection.includes('home') ? oddsData.home.odds : oddsData.away.odds
    } else if (market.marketType === 'TOTAL') {
      odds = selection.includes('over') ? oddsData.over.odds : oddsData.under.odds
    } else {
      return NextResponse.json(
        { error: 'Unsupported market type' },
        { status: 400 }
      )
    }

    // Validate bet placement
    const validation = await validateBetPlacement(
      challengeAccountId,
      stake,
      market.marketType,
      odds
    )

    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Bet validation failed', details: validation.errors },
        { status: 400 }
      )
    }

    // Calculate potential payout
    const potentialPayout = calculatePotentialPayout(stake, odds)

    // Create bet
    const bet = await prisma.bet.create({
      data: {
        challengeAccountId,
        marketId,
        oddsSnapshotId: oddsSnapshot.id,
        selection,
        stake,
        potentialPayout,
        status: 'OPEN'
      },
      include: {
        market: true,
        oddsSnapshot: true
      }
    })

    // Create audit log
    await createAuditLog({
      userId: challengeAccountId, // This should be the actual user ID
      action: AuditActions.BET_PLACED,
      payload: {
        betId: bet.id,
        marketId: bet.marketId,
        selection: bet.selection,
        stake: bet.stake,
        potentialPayout: bet.potentialPayout,
        odds: odds
      }
    })

    return NextResponse.json({ bet }, { status: 201 })
  } catch (error) {
    console.error('Bet creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const challengeAccountId = searchParams.get('challengeAccountId')
    const status = searchParams.get('status')

    if (!challengeAccountId) {
      return NextResponse.json(
        { error: 'challengeAccountId is required' },
        { status: 400 }
      )
    }

    const where: any = { challengeAccountId }
    
    if (status) {
      where.status = status
    }

    const bets = await prisma.bet.findMany({
      where,
      include: {
        market: true,
        oddsSnapshot: true,
        settlements: true
      },
      orderBy: { placedAt: 'desc' }
    })

    return NextResponse.json({ bets })
  } catch (error) {
    console.error('Bets fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
