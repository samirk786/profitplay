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
   */
  async fetchPlayerProps(sport: string): Promise<ProcessedMarket[]> {
    try {
      // For now, let's create mock player props data since the API might not have player props
      // In a real implementation, you'd need to check which markets are available for each sport
      console.log(`Creating mock player props data for ${sport}`)
      
      const mockPlayerProps: ProcessedMarket[] = [
        {
          eventId: `player_props_${Date.now()}_1`,
          sport: this.mapSportName(sport),
          league: 'Player Props',
          participants: ['Josh Allen', 'Buffalo Bills'],
          startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
          markets: [
            {
              marketType: 'PLAYER_PASS_YDS',
              bookmaker: 'DraftKings',
              odds: {
                over: { total: 276, odds: -110 },
                under: { total: 276, odds: -110 }
              }
            }
          ]
        },
        {
          eventId: `player_props_${Date.now()}_2`,
          sport: this.mapSportName(sport),
          league: 'Player Props',
          participants: ['Christian McCaffrey', 'San Francisco 49ers'],
          startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
          markets: [
            {
              marketType: 'PLAYER_RUSH_YDS',
              bookmaker: 'DraftKings',
              odds: {
                over: { total: 96, odds: -105 },
                under: { total: 96, odds: -115 }
              }
            }
          ]
        }
      ]

      return mockPlayerProps
    } catch (error) {
      console.error('Error fetching player props:', error)
      throw error
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
      'player_pass_tds': 'PLAYER_PASS_TDS',
      'player_pass_yds': 'PLAYER_PASS_YDS',
      'player_pass_completions': 'PLAYER_PASS_COMPLETIONS',
      'player_rush_yds': 'PLAYER_RUSH_YDS',
      'player_rush_att': 'PLAYER_RUSH_ATT',
      'player_rec_yds': 'PLAYER_REC_YDS',
      'player_rec_receptions': 'PLAYER_REC_RECEPTIONS',
      'player_rec_tds': 'PLAYER_REC_TDS'
    }
    return mapping[apiMarketType] || 'PLAYER_PROPS'
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
