'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

interface Market {
  id: string
  sport: string
  league: string
  participants: string[]
  marketType: string
  startTime: string
  odds: {
    home?: number
    away?: number
    over?: { total: number; odds: number }
    under?: { total: number; odds: number }
    spread?: number
  } | null
}

interface Game {
  id: string
  sport: string
  league: string
  participants: string[]
  startTime: string
  markets: Market[]
}

const SPORT_TABS = [
  { key: 'ALL', label: 'All Sports' },
  { key: 'NBA', label: 'NBA' },
  { key: 'NFL', label: 'NFL' },
  { key: 'MLB', label: 'MLB' },
  { key: 'NHL', label: 'NHL' },
]

const MARKET_TYPE_TABS_DEFAULT = [
  { key: 'ALL', label: 'All Markets' },
  { key: 'MONEYLINE', label: 'Moneyline' },
  { key: 'SPREAD', label: 'Spread' },
  { key: 'TOTAL', label: 'Total' },
]

const MARKET_TYPE_TABS_NFL_PLAYER_PROPS = [
  { key: 'ALL', label: 'All Markets' },
  { key: 'MONEYLINE', label: 'Moneyline' },
  { key: 'SPREAD', label: 'Spread' },
  { key: 'TOTAL', label: 'Total' },
  { key: 'PLAYER_PASS_TDS', label: 'Pass TDs' },
  { key: 'PLAYER_PASS_YDS', label: 'Pass Yards' },
  { key: 'PLAYER_RUSH_YDS', label: 'Rush Yards' },
  { key: 'PLAYER_REC_YDS', label: 'Rec Yards' }
]

