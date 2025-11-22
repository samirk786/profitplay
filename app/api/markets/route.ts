import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { oddsApiService } from '@/lib/odds-api'

export const dynamic = 'force-dynamic'

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
      // Return comprehensive mock player props data
      markets = getMockPlayerProps(sport || 'NFL', marketType)
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

// Generate comprehensive mock player props for all sports
function getMockPlayerProps(sport: string, marketType: string): any[] {
  const playerProps: any = {
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
      ],
      PLAYER_REBOUNDS: [
        { player: 'Giannis Antetokounmpo', team: 'MIL', jersey: 34, matchup: 'Milwaukee Bucks @ Dallas Mavericks', value: 11.5, odds: -110, engagement: '15.2K' },
        { player: 'Nikola Jokic', team: 'DEN', jersey: 15, matchup: 'Golden State Warriors @ Denver Nuggets', value: 13.5, odds: -105, engagement: '16.8K' },
        { player: 'Joel Embiid', team: 'PHI', jersey: 21, matchup: 'Philadelphia 76ers @ Brooklyn Nets', value: 11.5, odds: -112, engagement: '14.9K' },
        { player: 'Rudy Gobert', team: 'MIN', jersey: 27, matchup: 'Minnesota Timberwolves @ Sacramento Kings', value: 12.5, odds: -110, engagement: '13.5K' },
        { player: 'Domantas Sabonis', team: 'SAC', jersey: 10, matchup: 'Minnesota Timberwolves @ Sacramento Kings', value: 14.5, odds: -108, engagement: '15.3K' },
      ],
      PLAYER_ASSISTS: [
        { player: 'Luka Doncic', team: 'DAL', jersey: 77, matchup: 'Milwaukee Bucks @ Dallas Mavericks', value: 9.5, odds: -110, engagement: '16.4K' },
        { player: 'Nikola Jokic', team: 'DEN', jersey: 15, matchup: 'Golden State Warriors @ Denver Nuggets', value: 10.5, odds: -105, engagement: '17.2K' },
        { player: 'Damian Lillard', team: 'MIL', jersey: 0, matchup: 'Milwaukee Bucks @ Dallas Mavericks', value: 7.5, odds: -108, engagement: '15.7K' },
        { player: 'James Harden', team: 'LAC', jersey: 1, matchup: 'LA Clippers @ New Orleans Pelicans', value: 8.5, odds: -112, engagement: '14.8K' },
        { player: 'Trae Young', team: 'ATL', jersey: 11, matchup: 'Atlanta Hawks @ New York Knicks', value: 9.5, odds: -110, engagement: '15.1K' },
      ],
      PLAYER_STEALS: [
        { player: 'Jimmy Butler', team: 'MIA', jersey: 22, matchup: 'Boston Celtics @ Miami Heat', value: 1.5, odds: -110, engagement: '12.3K' },
        { player: 'Fred VanVleet', team: 'HOU', jersey: 5, matchup: 'Houston Rockets @ Memphis Grizzlies', value: 1.5, odds: -108, engagement: '11.8K' },
        { player: 'Dejounte Murray', team: 'ATL', jersey: 5, matchup: 'Atlanta Hawks @ New York Knicks', value: 2.5, odds: -115, engagement: '13.2K' },
      ],
      PLAYER_BLOCKS: [
        { player: 'Anthony Davis', team: 'LAL', jersey: 3, matchup: 'Los Angeles Lakers @ Phoenix Suns', value: 2.5, odds: -110, engagement: '13.7K' },
        { player: 'Evan Mobley', team: 'CLE', jersey: 4, matchup: 'Cleveland Cavaliers @ Orlando Magic', value: 1.5, odds: -108, engagement: '12.1K' },
        { player: 'Victor Wembanyama', team: 'SAN', jersey: 1, matchup: 'San Antonio Spurs @ Oklahoma City Thunder', value: 3.5, odds: -105, engagement: '14.9K' },
      ],
      PLAYER_THREES: [
        { player: 'Stephen Curry', team: 'GSW', jersey: 30, matchup: 'Golden State Warriors @ Denver Nuggets', value: 4.5, odds: -110, engagement: '16.5K' },
        { player: 'Klay Thompson', team: 'GSW', jersey: 11, matchup: 'Golden State Warriors @ Denver Nuggets', value: 3.5, odds: -108, engagement: '14.3K' },
        { player: 'Luka Doncic', team: 'DAL', jersey: 77, matchup: 'Milwaukee Bucks @ Dallas Mavericks', value: 3.5, odds: -112, engagement: '15.2K' },
      ],
    },
    NFL: {
      PLAYER_PASS_YDS: [
        { player: 'Josh Allen', team: 'BUF', jersey: 17, matchup: 'Buffalo Bills @ Kansas City Chiefs', value: 275.5, odds: -110, engagement: '18.5K' },
        { player: 'Patrick Mahomes', team: 'KC', jersey: 15, matchup: 'Buffalo Bills @ Kansas City Chiefs', value: 285.5, odds: -108, engagement: '19.2K' },
        { player: 'Lamar Jackson', team: 'BAL', jersey: 8, matchup: 'Baltimore Ravens @ Cincinnati Bengals', value: 265.5, odds: -112, engagement: '17.8K' },
        { player: 'Dak Prescott', team: 'DAL', jersey: 4, matchup: 'Dallas Cowboys @ Philadelphia Eagles', value: 270.5, odds: -110, engagement: '18.1K' },
        { player: 'Tua Tagovailoa', team: 'MIA', jersey: 1, matchup: 'Miami Dolphins @ New York Jets', value: 260.5, odds: -108, engagement: '16.9K' },
      ],
      PLAYER_PASS_TDS: [
        { player: 'Josh Allen', team: 'BUF', jersey: 17, matchup: 'Buffalo Bills @ Kansas City Chiefs', value: 2.5, odds: -110, engagement: '17.2K' },
        { player: 'Patrick Mahomes', team: 'KC', jersey: 15, matchup: 'Buffalo Bills @ Kansas City Chiefs', value: 2.5, odds: -108, engagement: '17.9K' },
        { player: 'Jalen Hurts', team: 'PHI', jersey: 1, matchup: 'Dallas Cowboys @ Philadelphia Eagles', value: 2.5, odds: -112, engagement: '16.8K' },
      ],
      PLAYER_RUSH_YDS: [
        { player: 'Christian McCaffrey', team: 'SF', jersey: 23, matchup: 'San Francisco 49ers @ Seattle Seahawks', value: 95.5, odds: -110, engagement: '16.4K' },
        { player: 'Derrick Henry', team: 'BAL', jersey: 22, matchup: 'Baltimore Ravens @ Cincinnati Bengals', value: 85.5, odds: -108, engagement: '15.7K' },
        { player: 'Jonathan Taylor', team: 'IND', jersey: 28, matchup: 'Indianapolis Colts @ Jacksonville Jaguars', value: 90.5, odds: -112, engagement: '15.9K' },
        { player: 'Lamar Jackson', team: 'BAL', jersey: 8, matchup: 'Baltimore Ravens @ Cincinnati Bengals', value: 65.5, odds: -110, engagement: '14.8K' },
      ],
      PLAYER_REC_YDS: [
        { player: 'Tyreek Hill', team: 'MIA', jersey: 10, matchup: 'Miami Dolphins @ New York Jets', value: 95.5, odds: -110, engagement: '17.3K' },
        { player: 'CeeDee Lamb', team: 'DAL', jersey: 88, matchup: 'Dallas Cowboys @ Philadelphia Eagles', value: 85.5, odds: -108, engagement: '16.5K' },
        { player: 'Stefon Diggs', team: 'BUF', jersey: 14, matchup: 'Buffalo Bills @ Kansas City Chiefs', value: 80.5, odds: -112, engagement: '15.8K' },
        { player: 'Davante Adams', team: 'LV', jersey: 17, matchup: 'Las Vegas Raiders @ Los Angeles Chargers', value: 75.5, odds: -110, engagement: '15.2K' },
      ],
      PLAYER_REC_RECEPTIONS: [
        { player: 'Tyreek Hill', team: 'MIA', jersey: 10, matchup: 'Miami Dolphins @ New York Jets', value: 7.5, odds: -110, engagement: '15.1K' },
        { player: 'CeeDee Lamb', team: 'DAL', jersey: 88, matchup: 'Dallas Cowboys @ Philadelphia Eagles', value: 6.5, odds: -108, engagement: '14.7K' },
        { player: 'Keenan Allen', team: 'LAC', jersey: 13, matchup: 'Las Vegas Raiders @ Los Angeles Chargers', value: 6.5, odds: -112, engagement: '14.3K' },
      ],
    },
    MLB: {
      PLAYER_HITS: [
        { player: 'Vladimir Guerrero Jr.', team: 'TOR', jersey: 27, matchup: 'Toronto Blue Jays @ New York Yankees', value: 1.5, odds: -110, engagement: '14.2K' },
        { player: 'Aaron Judge', team: 'NYY', jersey: 99, matchup: 'Toronto Blue Jays @ New York Yankees', value: 1.5, odds: -108, engagement: '15.1K' },
        { player: 'Ronald Acuña Jr.', team: 'ATL', jersey: 13, matchup: 'Atlanta Braves @ Philadelphia Phillies', value: 1.5, odds: -112, engagement: '14.8K' },
      ],
      PLAYER_STRIKEOUTS: [
        { player: 'Jacob deGrom', team: 'TEX', jersey: 48, matchup: 'Texas Rangers @ Houston Astros', value: 8.5, odds: -110, engagement: '13.5K' },
        { player: 'Gerrit Cole', team: 'NYY', jersey: 45, matchup: 'Toronto Blue Jays @ New York Yankees', value: 7.5, odds: -108, engagement: '13.8K' },
        { player: 'Shane Bieber', team: 'CLE', jersey: 57, matchup: 'Cleveland Guardians @ Chicago White Sox', value: 7.5, odds: -112, engagement: '12.9K' },
      ],
      PLAYER_HOME_RUNS: [
        { player: 'Aaron Judge', team: 'NYY', jersey: 99, matchup: 'Toronto Blue Jays @ New York Yankees', value: 0.5, odds: -110, engagement: '15.7K' },
        { player: 'Shohei Ohtani', team: 'LAD', jersey: 17, matchup: 'Los Angeles Dodgers @ San Francisco Giants', value: 0.5, odds: -108, engagement: '16.2K' },
        { player: 'Vladimir Guerrero Jr.', team: 'TOR', jersey: 27, matchup: 'Toronto Blue Jays @ New York Yankees', value: 0.5, odds: -112, engagement: '14.5K' },
      ],
    },
    NHL: {
      PLAYER_POINTS: [
        { player: 'Connor McDavid', team: 'EDM', jersey: 97, matchup: 'Edmonton Oilers @ Calgary Flames', value: 1.5, odds: -110, engagement: '15.3K' },
        { player: 'Nathan MacKinnon', team: 'COL', jersey: 29, matchup: 'Colorado Avalanche @ Vegas Golden Knights', value: 1.5, odds: -108, engagement: '14.9K' },
        { player: 'Auston Matthews', team: 'TOR', jersey: 34, matchup: 'Toronto Maple Leafs @ Montreal Canadiens', value: 1.5, odds: -112, engagement: '15.1K' },
      ],
      PLAYER_GOALS: [
        { player: 'Connor McDavid', team: 'EDM', jersey: 97, matchup: 'Edmonton Oilers @ Calgary Flames', value: 0.5, odds: -110, engagement: '14.7K' },
        { player: 'Auston Matthews', team: 'TOR', jersey: 34, matchup: 'Toronto Maple Leafs @ Montreal Canadiens', value: 0.5, odds: -108, engagement: '14.5K' },
        { player: 'Alex Ovechkin', team: 'WSH', jersey: 8, matchup: 'Washington Capitals @ Pittsburgh Penguins', value: 0.5, odds: -112, engagement: '13.8K' },
      ],
      PLAYER_ASSISTS: [
        { player: 'Connor McDavid', team: 'EDM', jersey: 97, matchup: 'Edmonton Oilers @ Calgary Flames', value: 0.5, odds: -110, engagement: '13.9K' },
        { player: 'Nathan MacKinnon', team: 'COL', jersey: 29, matchup: 'Colorado Avalanche @ Vegas Golden Knights', value: 0.5, odds: -108, engagement: '13.5K' },
        { player: 'Leon Draisaitl', team: 'EDM', jersey: 29, matchup: 'Edmonton Oilers @ Calgary Flames', value: 0.5, odds: -112, engagement: '13.2K' },
      ],
    },
  }

  // Map market type to stat key
  const statKey = marketType.replace('PLAYER_', '')
  const players = playerProps[sport]?.[marketType] || []

  if (players.length === 0) {
    // Return empty array if no players for this sport/stat combination
    return []
  }

  const baseTime = new Date(Date.now() + 24 * 60 * 60 * 1000) // Tomorrow

  return players.map((p: any, index: number) => ({
    id: `player_prop_${sport}_${marketType}_${index}`,
    sport: sport,
    league: sport === 'NBA' ? 'National Basketball Association' : 
            sport === 'NFL' ? 'National Football League' :
            sport === 'MLB' ? 'Major League Baseball' :
            sport === 'NHL' ? 'National Hockey League' : 'Professional League',
    eventId: `player_prop_${sport}_${Date.now()}_${index}`,
    marketType: marketType,
    participants: [p.player, p.team],
    startTime: new Date(baseTime.getTime() + index * 60 * 60 * 1000), // Stagger start times
    status: 'UPCOMING',
    oddsSnapshots: [{
      lineJSON: {
        over: { total: p.value, odds: p.odds },
        under: { total: p.value, odds: p.odds }
      },
      ts: new Date()
    }],
    // Include additional player metadata
    _metadata: {
      player: p.player,
      team: p.team,
      jersey: p.jersey,
      matchup: p.matchup,
      engagement: p.engagement
    }
  }))
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
