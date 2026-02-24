'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'

interface Bet {
  id: string
  selection: string
  stake: number
  potentialPayout: number
  status: string
  placedAt: string
  settledAt?: string | null
  parlayId?: string | null
  parlayMultiplier?: number | null
  market: {
    id: string
    sport: string
    participants: string[]
    marketType: string
    startTime: string
    metadata?: any
  }
  challengeAccount: {
    id: string
    equity: number
    user: {
      id: string
      name: string | null
      email: string
    }
  }
  oddsSnapshot?: {
    lineJSON: any
  }
}

type StatusFilter = 'OPEN' | 'WON' | 'LOST' | 'PUSH' | 'ALL'

export default function AdminSettlementsPage() {
  const [bets, setBets] = useState<Bet[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('OPEN')
  const [settlingBetId, setSettlingBetId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    fetchBets()
  }, [statusFilter])

  const fetchBets = async () => {
    setLoading(true)
    setError(null)
    try {
      const status = statusFilter === 'ALL' ? '' : statusFilter
      const response = await fetch(`/api/admin/settlements?status=${status}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch bets')
      }

      setBets(data.bets || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Group bets by parlayId (or individual ID if not in parlay)
  const groupedBets = useMemo(() => {
    const groups: Record<string, Bet[]> = {}
    bets.forEach(bet => {
      const key = bet.parlayId || bet.id
      if (!groups[key]) groups[key] = []
      groups[key].push(bet)
    })
    return groups
  }, [bets])

  const handleSettleBet = async (betId: string, result: 'WON' | 'LOST' | 'PUSH') => {
    setSettlingBetId(betId)
    setError(null)
    setSuccessMessage(null)

    try {
      const response = await fetch('/api/admin/settlements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          betId,
          result,
          adminUserId: 'admin' // TODO: use actual admin session
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Settlement failed')
      }

      setSuccessMessage(`Bet settled as ${result}. P&L: $${data.pnl?.toFixed(2)}`)

      // Refresh bets list
      await fetchBets()
    } catch (err: any) {
      setError(`Settlement failed: ${err.message}`)
    } finally {
      setSettlingBetId(null)
    }
  }

  const handleSettleAllParlay = async (parlayBets: Bet[], result: 'WON' | 'LOST') => {
    setError(null)
    setSuccessMessage(null)

    const openBets = parlayBets.filter(b => b.status === 'OPEN')
    if (openBets.length === 0) return

    try {
      for (const bet of openBets) {
        setSettlingBetId(bet.id)
        const response = await fetch('/api/admin/settlements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            betId: bet.id,
            result,
            adminUserId: 'admin'
          })
        })

        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || `Settlement failed for bet ${bet.id}`)
        }
      }

      setSuccessMessage(`All ${openBets.length} legs settled as ${result}`)
      await fetchBets()
    } catch (err: any) {
      setError(`Parlay settlement failed: ${err.message}`)
      await fetchBets() // Refresh anyway to show partial progress
    } finally {
      setSettlingBetId(null)
    }
  }

  const getMarketLabel = (bet: Bet): string => {
    const metadata = bet.market.metadata
    const marketType = metadata?.originalMarketType || bet.market.marketType

    if (marketType === 'SPREAD') return 'Spread'
    if (marketType.includes('POINTS') || marketType === 'PLAYER_POINTS') return 'Points'
    if (marketType.includes('REBOUNDS') || marketType === 'PLAYER_REBOUNDS') return 'Rebounds'
    if (marketType.includes('ASSISTS') || marketType === 'PLAYER_ASSISTS') return 'Assists'
    return metadata?.propType || marketType
  }

  const getLineValue = (bet: Bet): string => {
    const odds = bet.oddsSnapshot?.lineJSON
    if (!odds) return 'N/A'

    if (bet.market.marketType === 'SPREAD') {
      const selection = bet.selection
      if (selection.includes('home')) {
        return `${odds.home?.spread > 0 ? '+' : ''}${odds.home?.spread} (${odds.home?.odds})`
      } else {
        return `${odds.away?.spread > 0 ? '+' : ''}${odds.away?.spread} (${odds.away?.odds})`
      }
    }

    // Player props
    const line = odds.over?.total || odds.under?.total || 'N/A'
    return String(line)
  }

  const getPlayerName = (bet: Bet): string => {
    const metadata = bet.market.metadata
    return metadata?.player || bet.market.participants[0] || 'Unknown'
  }

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      OPEN: 'bg-yellow-100 text-yellow-800',
      WON: 'bg-green-100 text-green-800',
      LOST: 'bg-red-100 text-red-800',
      PUSH: 'bg-gray-100 text-gray-800',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <Link href="/admin" className="text-2xl font-bold text-gray-900">
              ProfitPlay Admin
            </Link>
            <nav className="flex space-x-8">
              <Link href="/admin" className="text-gray-500 hover:text-gray-900">
                Dashboard
              </Link>
              <Link href="/admin/games" className="text-gray-500 hover:text-gray-900">
                Games
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Bet Settlements</h1>
          <p className="text-gray-600">
            Manually grade bets. Look up player stats after games and mark each bet as Won, Lost, or Push.
          </p>
        </div>

        {/* Status message */}
        {successMessage && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-green-700 text-sm">{successMessage}</p>
          </div>
        )}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Status Filter Tabs */}
        <div className="flex space-x-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
          {(['OPEN', 'WON', 'LOST', 'PUSH', 'ALL'] as StatusFilter[]).map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading bets...</p>
          </div>
        ) : Object.keys(groupedBets).length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500 text-lg">No {statusFilter === 'ALL' ? '' : statusFilter.toLowerCase()} bets found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedBets).map(([groupKey, groupBets]) => {
              const isParlay = groupBets.length > 1 || groupBets[0]?.parlayId
              const firstBet = groupBets[0]
              const hasOpenBets = groupBets.some(b => b.status === 'OPEN')

              return (
                <div key={groupKey} className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
                  {/* Group Header */}
                  <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                      {isParlay && (
                        <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full text-xs font-semibold">
                          PARLAY ({groupBets.length} legs)
                        </span>
                      )}
                      <span className="text-sm text-gray-600">
                        {firstBet.challengeAccount.user.name || firstBet.challengeAccount.user.email}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatTime(firstBet.placedAt)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-medium text-gray-700">
                        Stake: ${firstBet.stake.toFixed(2)}
                      </span>
                      {firstBet.parlayMultiplier && (
                        <span className="text-sm text-gray-500">
                          {firstBet.parlayMultiplier}x &rarr; ${firstBet.potentialPayout.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Individual Bet Legs */}
                  <div className="divide-y divide-gray-100">
                    {groupBets.map(bet => (
                      <div key={bet.id} className="px-5 py-3 flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusBadge(bet.status)}`}>
                              {bet.status}
                            </span>
                            <span className="font-semibold text-gray-900">
                              {getPlayerName(bet)}
                            </span>
                          </div>
                          <div className="mt-1 text-sm text-gray-600">
                            <span className="font-medium">{getMarketLabel(bet)}</span>
                            {' '}&middot;{' '}
                            Line: <span className="font-mono">{getLineValue(bet)}</span>
                            {' '}&middot;{' '}
                            Pick: <span className="font-semibold capitalize">{bet.selection}</span>
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            {bet.market.metadata?.matchup || bet.market.participants.join(' vs ')}
                          </div>
                        </div>

                        {/* Settlement Buttons */}
                        {bet.status === 'OPEN' && (
                          <div className="flex space-x-2 ml-4">
                            <button
                              onClick={() => handleSettleBet(bet.id, 'WON')}
                              disabled={settlingBetId === bet.id}
                              className="px-3 py-1.5 bg-green-600 text-white rounded-md text-xs font-medium hover:bg-green-700 disabled:opacity-50"
                            >
                              {settlingBetId === bet.id ? '...' : 'Won'}
                            </button>
                            <button
                              onClick={() => handleSettleBet(bet.id, 'LOST')}
                              disabled={settlingBetId === bet.id}
                              className="px-3 py-1.5 bg-red-600 text-white rounded-md text-xs font-medium hover:bg-red-700 disabled:opacity-50"
                            >
                              {settlingBetId === bet.id ? '...' : 'Lost'}
                            </button>
                            <button
                              onClick={() => handleSettleBet(bet.id, 'PUSH')}
                              disabled={settlingBetId === bet.id}
                              className="px-3 py-1.5 bg-gray-400 text-white rounded-md text-xs font-medium hover:bg-gray-500 disabled:opacity-50"
                            >
                              Push
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Parlay Quick Actions */}
                  {isParlay && hasOpenBets && (
                    <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 flex justify-end space-x-2">
                      <button
                        onClick={() => handleSettleAllParlay(groupBets, 'WON')}
                        disabled={!!settlingBetId}
                        className="px-4 py-1.5 bg-green-100 text-green-700 rounded-md text-xs font-medium hover:bg-green-200 disabled:opacity-50"
                      >
                        Settle All Won
                      </button>
                      <button
                        onClick={() => handleSettleAllParlay(groupBets, 'LOST')}
                        disabled={!!settlingBetId}
                        className="px-4 py-1.5 bg-red-100 text-red-700 rounded-md text-xs font-medium hover:bg-red-200 disabled:opacity-50"
                      >
                        Settle All Lost
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