export default function Markets() {
  const [markets, setMarkets] = useState<Market[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSport, setSelectedSport] = useState('ALL')
  const [selectedMarketType, setSelectedMarketType] = useState('ALL')

  const fetchMarkets = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedSport !== 'ALL') {
        params.append('sport', selectedSport)
      }
      if (selectedMarketType !== 'ALL') {
        params.append('marketType', selectedMarketType)
      }
      
      const response = await fetch(`/api/markets?${params}`)
      const data = await response.json()
      
      if (response.ok) {
        setMarkets(data.markets || [])
      } else {
        console.error('Failed to fetch markets:', data.error)
        setMarkets([])
      }
    } catch (error) {
      console.error('Error fetching markets:', error)
      setMarkets([])
    } finally {
      setLoading(false)
    }
  }, [selectedSport, selectedMarketType])

  useEffect(() => {
    fetchMarkets()
  }, [fetchMarkets])

  // Group markets by game
  const groupMarketsByGame = (markets: Market[]): Game[] => {
    const gameMap = new Map<string, Game>()
    
    markets.forEach(market => {
      const gameKey = `${market.sport}-${market.participants.join('-')}-${market.startTime}`
      
      if (!gameMap.has(gameKey)) {
        gameMap.set(gameKey, {
          id: gameKey,
          sport: market.sport,
          league: market.league,
          participants: market.participants,
          startTime: market.startTime,
          markets: []
        })
      }
      
      gameMap.get(gameKey)!.markets.push(market)
    })
    
    return Array.from(gameMap.values())
  }

  const filteredMarkets = markets.filter(market => {
    const sportMatch = selectedSport === 'ALL' || market.sport === selectedSport
    const marketTypeMatch = selectedMarketType === 'ALL' || market.marketType === selectedMarketType
    return sportMatch && marketTypeMatch
  })

  const games = groupMarketsByGame(filteredMarkets)

  const formatOdds = (odds: number) => {
    if (isNaN(odds) || !isFinite(odds)) {
      return 'N/A'
    }
    const rounded = Math.round(odds * 100) / 100
    if (rounded > 0) {
      return `+${rounded}`
    }
    return rounded.toString()
  }

  const formatTotal = (total: number) => {
    if (isNaN(total) || !isFinite(total)) {
      return 'N/A'
    }
    return total.toString()
  }

  const formatStartTime = (startTime: string) => {
    const date = new Date(startTime)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const handleSportChange = (sport: string) => {
    setSelectedSport(sport)
    setSelectedMarketType('ALL')
  }

  const getMarketTypeTabs = () => {
    if (selectedSport === 'NFL') {
      return MARKET_TYPE_TABS_NFL_PLAYER_PROPS
    }
    return MARKET_TYPE_TABS_DEFAULT
  }

  const getMarketTypeDisplayName = (marketType: string) => {
    const displayNames: Record<string, string> = {
      'MONEYLINE': 'Moneyline',
      'SPREAD': 'Spread',
      'TOTAL': 'Total',
      'PLAYER_PASS_TDS': 'Pass TDs',
      'PLAYER_PASS_YDS': 'Pass Yards',
      'PLAYER_RUSH_YDS': 'Rush Yards',
      'PLAYER_REC_YDS': 'Rec Yards',
      'PLAYER_REC_RECEPTIONS': 'Receptions',
      'PLAYER_REC_TDS': 'Rec TDs'
    }
    return displayNames[marketType] || marketType.replace(/_/g, ' ').toLowerCase()
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Sports Markets</h1>
              <p className="text-gray-600 text-sm">
                Browse and place simulated bets on upcoming events.
              </p>
            </div>
            <button
              onClick={() => fetchMarkets()}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm font-medium"
            >
              Refresh Data
            </button>
          </div>
        </div>

        {/* Sport Tabs */}
        <div className="bg-white border-b border-gray-200">
          <div className="px-6">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              {SPORT_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => handleSportChange(tab.key)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    selectedSport === tab.key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Market Type Tabs */}
        <div className="bg-white border-b border-gray-200">
          <div className="px-6">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              {getMarketTypeTabs().map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setSelectedMarketType(tab.key)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    selectedMarketType === tab.key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading markets...</div>
          ) : games.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No markets found for the selected criteria.</div>
          ) : (
            <div className="space-y-8">
              {games.map((game) => (
                <div key={game.id} className="bg-white rounded-lg shadow-sm border border-gray-200">
                  {/* Game Header */}
                  <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {game.participants[0]} vs {game.participants[1]}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {game.league} • {formatStartTime(game.startTime)}
                        </p>
                      </div>
                      <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                        {game.sport}
                      </span>
                    </div>
                  </div>

                  {/* Markets */}
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {game.markets.map((market) => (
                        <div key={market.id} className="border border-gray-200 rounded-lg p-4">
                          <h4 className="text-sm font-medium text-gray-900 mb-3">
                            {getMarketTypeDisplayName(market.marketType)}
                          </h4>
                          
                          {/* Player Props Display */}
                          {market.odds && market.odds.over && market.odds.under ? (
                            <div className="text-center">
                              <p className="text-3xl font-bold text-gray-900 mb-4">
                                {formatTotal(market.odds.over.total)}
                              </p>
                              <div className="grid grid-cols-2 gap-3">
                                <button className="bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 text-sm font-medium">
                                  Higher
                                </button>
                                <button className="bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 text-sm font-medium">
                                  Lower
                                </button>
                              </div>
                            </div>
                          ) : market.odds && (market.odds.home !== undefined || market.odds.away !== undefined) ? (
                            <div className="space-y-3">
                              {/* Home Team */}
                              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <span className="text-sm font-medium text-gray-900">
                                  {market.participants[0]}
                                </span>
                                {market.marketType === 'SPREAD' && market.odds?.home && typeof market.odds.home === 'object' ? (
                                  <div className="text-right">
                                    <div className="text-sm font-semibold text-gray-700">
                                      {market.odds.home.spread > 0 ? '+' : ''}{market.odds.home.spread}
                                    </div>
                                    <div className="text-lg font-bold text-gray-900">
                                      {formatOdds(market.odds.home.odds)}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-lg font-bold text-gray-900">
                                    {formatOdds(market.odds?.home || 0)}
                                  </div>
                                )}
                              </div>
                              
                              {/* Away Team */}
                              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <span className="text-sm font-medium text-gray-900">
                                  {market.participants[1]}
                                </span>
                                {market.marketType === 'SPREAD' && market.odds?.away && typeof market.odds.away === 'object' ? (
                                  <div className="text-right">
                                    <div className="text-sm font-semibold text-gray-700">
                                      {market.odds.away.spread > 0 ? '+' : ''}{market.odds.away.spread}
                                    </div>
                                    <div className="text-lg font-bold text-gray-900">
                                      {formatOdds(market.odds.away.odds)}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-lg font-bold text-gray-900">
                                    {formatOdds(market.odds?.away || 0)}
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-4">
                              <p className="text-gray-500 text-sm">No odds available</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}