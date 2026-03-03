import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { oddsApiService } from '@/lib/odds-api'

export const dynamic = 'force-dynamic'

/**
 * POST: Sync odds for active events only (NBA beta).
 * Uses the bulk endpoint for spreads (1 credit) and per-event endpoint for player props.
 * Only syncs for admin-selected active games.
 */
export async function POST(request: NextRequest) {
  try {
    // Get active events from the database
    const activeEvents = await prisma.activeEvent.findMany({
      where: { isActive: true }
    })

    if (activeEvents.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active games selected. Go to /admin/games to select games.',
        stats: { marketsCreated: 0, oddsSnapshotsCreated: 0 }
      })
    }

    console.log(`Syncing odds for ${activeEvents.length} active event(s)...`)

    let marketsCreated = 0
    let oddsSnapshotsCreated = 0

    // 1. Fetch spreads via bulk endpoint (1 credit)
    const spreadData = await oddsApiService.fetchOdds('basketball_nba', ['spreads'])
    const activeTeams = new Set(activeEvents.flatMap(e => [e.homeTeam, e.awayTeam]))

    for (const event of spreadData) {
      const isActiveEvent = event.participants.some(p => activeTeams.has(p))
      if (!isActiveEvent) continue

      for (const marketData of event.markets) {
        if (marketData.marketType !== 'SPREAD') continue

        const marketId = `${event.eventId}-SPREAD-${marketData.bookmaker}`

        await prisma.market.upsert({
          where: { id: marketId },
          update: {
            participants: event.participants,
            startTime: event.startTime,
            status: 'UPCOMING',
            metadata: event.metadata || null
          },
          create: {
            id: marketId,
            sport: 'NBA',
            league: 'National Basketball Association',
            eventId: event.eventId,
            marketType: 'SPREAD',
            participants: event.participants,
            startTime: event.startTime,
            status: 'UPCOMING',
            metadata: event.metadata || null
          }
        })
        marketsCreated++

        await prisma.oddsSnapshot.create({
          data: {
            marketId,
            bookmaker: marketData.bookmaker,
            lineJSON: marketData.odds
          }
        })
        oddsSnapshotsCreated++
      }
    }

    // 2. Fetch player props per event (1 credit per market per event)
    const playerPropMarkets = ['player_points', 'player_rebounds', 'player_assists']

    for (const activeEvent of activeEvents) {
      for (const propMarket of playerPropMarkets) {
        const playerProps = await oddsApiService.fetchPlayerPropsForEvent(
          'basketball_nba',
          activeEvent.eventId,
          [propMarket]
        )

        for (const prop of playerProps) {
          for (const market of prop.markets) {
            const playerName = prop.metadata?.player || prop.participants[0] || 'Unknown'
            const marketId = `${activeEvent.eventId}-${playerName.replace(/\s+/g, '_')}-${market.marketType}`

            await prisma.market.upsert({
              where: { id: marketId },
              update: {
                participants: prop.participants,
                startTime: prop.startTime,
                status: 'UPCOMING',
                metadata: {
                  player: playerName,
                  matchup: prop.metadata?.matchup || `${activeEvent.awayTeam} @ ${activeEvent.homeTeam}`,
                  homeTeam: prop.metadata?.homeTeam || activeEvent.homeTeam,
                  awayTeam: prop.metadata?.awayTeam || activeEvent.awayTeam,
                  propType: market.marketType,
                  apiEventId: activeEvent.eventId
                }
              },
              create: {
                id: marketId,
                sport: 'NBA',
                league: 'National Basketball Association',
                eventId: prop.eventId,
                marketType: market.marketType as any,
                participants: prop.participants,
                startTime: prop.startTime,
                status: 'UPCOMING',
                metadata: {
                  player: playerName,
                  matchup: prop.metadata?.matchup || `${activeEvent.awayTeam} @ ${activeEvent.homeTeam}`,
                  homeTeam: prop.metadata?.homeTeam || activeEvent.homeTeam,
                  awayTeam: prop.metadata?.awayTeam || activeEvent.awayTeam,
                  propType: market.marketType,
                  apiEventId: activeEvent.eventId
                }
              }
            })
            marketsCreated++

            await prisma.oddsSnapshot.create({
              data: {
                marketId,
                bookmaker: market.bookmaker,
                lineJSON: market.odds
              }
            })
            oddsSnapshotsCreated++
          }
        }
      }
    }

    console.log(`Sync complete: ${marketsCreated} markets, ${oddsSnapshotsCreated} odds snapshots`)

    const usage = await oddsApiService.checkUsage()
    console.log(`API Usage: ${usage.used} used, ${usage.remaining} remaining`)

    return NextResponse.json({
      success: true,
      stats: {
        marketsCreated,
        oddsSnapshotsCreated,
        apiUsage: usage
      }
    })
  } catch (error) {
    console.error('Odds sync error:', error)
    return NextResponse.json(
      {
        error: 'Failed to sync odds data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const [usage, activeEvents] = await Promise.all([
      oddsApiService.checkUsage(),
      prisma.activeEvent.findMany({ where: { isActive: true } })
    ])

    return NextResponse.json({
      apiUsage: usage,
      activeEvents: activeEvents.length,
      sport: 'basketball_nba'
    })
  } catch (error) {
    console.error('Odds info error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch odds info',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
