'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'

interface Bet {
  id: string
  market: {
    id: string
    sport: string
    participants: string[]
    marketType: string
    startTime: string
    _metadata?: any
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
  oddsSnapshot?: {
    lineJSON: any
  }
}

export default function BetsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [bets, setBets] = useState<Bet[]>([])
  const [loading, setLoading] = useState(true)
  const [challengeAccountId, setChallengeAccountId] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }
    if (status === 'authenticated' && session?.user?.id) {
      fetchChallengeAccount()
    }
  }, [status, session, router])

  useEffect(() => {
    if (challengeAccountId) {
      fetchBets()
    }
  }, [challengeAccountId])

  const fetchChallengeAccount = async () => {
    if (!session?.user?.id) return
    try {
      const response = await fetch('/api/challenges?state=ACTIVE', {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        if (data.challenges && data.challenges.length > 0) {
          setChallengeAccountId(data.challenges[0].id)
        } else {
          setChallengeAccountId(null)
        }
      }
    } catch (error) {
      console.error('Error fetching challenge account:', error)
      setChallengeAccountId(null)
    }
  }

  const fetchBets = async () => {
    if (!challengeAccountId) return

    try {
      setLoading(true)
      const url = `/api/bets?challengeAccountId=${challengeAccountId}`
      const response = await fetch(url, {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        const mappedBets: Bet[] = (data.bets || []).map((bet: any) => ({
          id: bet.id,
          market: {
            id: bet.market.id,
            sport: bet.market.sport,
            participants: bet.market.participants || [],
            marketType: bet.market.marketType,
            startTime: bet.market.startTime,
            _metadata: bet.market._metadata
          },
          selection: bet.selection,
          stake: bet.stake,
          potentialPayout: bet.potentialPayout,
          status: bet.status,
          placedAt: bet.placedAt,
          settledAt: bet.settledAt || undefined,
          pnl: bet.settlements?.[0]?.resultJSON?.pnl || undefined,
          parlayId: bet.parlayId || undefined,
          parlayMultiplier: bet.parlayMultiplier || undefined,
          oddsSnapshot: bet.oddsSnapshot
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

  const groupedBets = useMemo(() => {
    const groups: Record<string, Bet[]> = {}
    bets.forEach(bet => {
      const key = bet.parlayId || bet.id
      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(bet)
    })
    return groups
  }, [bets])

  const betGroups = Object.values(groupedBets)
    .sort((a, b) => new Date(b[0].placedAt).getTime() - new Date(a[0].placedAt).getTime())

  // Extract player info from market metadata
  const formatPropType = (marketType?: string) => {
    if (!marketType) return null
    if (marketType.includes('PLAYER_POINTS')) return 'PTS'
    if (marketType.includes('PLAYER_REBOUNDS')) return 'REB'
    if (marketType.includes('PLAYER_ASSISTS')) return 'AST'
    if (marketType.includes('PLAYER_STEALS')) return 'STL'
    if (marketType.includes('PLAYER_BLOCKS')) return 'BLK'
    if (marketType.includes('PLAYER_THREES')) return '3PT'
    if (marketType.includes('PLAYER_PASS_YDS')) return 'PASS YDS'
    if (marketType.includes('PLAYER_PASS_TDS')) return 'PASS TDS'
    if (marketType.includes('PLAYER_PASS_COMPLETIONS')) return 'CMP'
    if (marketType.includes('PLAYER_RUSH_YDS')) return 'RUSH YDS'
    if (marketType.includes('PLAYER_RUSH_ATT')) return 'CAR'
    if (marketType.includes('PLAYER_REC_YDS')) return 'REC YDS'
    if (marketType.includes('PLAYER_REC_RECEPTIONS')) return 'REC'
    if (marketType.includes('PLAYER_REC_TDS')) return 'REC TDS'
    return marketType.replace('PLAYER_', '').replace(/_/g, ' ')
  }


  const getPlayerInfo = (bet: Bet) => {
    const metadata = bet.market._metadata || {}
    const playerName = metadata.player || bet.market.participants[0] || 'Unknown Player'
    const jerseyNumber = metadata.jersey || null
    const matchup = metadata.matchup || bet.market.participants.join(' vs ')
    const engagement = metadata.engagement || '0'
    const team = metadata.team || bet.market.participants[1] || null
    
    // Extract actual value and pick value from lineJSON
    const lineJSON = bet.oddsSnapshot?.lineJSON || {}
    let pickValue: number | null = null
    let actualValue: number | null = null
    let statType = ''

    if (bet.market.marketType === 'SPREAD') {
      // For spreads, the selection stored is the team name
      // lineJSON has { home: { spread, odds }, away: { spread, odds } }
      const selection = bet.selection
      if (lineJSON.home && lineJSON.away) {
        // Match by team name in participants
        if (playerName === bet.market.participants?.[1]) {
          pickValue = lineJSON.home.spread
        } else {
          pickValue = lineJSON.away.spread
        }
      }
      statType = ''
    } else if (bet.market.marketType.includes('PLAYER_') || bet.market.marketType === 'PROPS') {
      // For player props, extract the total/line value
      if (lineJSON.over) {
        pickValue = lineJSON.over.total || lineJSON.over.line || null
      } else if (lineJSON.under) {
        pickValue = lineJSON.under.total || lineJSON.under.line || null
      }
      
      // Extract stat type from market type
      if (bet.market.marketType.includes('RUSH_YDS')) {
        statType = 'RUSH YDS'
      } else if (bet.market.marketType.includes('PASS_YDS')) {
        statType = 'PASS YDS'
      } else if (bet.market.marketType.includes('REC_YDS')) {
        statType = 'REC YDS'
      } else if (bet.market.marketType.includes('POINTS')) {
        statType = 'PTS'
      } else if (bet.market.marketType.includes('RECEPTIONS')) {
        statType = 'REC'
      } else if (bet.market.marketType.includes('TDS')) {
        statType = 'TDS'
      } else if (bet.market.marketType.includes('PASS_COMPLETIONS')) {
        statType = 'CMP'
      } else if (bet.market.marketType.includes('RUSH_ATT')) {
        statType = 'CAR'
      } else if (bet.market.marketType === 'PROPS') {
        // Try to infer from metadata or use generic
        statType =
          metadata.statType ||
          metadata.propType ||
          lineJSON.propType ||
          formatPropType(metadata.originalMarketType) ||
          formatPropType(lineJSON.originalMarketType) ||
          'PROPS'
      } else {
        statType = bet.market.marketType.replace('PLAYER_', '').replace(/_/g, ' ')
      }
    }

    // Actual value and stats should come from settlements/API
    actualValue = metadata.actualValue ?? null
    const gameStats: string | null = metadata.gameStats ?? null

    return {
      name: playerName,
      jersey: jerseyNumber,
      matchup,
      engagement,
      team,
      pickValue,
      actualValue,
      statType,
      gameStats
    }
  }

  const getOutcomeText = (group: Bet[]) => {
    const firstBet = group[0]
    return {
      wager: `$${firstBet.stake.toFixed(2)}`,
      potential: `$${firstBet.potentialPayout.toFixed(2)}`
    }
  }

  const getParlayStatus = (group: Bet[]) => {
    const hasLost = group.some(b => b.status === 'LOST')
    const allWon = group.every(b => b.status === 'WON')
    const allSettled = group.every(b => b.status === 'WON' || b.status === 'LOST')
    if (hasLost) return 'LOST'
    if (allWon) return 'WON'
    if (allSettled) return 'LOST'
    return 'PENDING'
  }


  if (status === 'loading' || loading) {
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

  if (status === 'unauthenticated') {
    return null
  }

  return (
    <div className="App">
      <Header />

      <main style={{ 
        maxWidth: '800px', 
        margin: '0 auto', 
        padding: '1rem',
        minHeight: 'calc(100vh - 80px)'
      }}>
        {/* Betting History */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
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
              const outcome = getOutcomeText(betGroup)
              const parlayStatus = getParlayStatus(betGroup)
              const parlayWon = parlayStatus === 'WON'
              const parlayLost = parlayStatus === 'LOST'

              return (
                <div
                  key={isParlay ? firstBet.parlayId : firstBet.id}
                  style={{
                    backgroundColor: '#121212',
                    borderRadius: '12px',
                    padding: '1rem 1.25rem',
                    border: '1px solid #333'
                  }}
                >
                  {/* Header Row */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.75rem',
                    paddingBottom: '0.75rem',
                    borderBottom: '1px solid #333'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span style={{ color: 'white', fontSize: '1rem' }}>
                        {outcome.wager} to pay {outcome.potential}
                      </span>
                      {firstBet.parlayMultiplier && (
                        <span style={{ color: '#888', fontSize: '0.875rem' }}>
                          <strong>{firstBet.parlayMultiplier.toFixed(2)}x</strong>
                        </span>
                      )}
                      <span style={{ color: '#888', fontSize: '0.875rem' }}>
                        <strong>{betGroup.length} {betGroup.length === 1 ? 'PICK' : 'PICKS'}</strong>
                      </span>
                    </div>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '10px',
                      backgroundColor: parlayWon ? 'rgba(34, 197, 94, 0.2)' : parlayLost ? 'rgba(239, 68, 68, 0.2)' : 'rgba(156, 163, 175, 0.2)',
                      color: parlayWon ? '#22C55E' : parlayLost ? '#EF4444' : '#9CA3AF',
                      fontSize: '0.75rem',
                      fontWeight: 600
                    }}>
                      {parlayWon ? '✓ WON' : parlayLost ? '✕ LOST' : '○ PENDING'}
                    </div>
                  </div>

                  {/* Pick Rows - Compact */}
                  {betGroup.map((bet, idx) => {
                    const playerInfo = getPlayerInfo(bet)
                    const isWon = bet.status === 'WON'
                    const isLost = bet.status === 'LOST'

                    return (
                      <div
                        key={bet.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '0.5rem 0',
                          borderBottom: idx < betGroup.length - 1 ? '1px solid #222' : 'none'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            backgroundColor: isWon ? 'rgba(34, 197, 94, 0.2)' : isLost ? 'rgba(239, 68, 68, 0.2)' : 'rgba(156, 163, 175, 0.2)',
                            color: isWon ? '#22C55E' : isLost ? '#EF4444' : '#9CA3AF',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.65rem',
                            flexShrink: 0
                          }}>
                            {isWon ? '✓' : isLost ? '✕' : '○'}
                          </span>
                          <span style={{ color: 'white', fontSize: '0.875rem' }}>
                            {playerInfo.name}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {bet.market.marketType === 'SPREAD' ? (
                            <span style={{ color: '#888', fontSize: '0.875rem' }}>
                              {playerInfo.pickValue !== null
                                ? (playerInfo.pickValue > 0 ? `+${playerInfo.pickValue.toFixed(1)}` : playerInfo.pickValue.toFixed(1))
                                : '—'}
                            </span>
                          ) : (
                            <>
                              <span style={{ color: '#888', fontSize: '0.875rem' }}>
                                {playerInfo.pickValue !== null ? playerInfo.pickValue.toFixed(1) : '—'} {playerInfo.statType}
                              </span>
                              <span style={{
                                width: '22px',
                                height: '22px',
                                borderRadius: '50%',
                                backgroundColor: bet.selection === 'over' ? '#22C55E' : '#EF4444',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                flexShrink: 0
                              }}>
                                {bet.selection === 'over' ? '↑' : '↓'}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}

                  {/* Date */}
                  <div style={{
                    marginTop: '0.5rem',
                    fontSize: '0.75rem',
                    color: '#555'
                  }}>
                    {new Date(firstBet.placedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
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
