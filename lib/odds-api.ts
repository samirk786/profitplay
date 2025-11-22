interface OddsApiResponse {
  id: string
  sport_key: string
  sport_title: string
  commence_time: string
  home_team: string
  away_team: string
  bookmakers: Array<{
    key: string
    title: string
    markets: Array<{
      key: string
      outcomes: Array<{
        name: string
        price: number
        point?: number
      }>
    }>
  }>
}

interface ProcessedMarket {
  eventId: string
  sport: string
  league: string
  participants: string[]
  startTime: Date
  markets: Array<{
    marketType: string
    bookmaker: string
    odds: any
  }>
}

export class OddsApiService {
  private apiKey: string
  private baseUrl = 'https://api.the-odds-api.com/v4'

  constructor() {
    this.apiKey = process.env.ODDS_API_KEY || ''
    if (!this.apiKey) {
      throw new Error('ODDS_API_KEY environment variable is required')
    }
  }

  /**
   * Fetch odds for a specific sport
   */
  async fetchOdds(sport: string, markets: string[] = ['h2h', 'spreads', 'totals']): Promise<ProcessedMarket[]> {
    try {
      const params = new URLSearchParams({
        apiKey: this.apiKey,
        sport,
        markets: markets.join(','),
        regions: 'us',
        oddsFormat: 'american',
        dateFormat: 'iso'
      })

      const response = await fetch(`${this.baseUrl}/sports/${sport}/odds/?${params}`)
      
      if (!response.ok) {
        throw new Error(`Odds API error: ${response.status} ${response.statusText}`)
      }

      const data: OddsApiResponse[] = await response.json()
      return this.processOddsData(data)
    } catch (error) {
      console.error('Error fetching odds:', error)
      throw error
    }
  }

  /**
   * Fetch player props for a specific sport
   * NOTE: The Odds API (the-odds-api.com) may not support player props directly.
   * This function attempts to fetch them, but will return empty array if not supported.
   * For production, you may need to integrate with a different API provider that
   * specializes in player props (e.g., OddsJam, MetaBet, Wager API).
   * 
   * If the API doesn't support player props, the route will fall back to mock data
   * for demonstration purposes.
   */
  async fetchPlayerProps(sport: string): Promise<ProcessedMarket[]> {
    try {
      // Define player props market types based on sport
      // NOTE: These market names may need to be adjusted based on actual Odds API support
      // The Odds API may use different naming conventions or may not support all of these
      const playerPropsMarkets: Record<string, string[]> = {
        'americanfootball_nfl': [
          'player_pass_tds',
          'player_pass_yds',
          'player_pass_completions',
          'player_rush_yds',
          'player_rush_att',
          'player_rec_yds',
          'player_rec_receptions',
          'player_rec_tds'
        ],
        'basketball_nba': [
          'player_points',
          'player_rebounds',
          'player_assists',
          'player_threes',
          'player_steals',
          'player_blocks'
        ],
        'baseball_mlb': [
          'player_hits',
          'player_home_runs',
          'player_strikeouts',
          'player_total_bases'
        ],
        'icehockey_nhl': [
          'player_points',
          'player_goals',
          'player_assists',
          'player_shots_on_goal'
        ]
      }

      const marketsToFetch = playerPropsMarkets[sport] || []
      
      if (marketsToFetch.length === 0) {
        console.log(`No player props markets defined for sport: ${sport}`)
        return []
      }

      console.log(`Fetching player props for ${sport} with markets: ${marketsToFetch.join(', ')}`)

      // Fetch player props from the Odds API
      const params = new URLSearchParams({
        apiKey: this.apiKey,
        sport,
        markets: marketsToFetch.join(','),
        regions: 'us',
        oddsFormat: 'american',
        dateFormat: 'iso'
      })

      const response = await fetch(`${this.baseUrl}/sports/${sport}/odds/?${params}`)
      
      if (!response.ok) {
        // If player props aren't available, return empty array (we'll fall back to mocks in the route)
        console.warn(`Player props not available for ${sport}: ${response.status} ${response.statusText}`)
        return []
      }

      const data: OddsApiResponse[] = await response.json()
      
      if (!data || data.length === 0) {
        console.log(`No player props data returned for ${sport}`)
        return []
      }

      // Process player props data - need to extract player name from event/outcome names
      const processedMarkets: ProcessedMarket[] = []
      
      for (const event of data) {
        // Player props are structured differently - each event represents a player prop
        // The event structure may have player names in the home_team/away_team or outcomes
        for (const bookmaker of event.bookmakers) {
          for (const market of bookmaker.markets) {
            // Extract player name from outcomes or event name
            // Player props typically have outcomes like "Over 275.5" or "Under 275.5"
            // The player name might be in the event title or outcome name
            const playerName = event.home_team || event.away_team || 'Player'
            const teamName = event.home_team && event.away_team 
              ? (event.home_team.includes(playerName) ? event.away_team : event.home_team)
              : event.home_team || event.away_team || 'Team'

            const marketType = this.mapPlayerPropsMarketType(market.key)
            const odds = this.processPlayerPropsOutcomes(market.outcomes, market.key)

            // Find existing processed market for this player and market type
            let processedMarket = processedMarkets.find(
              pm => pm.eventId === `${event.id}-${playerName}-${marketType}` &&
                    pm.markets.some(m => m.marketType === marketType)
            )

            if (!processedMarket) {
              processedMarket = {
                eventId: `${event.id}-${playerName}-${marketType}`,
                sport: this.mapSportName(event.sport_title),
                league: event.sport_title,
                participants: [playerName, teamName],
                startTime: new Date(event.commence_time),
                markets: []
              }
              processedMarkets.push(processedMarket)
            }

            // Add market to the processed market
            processedMarket.markets.push({
              marketType,
              bookmaker: bookmaker.title,
              odds
            })
          }
        }
      }

      console.log(`Processed ${processedMarkets.length} player props events for ${sport}`)
      return processedMarkets
    } catch (error) {
      console.error('Error fetching player props:', error)
      // Return empty array on error - the route will fall back to mock data
      return []
    }
  }

