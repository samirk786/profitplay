'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
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

function BettingHistorySection({ challengeAccountId }: { challengeAccountId: string }) {
  const [bets, setBets] = useState<Bet[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBets()
  }, [challengeAccountId])

  const fetchBets = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/bets?challengeAccountId=${challengeAccountId}`, {
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
      }
    } catch (error) {
      console.error('Error fetching bets:', error)
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
      groups[bet.id] = [bet]
    }
    return groups
  }, {})

  const allBetGroups = Object.values(groupedBets)
    .sort((a, b) => new Date(b[0].placedAt).getTime() - new Date(a[0].placedAt).getTime())
  const betGroups = allBetGroups.slice(0, 1) // Show only most recent bet

  // Extract player info and prop type from bet
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

  const getBetInfo = (bet: Bet) => {
    const metadata = bet.market._metadata || {}
    const lineJSON = bet.oddsSnapshot?.lineJSON || {}
    const playerName = metadata.player || bet.market.participants?.[0] || 'Unknown Player'
    const jersey = metadata.jersey || null
    const matchup = metadata.matchup || bet.market.participants?.join(' vs ') || 'N/A'
    const engagement = metadata.engagement || '0'
    
    // Get prop type
    let statType = ''
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

    // Get pick value
    let pickValue: number | null = null
    if (bet.market.marketType === 'SPREAD') {
      // For spreads, match team name to get the right spread value
      if (lineJSON.home && lineJSON.away) {
        if (playerName === bet.market.participants?.[1]) {
          pickValue = lineJSON.home.spread
        } else {
          pickValue = lineJSON.away.spread
        }
      }
      statType = ''
    } else if (lineJSON.over) {
      pickValue = lineJSON.over.total || lineJSON.over.line || null
    } else if (lineJSON.under) {
      pickValue = lineJSON.under.total || lineJSON.under.line || null
    }

    // Actual value and stats should come from settlements/API
    const actualValue: number | null = metadata.actualValue ?? null
    const gameStats: string | null = metadata.gameStats ?? null

    return {
      playerName,
      jersey,
      matchup,
      engagement,
      statType,
      pickValue,
      actualValue,
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div style={{
      backgroundColor: '#1E1E1E',
      border: '1px solid #FFFFFF',
      borderRadius: '16px',
      padding: '1.5rem'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ 
          fontSize: '1.125rem', 
          fontWeight: 600, 
          color: 'white', 
          margin: 0
        }}>
          Betting History
        </h3>
        <Link
          href="/dashboard/bets"
          style={{
            fontSize: '0.875rem',
            color: '#3B82F6',
            textDecoration: 'none',
            fontWeight: 500
          }}
        >
          View All
        </Link>
      </div>
      
      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#888888' }}>
          Loading bets...
        </div>
      ) : betGroups.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#888888' }}>
          No bets yet. Start placing bets to see your history here.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {betGroups.map((betGroup) => {
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
                  const betInfo = getBetInfo(bet)
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
                          {betInfo.playerName}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {bet.market.marketType === 'SPREAD' ? (
                          <span style={{ color: '#888', fontSize: '0.875rem' }}>
                            {betInfo.pickValue !== null
                              ? (betInfo.pickValue > 0 ? `+${betInfo.pickValue.toFixed(1)}` : betInfo.pickValue.toFixed(1))
                              : '—'}
                          </span>
                        ) : (
                          <>
                            <span style={{ color: '#888', fontSize: '0.875rem' }}>
                              {betInfo.pickValue !== null ? betInfo.pickValue.toFixed(1) : '—'} {betInfo.statType}
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
                  {formatDate(firstBet.placedAt)}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

interface ChallengeAccount {
  id: string
  startBalance: number
  equity: number
  highWaterMark: number
  state: string
  isFunded: boolean
  ruleset: {
    name: string
    profitTargetPct: number
    maxDailyLossPct: number
    maxDrawdownPct: number
    maxStakePct: number
  }
}

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [challengeAccount, setChallengeAccount] = useState<ChallengeAccount | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }

    if (status === 'authenticated' && session?.user?.id) {
      fetchChallengeAccount()
    }
  }, [status, session, router])

  const fetchChallengeAccount = async () => {
    if (!session?.user?.id) return

    try {
      setLoading(true)
      const response = await fetch(`/api/challenges?state=ACTIVE`, {
        credentials: 'include' // Include cookies for authentication
      })
      
      if (!response.ok) {
        console.error('Failed to fetch challenge account:', response.status, response.statusText)
        setChallengeAccount(null)
        return
      }

      const data = await response.json()
      console.log('Challenge account data:', data) // Debug log

      if (data.challenges && data.challenges.length > 0) {
        const activeChallenge = data.challenges[0]
        setChallengeAccount({
          id: activeChallenge.id,
          startBalance: activeChallenge.startBalance,
          equity: activeChallenge.equity,
          highWaterMark: activeChallenge.highWaterMark,
          state: activeChallenge.state,
          isFunded: activeChallenge.isFunded || false,
          ruleset: {
            name: activeChallenge.ruleset.name,
            profitTargetPct: activeChallenge.ruleset.profitTargetPct,
            maxDailyLossPct: activeChallenge.ruleset.maxDailyLossPct,
            maxDrawdownPct: activeChallenge.ruleset.maxDrawdownPct,
            maxStakePct: activeChallenge.ruleset.maxStakePct,
          }
        })
      } else {
        setChallengeAccount(null)
      }
    } catch (error) {
      console.error('Error fetching challenge account:', error)
      setChallengeAccount(null)
    } finally {
      setLoading(false)
    }
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
            <p style={{ marginTop: '1rem', color: '#cccccc' }}>Loading your dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return null // Will redirect
  }

  if (!challengeAccount) {
    return (
      <div className="App">
        <Header />
        <div style={{ 
          minHeight: 'calc(100vh - 80px)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          padding: '2rem'
        }}>
          <div style={{ textAlign: 'center', maxWidth: '600px' }}>
            <h1 style={{ 
              fontSize: '2rem', 
              fontWeight: 700, 
              color: 'white', 
              marginBottom: '1rem' 
            }}>
              No Active Challenge
            </h1>
            <p style={{ color: '#cccccc', marginBottom: '2rem', fontSize: '1.125rem' }}>
              You don&apos;t have an active challenge account. Subscribe to a plan to get started.
            </p>
            <Link
              href="/pricing"
              style={{
                display: 'inline-block',
                padding: '0.75rem 1.5rem',
                backgroundColor: 'white',
                color: '#121212',
                borderRadius: '8px',
                fontWeight: 600,
                textDecoration: 'none',
                transition: 'background-color 0.2s ease'
              }}
              className="hero-cta-button"
            >
              View Plans
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const profit = challengeAccount.equity - challengeAccount.startBalance
  const profitPct = (profit / challengeAccount.startBalance) * 100
  const profitTarget = challengeAccount.startBalance * (challengeAccount.ruleset.profitTargetPct / 100)
  const progressToTarget = Math.min((profit / profitTarget) * 100, 100)

  return (
    <div className="App">
      <Header />

      <main style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: 'clamp(1rem, 3vw, 2rem)',
        minHeight: 'calc(100vh - 80px)'
      }}>
        {/* Welcome Section */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ 
            fontSize: '2rem', 
            fontWeight: 700, 
            color: 'white', 
            marginBottom: '0.5rem' 
          }}>
            Welcome to your Run
          </h1>
          <p style={{ color: '#cccccc', fontSize: '1.125rem' }}>
            Track your progress and manage your simulated performance.
          </p>
        </div>

        {/* Stats Grid */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(250px, 100%), 1fr))',
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
            }}>Starting Score</h3>
            <p style={{ 
              fontSize: '2rem', 
              fontWeight: 700, 
              color: 'white',
              margin: 0
            }}>
              ${challengeAccount.startBalance.toLocaleString()}
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
            }}>Profit/Loss</h3>
            <p style={{ 
              fontSize: '2rem', 
              fontWeight: 700, 
              color: profit >= 0 ? '#22C55E' : '#EF4444',
              margin: 0
            }}>
              {profit >= 0 ? '+' : ''}${profit.toLocaleString()}
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
            }}>Profit %</h3>
            <p style={{ 
              fontSize: '2rem', 
              fontWeight: 700, 
              color: profitPct >= 0 ? '#22C55E' : '#EF4444',
              margin: 0
            }}>
              {profitPct >= 0 ? '+' : ''}{profitPct.toFixed(2)}%
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
            }}>Status</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-start' }}>
              <span style={{
                display: 'inline-block',
                padding: '0.35rem 0.75rem',
                borderRadius: '20px',
                fontSize: '0.75rem',
                fontWeight: 600,
                backgroundColor: challengeAccount.isFunded ? 'rgba(168, 85, 247, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                color: challengeAccount.isFunded ? '#A855F7' : '#3B82F6',
                border: `1px solid ${challengeAccount.isFunded ? '#A855F7' : '#3B82F6'}`
              }}>
                {challengeAccount.isFunded ? 'FUNDED' : 'CHALLENGE'}
              </span>
              <span style={{
                display: 'inline-block',
                padding: '0.5rem 1rem',
                borderRadius: '20px',
                fontSize: '0.875rem',
                fontWeight: 600,
                backgroundColor: challengeAccount.state === 'ACTIVE' ? 'rgba(34, 197, 94, 0.2)' :
                                  challengeAccount.state === 'PASSED' ? 'rgba(59, 130, 246, 0.2)' :
                                  challengeAccount.state === 'FAILED' ? 'rgba(239, 68, 68, 0.2)' :
                                  'rgba(234, 179, 8, 0.2)',
                color: challengeAccount.state === 'ACTIVE' ? '#22C55E' :
                       challengeAccount.state === 'PASSED' ? '#3B82F6' :
                       challengeAccount.state === 'FAILED' ? '#EF4444' :
                       '#EAB308',
                border: `1px solid ${challengeAccount.state === 'ACTIVE' ? '#22C55E' :
                                    challengeAccount.state === 'PASSED' ? '#3B82F6' :
                                    challengeAccount.state === 'FAILED' ? '#EF4444' :
                                    '#EAB308'}`
              }}>
                {challengeAccount.state === 'PAUSED' ? 'FROZEN' : challengeAccount.state}
              </span>
            </div>
          </div>
        </div>

        {/* Progress Section */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(400px, 100%), 1fr))',
          gap: '2rem', 
          marginBottom: '2rem' 
        }}>
          {/* Progress to Target */}
          <div style={{
            backgroundColor: '#1E1E1E',
            border: '1px solid #FFFFFF',
            borderRadius: '16px',
            padding: '1.5rem'
          }}>
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: 600,
              color: 'white',
              marginBottom: '1rem'
            }}>
              {challengeAccount.isFunded ? 'Profit/Loss' : 'Progress to Target'}
            </h3>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.875rem',
                color: '#cccccc',
                marginBottom: '0.5rem'
              }}>
                <span>Current: ${profit.toLocaleString()}</span>
                {!challengeAccount.isFunded && <span>Target: ${profitTarget.toLocaleString()}</span>}
              </div>
              {!challengeAccount.isFunded && (
                <div style={{
                  width: '100%',
                  backgroundColor: '#333333',
                  borderRadius: '9999px',
                  height: '12px',
                  overflow: 'hidden'
                }}>
                  <div
                    style={{
                      backgroundColor: '#3B82F6',
                      height: '100%',
                      borderRadius: '9999px',
                      transition: 'width 0.3s ease',
                      width: `${Math.max(0, Math.min(100, progressToTarget))}%`
                    }}
                  ></div>
                </div>
              )}
              {!challengeAccount.isFunded && (
                <p style={{
                  fontSize: '0.875rem',
                  color: '#cccccc',
                  marginTop: '0.5rem',
                  margin: 0
                }}>
                  {progressToTarget.toFixed(1)}% complete
                </p>
              )}
            </div>
          </div>

          {/* Run Guidelines */}
          <div style={{
            backgroundColor: '#1E1E1E',
            border: '1px solid #FFFFFF',
            borderRadius: '16px',
            padding: '1.5rem'
          }}>
            <h3 style={{ 
              fontSize: '1.125rem', 
              fontWeight: 600, 
              color: 'white', 
              marginBottom: '0.5rem' 
            }}>
              {challengeAccount.isFunded ? 'Account Rules' : 'Challenge Rules'}
            </h3>
            <p style={{ 
              fontSize: '0.875rem', 
              color: '#cccccc', 
              marginBottom: '1rem' 
            }}>
              These limits keep each run fair and skill-based
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {!challengeAccount.isFunded && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#cccccc', display: 'flex', alignItems: 'center' }}>
                      Goal
                      <span className="info-tooltip">
                        i
                        <span className="info-tooltip-text">
                          How much you need to make to pass the challenge.
                        </span>
                      </span>
                      :
                    </span>
                    <span style={{ fontWeight: 600, color: 'white' }}>${profitTarget.toLocaleString()}/{challengeAccount.ruleset.profitTargetPct}%</span>
                  </div>
                  <div style={{
                    width: '100%',
                    height: '1px',
                    backgroundColor: '#333333',
                    margin: '0.25rem 0'
                  }}></div>
                </>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#cccccc', display: 'flex', alignItems: 'center' }}>
                  Max Daily Loss
                  <span className="info-tooltip">
                    i
                    <span className="info-tooltip-text">
                      The most you can lose in a day before your account fails.
                    </span>
                  </span>
                  :
                </span>
                <span style={{ fontWeight: 600, color: 'white' }}>{challengeAccount.ruleset.maxDailyLossPct}%</span>
              </div>
              <div style={{ 
                width: '100%', 
                height: '1px', 
                backgroundColor: '#333333',
                margin: '0.25rem 0'
              }}></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#cccccc', display: 'flex', alignItems: 'center' }}>
                  Max Trailing Drawdown
                  <span className="info-tooltip">
                    i
                    <span className="info-tooltip-text">
                      Maximum drop from your highest balance. If you lose this amount from your peak, your account is {challengeAccount.isFunded ? 'frozen' : 'failed'}.
                    </span>
                  </span>
                  :
                </span>
                <span style={{ fontWeight: 600, color: 'white' }}>${(challengeAccount.startBalance * challengeAccount.ruleset.maxDrawdownPct / 100).toLocaleString()}/{challengeAccount.ruleset.maxDrawdownPct}%</span>
              </div>
              <div style={{ 
                width: '100%', 
                height: '1px', 
                backgroundColor: '#333333',
                margin: '0.25rem 0'
              }}></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#cccccc', display: 'flex', alignItems: 'center' }}>
                  Max Bet Size
                  <span className="info-tooltip">
                    i
                    <span className="info-tooltip-text">
                      The most money you can put on a single bet.
                    </span>
                  </span>
                  :
                </span>
                <span style={{ fontWeight: 600, color: 'white' }}>${Math.floor(challengeAccount.startBalance * (challengeAccount.ruleset.maxStakePct / 100))}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Betting History */}
        <BettingHistorySection challengeAccountId={challengeAccount.id} />
      </main>
    </div>
  )
}
