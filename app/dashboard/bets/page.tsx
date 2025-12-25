'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import Header from '@/components/Header'

interface Bet {
  id: string
  market: {
    id: string
    sport: string
    participants: string[]
    marketType: string
    startTime: string
  }
  selection: string
  stake: number
  potentialPayout: number
  status: string
  placedAt: string
  settledAt?: string
  pnl?: number
  parlayId?: string | null
  parlayMultiplier?: number | null
}

export default function BetsPage() {
  const { data: session } = useSession()
  const [bets, setBets] = useState<Bet[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')
  const [sportFilter, setSportFilter] = useState('ALL')
  const [challengeAccountId, setChallengeAccountId] = useState<string | null>(null)

  useEffect(() => {
    // Fetch challenge account ID first
    if (session?.user?.id) {
      fetchChallengeAccount()
    }
  }, [session])

  useEffect(() => {
    // Fetch bets once we have challenge account ID
    if (challengeAccountId) {
      fetchBets()
    }
  }, [challengeAccountId, filter])

  const fetchChallengeAccount = async () => {
    try {
      const response = await fetch('/api/challenges?state=ACTIVE', {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        if (data.challenges && data.challenges.length > 0) {
          setChallengeAccountId(data.challenges[0].id)
        }
      }
    } catch (error) {
      console.error('Error fetching challenge account:', error)
    }
  }

  const fetchBets = async () => {
    if (!challengeAccountId) return

    try {
      setLoading(true)
      const url = `/api/bets?challengeAccountId=${challengeAccountId}${filter !== 'ALL' ? `&status=${filter}` : ''}`
      const response = await fetch(url, {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        // Map the bets data to match our interface
        const mappedBets: Bet[] = (data.bets || []).map((bet: any) => ({
          id: bet.id,
          market: {
            id: bet.market.id,
            sport: bet.market.sport,
            participants: bet.market.participants || [],
            marketType: bet.market.marketType,
            startTime: bet.market.startTime
          },
          selection: bet.selection,
          stake: bet.stake,
          potentialPayout: bet.potentialPayout,
          status: bet.status,
          placedAt: bet.placedAt,
          settledAt: bet.settledAt || undefined,
          pnl: bet.settlements?.[0]?.resultJSON?.pnl || undefined,
          parlayId: bet.parlayId || undefined,
          parlayMultiplier: bet.parlayMultiplier || undefined
        }))
        setBets(mappedBets)
      } else {
        console.error('Failed to fetch bets:', response.statusText)
        setBets([])
      }
    } catch (error) {
      console.error('Error fetching bets:', error)
      setBets([])
    } finally {
      setLoading(false)
    }
  }

  // Group bets by parlayId
  const groupedBets = bets.reduce((groups: Record<string, Bet[]>, bet) => {
    if (bet.parlayId) {
      if (!groups[bet.parlayId]) {
        groups[bet.parlayId] = []
      }
      groups[bet.parlayId].push(bet)
    } else {
      // Individual bets (no parlayId) get their own group
      groups[bet.id] = [bet]
    }
    return groups
  }, {})

  // Convert to array and filter by sport
  const betGroups = Object.values(groupedBets)
    .filter(group => {
      // Check if any bet in the group matches the sport filter
      return sportFilter === 'ALL' || group.some(bet => bet.market.sport === sportFilter)
    })
    .filter(group => {
      // Filter by status if needed (all bets in a parlay share the same status)
      return filter === 'ALL' || group[0]?.status === filter
    })

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'WON':
        return {
          backgroundColor: 'rgba(34, 197, 94, 0.2)',
          color: '#22C55E',
          borderColor: '#22C55E'
        }
      case 'LOST':
        return {
          backgroundColor: 'rgba(239, 68, 68, 0.2)',
          color: '#EF4444',
          borderColor: '#EF4444'
        }
      case 'PUSH':
        return {
          backgroundColor: 'rgba(156, 163, 175, 0.2)',
          color: '#9CA3AF',
          borderColor: '#9CA3AF'
        }
      case 'OPEN':
        return {
          backgroundColor: 'rgba(234, 179, 8, 0.2)',
          color: '#EAB308',
          borderColor: '#EAB308'
        }
      default:
        return {
          backgroundColor: 'rgba(156, 163, 175, 0.2)',
          color: '#9CA3AF',
          borderColor: '#9CA3AF'
        }
    }
  }

  // Calculate stats from unique bets (don't double-count parlay bets)
  const uniqueBets = Object.values(groupedBets).map(group => group[0])
  const totalPnl = uniqueBets.reduce((sum, bet) => sum + (bet.pnl || 0), 0)
  const settledBets = uniqueBets.filter(bet => bet.status !== 'OPEN')
  const winRate = settledBets.length > 0 
    ? (settledBets.filter(bet => bet.status === 'WON').length / settledBets.length * 100) 
    : 0
  const totalBetsCount = Object.keys(groupedBets).length // Count bet groups, not individual bets
  const openBetsCount = uniqueBets.filter(bet => bet.status === 'OPEN').length

  if (loading) {
    return (
      <div className="App">
        <Header />
        <div style={{ 
          minHeight: 'calc(100vh - 80px)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center' 
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              display: 'inline-block',
              width: '48px',
              height: '48px',
              border: '3px solid rgba(255, 255, 255, 0.3)',
              borderTopColor: '#3B82F6',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            <style jsx>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>
            <p style={{ marginTop: '1rem', color: '#cccccc' }}>Loading your bets...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="App">
      <Header />

      <main style={{ 
        maxWidth: '1200px', 
        margin: '0 auto', 
        padding: '2rem',
        minHeight: 'calc(100vh - 80px)'
      }}>
        {/* Page Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ 
            fontSize: '2rem', 
            fontWeight: 700, 
            color: 'white', 
            marginBottom: '0.5rem' 
          }}>
            My Bets
          </h1>
          <p style={{ color: '#cccccc', fontSize: '1.125rem' }}>
            Track your betting history and performance.
          </p>
        </div>

        {/* Stats */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '1.5rem', 
          marginBottom: '2rem' 
        }}>
          <div style={{
            backgroundColor: '#1E1E1E',
            border: '1px solid #FFFFFF',
            borderRadius: '16px',
            padding: '1.5rem'
          }}>
            <h3 style={{ 
              fontSize: '0.875rem', 
              fontWeight: 500, 
              color: '#888888', 
              marginBottom: '0.5rem',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>Total Bets</h3>
            <p style={{ 
              fontSize: '2rem', 
              fontWeight: 700, 
              color: 'white',
              margin: 0
            }}>
              {totalBetsCount}
            </p>
          </div>
          
          <div style={{
            backgroundColor: '#1E1E1E',
            border: '1px solid #FFFFFF',
            borderRadius: '16px',
            padding: '1.5rem'
          }}>
            <h3 style={{ 
              fontSize: '0.875rem', 
              fontWeight: 500, 
              color: '#888888', 
              marginBottom: '0.5rem',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>Win Rate</h3>
            <p style={{ 
              fontSize: '2rem', 
              fontWeight: 700, 
              color: '#3B82F6',
              margin: 0
            }}>
              {winRate.toFixed(1)}%
            </p>
          </div>
          
          <div style={{
            backgroundColor: '#1E1E1E',
            border: '1px solid #FFFFFF',
            borderRadius: '16px',
            padding: '1.5rem'
          }}>
            <h3 style={{ 
              fontSize: '0.875rem', 
              fontWeight: 500, 
              color: '#888888', 
              marginBottom: '0.5rem',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>Total P&L</h3>
            <p style={{ 
              fontSize: '2rem', 
              fontWeight: 700, 
              color: totalPnl >= 0 ? '#22C55E' : '#EF4444',
              margin: 0
            }}>
              {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
            </p>
          </div>
          
          <div style={{
            backgroundColor: '#1E1E1E',
            border: '1px solid #FFFFFF',
            borderRadius: '16px',
            padding: '1.5rem'
          }}>
            <h3 style={{ 
              fontSize: '0.875rem', 
              fontWeight: 500, 
              color: '#888888', 
              marginBottom: '0.5rem',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>Open Bets</h3>
            <p style={{ 
              fontSize: '2rem', 
              fontWeight: 700, 
              color: '#EAB308',
              margin: 0
            }}>
              {openBetsCount}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div style={{
          backgroundColor: '#1E1E1E',
          border: '1px solid #FFFFFF',
          borderRadius: '16px',
          padding: '1.5rem',
          marginBottom: '2rem'
        }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '1rem' 
          }}>
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '0.875rem', 
                fontWeight: 500, 
                color: '#cccccc', 
                marginBottom: '0.5rem' 
              }}>
                Filter by Status
              </label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  backgroundColor: '#121212',
                  border: '1px solid #FFFFFF',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                <option value="ALL">All Statuses</option>
                <option value="OPEN">Open</option>
                <option value="WON">Won</option>
                <option value="LOST">Lost</option>
                <option value="PUSH">Push</option>
              </select>
            </div>
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '0.875rem', 
                fontWeight: 500, 
                color: '#cccccc', 
                marginBottom: '0.5rem' 
              }}>
                Filter by Sport
              </label>
              <select
                value={sportFilter}
                onChange={(e) => setSportFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  backgroundColor: '#121212',
                  border: '1px solid #FFFFFF',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                <option value="ALL">All Sports</option>
                <option value="NBA">NBA</option>
                <option value="NFL">NFL</option>
                <option value="MLB">MLB</option>
                <option value="NHL">NHL</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bets List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {betGroups.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '3rem',
              backgroundColor: '#1E1E1E',
              border: '1px solid #FFFFFF',
              borderRadius: '16px'
            }}>
              <p style={{ color: '#cccccc', fontSize: '1.125rem' }}>
                No bets found matching your criteria.
              </p>
            </div>
          ) : (
            betGroups.map((betGroup) => {
              const firstBet = betGroup[0]
              const isParlay = betGroup.length > 1 && firstBet.parlayId
              const statusStyle = getStatusStyle(firstBet.status)
              const totalStake = isParlay ? firstBet.stake : firstBet.stake // For parlays, stake is the same for all bets
              const totalPayout = isParlay ? firstBet.potentialPayout : firstBet.potentialPayout
              const groupPnl = firstBet.pnl || 0
              
              return (
                <div 
                  key={isParlay ? firstBet.parlayId : firstBet.id} 
                  style={{
                    backgroundColor: '#1E1E1E',
                    border: '1px solid #FFFFFF',
                    borderRadius: '16px',
                    padding: '1.5rem'
                  }}
                >
                  {isParlay && (
                    <div style={{ 
                      marginBottom: '1rem',
                      paddingBottom: '1rem',
                      borderBottom: '1px solid #333333'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 style={{ 
                          fontSize: '1.25rem', 
                          fontWeight: 700, 
                          color: 'white',
                          margin: 0
                        }}>
                          Parlay ({betGroup.length} picks)
                        </h2>
                        {firstBet.parlayMultiplier && (
                          <span style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: 'rgba(59, 130, 246, 0.2)',
                            color: '#3B82F6',
                            borderRadius: '8px',
                            fontSize: '0.875rem',
                            fontWeight: 600
                          }}>
                            {firstBet.parlayMultiplier}x Multiplier
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'flex-start', 
                    marginBottom: '1rem' 
                  }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '0.875rem', color: '#888888', marginBottom: '0.5rem' }}>
                        {isParlay ? 'Picks:' : 'Selection:'}
                      </p>
                      {betGroup.map((bet, idx) => {
                        // Format selection display - capitalize first letter
                        const selectionDisplay = bet.selection ? 
                          bet.selection.charAt(0).toUpperCase() + bet.selection.slice(1) : 
                          'N/A'
                        
                        return (
                          <div key={bet.id} style={{ marginBottom: idx < betGroup.length - 1 ? '0.75rem' : '0' }}>
                            <p style={{ 
                              fontSize: '1rem', 
                              fontWeight: 600, 
                              color: 'white',
                              marginBottom: '0.25rem'
                            }}>
                              {selectionDisplay} • {bet.market.sport}
                            </p>
                            <p style={{ fontSize: '0.875rem', color: '#cccccc' }}>
                              {bet.market.participants.length > 0 ? bet.market.participants.join(' vs ') : 'N/A'}
                            </p>
                          </div>
                        )
                      })}
                      <p style={{ fontSize: '0.875rem', color: '#888888', marginTop: '0.75rem' }}>
                        Placed: {formatDate(firstBet.placedAt)}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right', marginLeft: '1rem' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '0.5rem 1rem',
                        borderRadius: '20px',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        ...statusStyle,
                        border: `1px solid ${statusStyle.borderColor}`
                      }}>
                        {firstBet.status}
                      </span>
                      {firstBet.settledAt && (
                        <p style={{ fontSize: '0.875rem', color: '#888888', marginTop: '0.5rem' }}>
                          Settled: {formatDate(firstBet.settledAt)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
                    gap: '1rem'
                  }}>
                    <div>
                      <p style={{ fontSize: '0.875rem', color: '#888888', marginBottom: '0.25rem' }}>Stake</p>
                      <p style={{ fontWeight: 600, color: 'white' }}>${totalStake.toFixed(2)}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '0.875rem', color: '#888888', marginBottom: '0.25rem' }}>Potential Payout</p>
                      <p style={{ fontWeight: 600, color: 'white' }}>${totalPayout.toFixed(2)}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '0.875rem', color: '#888888', marginBottom: '0.25rem' }}>P&L</p>
                      <p style={{ 
                        fontWeight: 600, 
                        color: groupPnl !== undefined 
                          ? (groupPnl >= 0 ? '#22C55E' : '#EF4444') 
                          : '#888888' 
                      }}>
                        {groupPnl !== undefined 
                          ? (groupPnl >= 0 ? '+' : '') + '$' + groupPnl.toFixed(2) 
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </main>
    </div>
  )
}