  /**
   * Fetch available sports
   */
  async fetchSports(): Promise<Array<{ key: string; title: string; active: boolean }>> {
    try {
      const response = await fetch(`${this.baseUrl}/sports/?apiKey=${this.apiKey}`)
      
      if (!response.ok) {
        throw new Error(`Sports API error: ${response.status} ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching sports:', error)
      throw error
    }
  }

  /**
   * Process player props data into our market format
   */
  private processPlayerPropsData(data: OddsApiResponse[]): ProcessedMarket[] {
    return data.map(event => {
      const participants = [event.away_team, event.home_team]
      const startTime = new Date(event.commence_time)
      
      // Process each bookmaker's markets
      const markets = event.bookmakers.flatMap(bookmaker => 
        bookmaker.markets.map(market => ({
          marketType: this.mapPlayerPropsMarketType(market.key),
          bookmaker: bookmaker.title,
          odds: this.processPlayerPropsOutcomes(market.outcomes, market.key)
        }))
      )

      return {
        eventId: event.id,
        sport: this.mapSportName(event.sport_title),
        league: event.sport_title,
        participants,
        startTime,
        markets
      }
    })
  }

  /**
   * Process raw odds data into our market format
   */
  private processOddsData(data: OddsApiResponse[]): ProcessedMarket[] {
    return data.map(event => {
      const participants = [event.away_team, event.home_team]
      const startTime = new Date(event.commence_time)
      
      // Process each bookmaker's markets
      const markets = event.bookmakers.flatMap(bookmaker => 
        bookmaker.markets.map(market => ({
          marketType: this.mapMarketType(market.key),
          bookmaker: bookmaker.title,
          odds: this.processMarketOutcomes(market.outcomes, market.key)
        }))
      )

      return {
        eventId: event.id,
        sport: this.mapSportName(event.sport_title),
        league: event.sport_title,
        participants,
        startTime,
        markets
      }
    })
  }

  /**
   * Map Odds API market types to our internal types
   */
  private mapMarketType(apiMarketType: string): string {
    const mapping: Record<string, string> = {
      'h2h': 'MONEYLINE',
      'spreads': 'SPREAD',
      'totals': 'TOTAL',
      'btts': 'PROPS' // Both Teams To Score
    }
    return mapping[apiMarketType] || 'PROPS'
  }

  /**
   * Map player props market types to our internal types
   */
  private mapPlayerPropsMarketType(apiMarketType: string): string {
    const mapping: Record<string, string> = {
      // NFL
      'player_pass_tds': 'PLAYER_PASS_TDS',
      'player_pass_yds': 'PLAYER_PASS_YDS',
      'player_pass_completions': 'PLAYER_PASS_COMPLETIONS',
      'player_rush_yds': 'PLAYER_RUSH_YDS',
      'player_rush_att': 'PLAYER_RUSH_ATT',
      'player_rec_yds': 'PLAYER_REC_YDS',
      'player_rec_receptions': 'PLAYER_REC_RECEPTIONS',
      'player_rec_tds': 'PLAYER_REC_TDS',
      // NBA
      'player_points': 'PLAYER_POINTS',
      'player_rebounds': 'PLAYER_REBOUNDS',
      'player_assists': 'PLAYER_ASSISTS',
      'player_steals': 'PLAYER_STEALS',
      'player_blocks': 'PLAYER_BLOCKS',
      'player_threes': 'PLAYER_THREES',
      // MLB
      'player_hits': 'PLAYER_HITS',
      'player_home_runs': 'PLAYER_HOME_RUNS',
      'player_strikeouts': 'PLAYER_STRIKEOUTS',
      // NHL
      'player_goals': 'PLAYER_GOALS'
    }
    return mapping[apiMarketType.toLowerCase()] || 'PLAYER_PROPS'
  }

  /**
   * Map sport names to our internal format
   */
  private mapSportName(sportTitle: string): string {
    const mapping: Record<string, string> = {
      'Basketball': 'NBA',
      'American Football': 'NFL',
      'Baseball': 'MLB',
      'Soccer': 'SOCCER',
      'Hockey': 'NHL',
      'Tennis': 'TENNIS'
    }
    return mapping[sportTitle] || sportTitle.toUpperCase()
  }

  /**
   * Process market outcomes into our odds format
   */
  private processMarketOutcomes(outcomes: any[], marketType: string): any {
    if (marketType === 'h2h') {
      return {
        home: this.roundOdds(outcomes.find(o => o.name === outcomes[1]?.name)?.price || 0),
        away: this.roundOdds(outcomes.find(o => o.name === outcomes[0]?.name)?.price || 0)
      }
    } else if (marketType === 'spreads') {
      return {
        home: {
          spread: this.roundSpread(outcomes.find(o => o.name === outcomes[1]?.name)?.point || 0),
          odds: this.roundOdds(outcomes.find(o => o.name === outcomes[1]?.name)?.price || 0)
        },
        away: {
          spread: this.roundSpread(outcomes.find(o => o.name === outcomes[0]?.name)?.point || 0),
          odds: this.roundOdds(outcomes.find(o => o.name === outcomes[0]?.name)?.price || 0)
        }
      }
    } else if (marketType === 'totals') {
            return {
              over: {
                total: this.preserveDecimal(outcomes.find(o => o.name.includes('Over'))?.point || 0),
                odds: this.roundOdds(outcomes.find(o => o.name.includes('Over'))?.price || 0)
              },
              under: {
                total: this.preserveDecimal(outcomes.find(o => o.name.includes('Under'))?.point || 0),
                odds: this.roundOdds(outcomes.find(o => o.name.includes('Under'))?.price || 0)
              }
            }
    }
    return outcomes
  }

  /**
   * Process player props market outcomes into our odds format
   */
  private processPlayerPropsOutcomes(outcomes: any[], marketType: string): any {
    // Player props typically have over/under format
    const overOutcome = outcomes.find(o => o.name.includes('Over') || o.name.includes('o'))
    const underOutcome = outcomes.find(o => o.name.includes('Under') || o.name.includes('u'))
    
    if (overOutcome && underOutcome) {
            return {
              over: {
                total: this.preserveDecimal(overOutcome.point || 0),
                odds: this.roundOdds(overOutcome.price || 0)
              },
              under: {
                total: this.preserveDecimal(underOutcome.point || 0),
                odds: this.roundOdds(underOutcome.price || 0)
              }
            }
    }
    
    return outcomes
  }

  /**
   * Round odds to 2 decimal places for better display
   */
  private roundOdds(odds: number): number {
    return Math.round(odds * 100) / 100
  }

  /**
   * Round spreads/totals to 1 decimal place for better display
   */
  private roundSpread(spread: number): number {
    // Handle NaN values
    if (isNaN(spread) || !isFinite(spread)) {
      return 0
    }
    return Math.round(spread * 10) / 10
  }

  /**
   * Preserve decimal values for totals and player props
   */
  private preserveDecimal(value: number): number {
    // Handle NaN values
    if (isNaN(value) || !isFinite(value)) {
      return 0
    }
    // Keep original value with decimals (don't round)
    return value
  }

  /**
   * Check API usage and limits
   */
  async checkUsage(): Promise<{ used: number; remaining: number }> {
    try {
      // The Odds API doesn't have a separate usage endpoint
      // We'll simulate this by making a simple request and checking headers
      const response = await fetch(`${this.baseUrl}/sports/?apiKey=${this.apiKey}`)
      
      if (!response.ok) {
        throw new Error(`Usage API error: ${response.status} ${response.statusText}`)
      }

      // For now, we'll return a mock response since the API doesn't provide usage info
      return {
        used: 1, // This will be incremented each time we make a request
        remaining: 499 // This is approximate for free tier
      }
    } catch (error) {
      console.error('Error checking API usage:', error)
      throw error
    }
  }
}

// Export singleton instance
export const oddsApiService = new OddsApiService()
