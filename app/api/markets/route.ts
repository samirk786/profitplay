import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { oddsApiService } from '@/lib/odds-api'

export const dynamic = 'force-dynamic'

// Helper to generate random engagement between min and max
function randomEngagement(min: number, max: number): string {
  const val = Math.floor(Math.random() * (max - min + 1)) + min
  return `${(val / 1000).toFixed(1)}K`
}

// Helper to generate random odds between -120 and -105
function randomOdds(): number {
  const odds = [-110, -108, -112, -105, -115, -109, -107, -113, -106, -114]
  return odds[Math.floor(Math.random() * odds.length)]
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
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

    // Check if this is a player props request (starts with PLAYER_)
    const isPlayerPropsRequest = marketType && marketType.startsWith('PLAYER_')
    
    // Valid Prisma enum market types (only NFL player props are in schema)
    const validMarketTypes = [
      'MONEYLINE', 'SPREAD', 'TOTAL', 'PROPS',
      'PLAYER_PASS_TDS', 'PLAYER_PASS_YDS', 'PLAYER_PASS_COMPLETIONS',
      'PLAYER_RUSH_YDS', 'PLAYER_RUSH_ATT', 'PLAYER_REC_YDS',
      'PLAYER_REC_RECEPTIONS', 'PLAYER_REC_TDS'
    ]
    
    // Track if we should skip database query for unsupported player prop types
    let skipDatabaseQuery = false
    
    if (marketType && marketType !== 'ALL') {
      // For database queries, only use valid Prisma enum types
      // For NBA/MLB/NHL player props that aren't in schema, we'll use mock data
      if (validMarketTypes.includes(marketType)) {
        where.marketType = marketType as any
      } else if (isPlayerPropsRequest) {
        // For unsupported player prop types (NBA/MLB/NHL), skip database query
        skipDatabaseQuery = true
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

    // Query markets from database (including player props)
    // Production flow: Database → API → Mock fallback
    let markets: any[] = []
    
    try {
      // Step 1: Try to fetch from database first (real data if available)
      // Skip database query for unsupported player prop types (NBA/MLB/NHL)
      if (!skipDatabaseQuery) {
        markets = await prisma.market.findMany({
          where,
          include: {
            oddsSnapshots: {
              where: {
                ts: {
                  gte: new Date(Date.now() - 30 * 60 * 1000) // Last 30 minutes
                }
              },
              orderBy: { ts: 'desc' },
              take: 1
            }
          },
          orderBy: { startTime: 'asc' }
        })
      }

      // Step 2: For player props, if no data or refresh requested, try fetching from API
      if (marketType && marketType.startsWith('PLAYER_')) {
        const needsRefresh = refresh || markets.length === 0 || markets.every(m => !m.oddsSnapshots || m.oddsSnapshots.length === 0)
        
        if (needsRefresh && sport && sport !== 'ALL') {
          try {
            const sportKey = mapSportToOddsApiKey(sport)
            console.log(`🔄 Fetching live player props from API for ${sport} - ${marketType}`)
            
            // Fetch player props from Odds API (if supported)
            const playerPropsData = await oddsApiService.fetchPlayerProps(sportKey)
            
            // If API returns data, store it in database for future queries
            if (playerPropsData && playerPropsData.length > 0) {
              console.log(`✅ Received ${playerPropsData.length} player props from API, storing in database`)
              await syncPlayerPropsToDatabase(playerPropsData, marketType)
              
              // Re-query from database after sync to get the fresh data
              markets = await prisma.market.findMany({
                where,
                include: {
                  oddsSnapshots: {
                    where: {
                      ts: {
                        gte: new Date(Date.now() - 30 * 60 * 1000)
                      }
                    },
                    orderBy: { ts: 'desc' },
                    take: 1
                  }
                },
                orderBy: { startTime: 'asc' }
              })
            } else {
              console.log(`⚠️  No player props data returned from API for ${sport}`)
            }
          } catch (error) {
            console.warn('❌ Failed to fetch player props from API:', error)
            // Continue to check if we have any cached data, otherwise fall back to mocks
          }
        }
        
        // Step 3: If still no real data, use mock data as fallback
        // NOTE: The Odds API may not support player props. For production, consider:
        // - Integrating with a specialized player props API (OddsJam, MetaBet, etc.)
        // - Or implementing a scheduled job to sync player props from an API that supports them
        // Mock data is used here for demonstration/presentation purposes
        // For NBA/MLB/NHL player props not in schema, always use mock data
        const isUnsupportedPlayerProp = isPlayerPropsRequest && marketType && !validMarketTypes.includes(marketType)
        const needsMockData = isUnsupportedPlayerProp || markets.length === 0 || markets.every(m => !m.oddsSnapshots || m.oddsSnapshots.length === 0)
        if (needsMockData && marketType) {
          console.log(`📝 Using mock player props data for ${sport} - ${marketType}`)
          console.log(`   ℹ️  Note: The Odds API may not support player props. Mock data used for demo.`)
          const mockMarkets = getMockPlayerProps(sport || 'NFL', marketType)
          // Store mock markets in database so they can be referenced when placing bets
          await syncMockPlayerPropsToDatabase(mockMarkets, sport || 'NFL', marketType)
          markets = mockMarkets
        }
      } else {
        // For regular markets: if no data, use mock markets as fallback
        if (markets.length === 0 || markets.every(m => !m.oddsSnapshots || m.oddsSnapshots.length === 0)) {
          console.log('No markets with odds found, using mock data')
          markets = getMockMarkets()
        }
      }
    } catch (error) {
      console.warn('Database query failed:', error)
      // Fall back to mock data only if database completely fails
      if (marketType && marketType.startsWith('PLAYER_')) {
        markets = getMockPlayerProps(sport || 'NFL', marketType)
      } else {
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

      const formatted: any = {
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

      // Include metadata if it exists (for player props)
      if (market._metadata) {
        formatted._metadata = market._metadata
      }

      return formatted
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

// Helper function to sync player props from API to database
async function syncPlayerPropsToDatabase(processedMarkets: any[], requestedMarketType?: string) {
  try {
    for (const event of processedMarkets) {
      // Each processed market represents a player prop event
      for (const marketData of event.markets) {
        // Filter by requested market type if specified
        if (requestedMarketType && marketData.marketType !== requestedMarketType) {
          continue
        }

        // Create or update market for this player prop
        const marketId = `${event.eventId}-${marketData.marketType}`
        
        const market = await prisma.market.upsert({
          where: { id: marketId },
          update: {
            sport: event.sport,
            league: event.league,
            participants: event.participants,
            startTime: event.startTime,
            status: 'UPCOMING'
          },
          create: {
            id: marketId,
            sport: event.sport,
            league: event.league,
            eventId: event.eventId,
            marketType: marketData.marketType as any,
            participants: event.participants,
            startTime: event.startTime,
            status: 'UPCOMING'
          }
        })

        // Create odds snapshot
        await prisma.oddsSnapshot.create({
          data: {
            marketId: market.id,
            bookmaker: marketData.bookmaker,
            lineJSON: marketData.odds
          }
        })
      }
    }
    console.log(`✅ Synced ${processedMarkets.length} player props events to database`)
  } catch (error) {
    console.error('Error syncing player props to database:', error)
    throw error
  }
}

// Helper function to sync mock player props to database
async function syncMockPlayerPropsToDatabase(mockMarkets: any[], sport: string, marketType: string) {
  // Valid Prisma enum market types
  const validMarketTypes = [
    'MONEYLINE', 'SPREAD', 'TOTAL', 'PROPS',
    'PLAYER_PASS_TDS', 'PLAYER_PASS_YDS', 'PLAYER_PASS_COMPLETIONS',
    'PLAYER_RUSH_YDS', 'PLAYER_RUSH_ATT', 'PLAYER_REC_YDS',
    'PLAYER_REC_RECEPTIONS', 'PLAYER_REC_TDS'
  ]

  try {
    for (const market of mockMarkets) {
      // Use a stable ID based on player name and market type (not timestamp)
      // This ensures we can find the market when placing bets
      const playerName = market._metadata?.player || market.participants[0] || 'unknown'
      const stableId = `mock_${sport}_${marketType}_${playerName.replace(/\s+/g, '_').toLowerCase()}_${market._metadata?.team || 'unknown'}`

      // Use PROPS as market type for unsupported types (works with Prisma schema)
      const dbMarketType = marketType.startsWith('PLAYER_') && !validMarketTypes.includes(marketType)
        ? 'PROPS'
        : marketType

      // Create or update market
      const dbMarket = await prisma.market.upsert({
        where: { id: stableId },
        update: {
          sport: market.sport,
          league: market.league,
          participants: market.participants,
          startTime: market.startTime,
          status: 'UPCOMING'
        },
        create: {
          id: stableId,
          sport: market.sport,
          league: market.league,
          eventId: market.eventId,
          marketType: dbMarketType as any,
          participants: market.participants,
          startTime: market.startTime,
          status: 'UPCOMING'
        }
      })

      // Create odds snapshot if it doesn't exist (check if one exists in last 24 hours)
      const recentSnapshot = await prisma.oddsSnapshot.findFirst({
        where: {
          marketId: dbMarket.id,
          ts: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      })

      if (!recentSnapshot && market.oddsSnapshots && market.oddsSnapshots[0]) {
        await prisma.oddsSnapshot.create({
          data: {
            marketId: dbMarket.id,
            bookmaker: 'MOCK',
            lineJSON: market.oddsSnapshots[0].lineJSON
          }
        })
      }

      // Update the market ID in the returned data to use the stable ID
      market.id = stableId
    }
    console.log(`✅ Synced ${mockMarkets.length} mock player props to database`)
  } catch (error) {
    console.error('Error syncing mock player props to database:', error)
    // Don't throw - we still want to return the mock data even if sync fails
  }
}

// Comprehensive player props data - 20+ players per category
function getMockPlayerProps(sport: string, marketType: string): any[] {
  const playerPropsData = getComprehensivePlayerProps()
  const players = playerPropsData[sport]?.[marketType] || []

  if (players.length === 0) {
    return []
  }

  const baseTime = new Date(Date.now() + 24 * 60 * 60 * 1000) // Tomorrow

  return players.map((p: any, index: number) => {
    // Use stable ID (will be updated by syncMockPlayerPropsToDatabase)
    const playerName = p.player || 'unknown'
    const stableId = `mock_${sport}_${marketType}_${playerName.replace(/\s+/g, '_').toLowerCase()}_${p.team || 'unknown'}`
    
    return {
      id: stableId,
      sport: sport,
      league: sport === 'NBA' ? 'National Basketball Association' : 
              sport === 'NFL' ? 'National Football League' :
              sport === 'MLB' ? 'Major League Baseball' :
              sport === 'NHL' ? 'National Hockey League' : 'Professional League',
      eventId: `mock_${sport}_${playerName.replace(/\s+/g, '_').toLowerCase()}_${index}`,
      marketType: marketType,
      participants: [p.player, p.team],
      startTime: new Date(baseTime.getTime() + index * 60 * 60 * 1000),
      status: 'UPCOMING',
      oddsSnapshots: [{
        lineJSON: {
          over: { total: p.value, odds: p.odds },
          under: { total: p.value, odds: p.odds }
        },
        ts: new Date()
      }],
      _metadata: {
        player: p.player,
        team: p.team,
        jersey: p.jersey,
        matchup: p.matchup,
        engagement: p.engagement
      }
    }
  })
}

// Comprehensive player props data with 20+ players per category
function getComprehensivePlayerProps(): any {
  return {
    NBA: {
      PLAYER_POINTS: [
        { player: 'Giannis Antetokounmpo', team: 'MIL', jersey: 34, matchup: 'Milwaukee Bucks @ Dallas Mavericks', value: 30.5, odds: -110, engagement: '19.5K' },
        { player: 'Luka Doncic', team: 'DAL', jersey: 77, matchup: 'Milwaukee Bucks @ Dallas Mavericks', value: 32.5, odds: -115, engagement: '19.2K' },
        { player: 'Damian Lillard', team: 'MIL', jersey: 0, matchup: 'Milwaukee Bucks @ Dallas Mavericks', value: 25.5, odds: -108, engagement: '17.8K' },
        { player: 'Kyrie Irving', team: 'DAL', jersey: 11, matchup: 'Milwaukee Bucks @ Dallas Mavericks', value: 24.5, odds: -112, engagement: '18.1K' },
        { player: 'Khris Middleton', team: 'MIL', jersey: 22, matchup: 'Milwaukee Bucks @ Dallas Mavericks', value: 18.5, odds: -110, engagement: '14.2K' },
        { player: 'LeBron James', team: 'LAL', jersey: 23, matchup: 'Los Angeles Lakers @ Phoenix Suns', value: 28.5, odds: -105, engagement: '21.3K' },
        { player: 'Kevin Durant', team: 'PHX', jersey: 35, matchup: 'Los Angeles Lakers @ Phoenix Suns', value: 29.5, odds: -108, engagement: '20.7K' },
        { player: 'Stephen Curry', team: 'GSW', jersey: 30, matchup: 'Golden State Warriors @ Denver Nuggets', value: 27.5, odds: -110, engagement: '19.8K' },
        { player: 'Nikola Jokic', team: 'DEN', jersey: 15, matchup: 'Golden State Warriors @ Denver Nuggets', value: 26.5, odds: -112, engagement: '18.5K' },
        { player: 'Jayson Tatum', team: 'BOS', jersey: 0, matchup: 'Boston Celtics @ Miami Heat', value: 31.5, odds: -108, engagement: '20.1K' },
        { player: 'Devin Booker', team: 'PHX', jersey: 1, matchup: 'Los Angeles Lakers @ Phoenix Suns', value: 27.5, odds: -109, engagement: '17.5K' },
        { player: 'Anthony Edwards', team: 'MIN', jersey: 1, matchup: 'Minnesota Timberwolves @ Sacramento Kings', value: 26.5, odds: -111, engagement: '16.8K' },
        { player: 'Donovan Mitchell', team: 'CLE', jersey: 45, matchup: 'Cleveland Cavaliers @ Orlando Magic', value: 28.5, odds: -107, engagement: '18.2K' },
        { player: 'Jaylen Brown', team: 'BOS', jersey: 7, matchup: 'Boston Celtics @ Miami Heat', value: 24.5, odds: -110, engagement: '16.5K' },
        { player: 'Kawhi Leonard', team: 'LAC', jersey: 2, matchup: 'LA Clippers @ New Orleans Pelicans', value: 23.5, odds: -108, engagement: '17.1K' },
        { player: 'Paul George', team: 'LAC', jersey: 13, matchup: 'LA Clippers @ New Orleans Pelicans', value: 22.5, odds: -112, engagement: '15.9K' },
        { player: 'Joel Embiid', team: 'PHI', jersey: 21, matchup: 'Philadelphia 76ers @ Brooklyn Nets', value: 30.5, odds: -105, engagement: '19.1K' },
        { player: 'Shai Gilgeous-Alexander', team: 'OKC', jersey: 2, matchup: 'Oklahoma City Thunder @ San Antonio Spurs', value: 30.5, odds: -108, engagement: '18.7K' },
        { player: 'Tyrese Haliburton', team: 'IND', jersey: 0, matchup: 'Indiana Pacers @ Chicago Bulls', value: 22.5, odds: -110, engagement: '15.8K' },
        { player: 'Paolo Banchero', team: 'ORL', jersey: 5, matchup: 'Cleveland Cavaliers @ Orlando Magic', value: 23.5, odds: -109, engagement: '16.2K' },
        { player: 'Jamal Murray', team: 'DEN', jersey: 27, matchup: 'Golden State Warriors @ Denver Nuggets', value: 21.5, odds: -111, engagement: '14.9K' },
        { player: 'De\'Aaron Fox', team: 'SAC', jersey: 5, matchup: 'Minnesota Timberwolves @ Sacramento Kings', value: 25.5, odds: -107, engagement: '17.4K' },
      ],
      PLAYER_REBOUNDS: [
        { player: 'Giannis Antetokounmpo', team: 'MIL', jersey: 34, matchup: 'Milwaukee Bucks @ Dallas Mavericks', value: 11.5, odds: -110, engagement: '15.2K' },
        { player: 'Nikola Jokic', team: 'DEN', jersey: 15, matchup: 'Golden State Warriors @ Denver Nuggets', value: 13.5, odds: -105, engagement: '16.8K' },
        { player: 'Joel Embiid', team: 'PHI', jersey: 21, matchup: 'Philadelphia 76ers @ Brooklyn Nets', value: 11.5, odds: -112, engagement: '14.9K' },
        { player: 'Rudy Gobert', team: 'MIN', jersey: 27, matchup: 'Minnesota Timberwolves @ Sacramento Kings', value: 12.5, odds: -110, engagement: '13.5K' },
        { player: 'Domantas Sabonis', team: 'SAC', jersey: 10, matchup: 'Minnesota Timberwolves @ Sacramento Kings', value: 14.5, odds: -108, engagement: '15.3K' },
        { player: 'Anthony Davis', team: 'LAL', jersey: 3, matchup: 'Los Angeles Lakers @ Phoenix Suns', value: 11.5, odds: -109, engagement: '14.7K' },
        { player: 'Evan Mobley', team: 'CLE', jersey: 4, matchup: 'Cleveland Cavaliers @ Orlando Magic', value: 9.5, odds: -111, engagement: '12.8K' },
        { player: 'Bam Adebayo', team: 'MIA', jersey: 13, matchup: 'Boston Celtics @ Miami Heat', value: 10.5, odds: -107, engagement: '13.2K' },
        { player: 'Jarrett Allen', team: 'CLE', jersey: 31, matchup: 'Cleveland Cavaliers @ Orlando Magic', value: 10.5, odds: -110, engagement: '12.5K' },
        { player: 'Myles Turner', team: 'IND', jersey: 33, matchup: 'Indiana Pacers @ Chicago Bulls', value: 7.5, odds: -108, engagement: '11.2K' },
        { player: 'Alperen Sengun', team: 'HOU', jersey: 28, matchup: 'Houston Rockets @ Memphis Grizzlies', value: 9.5, odds: -112, engagement: '12.1K' },
        { player: 'Kristaps Porzingis', team: 'BOS', jersey: 8, matchup: 'Boston Celtics @ Miami Heat', value: 8.5, odds: -109, engagement: '11.8K' },
        { player: 'Jusuf Nurkic', team: 'PHX', jersey: 20, matchup: 'Los Angeles Lakers @ Phoenix Suns', value: 9.5, odds: -111, engagement: '11.5K' },
        { player: 'Ivica Zubac', team: 'LAC', jersey: 40, matchup: 'LA Clippers @ New Orleans Pelicans', value: 9.5, odds: -107, engagement: '11.1K' },
        { player: 'Walker Kessler', team: 'UTA', jersey: 24, matchup: 'Utah Jazz @ Portland Trail Blazers', value: 10.5, odds: -110, engagement: '11.9K' },
        { player: 'Clint Capela', team: 'ATL', jersey: 15, matchup: 'Atlanta Hawks @ New York Knicks', value: 11.5, odds: -108, engagement: '12.3K' },
        { player: 'Daniel Gafford', team: 'DAL', jersey: 21, matchup: 'Milwaukee Bucks @ Dallas Mavericks', value: 8.5, odds: -112, engagement: '10.8K' },
        { player: 'Chet Holmgren', team: 'OKC', jersey: 7, matchup: 'Oklahoma City Thunder @ San Antonio Spurs', value: 8.5, odds: -109, engagement: '12.4K' },
        { player: 'Mitchell Robinson', team: 'NYK', jersey: 23, matchup: 'Atlanta Hawks @ New York Knicks', value: 9.5, odds: -111, engagement: '11.6K' },
        { player: 'Nic Claxton', team: 'BKN', jersey: 33, matchup: 'Philadelphia 76ers @ Brooklyn Nets', value: 9.5, odds: -107, engagement: '11.3K' },
      ],
      PLAYER_ASSISTS: [
        { player: 'Luka Doncic', team: 'DAL', jersey: 77, matchup: 'Milwaukee Bucks @ Dallas Mavericks', value: 9.5, odds: -110, engagement: '16.4K' },
        { player: 'Nikola Jokic', team: 'DEN', jersey: 15, matchup: 'Golden State Warriors @ Denver Nuggets', value: 10.5, odds: -105, engagement: '17.2K' },
        { player: 'Damian Lillard', team: 'MIL', jersey: 0, matchup: 'Milwaukee Bucks @ Dallas Mavericks', value: 7.5, odds: -108, engagement: '15.7K' },
        { player: 'James Harden', team: 'LAC', jersey: 1, matchup: 'LA Clippers @ New Orleans Pelicans', value: 8.5, odds: -112, engagement: '14.8K' },
        { player: 'Trae Young', team: 'ATL', jersey: 11, matchup: 'Atlanta Hawks @ New York Knicks', value: 9.5, odds: -110, engagement: '15.1K' },
        { player: 'Tyrese Haliburton', team: 'IND', jersey: 0, matchup: 'Indiana Pacers @ Chicago Bulls', value: 11.5, odds: -105, engagement: '16.8K' },
        { player: 'Chris Paul', team: 'GSW', jersey: 3, matchup: 'Golden State Warriors @ Denver Nuggets', value: 7.5, odds: -109, engagement: '13.2K' },
        { player: 'Dejounte Murray', team: 'ATL', jersey: 5, matchup: 'Atlanta Hawks @ New York Knicks', value: 6.5, odds: -111, engagement: '12.8K' },
        { player: 'Jrue Holiday', team: 'BOS', jersey: 4, matchup: 'Boston Celtics @ Miami Heat', value: 6.5, odds: -107, engagement: '12.5K' },
        { player: 'Shai Gilgeous-Alexander', team: 'OKC', jersey: 2, matchup: 'Oklahoma City Thunder @ San Antonio Spurs', value: 6.5, odds: -110, engagement: '14.2K' },
        { player: 'LaMelo Ball', team: 'CHA', jersey: 1, matchup: 'Charlotte Hornets @ Washington Wizards', value: 8.5, odds: -108, engagement: '14.5K' },
        { player: 'Cade Cunningham', team: 'DET', jersey: 2, matchup: 'Detroit Pistons @ Toronto Raptors', value: 7.5, odds: -112, engagement: '13.1K' },
        { player: 'Russell Westbrook', team: 'LAC', jersey: 0, matchup: 'LA Clippers @ New Orleans Pelicans', value: 5.5, odds: -109, engagement: '11.8K' },
        { player: 'Jalen Brunson', team: 'NYK', jersey: 11, matchup: 'Atlanta Hawks @ New York Knicks', value: 7.5, odds: -111, engagement: '13.9K' },
        { player: 'D\'Angelo Russell', team: 'LAL', jersey: 1, matchup: 'Los Angeles Lakers @ Phoenix Suns', value: 6.5, odds: -107, engagement: '12.3K' },
        { player: 'Fred VanVleet', team: 'HOU', jersey: 5, matchup: 'Houston Rockets @ Memphis Grizzlies', value: 7.5, odds: -110, engagement: '12.6K' },
        { player: 'Kyle Lowry', team: 'MIA', jersey: 7, matchup: 'Boston Celtics @ Miami Heat', value: 5.5, odds: -108, engagement: '11.2K' },
        { player: 'Mike Conley', team: 'MIN', jersey: 10, matchup: 'Minnesota Timberwolves @ Sacramento Kings', value: 6.5, odds: -112, engagement: '11.5K' },
        { player: 'Jamal Murray', team: 'DEN', jersey: 27, matchup: 'Golden State Warriors @ Denver Nuggets', value: 6.5, odds: -109, engagement: '13.4K' },
        { player: 'De\'Aaron Fox', team: 'SAC', jersey: 5, matchup: 'Minnesota Timberwolves @ Sacramento Kings', value: 6.5, odds: -111, engagement: '13.7K' },
      ],
      PLAYER_STEALS: [
        { player: 'Jimmy Butler', team: 'MIA', jersey: 22, matchup: 'Boston Celtics @ Miami Heat', value: 1.5, odds: -110, engagement: '12.3K' },
        { player: 'Fred VanVleet', team: 'HOU', jersey: 5, matchup: 'Houston Rockets @ Memphis Grizzlies', value: 1.5, odds: -108, engagement: '11.8K' },
        { player: 'Dejounte Murray', team: 'ATL', jersey: 5, matchup: 'Atlanta Hawks @ New York Knicks', value: 2.5, odds: -115, engagement: '13.2K' },
        { player: 'Kawhi Leonard', team: 'LAC', jersey: 2, matchup: 'LA Clippers @ New Orleans Pelicans', value: 1.5, odds: -109, engagement: '11.5K' },
        { player: 'Chris Paul', team: 'GSW', jersey: 3, matchup: 'Golden State Warriors @ Denver Nuggets', value: 1.5, odds: -111, engagement: '11.2K' },
        { player: 'Matisse Thybulle', team: 'POR', jersey: 4, matchup: 'Utah Jazz @ Portland Trail Blazers', value: 1.5, odds: -107, engagement: '10.8K' },
        { player: 'Herb Jones', team: 'NOP', jersey: 5, matchup: 'LA Clippers @ New Orleans Pelicans', value: 1.5, odds: -110, engagement: '10.5K' },
        { player: 'Alex Caruso', team: 'CHI', jersey: 6, matchup: 'Indiana Pacers @ Chicago Bulls', value: 1.5, odds: -108, engagement: '10.9K' },
        { player: 'OG Anunoby', team: 'NYK', jersey: 8, matchup: 'Atlanta Hawks @ New York Knicks', value: 1.5, odds: -112, engagement: '11.1K' },
        { player: 'Tyler Herro', team: 'MIA', jersey: 14, matchup: 'Boston Celtics @ Miami Heat', value: 1.5, odds: -109, engagement: '10.6K' },
      ],
      PLAYER_BLOCKS: [
        { player: 'Anthony Davis', team: 'LAL', jersey: 3, matchup: 'Los Angeles Lakers @ Phoenix Suns', value: 2.5, odds: -110, engagement: '13.7K' },
        { player: 'Evan Mobley', team: 'CLE', jersey: 4, matchup: 'Cleveland Cavaliers @ Orlando Magic', value: 1.5, odds: -108, engagement: '12.1K' },
        { player: 'Victor Wembanyama', team: 'SAN', jersey: 1, matchup: 'San Antonio Spurs @ Oklahoma City Thunder', value: 3.5, odds: -105, engagement: '14.9K' },
        { player: 'Rudy Gobert', team: 'MIN', jersey: 27, matchup: 'Minnesota Timberwolves @ Sacramento Kings', value: 2.5, odds: -109, engagement: '12.8K' },
        { player: 'Brook Lopez', team: 'MIL', jersey: 11, matchup: 'Milwaukee Bucks @ Dallas Mavericks', value: 2.5, odds: -111, engagement: '12.3K' },
        { player: 'Myles Turner', team: 'IND', jersey: 33, matchup: 'Indiana Pacers @ Chicago Bulls', value: 2.5, odds: -107, engagement: '11.9K' },
        { player: 'Jarrett Allen', team: 'CLE', jersey: 31, matchup: 'Cleveland Cavaliers @ Orlando Magic', value: 1.5, odds: -110, engagement: '11.5K' },
        { player: 'Nic Claxton', team: 'BKN', jersey: 33, matchup: 'Philadelphia 76ers @ Brooklyn Nets', value: 2.5, odds: -108, engagement: '11.7K' },
        { player: 'Ivica Zubac', team: 'LAC', jersey: 40, matchup: 'LA Clippers @ New Orleans Pelicans', value: 1.5, odds: -112, engagement: '10.8K' },
        { player: 'Walker Kessler', team: 'UTA', jersey: 24, matchup: 'Utah Jazz @ Portland Trail Blazers', value: 2.5, odds: -109, engagement: '11.4K' },
        { player: 'Chet Holmgren', team: 'OKC', jersey: 7, matchup: 'Oklahoma City Thunder @ San Antonio Spurs', value: 2.5, odds: -111, engagement: '12.1K' },
        { player: 'Clint Capela', team: 'ATL', jersey: 15, matchup: 'Atlanta Hawks @ New York Knicks', value: 1.5, odds: -107, engagement: '10.9K' },
      ],
      PLAYER_THREES: [
        { player: 'Stephen Curry', team: 'GSW', jersey: 30, matchup: 'Golden State Warriors @ Denver Nuggets', value: 4.5, odds: -110, engagement: '16.5K' },
        { player: 'Klay Thompson', team: 'GSW', jersey: 11, matchup: 'Golden State Warriors @ Denver Nuggets', value: 3.5, odds: -108, engagement: '14.3K' },
        { player: 'Luka Doncic', team: 'DAL', jersey: 77, matchup: 'Milwaukee Bucks @ Dallas Mavericks', value: 3.5, odds: -112, engagement: '15.2K' },
        { player: 'Damian Lillard', team: 'MIL', jersey: 0, matchup: 'Milwaukee Bucks @ Dallas Mavericks', value: 3.5, odds: -109, engagement: '14.8K' },
        { player: 'Trae Young', team: 'ATL', jersey: 11, matchup: 'Atlanta Hawks @ New York Knicks', value: 3.5, odds: -111, engagement: '14.1K' },
        { player: 'Tyrese Haliburton', team: 'IND', jersey: 0, matchup: 'Indiana Pacers @ Chicago Bulls', value: 3.5, odds: -107, engagement: '13.5K' },
        { player: 'Donovan Mitchell', team: 'CLE', jersey: 45, matchup: 'Cleveland Cavaliers @ Orlando Magic', value: 3.5, odds: -110, engagement: '13.8K' },
        { player: 'Devin Booker', team: 'PHX', jersey: 1, matchup: 'Los Angeles Lakers @ Phoenix Suns', value: 2.5, odds: -108, engagement: '12.9K' },
        { player: 'Jayson Tatum', team: 'BOS', jersey: 0, matchup: 'Boston Celtics @ Miami Heat', value: 3.5, odds: -112, engagement: '14.5K' },
        { player: 'Jaylen Brown', team: 'BOS', jersey: 7, matchup: 'Boston Celtics @ Miami Heat', value: 2.5, odds: -109, engagement: '12.6K' },
        { player: 'Anthony Edwards', team: 'MIN', jersey: 1, matchup: 'Minnesota Timberwolves @ Sacramento Kings', value: 3.5, odds: -111, engagement: '13.9K' },
        { player: 'Paul George', team: 'LAC', jersey: 13, matchup: 'LA Clippers @ New Orleans Pelicans', value: 3.5, odds: -107, engagement: '13.2K' },
        { player: 'Kevin Durant', team: 'PHX', jersey: 35, matchup: 'Los Angeles Lakers @ Phoenix Suns', value: 2.5, odds: -110, engagement: '13.4K' },
        { player: 'LaMelo Ball', team: 'CHA', jersey: 1, matchup: 'Charlotte Hornets @ Washington Wizards', value: 3.5, odds: -108, engagement: '13.1K' },
        { player: 'Cade Cunningham', team: 'DET', jersey: 2, matchup: 'Detroit Pistons @ Toronto Raptors', value: 2.5, odds: -112, engagement: '11.8K' },
      ],
    },
    NFL: {
      PLAYER_PASS_YDS: [
        { player: 'Josh Allen', team: 'BUF', jersey: 17, matchup: 'Buffalo Bills @ Kansas City Chiefs', value: 275.5, odds: -110, engagement: '18.5K' },
        { player: 'Patrick Mahomes', team: 'KC', jersey: 15, matchup: 'Buffalo Bills @ Kansas City Chiefs', value: 285.5, odds: -108, engagement: '19.2K' },
        { player: 'Lamar Jackson', team: 'BAL', jersey: 8, matchup: 'Baltimore Ravens @ Cincinnati Bengals', value: 265.5, odds: -112, engagement: '17.8K' },
        { player: 'Dak Prescott', team: 'DAL', jersey: 4, matchup: 'Dallas Cowboys @ Philadelphia Eagles', value: 270.5, odds: -110, engagement: '18.1K' },
        { player: 'Tua Tagovailoa', team: 'MIA', jersey: 1, matchup: 'Miami Dolphins @ New York Jets', value: 260.5, odds: -108, engagement: '16.9K' },
        { player: 'Jalen Hurts', team: 'PHI', jersey: 1, matchup: 'Dallas Cowboys @ Philadelphia Eagles', value: 255.5, odds: -112, engagement: '17.3K' },
        { player: 'Justin Herbert', team: 'LAC', jersey: 10, matchup: 'Las Vegas Raiders @ Los Angeles Chargers', value: 265.5, odds: -109, engagement: '16.5K' },
        { player: 'Joe Burrow', team: 'CIN', jersey: 9, matchup: 'Baltimore Ravens @ Cincinnati Bengals', value: 260.5, odds: -111, engagement: '17.1K' },
        { player: 'Trevor Lawrence', team: 'JAX', jersey: 16, matchup: 'Indianapolis Colts @ Jacksonville Jaguars', value: 250.5, odds: -107, engagement: '15.8K' },
        { player: 'Geno Smith', team: 'SEA', jersey: 7, matchup: 'San Francisco 49ers @ Seattle Seahawks', value: 245.5, odds: -110, engagement: '15.2K' },
        { player: 'Kirk Cousins', team: 'MIN', jersey: 8, matchup: 'Minnesota Vikings @ Green Bay Packers', value: 255.5, odds: -108, engagement: '15.9K' },
        { player: 'Deshaun Watson', team: 'CLE', jersey: 4, matchup: 'Cleveland Browns @ Pittsburgh Steelers', value: 240.5, odds: -112, engagement: '14.5K' },
        { player: 'Russell Wilson', team: 'DEN', jersey: 3, matchup: 'Denver Broncos @ Los Angeles Rams', value: 235.5, odds: -109, engagement: '14.1K' },
        { player: 'Brock Purdy', team: 'SF', jersey: 13, matchup: 'San Francisco 49ers @ Seattle Seahawks', value: 245.5, odds: -111, engagement: '15.6K' },
        { player: 'Matthew Stafford', team: 'LAR', jersey: 9, matchup: 'Denver Broncos @ Los Angeles Rams', value: 250.5, odds: -107, engagement: '15.4K' },
        { player: 'Jared Goff', team: 'DET', jersey: 16, matchup: 'Detroit Lions @ New Orleans Saints', value: 245.5, odds: -110, engagement: '15.1K' },
        { player: 'Derek Carr', team: 'NO', jersey: 4, matchup: 'Detroit Lions @ New Orleans Saints', value: 240.5, odds: -108, engagement: '14.8K' },
        { player: 'Daniel Jones', team: 'NYG', jersey: 8, matchup: 'New York Giants @ Washington Commanders', value: 235.5, odds: -112, engagement: '13.9K' },
        { player: 'Sam Howell', team: 'WAS', jersey: 14, matchup: 'New York Giants @ Washington Commanders', value: 230.5, odds: -109, engagement: '13.5K' },
        { player: 'Jordan Love', team: 'GB', jersey: 10, matchup: 'Minnesota Vikings @ Green Bay Packers', value: 240.5, odds: -111, engagement: '14.7K' },
      ],
      PLAYER_PASS_TDS: [
        { player: 'Josh Allen', team: 'BUF', jersey: 17, matchup: 'Buffalo Bills @ Kansas City Chiefs', value: 2.5, odds: -110, engagement: '17.2K' },
        { player: 'Patrick Mahomes', team: 'KC', jersey: 15, matchup: 'Buffalo Bills @ Kansas City Chiefs', value: 2.5, odds: -108, engagement: '17.9K' },
        { player: 'Jalen Hurts', team: 'PHI', jersey: 1, matchup: 'Dallas Cowboys @ Philadelphia Eagles', value: 2.5, odds: -112, engagement: '16.8K' },
        { player: 'Lamar Jackson', team: 'BAL', jersey: 8, matchup: 'Baltimore Ravens @ Cincinnati Bengals', value: 1.5, odds: -109, engagement: '14.5K' },
        { player: 'Dak Prescott', team: 'DAL', jersey: 4, matchup: 'Dallas Cowboys @ Philadelphia Eagles', value: 2.5, odds: -111, engagement: '16.5K' },
        { player: 'Tua Tagovailoa', team: 'MIA', jersey: 1, matchup: 'Miami Dolphins @ New York Jets', value: 2.5, odds: -107, engagement: '16.2K' },
        { player: 'Justin Herbert', team: 'LAC', jersey: 10, matchup: 'Las Vegas Raiders @ Los Angeles Chargers', value: 2.5, odds: -110, engagement: '15.9K' },
        { player: 'Joe Burrow', team: 'CIN', jersey: 9, matchup: 'Baltimore Ravens @ Cincinnati Bengals', value: 2.5, odds: -108, engagement: '16.1K' },
        { player: 'Trevor Lawrence', team: 'JAX', jersey: 16, matchup: 'Indianapolis Colts @ Jacksonville Jaguars', value: 1.5, odds: -112, engagement: '14.2K' },
        { player: 'Brock Purdy', team: 'SF', jersey: 13, matchup: 'San Francisco 49ers @ Seattle Seahawks', value: 1.5, odds: -109, engagement: '13.8K' },
      ],
      PLAYER_RUSH_YDS: [
        { player: 'Christian McCaffrey', team: 'SF', jersey: 23, matchup: 'San Francisco 49ers @ Seattle Seahawks', value: 95.5, odds: -110, engagement: '16.4K' },
        { player: 'Derrick Henry', team: 'BAL', jersey: 22, matchup: 'Baltimore Ravens @ Cincinnati Bengals', value: 85.5, odds: -108, engagement: '15.7K' },
        { player: 'Jonathan Taylor', team: 'IND', jersey: 28, matchup: 'Indianapolis Colts @ Jacksonville Jaguars', value: 90.5, odds: -112, engagement: '15.9K' },
        { player: 'Lamar Jackson', team: 'BAL', jersey: 8, matchup: 'Baltimore Ravens @ Cincinnati Bengals', value: 65.5, odds: -110, engagement: '14.8K' },
        { player: 'Saquon Barkley', team: 'PHI', jersey: 26, matchup: 'Dallas Cowboys @ Philadelphia Eagles', value: 85.5, odds: -109, engagement: '15.2K' },
        { player: 'Josh Jacobs', team: 'LV', jersey: 28, matchup: 'Las Vegas Raiders @ Los Angeles Chargers', value: 80.5, odds: -111, engagement: '14.9K' },
        { player: 'Breece Hall', team: 'NYJ', jersey: 20, matchup: 'Miami Dolphins @ New York Jets', value: 75.5, odds: -107, engagement: '14.3K' },
        { player: 'Travis Etienne', team: 'JAX', jersey: 1, matchup: 'Indianapolis Colts @ Jacksonville Jaguars', value: 80.5, odds: -110, engagement: '14.6K' },
        { player: 'Jalen Hurts', team: 'PHI', jersey: 1, matchup: 'Dallas Cowboys @ Philadelphia Eagles', value: 45.5, odds: -108, engagement: '13.5K' },
        { player: 'Alvin Kamara', team: 'NO', jersey: 41, matchup: 'Detroit Lions @ New Orleans Saints', value: 70.5, odds: -112, engagement: '13.9K' },
        { player: 'De\'Von Achane', team: 'MIA', jersey: 28, matchup: 'Miami Dolphins @ New York Jets', value: 75.5, odds: -109, engagement: '14.1K' },
        { player: 'Rhamondre Stevenson', team: 'NE', jersey: 38, matchup: 'New England Patriots @ Buffalo Bills', value: 65.5, odds: -111, engagement: '13.2K' },
        { player: 'Tony Pollard', team: 'DAL', jersey: 20, matchup: 'Dallas Cowboys @ Philadelphia Eagles', value: 70.5, odds: -107, engagement: '13.7K' },
        { player: 'Isiah Pacheco', team: 'KC', jersey: 10, matchup: 'Buffalo Bills @ Kansas City Chiefs', value: 75.5, odds: -110, engagement: '14.4K' },
        { player: 'Rachaad White', team: 'TB', jersey: 1, matchup: 'Tampa Bay Buccaneers @ Atlanta Falcons', value: 70.5, odds: -108, engagement: '13.6K' },
        { player: 'Aaron Jones', team: 'GB', jersey: 33, matchup: 'Minnesota Vikings @ Green Bay Packers', value: 65.5, odds: -112, engagement: '13.1K' },
        { player: 'Javonte Williams', team: 'DEN', jersey: 33, matchup: 'Denver Broncos @ Los Angeles Rams', value: 60.5, odds: -109, engagement: '12.5K' },
        { player: 'Gus Edwards', team: 'BAL', jersey: 35, matchup: 'Baltimore Ravens @ Cincinnati Bengals', value: 55.5, odds: -111, engagement: '12.1K' },
      ],
      PLAYER_REC_YDS: [
        { player: 'Tyreek Hill', team: 'MIA', jersey: 10, matchup: 'Miami Dolphins @ New York Jets', value: 95.5, odds: -110, engagement: '17.3K' },
        { player: 'CeeDee Lamb', team: 'DAL', jersey: 88, matchup: 'Dallas Cowboys @ Philadelphia Eagles', value: 85.5, odds: -108, engagement: '16.5K' },
        { player: 'Stefon Diggs', team: 'BUF', jersey: 14, matchup: 'Buffalo Bills @ Kansas City Chiefs', value: 80.5, odds: -112, engagement: '15.8K' },
        { player: 'Davante Adams', team: 'LV', jersey: 17, matchup: 'Las Vegas Raiders @ Los Angeles Chargers', value: 75.5, odds: -110, engagement: '15.2K' },
        { player: 'Justin Jefferson', team: 'MIN', jersey: 18, matchup: 'Minnesota Vikings @ Green Bay Packers', value: 90.5, odds: -109, engagement: '16.8K' },
        { player: 'A.J. Brown', team: 'PHI', jersey: 11, matchup: 'Dallas Cowboys @ Philadelphia Eagles', value: 80.5, odds: -111, engagement: '15.9K' },
        { player: 'Keenan Allen', team: 'LAC', jersey: 13, matchup: 'Las Vegas Raiders @ Los Angeles Chargers', value: 75.5, odds: -107, engagement: '14.9K' },
        { player: 'Mike Evans', team: 'TB', jersey: 13, matchup: 'Tampa Bay Buccaneers @ Atlanta Falcons', value: 70.5, odds: -110, engagement: '14.6K' },
        { player: 'Amari Cooper', team: 'CLE', jersey: 2, matchup: 'Cleveland Browns @ Pittsburgh Steelers', value: 70.5, odds: -108, engagement: '14.3K' },
        { player: 'Cooper Kupp', team: 'LAR', jersey: 10, matchup: 'Denver Broncos @ Los Angeles Rams', value: 75.5, odds: -112, engagement: '15.1K' },
        { player: 'Ja\'Marr Chase', team: 'CIN', jersey: 1, matchup: 'Baltimore Ravens @ Cincinnati Bengals', value: 85.5, odds: -109, engagement: '16.2K' },
        { player: 'Deebo Samuel', team: 'SF', jersey: 19, matchup: 'San Francisco 49ers @ Seattle Seahawks', value: 65.5, odds: -111, engagement: '14.1K' },
        { player: 'DK Metcalf', team: 'SEA', jersey: 14, matchup: 'San Francisco 49ers @ Seattle Seahawks', value: 70.5, odds: -107, engagement: '14.5K' },
        { player: 'DJ Moore', team: 'CHI', jersey: 2, matchup: 'Chicago Bears @ Detroit Lions', value: 65.5, odds: -110, engagement: '13.8K' },
        { player: 'Calvin Ridley', team: 'TEN', jersey: 0, matchup: 'Tennessee Titans @ Houston Texans', value: 70.5, odds: -108, engagement: '14.2K' },
        { player: 'Terry McLaurin', team: 'WAS', jersey: 17, matchup: 'New York Giants @ Washington Commanders', value: 65.5, odds: -112, engagement: '13.6K' },
        { player: 'Tee Higgins', team: 'CIN', jersey: 5, matchup: 'Baltimore Ravens @ Cincinnati Bengals', value: 60.5, odds: -109, engagement: '13.2K' },
        { player: 'Brandon Aiyuk', team: 'SF', jersey: 11, matchup: 'San Francisco 49ers @ Seattle Seahawks', value: 65.5, odds: -111, engagement: '13.9K' },
        { player: 'Chris Olave', team: 'NO', jersey: 12, matchup: 'Detroit Lions @ New Orleans Saints', value: 70.5, odds: -107, engagement: '14.4K' },
        { player: 'Courtland Sutton', team: 'DEN', jersey: 14, matchup: 'Denver Broncos @ Los Angeles Rams', value: 60.5, odds: -110, engagement: '13.1K' },
      ],
      PLAYER_REC_RECEPTIONS: [
        { player: 'Tyreek Hill', team: 'MIA', jersey: 10, matchup: 'Miami Dolphins @ New York Jets', value: 7.5, odds: -110, engagement: '15.1K' },
        { player: 'CeeDee Lamb', team: 'DAL', jersey: 88, matchup: 'Dallas Cowboys @ Philadelphia Eagles', value: 6.5, odds: -108, engagement: '14.7K' },
        { player: 'Keenan Allen', team: 'LAC', jersey: 13, matchup: 'Las Vegas Raiders @ Los Angeles Chargers', value: 6.5, odds: -112, engagement: '14.3K' },
        { player: 'Stefon Diggs', team: 'BUF', jersey: 14, matchup: 'Buffalo Bills @ Kansas City Chiefs', value: 6.5, odds: -109, engagement: '14.5K' },
        { player: 'Justin Jefferson', team: 'MIN', jersey: 18, matchup: 'Minnesota Vikings @ Green Bay Packers', value: 7.5, odds: -111, engagement: '15.3K' },
        { player: 'A.J. Brown', team: 'PHI', jersey: 11, matchup: 'Dallas Cowboys @ Philadelphia Eagles', value: 6.5, odds: -107, engagement: '14.1K' },
        { player: 'Cooper Kupp', team: 'LAR', jersey: 10, matchup: 'Denver Broncos @ Los Angeles Rams', value: 6.5, odds: -110, engagement: '14.2K' },
        { player: 'Davante Adams', team: 'LV', jersey: 17, matchup: 'Las Vegas Raiders @ Los Angeles Chargers', value: 6.5, odds: -108, engagement: '13.9K' },
        { player: 'Ja\'Marr Chase', team: 'CIN', jersey: 1, matchup: 'Baltimore Ravens @ Cincinnati Bengals', value: 7.5, odds: -112, engagement: '14.8K' },
        { player: 'Amari Cooper', team: 'CLE', jersey: 2, matchup: 'Cleveland Browns @ Pittsburgh Steelers', value: 6.5, odds: -109, engagement: '13.6K' },
        { player: 'Mike Evans', team: 'TB', jersey: 13, matchup: 'Tampa Bay Buccaneers @ Atlanta Falcons', value: 5.5, odds: -111, engagement: '13.2K' },
        { player: 'DK Metcalf', team: 'SEA', jersey: 14, matchup: 'San Francisco 49ers @ Seattle Seahawks', value: 5.5, odds: -107, engagement: '12.9K' },
      ],
    },
    MLB: {
      PLAYER_HITS: [
        { player: 'Vladimir Guerrero Jr.', team: 'TOR', jersey: 27, matchup: 'Toronto Blue Jays @ New York Yankees', value: 1.5, odds: -110, engagement: '14.2K' },
        { player: 'Aaron Judge', team: 'NYY', jersey: 99, matchup: 'Toronto Blue Jays @ New York Yankees', value: 1.5, odds: -108, engagement: '15.1K' },
        { player: 'Ronald Acuña Jr.', team: 'ATL', jersey: 13, matchup: 'Atlanta Braves @ Philadelphia Phillies', value: 1.5, odds: -112, engagement: '14.8K' },
        { player: 'Mookie Betts', team: 'LAD', jersey: 50, matchup: 'Los Angeles Dodgers @ San Francisco Giants', value: 1.5, odds: -109, engagement: '14.5K' },
        { player: 'Shohei Ohtani', team: 'LAD', jersey: 17, matchup: 'Los Angeles Dodgers @ San Francisco Giants', value: 1.5, odds: -111, engagement: '15.3K' },
        { player: 'Freddie Freeman', team: 'LAD', jersey: 5, matchup: 'Los Angeles Dodgers @ San Francisco Giants', value: 1.5, odds: -107, engagement: '14.1K' },
        { player: 'Juan Soto', team: 'NYY', jersey: 22, matchup: 'Toronto Blue Jays @ New York Yankees', value: 1.5, odds: -110, engagement: '14.9K' },
        { player: 'Fernando Tatis Jr.', team: 'SD', jersey: 23, matchup: 'San Diego Padres @ Arizona Diamondbacks', value: 1.5, odds: -108, engagement: '14.6K' },
        { player: 'Bo Bichette', team: 'TOR', jersey: 11, matchup: 'Toronto Blue Jays @ New York Yankees', value: 1.5, odds: -112, engagement: '13.9K' },
        { player: 'Jose Altuve', team: 'HOU', jersey: 27, matchup: 'Texas Rangers @ Houston Astros', value: 1.5, odds: -109, engagement: '14.2K' },
        { player: 'Yordan Alvarez', team: 'HOU', jersey: 44, matchup: 'Texas Rangers @ Houston Astros', value: 1.5, odds: -111, engagement: '14.7K' },
        { player: 'Corey Seager', team: 'TEX', jersey: 5, matchup: 'Texas Rangers @ Houston Astros', value: 1.5, odds: -107, engagement: '14.3K' },
      ],
      PLAYER_STRIKEOUTS: [
        { player: 'Jacob deGrom', team: 'TEX', jersey: 48, matchup: 'Texas Rangers @ Houston Astros', value: 8.5, odds: -110, engagement: '13.5K' },
        { player: 'Gerrit Cole', team: 'NYY', jersey: 45, matchup: 'Toronto Blue Jays @ New York Yankees', value: 7.5, odds: -108, engagement: '13.8K' },
        { player: 'Shane Bieber', team: 'CLE', jersey: 57, matchup: 'Cleveland Guardians @ Chicago White Sox', value: 7.5, odds: -112, engagement: '12.9K' },
        { player: 'Spencer Strider', team: 'ATL', jersey: 65, matchup: 'Atlanta Braves @ Philadelphia Phillies', value: 9.5, odds: -109, engagement: '13.9K' },
        { player: 'Corbin Burnes', team: 'BAL', jersey: 39, matchup: 'Baltimore Orioles @ Boston Red Sox', value: 7.5, odds: -111, engagement: '13.2K' },
        { player: 'Dylan Cease', team: 'SD', jersey: 84, matchup: 'San Diego Padres @ Arizona Diamondbacks', value: 7.5, odds: -107, engagement: '12.8K' },
        { player: 'Luis Castillo', team: 'SEA', jersey: 58, matchup: 'Seattle Mariners @ Oakland Athletics', value: 7.5, odds: -110, engagement: '13.1K' },
        { player: 'Kevin Gausman', team: 'TOR', jersey: 34, matchup: 'Toronto Blue Jays @ New York Yankees', value: 8.5, odds: -108, engagement: '13.5K' },
        { player: 'Tyler Glasnow', team: 'LAD', jersey: 20, matchup: 'Los Angeles Dodgers @ San Francisco Giants', value: 7.5, odds: -112, engagement: '13.0K' },
        { player: 'Logan Webb', team: 'SF', jersey: 62, matchup: 'Los Angeles Dodgers @ San Francisco Giants', value: 7.5, odds: -109, engagement: '12.7K' },
      ],
      PLAYER_HOME_RUNS: [
        { player: 'Aaron Judge', team: 'NYY', jersey: 99, matchup: 'Toronto Blue Jays @ New York Yankees', value: 0.5, odds: -110, engagement: '15.7K' },
        { player: 'Shohei Ohtani', team: 'LAD', jersey: 17, matchup: 'Los Angeles Dodgers @ San Francisco Giants', value: 0.5, odds: -108, engagement: '16.2K' },
        { player: 'Vladimir Guerrero Jr.', team: 'TOR', jersey: 27, matchup: 'Toronto Blue Jays @ New York Yankees', value: 0.5, odds: -112, engagement: '14.5K' },
        { player: 'Ronald Acuña Jr.', team: 'ATL', jersey: 13, matchup: 'Atlanta Braves @ Philadelphia Phillies', value: 0.5, odds: -109, engagement: '15.1K' },
        { player: 'Yordan Alvarez', team: 'HOU', jersey: 44, matchup: 'Texas Rangers @ Houston Astros', value: 0.5, odds: -111, engagement: '14.8K' },
        { player: 'Juan Soto', team: 'NYY', jersey: 22, matchup: 'Toronto Blue Jays @ New York Yankees', value: 0.5, odds: -107, engagement: '14.9K' },
        { player: 'Fernando Tatis Jr.', team: 'SD', jersey: 23, matchup: 'San Diego Padres @ Arizona Diamondbacks', value: 0.5, odds: -110, engagement: '14.6K' },
        { player: 'Mookie Betts', team: 'LAD', jersey: 50, matchup: 'Los Angeles Dodgers @ San Francisco Giants', value: 0.5, odds: -108, engagement: '14.3K' },
        { player: 'Kyle Tucker', team: 'HOU', jersey: 30, matchup: 'Texas Rangers @ Houston Astros', value: 0.5, odds: -112, engagement: '13.9K' },
        { player: 'Pete Alonso', team: 'NYM', jersey: 20, matchup: 'New York Mets @ Miami Marlins', value: 0.5, odds: -109, engagement: '14.1K' },
      ],
    },
    NHL: {
      PLAYER_POINTS: [
        { player: 'Connor McDavid', team: 'EDM', jersey: 97, matchup: 'Edmonton Oilers @ Calgary Flames', value: 1.5, odds: -110, engagement: '15.3K' },
        { player: 'Nathan MacKinnon', team: 'COL', jersey: 29, matchup: 'Colorado Avalanche @ Vegas Golden Knights', value: 1.5, odds: -108, engagement: '14.9K' },
        { player: 'Auston Matthews', team: 'TOR', jersey: 34, matchup: 'Toronto Maple Leafs @ Montreal Canadiens', value: 1.5, odds: -112, engagement: '15.1K' },
        { player: 'Leon Draisaitl', team: 'EDM', jersey: 29, matchup: 'Edmonton Oilers @ Calgary Flames', value: 1.5, odds: -109, engagement: '14.6K' },
        { player: 'Artemi Panarin', team: 'NYR', jersey: 10, matchup: 'New York Rangers @ New Jersey Devils', value: 1.5, odds: -111, engagement: '14.2K' },
        { player: 'Sidney Crosby', team: 'PIT', jersey: 87, matchup: 'Washington Capitals @ Pittsburgh Penguins', value: 1.5, odds: -107, engagement: '13.8K' },
        { player: 'Kirill Kaprizov', team: 'MIN', jersey: 97, matchup: 'Minnesota Wild @ Winnipeg Jets', value: 1.5, odds: -110, engagement: '14.0K' },
        { player: 'David Pastrnak', team: 'BOS', jersey: 88, matchup: 'Boston Bruins @ Toronto Maple Leafs', value: 1.5, odds: -108, engagement: '14.4K' },
        { player: 'Mikko Rantanen', team: 'COL', jersey: 96, matchup: 'Colorado Avalanche @ Vegas Golden Knights', value: 1.5, odds: -112, engagement: '14.1K' },
        { player: 'Nikita Kucherov', team: 'TB', jersey: 86, matchup: 'Tampa Bay Lightning @ Florida Panthers', value: 1.5, odds: -109, engagement: '13.9K' },
      ],
      PLAYER_GOALS: [
        { player: 'Connor McDavid', team: 'EDM', jersey: 97, matchup: 'Edmonton Oilers @ Calgary Flames', value: 0.5, odds: -110, engagement: '14.7K' },
        { player: 'Auston Matthews', team: 'TOR', jersey: 34, matchup: 'Toronto Maple Leafs @ Montreal Canadiens', value: 0.5, odds: -108, engagement: '14.5K' },
        { player: 'Alex Ovechkin', team: 'WSH', jersey: 8, matchup: 'Washington Capitals @ Pittsburgh Penguins', value: 0.5, odds: -112, engagement: '13.8K' },
        { player: 'Leon Draisaitl', team: 'EDM', jersey: 29, matchup: 'Edmonton Oilers @ Calgary Flames', value: 0.5, odds: -109, engagement: '14.2K' },
        { player: 'David Pastrnak', team: 'BOS', jersey: 88, matchup: 'Boston Bruins @ Toronto Maple Leafs', value: 0.5, odds: -111, engagement: '14.0K' },
        { player: 'Kirill Kaprizov', team: 'MIN', jersey: 97, matchup: 'Minnesota Wild @ Winnipeg Jets', value: 0.5, odds: -107, engagement: '13.6K' },
        { player: 'Nathan MacKinnon', team: 'COL', jersey: 29, matchup: 'Colorado Avalanche @ Vegas Golden Knights', value: 0.5, odds: -110, engagement: '13.9K' },
        { player: 'Steven Stamkos', team: 'TB', jersey: 91, matchup: 'Tampa Bay Lightning @ Florida Panthers', value: 0.5, odds: -108, engagement: '13.4K' },
      ],
      PLAYER_ASSISTS: [
        { player: 'Connor McDavid', team: 'EDM', jersey: 97, matchup: 'Edmonton Oilers @ Calgary Flames', value: 0.5, odds: -110, engagement: '13.9K' },
        { player: 'Nathan MacKinnon', team: 'COL', jersey: 29, matchup: 'Colorado Avalanche @ Vegas Golden Knights', value: 0.5, odds: -108, engagement: '13.5K' },
        { player: 'Leon Draisaitl', team: 'EDM', jersey: 29, matchup: 'Edmonton Oilers @ Calgary Flames', value: 0.5, odds: -112, engagement: '13.2K' },
        { player: 'Artemi Panarin', team: 'NYR', jersey: 10, matchup: 'New York Rangers @ New Jersey Devils', value: 0.5, odds: -109, engagement: '13.1K' },
        { player: 'Erik Karlsson', team: 'PIT', jersey: 65, matchup: 'Washington Capitals @ Pittsburgh Penguins', value: 0.5, odds: -111, engagement: '12.8K' },
        { player: 'Cale Makar', team: 'COL', jersey: 8, matchup: 'Colorado Avalanche @ Vegas Golden Knights', value: 0.5, odds: -107, engagement: '13.0K' },
        { player: 'Victor Hedman', team: 'TB', jersey: 77, matchup: 'Tampa Bay Lightning @ Florida Panthers', value: 0.5, odds: -110, engagement: '12.6K' },
        { player: 'Quinn Hughes', team: 'VAN', jersey: 43, matchup: 'Vancouver Canucks @ Seattle Kraken', value: 0.5, odds: -108, engagement: '12.9K' },
      ],
    },
  }
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
