import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { oddsApiService } from '@/lib/odds-api'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sport = searchParams.get('sport')
    const marketType = searchParams.get('marketType')
    const date = searchParams.get('date')
    const refresh = searchParams.get('refresh') === 'true'

    // If refresh is requested, fetch fresh odds data first
    if (refresh && sport && sport !== 'ALL') {
      try {
        const sportKey = mapSportToOddsApiKey(sport)
        await oddsApiService.fetchOdds(sportKey)
        
        // Also fetch player props for NFL
        if (sport === 'NFL') {
          await oddsApiService.fetchPlayerProps(sportKey)
        }
      } catch (error) {
        console.warn('Failed to refresh odds data:', error)
        // Continue with existing data
      }
    }

    const where: any = {
      status: 'UPCOMING'
    }

    if (sport && sport !== 'ALL') {
      where.sport = sport
    }

    if (marketType && marketType !== 'ALL') {
      // Map the market type to the correct Prisma enum value
      const validMarketTypes = [
        'MONEYLINE', 'SPREAD', 'TOTAL', 'PROPS',
        'PLAYER_PASS_TDS', 'PLAYER_PASS_YDS', 'PLAYER_PASS_COMPLETIONS',
        'PLAYER_RUSH_YDS', 'PLAYER_RUSH_ATT', 'PLAYER_REC_YDS',
        'PLAYER_REC_RECEPTIONS', 'PLAYER_REC_TDS'
      ]
      
      if (validMarketTypes.includes(marketType)) {
        where.marketType = marketType as any
      }
    }

    if (date) {
      const startDate = new Date(date)
      const endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + 1)
      
      where.startTime = {
        gte: startDate,
        lt: endDate
      }
    }

    // For player props or when no markets found, we'll return mock data
    let markets: any[] = []
    
    if (marketType && marketType.startsWith('PLAYER_')) {
      // Return mock player props data
      markets = [
        {
          id: `mock_${Date.now()}_1`,
          sport: sport || 'NFL',
          league: 'National Football League',
          eventId: `player_props_${Date.now()}_1`,
          marketType: marketType,
          participants: ['Josh Allen', 'Buffalo Bills'],
          startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
          status: 'UPCOMING',
          oddsSnapshots: [{
            lineJSON: {
              over: { total: 276.5, odds: -110 },
              under: { total: 276.5, odds: -110 }
            },
            ts: new Date()
          }]
        },
        {
          id: `mock_${Date.now()}_2`,
          sport: sport || 'NFL',
          league: 'National Football League',
          eventId: `player_props_${Date.now()}_2`,
          marketType: marketType,
          participants: ['Christian McCaffrey', 'San Francisco 49ers'],
          startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
          status: 'UPCOMING',
          oddsSnapshots: [{
            lineJSON: {
              over: { total: 96.5, odds: -105 },
              under: { total: 96.5, odds: -115 }
            },
            ts: new Date()
          }]
        }
      ]
    } else {
      // Query regular markets from database
      try {
        markets = await prisma.market.findMany({
          where,
          include: {
            oddsSnapshots: {
              where: {
                ts: {
                  gte: new Date(Date.now() - 30 * 60 * 1000) // Last 30 minutes (more generous for real data)
                }
              },
              orderBy: { ts: 'desc' },
              take: 1
            }
          },
          orderBy: { startTime: 'asc' }
        })
        
        // If no markets found or no odds, use mock data
        if (markets.length === 0 || markets.every(m => !m.oddsSnapshots || m.oddsSnapshots.length === 0)) {
          console.log('No markets with odds found, using mock data')
          markets = getMockMarkets()
        }
      } catch (error) {
        console.warn('Database query failed, returning mock data:', error)
        // Return mock data as fallback
        markets = getMockMarkets()
      }
    }

    // Helper function to round odds only
    const roundOdds = (odds: number): number => {
      // Handle NaN values
      if (isNaN(odds) || !isFinite(odds)) {
        return 0
      }
      return Math.round(odds * 100) / 100
    }

    // Helper function to round spreads only (keep .5 for totals and player props)
    const roundSpread = (spread: number): number => {
      // Handle NaN values
      if (isNaN(spread) || !isFinite(spread)) {
        return 0
      }
      return Math.round(spread * 10) / 10
    }

    // Helper function to preserve .5 values for totals and player props
    const preserveDecimal = (value: number): number => {
      // Handle NaN values
      if (isNaN(value) || !isFinite(value)) {
        return 0
      }
      // Keep original value with decimals (don't round)
      return value
    }

    // Format the response
    const formattedMarkets = markets.map(market => {
      const odds = market.oddsSnapshots[0]?.lineJSON || null
      
      // Round odds only, preserve .5 values for totals and player props
      if (odds) {
        if (odds.home && typeof odds.home === 'number') {
          odds.home = roundOdds(odds.home)
        }
        if (odds.away && typeof odds.away === 'number') {
          odds.away = roundOdds(odds.away)
        }
        if (odds.over && odds.over.odds) {
          odds.over.odds = roundOdds(odds.over.odds)
          odds.over.total = preserveDecimal(odds.over.total) // Keep .5 values
        }
        if (odds.under && odds.under.odds) {
          odds.under.odds = roundOdds(odds.under.odds)
          odds.under.total = preserveDecimal(odds.under.total) // Keep .5 values
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
        lastUpdated: market.oddsSnapshots[0]?.ts || null
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

// Helper function to map our sport names to Odds API keys
function mapSportToOddsApiKey(sport: string): string {
  const mapping: Record<string, string> = {
    'NBA': 'basketball_nba',
    'NFL': 'americanfootball_nfl',
    'MLB': 'baseball_mlb',
    'NHL': 'icehockey_nhl',
    'SOCCER': 'soccer_epl'
  }
  return mapping[sport] || 'basketball_nba'
}

// Mock markets data for fallback
function getMockMarkets(): any[] {
  return [
    // NBA Markets
    {
      id: 'mock_nba_1',
      sport: 'NBA',
      league: 'National Basketball Association',
      eventId: 'nba-mock-1',
      marketType: 'MONEYLINE',
      participants: ['Los Angeles Lakers', 'Golden State Warriors'],
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      status: 'UPCOMING',
      oddsSnapshots: [{
        lineJSON: {
          home: -150,
          away: 130
        },
        ts: new Date()
      }]
    },
    {
      id: 'mock_nba_2',
      sport: 'NBA',
      league: 'National Basketball Association',
      eventId: 'nba-mock-2',
      marketType: 'SPREAD',
      participants: ['Los Angeles Lakers', 'Golden State Warriors'],
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      status: 'UPCOMING',
      oddsSnapshots: [{
        lineJSON: {
          home: { spread: -3.5, odds: -110 },
          away: { spread: 3.5, odds: -110 }
        },
        ts: new Date()
      }]
    },
    {
      id: 'mock_nba_3',
      sport: 'NBA',
      league: 'National Basketball Association',
      eventId: 'nba-mock-3',
      marketType: 'TOTAL',
      participants: ['Los Angeles Lakers', 'Golden State Warriors'],
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      status: 'UPCOMING',
        oddsSnapshots: [{
          lineJSON: {
            over: { total: 220.5, odds: -110 },
            under: { total: 220.5, odds: -110 }
          },
          ts: new Date()
        }]
    },
    {
      id: 'mock_nba_4',
      sport: 'NBA',
      league: 'National Basketball Association',
      eventId: 'nba-mock-4',
      marketType: 'MONEYLINE',
      participants: ['Boston Celtics', 'Miami Heat'],
      startTime: new Date(Date.now() + 25 * 60 * 60 * 1000),
      status: 'UPCOMING',
      oddsSnapshots: [{
        lineJSON: {
          home: -120,
          away: 100
        },
        ts: new Date()
      }]
    },
    {
      id: 'mock_nba_5',
      sport: 'NBA',
      league: 'National Basketball Association',
      eventId: 'nba-mock-5',
      marketType: 'SPREAD',
      participants: ['Boston Celtics', 'Miami Heat'],
      startTime: new Date(Date.now() + 25 * 60 * 60 * 1000),
      status: 'UPCOMING',
      oddsSnapshots: [{
        lineJSON: {
          home: { spread: -2.5, odds: -105 },
          away: { spread: 2.5, odds: -115 }
        },
        ts: new Date()
      }]
    },
    {
      id: 'mock_nba_6',
      sport: 'NBA',
      league: 'National Basketball Association',
      eventId: 'nba-mock-6',
      marketType: 'TOTAL',
      participants: ['Boston Celtics', 'Miami Heat'],
      startTime: new Date(Date.now() + 25 * 60 * 60 * 1000),
      status: 'UPCOMING',
        oddsSnapshots: [{
          lineJSON: {
            over: { total: 215.5, odds: -105 },
            under: { total: 215.5, odds: -115 }
          },
          ts: new Date()
        }]
    },
    // NFL Markets
    {
      id: 'mock_nfl_1',
      sport: 'NFL',
      league: 'National Football League',
      eventId: 'nfl-mock-1',
      marketType: 'MONEYLINE',
      participants: ['Kansas City Chiefs', 'Buffalo Bills'],
      startTime: new Date(Date.now() + 26 * 60 * 60 * 1000),
      status: 'UPCOMING',
      oddsSnapshots: [{
        lineJSON: {
          home: -140,
          away: 120
        },
        ts: new Date()
      }]
    },
    {
      id: 'mock_nfl_2',
      sport: 'NFL',
      league: 'National Football League',
      eventId: 'nfl-mock-2',
      marketType: 'SPREAD',
      participants: ['Kansas City Chiefs', 'Buffalo Bills'],
      startTime: new Date(Date.now() + 26 * 60 * 60 * 1000),
      status: 'UPCOMING',
      oddsSnapshots: [{
        lineJSON: {
          home: { spread: -3.5, odds: -110 },
          away: { spread: 3.5, odds: -110 }
        },
        ts: new Date()
      }]
    },
    {
      id: 'mock_nfl_3',
      sport: 'NFL',
      league: 'National Football League',
      eventId: 'nfl-mock-3',
      marketType: 'TOTAL',
      participants: ['Kansas City Chiefs', 'Buffalo Bills'],
      startTime: new Date(Date.now() + 26 * 60 * 60 * 1000),
      status: 'UPCOMING',
        oddsSnapshots: [{
          lineJSON: {
            over: { total: 52.5, odds: -110 },
            under: { total: 52.5, odds: -110 }
          },
          ts: new Date()
        }]
    },
    // MLB Markets
    {
      id: 'mock_mlb_1',
      sport: 'MLB',
      league: 'Major League Baseball',
      eventId: 'mlb-mock-1',
      marketType: 'MONEYLINE',
      participants: ['New York Yankees', 'Boston Red Sox'],
      startTime: new Date(Date.now() + 27 * 60 * 60 * 1000),
      status: 'UPCOMING',
      oddsSnapshots: [{
        lineJSON: {
          home: -110,
          away: -110
        },
        ts: new Date()
      }]
    },
    {
      id: 'mock_mlb_2',
      sport: 'MLB',
      league: 'Major League Baseball',
      eventId: 'mlb-mock-2',
      marketType: 'SPREAD',
      participants: ['New York Yankees', 'Boston Red Sox'],
      startTime: new Date(Date.now() + 27 * 60 * 60 * 1000),
      status: 'UPCOMING',
      oddsSnapshots: [{
        lineJSON: {
          home: { spread: -1.5, odds: -120 },
          away: { spread: 1.5, odds: 100 }
        },
        ts: new Date()
      }]
    },
    {
      id: 'mock_mlb_3',
      sport: 'MLB',
      league: 'Major League Baseball',
      eventId: 'mlb-mock-3',
      marketType: 'TOTAL',
      participants: ['New York Yankees', 'Boston Red Sox'],
      startTime: new Date(Date.now() + 27 * 60 * 60 * 1000),
      status: 'UPCOMING',
        oddsSnapshots: [{
          lineJSON: {
            over: { total: 8.5, odds: -105 },
            under: { total: 8.5, odds: -115 }
          },
          ts: new Date()
        }]
    },
    // NHL Markets
    {
      id: 'mock_nhl_1',
      sport: 'NHL',
      league: 'National Hockey League',
      eventId: 'nhl-mock-1',
      marketType: 'MONEYLINE',
      participants: ['Toronto Maple Leafs', 'Montreal Canadiens'],
      startTime: new Date(Date.now() + 28 * 60 * 60 * 1000),
      status: 'UPCOMING',
      oddsSnapshots: [{
        lineJSON: {
          home: -130,
          away: 110
        },
        ts: new Date()
      }]
    },
    {
      id: 'mock_nhl_2',
      sport: 'NHL',
      league: 'National Hockey League',
      eventId: 'nhl-mock-2',
      marketType: 'SPREAD',
      participants: ['Toronto Maple Leafs', 'Montreal Canadiens'],
      startTime: new Date(Date.now() + 28 * 60 * 60 * 1000),
      status: 'UPCOMING',
      oddsSnapshots: [{
        lineJSON: {
          home: { spread: -1.5, odds: -110 },
          away: { spread: 1.5, odds: -110 }
        },
        ts: new Date()
      }]
    },
    {
      id: 'mock_nhl_3',
      sport: 'NHL',
      league: 'National Hockey League',
      eventId: 'nhl-mock-3',
      marketType: 'TOTAL',
      participants: ['Toronto Maple Leafs', 'Montreal Canadiens'],
      startTime: new Date(Date.now() + 28 * 60 * 60 * 1000),
      status: 'UPCOMING',
        oddsSnapshots: [{
          lineJSON: {
            over: { total: 6.5, odds: -110 },
            under: { total: 6.5, odds: -110 }
          },
          ts: new Date()
        }]
    }
  ]
}
