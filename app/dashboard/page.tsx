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

  const betGroups = Object.values(groupedBets).slice(0, 10) // Show last 10 bets/groups

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
    if (lineJSON.over) {
      pickValue = lineJSON.over.total || lineJSON.over.line || null
    } else if (lineJSON.under) {
      pickValue = lineJSON.under.total || lineJSON.under.line || null
    }

    // Get actual value (simulated for now)
    let actualValue: number | null = null
    if (bet.status === 'WON' && pickValue !== null) {
      if (bet.selection === 'over') {
        actualValue = pickValue + Math.random() * 20 + 5
      } else {
        actualValue = pickValue - Math.random() * 20 - 5
      }
    } else if (bet.status === 'LOST' && pickValue !== null) {
      if (bet.selection === 'over') {
        actualValue = pickValue - Math.random() * 15 - 2
      } else {
        actualValue = pickValue + Math.random() * 15 + 2
      }
    }

    // Generate mock game stats (in real app, this comes from settlements/API)
    const gameStats = metadata.gameStats || generateMockGameStats(bet.market.sport, statType)

    return {
      statType,
      pickValue,
      actualValue,
      gameStats
    }
  }

  // Generate mock game stats for display
  const generateMockGameStats = (sport: string, statType: string): string => {
    if (sport === 'NFL') {
      if (statType.includes('PASS')) {
        return `${Math.floor(Math.random() * 30 + 15)}/${Math.floor(Math.random() * 50 + 25)} CMP, ${Math.floor(Math.random() * 250 + 150)} YD`
      } else if (statType.includes('RUSH')) {
        return `${Math.floor(Math.random() * 25 + 10)} CAR, ${Math.floor(Math.random() * 80 + 40)} YD`
      } else if (statType.includes('REC')) {
        return `${Math.floor(Math.random() * 10 + 3)}/${Math.floor(Math.random() * 12 + 5)} REC, ${Math.floor(Math.random() * 80 + 30)} YD`
      }
    } else if (sport === 'NBA') {
      if (statType === 'PTS') {
        return `${Math.floor(Math.random() * 15 + 20)} PTS, ${Math.floor(Math.random() * 12 + 5)} REB, ${Math.floor(Math.random() * 10 + 3)} AST`
      }
    }
    return ''
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'WON':
        return '#22C55E'
      case 'LOST':
        return '#EF4444'
      case 'PUSH':
        return '#9CA3AF'
      case 'OPEN':
        return '#EAB308'
      default:
        return '#9CA3AF'
    }
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
            const statusColor = getStatusColor(firstBet.status)
            
            return (
              <div
                key={isParlay ? firstBet.parlayId : firstBet.id}
                style={{
                  backgroundColor: '#121212',
                  borderRadius: '12px',
                  padding: '1rem',
                  border: `1px solid ${statusColor === '#EAB308' ? '#EAB30833' : statusColor === '#22C55E' ? '#22C55E33' : '#EF444433'}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start'
                }}
              >
                <div style={{ flex: 1 }}>
                  {isParlay && (
                    <div style={{ 
                      fontSize: '0.75rem', 
                      color: '#888888', 
                      marginBottom: '0.5rem',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      PARLAY • {betGroup.length} PICKS{firstBet.parlayMultiplier ? ` • ${firstBet.parlayMultiplier.toFixed(0)}X` : ''}
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    {betGroup.map((bet, idx) => {
                      const betInfo = getBetInfo(bet)
                      const isWon = bet.status === 'WON'
                      const isLost = bet.status === 'LOST'
                      const progressColor = isWon ? '#22C55E' : isLost ? '#EF4444' : '#888888'
                      const maxValue = betInfo.pickValue && betInfo.actualValue
                        ? Math.max(betInfo.pickValue, betInfo.actualValue) * 1.2
                        : betInfo.pickValue ? betInfo.pickValue * 1.5 : 100
                      
                      return (
                        <div key={bet.id} style={{ marginBottom: idx < betGroup.length - 1 ? '0.5rem' : '0' }}>
                          <div style={{ 
                            fontSize: '0.875rem', 
                            fontWeight: 600, 
                            color: 'white',
                            lineHeight: '1.4',
                            marginBottom: '0.25rem'
                          }}>
                            {bet.selection.charAt(0).toUpperCase() + bet.selection.slice(1)} • {bet.market.sport}
                          </div>
                          <div style={{ 
                            fontSize: '0.75rem', 
                            color: '#888888',
                            marginBottom: '0.25rem'
                          }}>
                            {bet.market.participants.length > 0 ? bet.market.participants.slice(0, 2).join(' vs ') : 'N/A'}
                          </div>
                          
                          {/* Progress Bar for Actual vs Pick */}
                          {betInfo.pickValue !== null && (
                            <div style={{ marginBottom: '0.25rem' }}>
                              <div style={{
                                height: '6px',
                                backgroundColor: '#333',
                                borderRadius: '3px',
                                marginBottom: '0.5rem',
                                position: 'relative',
                                overflow: 'hidden',
                                width: '100%',
                                maxWidth: '200px'
                              }}>
                                {betInfo.actualValue !== null && (
                                  <div style={{
                                    height: '100%',
                                    width: `${Math.min((betInfo.actualValue / maxValue) * 100, 100)}%`,
                                    backgroundColor: progressColor,
                                    borderRadius: '3px',
                                    transition: 'width 0.3s ease'
                                  }}></div>
                                )}
                              </div>
                              <div style={{
                                fontSize: '0.75rem',
                                color: '#888888',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                              }}>
                                <span>
                                  {betInfo.actualValue !== null ? (
                                    <span style={{ color: progressColor, fontWeight: 600 }}>
                                      {betInfo.actualValue.toFixed(0)}
                                    </span>
                                  ) : (
                                    'Pending'
                                  )} / {betInfo.pickValue.toFixed(1)} {betInfo.statType}
                                </span>
                              </div>
                              {betInfo.gameStats && (
                                <div style={{
                                  fontSize: '0.7rem',
                                  color: '#666666',
                                  marginTop: '0.125rem'
                                }}>
                                  {betInfo.gameStats}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  <div style={{ 
                    fontSize: '0.75rem', 
                    color: '#888888'
                  }}>
                    {formatDate(firstBet.placedAt)}
                  </div>
                </div>
                
                <div style={{ textAlign: 'right', marginLeft: '1rem', flexShrink: 0 }}>
                  <div style={{ 
                    fontSize: '0.875rem', 
                    fontWeight: 600, 
                    color: statusColor,
                    marginBottom: '0.25rem'
                  }}>
                    {firstBet.status}
                  </div>
                  <div style={{ 
                    fontSize: '0.875rem', 
                    color: '#cccccc',
                    marginBottom: '0.125rem'
                  }}>
                    ${firstBet.stake.toFixed(2)}
                  </div>
                  {firstBet.status === 'OPEN' && (
                    <div style={{ 
                      fontSize: '0.75rem', 
                      color: '#888888'
                    }}>
                      ${firstBet.potentialPayout.toFixed(2)} potential
                    </div>
                  )}
                  {firstBet.pnl !== undefined && firstBet.status !== 'OPEN' && (
                    <div style={{ 
                      fontSize: '0.875rem', 
                      fontWeight: 600,
                      color: firstBet.pnl >= 0 ? '#22C55E' : '#EF4444',
                      marginTop: '0.125rem'
                    }}>
                      {firstBet.pnl >= 0 ? '+' : ''}${firstBet.pnl.toFixed(2)}
                    </div>
                  )}
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
  const [seeding, setSeeding] = useState(false)

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

  const seedAdminData = async () => {
    if (!session?.user?.id || session.user.role !== 'ADMIN') return

    try {
      setSeeding(true)
      const response = await fetch('/api/admin/seed-admin-data', {
        method: 'POST',
        credentials: 'include'
      })

      if (!response.ok) {
        const error = await response.json()
        alert(`Failed to seed admin data: ${error.error || 'Unknown error'}`)
        return
      }

      const data = await response.json()
      console.log('Admin data seeded:', data)
      
      // Refresh the challenge account
      await fetchChallengeAccount()
    } catch (error) {
      console.error('Error seeding admin data:', error)
      alert('Failed to seed admin data. Please try again.')
    } finally {
      setSeeding(false)
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
              {session?.user?.role === 'ADMIN' 
                ? 'You don\'t have an active challenge account. Click below to set up admin test data.'
                : 'You don\'t have an active challenge account. Subscribe to a plan to get started.'}
            </p>
            {session?.user?.role === 'ADMIN' ? (
              <button
                onClick={seedAdminData}
                disabled={seeding}
                className={seeding ? 'admin-seed-button admin-seed-button-disabled' : 'admin-seed-button'}
              >
                {seeding ? 'Setting up...' : 'Set Up Admin Test Data'}
              </button>
            ) : (
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
            )}
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
        padding: '2rem',
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
              {challengeAccount.state}
            </span>
          </div>
        </div>

        {/* Progress Section */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
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
              Progress to Target
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
                <span>Target: ${profitTarget.toLocaleString()}</span>
              </div>
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
              <p style={{ 
                fontSize: '0.875rem', 
                color: '#cccccc', 
                marginTop: '0.5rem',
                margin: 0
              }}>
                {progressToTarget.toFixed(1)}% complete
              </p>
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
              Run Guidelines
            </h3>
            <p style={{ 
              fontSize: '0.875rem', 
              color: '#cccccc', 
              marginBottom: '1rem' 
            }}>
              These limits keep each run fair and skill-based
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#cccccc' }}>Goal:</span>
                <span style={{ fontWeight: 600, color: 'white' }}>${profitTarget.toLocaleString()}/{challengeAccount.ruleset.profitTargetPct}%</span>
              </div>
              <div style={{ 
                width: '100%', 
                height: '1px', 
                backgroundColor: '#333333',
                margin: '0.25rem 0'
              }}></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#cccccc' }}>Max Daily Loss:</span>
                <span style={{ fontWeight: 600, color: 'white' }}>{challengeAccount.ruleset.maxDailyLossPct}%</span>
              </div>
              <div style={{ 
                width: '100%', 
                height: '1px', 
                backgroundColor: '#333333',
                margin: '0.25rem 0'
              }}></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#cccccc' }}>Allowed Dip:</span>
                <span style={{ fontWeight: 600, color: 'white' }}>${(challengeAccount.startBalance * (1 - challengeAccount.ruleset.maxDrawdownPct / 100)).toLocaleString()}/{challengeAccount.ruleset.maxDrawdownPct}%</span>
              </div>
              <div style={{ 
                width: '100%', 
                height: '1px', 
                backgroundColor: '#333333',
                margin: '0.25rem 0'
              }}></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#cccccc' }}>Max Bet Size:</span>
                <span style={{ fontWeight: 600, color: 'white' }}>$30</span>
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
