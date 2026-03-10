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
        description?: string // Player name for player props
        price: number
        point?: number
      }>
    }>
  }>
}

interface OddsApiEvent {
  id: string
  sport_key: string
  sport_title: string
  commence_time: string
  home_team: string
  away_team: string
}

export interface ProcessedMarket {
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
  metadata?: {
    player?: string
    homeTeam?: string
    awayTeam?: string
    matchup?: string
    apiEventId?: string
  }
}

interface OddsApiScoreResponse {
  id: string
  sport_key: string
  sport_title: string
  commence_time: string
  completed: boolean
  home_team: string
  away_team: string
  scores: Array<{
    name: string
    score: string
  }> | null
}

export class OddsApiService {
  private apiKey: string
  private baseUrl = 'https://api.the-odds-api.com/v4'

  constructor() {
    this.apiKey = process.env.ODDS_API_KEY || ''
  }

  private assertApiKey() {
    if (!this.apiKey) {
      throw new Error('ODDS_API_KEY environment variable is required')
    }
  }

  /**
   * Fetch upcoming events for a sport (FREE - 0 credits)
   */
  async fetchEvents(sport: string): Promise<OddsApiEvent[]> {
    try {
      this.assertApiKey()
      const params = new URLSearchParams({
        apiKey: this.apiKey,
        dateFormat: 'iso'
      })

      const response = await fetch(`${this.baseUrl}/sports/${sport}/events?${params}`)

      if (!response.ok) {
        throw new Error(`Events API error: ${response.status} ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching events:', error)
      throw error
    }
  }

  /**
   * Fetch odds for a specific sport using the BULK endpoint.
   * Works for featured markets: h2h, spreads, totals.
   * Costs 1 credit per region per market.
   */
  async fetchOdds(sport: string, markets: string[] = ['h2h', 'spreads', 'totals']): Promise<ProcessedMarket[]> {
    try {
      this.assertApiKey()
      const params = new URLSearchParams({
        apiKey: this.apiKey,
        regions: 'us',
        markets: markets.join(','),
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
   * Fetch player props for a SINGLE event using the per-event endpoint.
   * Player props are "non-featured" markets and MUST be fetched per-event.
   * Costs 1 credit per market (not per player - all players in one call).
   *
   * Example: fetching player_points for 1 event = 1 credit, returns all players' points props.
   */
  async fetchPlayerPropsForEvent(
    sport: string,
    eventId: string,
    markets: string[] = ['player_points', 'player_rebounds', 'player_assists']
  ): Promise<ProcessedMarket[]> {
    try {
      this.assertApiKey()
      const params = new URLSearchParams({
        apiKey: this.apiKey,
        regions: 'us',
        markets: markets.join(','),
        oddsFormat: 'american',
        dateFormat: 'iso'
      })

      console.log(`Fetching player props for event ${eventId}: ${markets.join(', ')}`)

      const response = await fetch(
        `${this.baseUrl}/sports/${sport}/events/${eventId}/odds?${params}`
      )

      if (!response.ok) {
        console.warn(`Player props not available for event ${eventId}: ${response.status} ${response.statusText}`)
        return []
      }

      const data: OddsApiResponse = await response.json()

      if (!data || !data.bookmakers || data.bookmakers.length === 0) {
        console.log(`No player props data returned for event ${eventId}`)
        return []
      }

      return this.processPerEventPlayerProps(data)
    } catch (error) {
      console.error(`Error fetching player props for event ${eventId}:`, error)
      return []
    }
  }

  /**
   * Fetch final scores/results for a sport.
   */
  async fetchScores(sport: string, daysFrom = 3): Promise<OddsApiScoreResponse[]> {
    try {
      this.assertApiKey()
      const params = new URLSearchParams({
        apiKey: this.apiKey,
        daysFrom: String(daysFrom),
        dateFormat: 'iso'
      })
      const response = await fetch(`${this.baseUrl}/sports/${sport}/scores/?${params}`)

      if (!response.ok) {
        throw new Error(`Scores API error: ${response.status} ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching scores:', error)
      throw error
    }
  }

  /**
   * Fetch available sports
   */
  async fetchSports(): Promise<Array<{ key: string; title: string; active: boolean }>> {
    try {
      this.assertApiKey()
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
   * Process per-event player props response.
   * The per-event endpoint returns a single event object with bookmakers.
   * Each market's outcomes contain individual player lines where:
   * - outcome.description = player name (e.g., "LeBron James")
   * - outcome.name = "Over" or "Under"
   * - outcome.point = the line (e.g., 25.5)
   * - outcome.price = the odds (e.g., -110)
   */
  private processPerEventPlayerProps(event: OddsApiResponse): ProcessedMarket[] {
    const processedMarkets: ProcessedMarket[] = []
    const matchup = `${event.away_team} @ ${event.home_team}`

    if (!event.bookmakers || event.bookmakers.length === 0) return []

    // Sort bookmakers so DraftKings comes first — its lines get priority.
    // All other bookmakers fill in players that DraftKings doesn't cover.
    const sortedBookmakers = [...event.bookmakers].sort((a, b) => {
      const aIsDK = a.key === 'draftkings' || a.title.toLowerCase().includes('draftkings') ? 0 : 1
      const bIsDK = b.key === 'draftkings' || b.title.toLowerCase().includes('draftkings') ? 0 : 1
      return aIsDK - bIsDK
    })

    // Log bookmaker breakdown for diagnostics
    const hasDK = sortedBookmakers.some(b => b.key === 'draftkings' || b.title.toLowerCase().includes('draftkings'))
    console.log(`  Bookmakers (${sortedBookmakers.length}): ${sortedBookmakers.map(b => b.key).join(', ')}${hasDK ? ' [DraftKings found]' : ' [No DraftKings]'}`)

    // Log raw player counts per bookmaker per market type
    for (const bk of sortedBookmakers) {
      for (const mkt of bk.markets) {
        const playerNames = new Set(mkt.outcomes.map(o => o.description).filter(Boolean))
        console.log(`    ${bk.key} → ${mkt.key}: ${playerNames.size} players`)
      }
    }

    // Collect player data across ALL bookmakers, keeping the first occurrence per player per market
    // DraftKings is processed first, so its lines take priority. Other bookmakers fill gaps.
    const seenPlayers = new Set<string>() // key: "playerName-marketType"

    for (const bookmaker of sortedBookmakers) {
      for (const market of bookmaker.markets) {
        const marketType = this.mapPlayerPropsMarketType(market.key)

        // Group outcomes by player (using description field)
        const playerGroups: Record<string, Array<{
          name: string
          description?: string
          price: number
          point?: number
        }>> = {}

        for (const outcome of market.outcomes) {
          const playerName = outcome.description || 'Unknown Player'
          if (!playerGroups[playerName]) {
            playerGroups[playerName] = []
          }
          playerGroups[playerName].push(outcome)
        }

        // Create a ProcessedMarket for each player (skip if already seen from another bookmaker)
        for (const [playerName, outcomes] of Object.entries(playerGroups)) {
          const playerKey = `${playerName}-${marketType}`
          if (seenPlayers.has(playerKey)) continue
          seenPlayers.add(playerKey)

          const overOutcome = outcomes.find(o => o.name === 'Over')
          const underOutcome = outcomes.find(o => o.name === 'Under')

          if (!overOutcome && !underOutcome) continue

          const processedId = `${event.id}-${playerName.replace(/\s+/g, '_')}-${marketType}`

          processedMarkets.push({
            eventId: processedId,
            sport: this.mapSportName(event.sport_title),
            league: event.sport_title,
            participants: [playerName, matchup],
            startTime: new Date(event.commence_time),
            markets: [{
              marketType,
              bookmaker: bookmaker.title,
              odds: {
                over: {
                  total: this.preserveDecimal(overOutcome?.point || 0),
                  odds: this.roundOdds(overOutcome?.price || -110)
                },
                under: {
                  total: this.preserveDecimal(underOutcome?.point || 0),
                  odds: this.roundOdds(underOutcome?.price || -110)
                }
              }
            }],
            metadata: {
              player: playerName,
              homeTeam: event.home_team,
              awayTeam: event.away_team,
              matchup,
              apiEventId: event.id
            }
          })
        }
      }
    }

    console.log(`Processed ${processedMarkets.length} player props for event ${event.id} (from ${event.bookmakers.length} bookmakers)`)
    return processedMarkets
  }

  /**
   * Process raw odds data into our market format (for bulk endpoint)
   */
  private processOddsData(data: OddsApiResponse[]): ProcessedMarket[] {
    return data.map(event => {
      const participants = [event.away_team, event.home_team]
      const startTime = new Date(event.commence_time)

      // Prefer DraftKings for spread/game lines, fall back to first available bookmaker
      const bookmaker = event.bookmakers.find(b =>
        b.key === 'draftkings' || b.title.toLowerCase().includes('draftkings')
      ) || event.bookmakers[0]
      const markets = bookmaker
        ? bookmaker.markets.map(market => ({
            marketType: this.mapMarketType(market.key),
            bookmaker: bookmaker.title,
            odds: this.processMarketOutcomes(market.outcomes, market.key)
          }))
        : []

      return {
        eventId: event.id,
        sport: this.mapSportName(event.sport_title),
        league: event.sport_title,
        participants,
        startTime,
        markets,
        metadata: {
          homeTeam: event.home_team,
          awayTeam: event.away_team,
          matchup: `${event.away_team} @ ${event.home_team}`,
          apiEventId: event.id
        }
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
      'btts': 'PROPS'
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
   * Process market outcomes into our odds format (for bulk endpoint)
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

  private roundOdds(odds: number): number {
    return Math.round(odds * 100) / 100
  }

  private roundSpread(spread: number): number {
    if (isNaN(spread) || !isFinite(spread)) return 0
    return Math.round(spread * 10) / 10
  }

  private preserveDecimal(value: number): number {
    if (isNaN(value) || !isFinite(value)) return 0
    return value
  }

  /**
   * Check API usage via response headers.
   * The Odds API returns x-requests-used and x-requests-remaining headers.
   */
  async checkUsage(): Promise<{ used: number; remaining: number }> {
    try {
      this.assertApiKey()
      const response = await fetch(`${this.baseUrl}/sports/?apiKey=${this.apiKey}`)

      if (!response.ok) {
        throw new Error(`Usage API error: ${response.status} ${response.statusText}`)
      }

      const used = parseInt(response.headers.get('x-requests-used') || '0', 10)
      const remaining = parseInt(response.headers.get('x-requests-remaining') || '500', 10)

      return { used, remaining }
    } catch (error) {
      console.error('Error checking API usage:', error)
      throw error
    }
  }
}

// Export singleton instance
export const oddsApiService = new OddsApiService()
