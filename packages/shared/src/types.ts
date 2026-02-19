export type ApiErrorResponse = {
  error: string
  message?: string
  statusCode?: number
}

export type PaginatedResponse<T> = {
  data: T[]
  page: number
  total: number
  limit: number
}

export type MarketSummary = {
  id: string
  sport: string
  league: string
  eventId: string
  marketType: 'MONEYLINE' | 'SPREAD' | 'TOTAL' | 'PROPS'
  participants: string[]
  startTime: string
}
