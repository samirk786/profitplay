export const ODDS_API_SPORT_KEYS: Record<string, string> = {
  NBA: 'basketball_nba',
  NFL: 'americanfootball_nfl',
  MLB: 'baseball_mlb',
  NHL: 'icehockey_nhl',
  SOCCER: 'soccer_epl'
}

export function mapInternalSportToOddsApiKey(sport: string): string | null {
  return ODDS_API_SPORT_KEYS[sport.toUpperCase()] || null
}
