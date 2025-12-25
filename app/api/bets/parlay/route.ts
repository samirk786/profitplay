import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateBetPlacement, calculatePotentialPayout } from '@/lib/rules-engine'
import { createAuditLog, AuditActions } from '@/lib/audit-logger'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { challengeAccountId, parlayId, picks, stake, multiplier } = await request.json()

    // Validate required fields
    if (!challengeAccountId || !parlayId || !picks || !Array.isArray(picks) || picks.length < 2 || !stake || !multiplier) {
      return NextResponse.json(
        { error: 'Missing required fields: challengeAccountId, parlayId, picks (min 2), stake, and multiplier are required' },
        { status: 400 }
      )
    }

    // Get challenge account to get user ID
    const challengeAccount = await prisma.challengeAccount.findUnique({
      where: { id: challengeAccountId },
      select: { userId: true, equity: true }
    })

    if (!challengeAccount) {
      return NextResponse.json(
        { error: 'Challenge account not found' },
        { status: 404 }
      )
    }

    // Validate total stake doesn't exceed available equity
    if (stake > challengeAccount.equity) {
      return NextResponse.json(
        { error: 'Insufficient funds' },
        { status: 400 }
      )
    }

    // Fetch all markets and odds for the picks
    const marketData = await Promise.all(
      picks.map(async (pick: any) => {
        const market = await prisma.market.findUnique({
          where: { id: pick.marketId },
          include: {
            oddsSnapshots: {
              orderBy: { ts: 'desc' },
              take: 1
            }
          }
        })

        if (!market) {
          throw new Error(`Market not found: ${pick.marketId}`)
        }

        if (!market.oddsSnapshots[0]) {
          throw new Error(`No odds available for market: ${pick.marketId}`)
        }

        const oddsSnapshot = market.oddsSnapshots[0]
        const oddsData = oddsSnapshot.lineJSON as any

        // Calculate odds based on selection
        let odds: number
        if (market.marketType === 'MONEYLINE') {
          odds = pick.selection === market.participants[0] ? oddsData.home : oddsData.away
        } else if (market.marketType === 'SPREAD') {
          odds = pick.selection.includes('home') ? oddsData.home.odds : oddsData.away.odds
        } else if (market.marketType === 'TOTAL' || market.marketType === 'PROPS' || market.marketType.startsWith('PLAYER_')) {
          // Handle player props and totals - selection is "over" or "under"
          if (pick.selection === 'over' && oddsData.over) {
            odds = oddsData.over.odds || -110
          } else if (pick.selection === 'under' && oddsData.under) {
            odds = oddsData.under.odds || -110
          } else {
            odds = oddsData.over?.odds || oddsData.under?.odds || -110
          }
        } else {
          throw new Error(`Unsupported market type: ${market.marketType}`)
        }

        return {
          market,
          oddsSnapshot,
          odds,
          selection: pick.selection
        }
      })
    )

    // For parlays, we validate the total stake against rules (not individual picks)
    // Use the first market's type for validation (or we could check all)
    const firstMarket = marketData[0].market
    const validation = await validateBetPlacement(
      challengeAccountId,
      stake,
      firstMarket.marketType,
      -110 // Use standard odds for validation
    )

    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Bet validation failed', details: validation.errors },
        { status: 400 }
      )
    }

    // Calculate parlay payout: stake * multiplier
    const potentialPayout = stake * multiplier

    // Create individual bet records for each pick in the parlay
    const bets = await Promise.all(
      marketData.map(async (data) => {
        return await prisma.bet.create({
          data: {
            challengeAccountId,
            marketId: data.market.id,
            oddsSnapshotId: data.oddsSnapshot.id,
            selection: data.selection,
            stake: stake, // Full stake for each bet (they're part of a parlay)
            potentialPayout: potentialPayout, // Full parlay payout for each bet
            status: 'OPEN',
            parlayId: parlayId,
            parlayMultiplier: multiplier
          },
          include: {
            market: true,
            oddsSnapshot: true
          }
        })
      })
    )

    // Create audit log
    await createAuditLog({
      userId: challengeAccount.userId,
      action: AuditActions.BET_PLACED,
      payload: {
        parlayId,
        betIds: bets.map(b => b.id),
        marketIds: bets.map(b => b.marketId),
        stake,
        multiplier,
        potentialPayout,
        pickCount: picks.length
      }
    })

    return NextResponse.json({ 
      parlayId,
      bets,
      stake,
      multiplier,
      potentialPayout
    }, { status: 201 })
  } catch (error: any) {
    console.error('Parlay creation error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

