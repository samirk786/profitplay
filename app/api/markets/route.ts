import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { oddsApiService } from '@/lib/odds-api'

export const dynamic = 'force-dynamic'

// Map internal market type names to Odds API market keys
const MARKET_TYPE_TO_API_KEY: Record<string, string> = {
  'PLAYER_POINTS': 'player_points',
  'PLAYER_REBOUNDS': 'player_rebounds',
  'PLAYER_ASSISTS': 'player_assists',
}

function getPropTypeLabel(marketType: string): string {
  if (!marketType) return 'PROPS'
  if (marketType.includes('PLAYER_POINTS')) return 'PTS'
  if (marketType.includes('PLAYER_REBOUNDS')) return 'REB'
  if (marketType.includes('PLAYER_ASSISTS')) return 'AST'
  return marketType.replace('PLAYER_', '').replace(/_/g, ' ')
}

// Helper functions for formatting
function roundOdds(odds: number): number {
  if (isNaN(odds) || !isFinite(odds)) return 0
  return Math.round(odds * 100) / 100
}

function roundSpread(spread: number): number {
  if (isNaN(spread) || !isFinite(spread)) return 0
  return Math.round(spread * 10) / 10
}

function preserveDecimal(value: number): number {
  if (isNaN(value) || !isFinite(value)) return 0
  return value
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const sport = searchParams.get('sport') || 'NBA'
    const marketType = searchParams.get('marketType')
    const refresh = searchParams.get('refresh') === 'true'

    // Get admin-selected active events
    const activeEvents = await prisma.activeEvent.findMany({
      where: { isActive: true }
    })

    if (activeEvents.length === 0) {
      return NextResponse.json({
        markets: [],
        message: 'No active games selected. Go to /admin/games to select games.'
      })
    }

    const activeEventIds = activeEvents.map(e => e.eventId)
    let markets: any[] = []

    const isPlayerPropsRequest = marketType && marketType.startsWith('PLAYER_')

    if (marketType === 'SPREAD') {
      markets = await handleSpreadRequest(activeEvents, refresh)
    } else if (isPlayerPropsRequest && marketType) {
      markets = await handlePlayerPropsRequest(activeEvents, marketType, refresh)
    } else {
      // Default: return all cached markets for active events
      markets = await fetchCachedMarkets(sport, marketType, activeEventIds)
    }

    // Format the response
    const formattedMarkets = markets.map(market => {
      const odds = market.oddsSnapshots?.[0]?.lineJSON || null

      // Round odds values for display
      if (odds) {
        if (odds.home && typeof odds.home === 'number') {
          odds.home = roundOdds(odds.home)
        }
        if (odds.away && typeof odds.away === 'number') {
          odds.away = roundOdds(odds.away)
        }
        if (odds.over && odds.over.odds) {
          odds.over.odds = roundOdds(odds.over.odds)
          odds.over.total = preserveDecimal(odds.over.total)
        }
        if (odds.under && odds.under.odds) {
          odds.under.odds = roundOdds(odds.under.odds)
          odds.under.total = preserveDecimal(odds.under.total)
        }
        if (odds.home && typeof odds.home === 'object' && odds.home.odds) {
          odds.home.odds = roundOdds(odds.home.odds)
          odds.home.spread = roundSpread(odds.home.spread)
        }
        if (odds.away && typeof odds.away === 'object' && odds.away.odds) {
          odds.away.odds = roundOdds(odds.away.odds)
          odds.away.spread = roundSpread(odds.away.spread)
        }
      }

      return {
        id: market.id,
        sport: market.sport,
        league: market.league,
        eventId: market.eventId,
        marketType: market.marketType,
        participants: market.participants,
        startTime: market.startTime,
        status: market.status,
        odds: odds,
        lastUpdated: market.oddsSnapshots?.[0]?.ts || null,
        _metadata: market.metadata || market._metadata || null
      }
    })

    return NextResponse.json({ markets: formattedMarkets })
  } catch (error) {
    console.error('Markets fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Handle SPREAD requests using the bulk odds endpoint (1 credit).
 * Fetches spreads for all NBA games, then filters to active events only.
 */
async function handleSpreadRequest(
  activeEvents: Array<{ eventId: string; homeTeam: string; awayTeam: string; commenceTime: Date }>,
  refresh: boolean
): Promise<any[]> {
  const activeEventIds = activeEvents.map(e => e.eventId)

  // Try database first
  let markets = await prisma.market.findMany({
    where: {
      sport: 'NBA',
      marketType: 'SPREAD',
      status: 'UPCOMING',
      // Match by participants since eventId may differ between bulk and per-event endpoints
    },
    include: {
      oddsSnapshots: {
        orderBy: { ts: 'desc' },
        take: 1
      }
    },
    orderBy: { startTime: 'asc' }
  })

  // Filter to only active event teams
  const activeTeams = new Set(
    activeEvents.flatMap(e => [e.homeTeam, e.awayTeam])
  )
  markets = markets.filter(m =>
    m.participants.some(p => activeTeams.has(p))
  )

  const hasRecentData = markets.length > 0 && markets.some(m =>
    m.oddsSnapshots.length > 0 &&
    new Date(m.oddsSnapshots[0].ts).getTime() > Date.now() - 60 * 60 * 1000 // Last hour
  )

  if (refresh || !hasRecentData) {
    try {
      console.log('Fetching spreads from Odds API (1 credit)...')
      const oddsData = await oddsApiService.fetchOdds('basketball_nba', ['spreads'])

      // Filter to active events and sync to database
      for (const event of oddsData) {
        // Check if this event matches any active event (by team name matching)
        const isActiveEvent = activeEvents.some(ae =>
          (event.participants.includes(ae.homeTeam) || event.participants.includes(ae.awayTeam))
        )

        if (!isActiveEvent) continue

        const spreadMarkets = event.markets.filter(m => m.marketType === 'SPREAD')

        for (const spreadMarket of spreadMarkets) {
          const marketId = `${event.eventId}-SPREAD-${spreadMarket.bookmaker}`

          const dbMarket = await prisma.market.upsert({
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

          await prisma.oddsSnapshot.create({
            data: {
              marketId: dbMarket.id,
              bookmaker: spreadMarket.bookmaker,
              lineJSON: spreadMarket.odds
            }
          })
        }
      }

      // Re-query from database
      markets = await prisma.market.findMany({
        where: {
          sport: 'NBA',
          marketType: 'SPREAD',
          status: 'UPCOMING'
        },
        include: {
          oddsSnapshots: {
            orderBy: { ts: 'desc' },
            take: 1
          }
        },
        orderBy: { startTime: 'asc' }
      })

      // Filter to active events
      markets = markets.filter(m =>
        m.participants.some(p => activeTeams.has(p))
      )

      // Deduplicate: keep only one spread market per game (first bookmaker)
      const seenGames = new Set<string>()
      markets = markets.filter(m => {
        const gameKey = m.participants.sort().join('-')
        if (seenGames.has(gameKey)) return false
        seenGames.add(gameKey)
        return true
      })
    } catch (error) {
      console.warn('Failed to fetch spreads from API:', error)
    }
  }

  return markets
}

/**
 * Handle player props requests using the per-event endpoint.
 * Costs 1 credit per event (all requested markets in one call per event).
 */
async function handlePlayerPropsRequest(
  activeEvents: Array<{ eventId: string; homeTeam: string; awayTeam: string; commenceTime: Date }>,
  marketType: string,
  refresh: boolean
): Promise<any[]> {
  // Try database first
  let markets = await prisma.market.findMany({
    where: {
      sport: 'NBA',
      marketType: marketType as any,
      status: 'UPCOMING'
    },
    include: {
      oddsSnapshots: {
        orderBy: { ts: 'desc' },
        take: 1
      }
    },
    orderBy: { startTime: 'asc' }
  })

  // Filter to only active event matchups
  const activeTeams = new Set(
    activeEvents.flatMap(e => [e.homeTeam, e.awayTeam])
  )
  markets = markets.filter(m => {
    const matchup = (m.metadata as any)?.matchup || m.participants[1] || ''
    return activeEvents.some(ae =>
      matchup.includes(ae.homeTeam) || matchup.includes(ae.awayTeam)
    )
  })

  const hasRecentData = markets.length > 0 && markets.some(m =>
    m.oddsSnapshots.length > 0 &&
    new Date(m.oddsSnapshots[0].ts).getTime() > Date.now() - 60 * 60 * 1000
  )

  if (refresh || !hasRecentData) {
    const apiMarketKey = MARKET_TYPE_TO_API_KEY[marketType]
    if (!apiMarketKey) {
      console.warn(`No API market key mapping for ${marketType}`)
      return markets
    }

    try {
      // Fetch player props for each active event (1 credit per event)
      for (const activeEvent of activeEvents) {
        console.log(`Fetching ${apiMarketKey} for event ${activeEvent.eventId} (1 credit)...`)

        const playerProps = await oddsApiService.fetchPlayerPropsForEvent(
          'basketball_nba',
          activeEvent.eventId,
          [apiMarketKey]
        )

        if (playerProps.length === 0) {
          console.log(`No ${apiMarketKey} props returned for event ${activeEvent.eventId}`)
          continue
        }

        // Sync each player prop to database
        for (const prop of playerProps) {
          for (const market of prop.markets) {
            const playerName = prop.metadata?.player || prop.participants[0] || 'Unknown'
            const marketId = `${activeEvent.eventId}-${playerName.replace(/\s+/g, '_')}-${market.marketType}`

            const propTypeLabel = getPropTypeLabel(market.marketType)

            const dbMarket = await prisma.market.upsert({
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
                  propType: propTypeLabel,
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
                  propType: propTypeLabel,
                  apiEventId: activeEvent.eventId
                }
              }
            })

            await prisma.oddsSnapshot.create({
              data: {
                marketId: dbMarket.id,
                bookmaker: market.bookmaker,
                lineJSON: market.odds
              }
            })
          }
        }

        console.log(`Synced ${playerProps.length} ${apiMarketKey} props for event ${activeEvent.eventId}`)
      }

      // Re-query from database after sync
      markets = await prisma.market.findMany({
        where: {
          sport: 'NBA',
          marketType: marketType as any,
          status: 'UPCOMING'
        },
        include: {
          oddsSnapshots: {
            orderBy: { ts: 'desc' },
            take: 1
          }
        },
        orderBy: { startTime: 'asc' }
      })

      // Filter to active events
      markets = markets.filter(m => {
        const matchup = (m.metadata as any)?.matchup || m.participants[1] || ''
        return activeEvents.some(ae =>
          matchup.includes(ae.homeTeam) || matchup.includes(ae.awayTeam)
        )
      })
    } catch (error) {
      console.warn(`Failed to fetch ${marketType} from API:`, error)
    }
  }

  return markets
}

/**
 * Fetch cached markets from database for active events.
 */
async function fetchCachedMarkets(
  sport: string,
  marketType: string | null,
  activeEventIds: string[]
): Promise<any[]> {
  const where: any = {
    sport,
    status: 'UPCOMING'
  }

  if (marketType && marketType !== 'ALL') {
    where.marketType = marketType as any
  }

  return prisma.market.findMany({
    where,
    include: {
      oddsSnapshots: {
        orderBy: { ts: 'desc' },
        take: 1
      }
    },
    orderBy: { startTime: 'asc' }
  })
}
