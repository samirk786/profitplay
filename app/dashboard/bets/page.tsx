'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import JerseyIcon from '@/components/JerseyIcon'

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
  const [filter, setFilter] = useState('ALL')
  const [sportFilter, setSportFilter] = useState('ALL')
  const [playerHeadshots, setPlayerHeadshots] = useState<Record<string, string>>({})

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
  }, [challengeAccountId, filter, sportFilter])

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
      const url = `/api/bets?challengeAccountId=${challengeAccountId}${filter !== 'ALL' ? `&status=${filter}` : ''}`
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
    .filter(group => {
      return sportFilter === 'ALL' || group.some(bet => bet.market.sport === sportFilter)
    })
    .filter(group => {
      return filter === 'ALL' || group[0]?.status === filter
    })
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

  const getHeadshotKey = (sport: string, playerName: string, team?: string | null) => {
    return `${sport}-${playerName}-${team || ''}`
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

    if (bet.market.marketType.includes('PLAYER_') || bet.market.marketType === 'PROPS') {
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

    // For now, we'll simulate actual values (in real app, this comes from settlements)
    // For WON bets, actual > pick (if over) or actual < pick (if under)
    // For LOST bets, opposite
    if (bet.status === 'WON' && pickValue !== null) {
      if (bet.selection === 'over') {
        actualValue = pickValue + Math.random() * 20 + 5 // Actual > pick
      } else {
        actualValue = pickValue - Math.random() * 20 - 5 // Actual < pick
      }
    } else if (bet.status === 'LOST' && pickValue !== null) {
      if (bet.selection === 'over') {
        actualValue = pickValue - Math.random() * 15 - 2 // Actual < pick
      } else {
        actualValue = pickValue + Math.random() * 15 + 2 // Actual > pick
      }
    } else if (bet.status === 'OPEN') {
      actualValue = null // No actual value yet
    }

    // Generate mock game stats (in real app, this comes from settlements/API)
    const gameStats = metadata.gameStats || generateMockGameStats(bet.market.sport, statType)

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

  // Generate mock game stats for display
  const generateMockGameStats = (sport: string, statType: string): string => {
    if (sport === 'NFL') {
      if (statType.includes('PASS') || statType.includes('CMP')) {
        return `${Math.floor(Math.random() * 30 + 15)}/${Math.floor(Math.random() * 50 + 25)} CMP, ${Math.floor(Math.random() * 250 + 150)} YD, ${Math.floor(Math.random() * 8 + 2)} CAR, ${Math.floor(Math.random() * 30 + 15)} YD`
      } else if (statType.includes('RUSH') || statType.includes('CAR')) {
        return `${Math.floor(Math.random() * 25 + 10)} CAR, ${Math.floor(Math.random() * 80 + 40)} YD, ${Math.floor(Math.random() * 5 + 2)}/${Math.floor(Math.random() * 7 + 3)} REC, ${Math.floor(Math.random() * 50 + 20)} YD`
      } else if (statType.includes('REC')) {
        return `${Math.floor(Math.random() * 10 + 3)}/${Math.floor(Math.random() * 12 + 5)} REC, ${Math.floor(Math.random() * 80 + 30)} YD`
      }
    } else if (sport === 'NBA') {
      if (statType === 'PTS') {
        return `${Math.floor(Math.random() * 15 + 20)} PTS, ${Math.floor(Math.random() * 12 + 5)} REB, ${Math.floor(Math.random() * 10 + 3)} AST`
      }
    } else if (sport === 'MLB') {
      return `${Math.floor(Math.random() * 4 + 1)} H, ${Math.floor(Math.random() * 2)} HR, ${Math.floor(Math.random() * 3)} RBI`
    }
    return ''
  }

  const getOutcomeText = (group: Bet[]) => {
    const firstBet = group[0]
    const totalPnl = firstBet.pnl || 0
    const stake = firstBet.stake

    if (totalPnl > 0) {
      return { text: `$${totalPnl.toFixed(0)} Won`, color: '#22C55E' }
    } else if (totalPnl < 0) {
      return { text: `$${Math.abs(totalPnl).toFixed(0)} Lost`, color: '#EF4444' }
    } else {
      return { text: '$0 Push', color: '#9CA3AF' }
    }
  }

  const headshotCandidates = useMemo(() => {
    const items: Array<{ sport: string; playerName: string; team?: string | null }> = []
    betGroups.forEach((group) => {
      group.forEach((bet) => {
        const info = getPlayerInfo(bet)
        items.push({ sport: bet.market.sport, playerName: info.name, team: info.team })
      })
    })
    return items
  }, [betGroups])

  useEffect(() => {
    const loadHeadshots = async () => {
      const missing = headshotCandidates.filter((player) => {
        const key = getHeadshotKey(player.sport, player.playerName, player.team)
        return !playerHeadshots[key]
      })
      if (missing.length === 0) return

      try {
        const results = await Promise.all(
          missing.map(async (player) => {
            const params = new URLSearchParams({
              sport: player.sport,
              playerName: player.playerName
            })
            if (player.team) {
              params.append('team', player.team)
            }
            const response = await fetch(`/api/headshots?${params.toString()}`)
            if (!response.ok) return null
            const data = await response.json()
            if (!data?.url) return null
            const key = getHeadshotKey(player.sport, player.playerName, player.team)
            return { key, url: data.url as string }
          })
        )

        const updates = results.filter(Boolean) as Array<{ key: string; url: string }>
        if (updates.length > 0) {
          setPlayerHeadshots((prev) => {
            const next = { ...prev }
            updates.forEach((item) => {
              next[item.key] = item.url
            })
            return next
          })
        }
      } catch (error) {
        console.error('Failed to load headshots:', error)
      }
    }

    if (headshotCandidates.length > 0) {
      loadHeadshots()
    }
  }, [headshotCandidates, playerHeadshots])

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
        {/* Filters */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '1.5rem',
          flexWrap: 'wrap'
        }}>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#1E1E1E',
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
              <select
                value={sportFilter}
                onChange={(e) => setSportFilter(e.target.value)}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#1E1E1E',
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
              
              return (
                <div
                  key={isParlay ? firstBet.parlayId : firstBet.id}
                  style={{
                    backgroundColor: '#121212',
                    borderRadius: '16px',
                    padding: '1.5rem',
                    border: '1px solid #333'
                  }}
                >
                  {/* Top Section - Outcome, Multiplier, Picks */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '1rem',
                    paddingBottom: '1rem',
                    borderBottom: '1px solid #333'
                  }}>
                  <div>
                      <div style={{
                        fontSize: '1.5rem',
                        fontWeight: 700,
                        color: outcome.color,
                        marginBottom: '0.25rem'
                      }}>
                        {outcome.text}
                      </div>
                      {firstBet.parlayMultiplier && (
                        <div style={{
                          fontSize: '0.875rem',
                          color: '#888888',
                          marginBottom: '0.25rem'
                        }}>
                          MAX {firstBet.parlayMultiplier.toFixed(2)}x
                  </div>
                      )}
                      <div style={{
                        fontSize: '0.875rem',
                        color: '#888888'
                      }}>
                        {betGroup.length} {betGroup.length === 1 ? 'PICK' : 'PICKS'}
                  </div>
                </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      color: 'white',
                      fontSize: '1.25rem',
                      fontWeight: 600
                    }}>
                      <span>ProfitPlay</span>
                    </div>
                  </div>

                  {/* Table Headers */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 1fr',
                    gap: '1rem',
                    paddingBottom: '0.75rem',
                    borderBottom: '1px solid #333',
                    marginBottom: '1rem'
                  }}>
                    <div style={{ color: '#888888', fontSize: '0.875rem', fontWeight: 500 }}>PLAYER</div>
                    <div style={{ color: '#888888', fontSize: '0.875rem', fontWeight: 500 }}>ACTUAL</div>
                    <div style={{ color: '#888888', fontSize: '0.875rem', fontWeight: 500 }}>PICK</div>
                  </div>

                  {/* Player Entries */}
                  {betGroup.map((bet, idx) => {
                    const playerInfo = getPlayerInfo(bet)
                    const isWon = bet.status === 'WON'
                    const isLost = bet.status === 'LOST'
                    const isOpen = bet.status === 'OPEN'
                    
                    // Determine progress bar color and max value
                    const progressColor = isWon ? '#22C55E' : isLost ? '#EF4444' : '#888888'
                    const maxValue = playerInfo.pickValue && playerInfo.actualValue
                      ? Math.max(playerInfo.pickValue, playerInfo.actualValue) * 1.2
                      : playerInfo.pickValue ? playerInfo.pickValue * 1.5 : 100

                    return (
                      <div
                        key={bet.id}
                        style={{
                          marginBottom: idx < betGroup.length - 1 ? '2rem' : '0',
                          paddingBottom: idx < betGroup.length - 1 ? '2rem' : '0',
                          borderBottom: idx < betGroup.length - 1 ? '1px solid #333' : 'none'
                        }}
                      >
                        {/* Player Info Row */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '2fr 1fr 1fr',
                          gap: '1.5rem',
                          alignItems: 'flex-start',
                          position: 'relative',
                          zIndex: 0
                        }}>
                          {/* Player Column */}
                          <div style={{ position: 'relative', overflow: 'hidden' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.5rem' }}>
                              <div style={{ 
                                position: 'relative', 
                                width: '60px', 
                                height: '60px', 
                                flexShrink: 0,
                                overflow: 'hidden'
                              }}>
                                {playerHeadshots[getHeadshotKey(bet.market.sport, playerInfo.name, playerInfo.team)] ? (
                                  <img
                                    src={playerHeadshots[getHeadshotKey(bet.market.sport, playerInfo.name, playerInfo.team)]}
                                    alt={`${playerInfo.name} headshot`}
                                    className="player-headshot"
                                    loading="lazy"
                                  />
                                ) : (
                                  <JerseyIcon number={playerInfo.jersey} />
                                )}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{
                                  fontSize: '1.125rem',
                                  fontWeight: 600,
                                  color: 'white',
                                  marginBottom: '0.25rem'
                                }}>
                                  {playerInfo.name.split(' ').map((n: string) => n[0]).join('. ')}
                                </div>
                                {isParlay && idx === 1 && (
                                  <div style={{
                                    fontSize: '0.75rem',
                                    color: '#EAB308',
                                    fontWeight: 600,
                                    marginBottom: '0.25rem'
                                  }}>
                                    MULTIPLIER BOOST
                                  </div>
                                )}
                                <div style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.5rem',
                                  padding: '0.25rem 0.75rem',
                                  borderRadius: '12px',
                                  backgroundColor: isWon ? 'rgba(34, 197, 94, 0.2)' : isLost ? 'rgba(239, 68, 68, 0.2)' : 'rgba(156, 163, 175, 0.2)',
                                  color: isWon ? '#22C55E' : isLost ? '#EF4444' : '#9CA3AF',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  marginBottom: '0.5rem'
                                }}>
                                  {isWon ? '✓' : isLost ? '✕' : '○'}
                                  <span>{bet.status}</span>
                                </div>
                              </div>
                            </div>
                            <div style={{
                              fontSize: '0.875rem',
                              color: '#888888',
                              marginBottom: '0.25rem'
                            }}>
                              {playerInfo.matchup}
                            </div>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              fontSize: '0.75rem',
                              color: '#666666',
                              marginBottom: '0.25rem'
                            }}>
                              <span>👁</span>
                              <span>{playerInfo.engagement}</span>
                            </div>
                            {playerInfo.gameStats && (
                              <div style={{
                                fontSize: '0.75rem',
                                color: '#666666',
                                lineHeight: '1.4'
                              }}>
                                {playerInfo.gameStats}
                              </div>
                            )}
                          </div>

                          {/* Actual Column */}
                          <div style={{ minWidth: '80px' }}>
                            {playerInfo.actualValue !== null ? (
                              <>
                                <div style={{
                                  height: '8px',
                                  backgroundColor: '#333',
                                  borderRadius: '4px',
                                  marginBottom: '0.75rem',
                                  position: 'relative',
                                  overflow: 'hidden',
                                  width: '100%'
                                }}>
                                  <div style={{
                                    height: '100%',
                                    width: `${Math.min((playerInfo.actualValue / maxValue) * 100, 100)}%`,
                                    backgroundColor: progressColor,
                                    borderRadius: '4px',
                                    transition: 'width 0.3s ease'
                                  }}></div>
                                </div>
                                <div style={{
                                  fontSize: '1.125rem',
                                  fontWeight: 700,
                                  color: progressColor,
                                  lineHeight: '1.2'
                                }}>
                                  {playerInfo.actualValue.toFixed(0)}
                                </div>
                              </>
                            ) : (
                              <>
                                <div style={{
                                  height: '8px',
                                  backgroundColor: '#333',
                                  borderRadius: '4px',
                                  marginBottom: '0.75rem',
                                  width: '100%'
                                }}></div>
                                <div style={{
                                  fontSize: '0.875rem',
                                  color: '#666666'
                                }}>
                                  Pending
                                </div>
                              </>
                            )}
                          </div>

                          {/* Pick Column */}
                  <div>
                            {playerInfo.pickValue !== null && (
                              <>
                                <div style={{
                                  fontSize: '1rem',
                                  fontWeight: 600,
                                  color: 'white',
                                  marginBottom: '0.25rem'
                                }}>
                                  {playerInfo.pickValue.toFixed(1)}
                                </div>
                                <div style={{
                                  fontSize: '0.75rem',
                                  color: '#888888',
                                  marginBottom: '0.5rem'
                                }}>
                                  {playerInfo.statType}
                                </div>
                                <div style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.5rem',
                                  marginBottom: '0.5rem'
                                }}>
                                  <div style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    backgroundColor: bet.selection === 'over' ? '#22C55E' : '#EF4444',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    fontSize: '1.25rem',
                                    fontWeight: 600
                                  }}>
                                    {bet.selection === 'over' ? '↑' : '↓'}
                                  </div>
                                </div>
                                <div style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                  fontSize: '0.75rem',
                                  color: '#666666'
                                }}>
                                  <span>👤</span>
                                  <span>{Math.floor(Math.random() * 5000 + 500)}</span>
                                </div>
                              </>
                            )}
                  </div>
                  </div>
                </div>
                    )
                  })}

                  {/* Bottom Buttons */}
                  <div style={{
                    display: 'flex',
                    gap: '1rem',
                    marginTop: '1.5rem',
                    paddingTop: '1.5rem',
                    borderTop: '1px solid #333'
                  }}>
                    <button style={{
                      flex: 1,
                      padding: '0.75rem',
                      backgroundColor: '#1E3A5F',
                      border: 'none',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}>
                      DETAILS
                    </button>
                    <button style={{
                      flex: 1,
                      padding: '0.75rem',
                      backgroundColor: '#1E3A5F',
                      border: 'none',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem'
                    }}>
                      <span>↗</span>
                      <span>SHARE</span>
                    </button>
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
