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
      OPEN: 'bg-yellow-500/20 text-yellow-200',
      WON: 'bg-green-500/20 text-green-200',
      LOST: 'bg-red-500/20 text-red-200',
      PUSH: 'bg-slate-500/20 text-slate-200',
    }
    return colors[status] || 'bg-slate-500/20 text-slate-200'
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
    <div className="admin-page">
      <header className="admin-header">
        <div className="admin-header-inner">
          <Link href="/admin" className="admin-brand">
            ProfitPlay Admin
          </Link>
          <nav className="admin-nav">
            <Link href="/admin" className="admin-nav-link">
              Dashboard
            </Link>
            <Link href="/admin/games" className="admin-nav-link">
              Games
            </Link>
          </nav>
        </div>
      </header>

      <main className="admin-container">
        <div className="mb-6">
          <h1 className="admin-title">Bet Settlements</h1>
          <p className="admin-subtitle">
            Manually grade bets. Look up player stats after games and mark each bet as Won, Lost, or Push.
          </p>
        </div>

        {/* Status message */}
        {successMessage && (
          <div className="mb-4 admin-alert admin-alert-success">
            <p className="text-sm">{successMessage}</p>
          </div>
        )}
        {error && (
          <div className="mb-4 admin-alert admin-alert-error">
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Status Filter Tabs */}
        <div className="admin-tab-bar mb-6">
          {(['OPEN', 'WON', 'LOST', 'PUSH', 'ALL'] as StatusFilter[]).map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`admin-tab ${statusFilter === status ? 'active' : ''}`}
            >
              {status}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 admin-muted">Loading bets...</p>
          </div>
        ) : Object.keys(groupedBets).length === 0 ? (
          <div className="text-center py-12 admin-card">
            <p className="admin-light text-lg">No {statusFilter === 'ALL' ? '' : statusFilter.toLowerCase()} bets found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedBets).map(([groupKey, groupBets]) => {
              const isParlay = groupBets.length > 1 || groupBets[0]?.parlayId
              const firstBet = groupBets[0]
              const hasOpenBets = groupBets.some(b => b.status === 'OPEN')

              return (
                <div key={groupKey} className="admin-list-card">
                  {/* Group Header */}
                  <div className="admin-list-header">
                    <div className="flex items-center space-x-3">
                      {isParlay && (
                        <span className="admin-pill" style={{ background: 'rgba(139, 92, 246, 0.2)', color: '#ddd6fe' }}>
                          PARLAY ({groupBets.length} legs)
                        </span>
                      )}
                      <span className="text-sm admin-light">
                        {firstBet.challengeAccount.user.name || firstBet.challengeAccount.user.email}
                      </span>
                      <span className="text-xs admin-muted">
                        {formatTime(firstBet.placedAt)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-medium admin-light">
                        Stake: ${firstBet.stake.toFixed(2)}
                      </span>
                      {firstBet.parlayMultiplier && (
                        <span className="text-sm admin-muted">
                          {firstBet.parlayMultiplier}x &rarr; ${firstBet.potentialPayout.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Individual Bet Legs */}
                  <div>
                    {groupBets.map(bet => (
                      <div key={bet.id} className="admin-list-row">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span
                              className={`admin-badge ${
                                bet.status === 'OPEN'
                                  ? 'admin-badge-open'
                                  : bet.status === 'WON'
                                  ? 'admin-badge-won'
                                  : bet.status === 'LOST'
                                  ? 'admin-badge-lost'
                                  : 'admin-badge-push'
                              }`}
                            >
                              {bet.status}
                            </span>
                            <span className="font-semibold text-white">
                              {getPlayerName(bet)}
                            </span>
                          </div>
                          <div className="mt-1 text-sm admin-light">
                            <span className="font-medium text-white">{getMarketLabel(bet)}</span>
                            {' '}&middot;{' '}
                            Line: <span className="admin-mono">{getLineValue(bet)}</span>
                            {' '}&middot;{' '}
                            Pick: <span className="font-semibold capitalize text-slate-100">{bet.selection}</span>
                          </div>
                          <div className="text-xs admin-muted mt-0.5">
                            {bet.market.metadata?.matchup || bet.market.participants.join(' vs ')}
                          </div>
                        </div>

                        {/* Settlement Buttons */}
                        {bet.status === 'OPEN' && (
                          <div className="flex space-x-2 ml-4">
                            <button
                              onClick={() => handleSettleBet(bet.id, 'WON')}
                              disabled={settlingBetId === bet.id}
                              className="admin-btn admin-btn-success"
                            >
                              {settlingBetId === bet.id ? '...' : 'Won'}
                            </button>
                            <button
                              onClick={() => handleSettleBet(bet.id, 'LOST')}
                              disabled={settlingBetId === bet.id}
                              className="admin-btn admin-btn-danger"
                            >
                              {settlingBetId === bet.id ? '...' : 'Lost'}
                            </button>
                            <button
                              onClick={() => handleSettleBet(bet.id, 'PUSH')}
                              disabled={settlingBetId === bet.id}
                              className="admin-btn admin-btn-neutral"
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
                    <div className="admin-list-header" style={{ justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => handleSettleAllParlay(groupBets, 'WON')}
                        disabled={!!settlingBetId}
                        className="admin-btn admin-btn-success"
                      >
                        Settle All Won
                      </button>
                      <button
                        onClick={() => handleSettleAllParlay(groupBets, 'LOST')}
                        disabled={!!settlingBetId}
                        className="admin-btn admin-btn-danger"
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
