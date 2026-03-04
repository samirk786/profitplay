'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import JerseyIcon from '@/components/JerseyIcon'

// Helper function to format name as "FirstInitial. LastName"
const getShortName = (name: string) => {
  const parts = name.split(' ')
  if (parts.length < 2) return name
  const firstInitial = parts[0][0]
  const lastName = parts.slice(1).join(' ')
  return `${firstInitial}. ${lastName}`
}

// NBA-only categories for beta
const CATEGORY_OPTIONS = ["Spread", "Points", "Assists", "Rebounds"]

// Map category to market type
const CATEGORY_TO_MARKET_TYPE: Record<string, string> = {
  "Spread": "SPREAD",
  "Points": "PLAYER_POINTS",
  "Assists": "PLAYER_ASSISTS",
  "Rebounds": "PLAYER_REBOUNDS"
}

interface PlayerProp {
  id: string
  playerName: string
  displayName: string
  line: number
  category: string
  sport: string
  jerseyNumber: number | null
  team?: string | null
    matchup: string
  gameDateTime: string | null
}

interface SelectedPick extends PlayerProp {
  choice: 'over' | 'under'
  marketId: string
}

// Helper function to generate composite key for prop selection
const getPropKey = (sport: string, playerName: string, category: string) => {
  return `${sport}-${playerName}-${category}`
}

const getSpreadKey = (gameId: string, teamName: string) => {
  return `SPREAD-${gameId}-${teamName}`
}

export default function Home() {
  const { data: session } = useSession()
  const router = useRouter()

  // State to track selected picks across sports/categories
  const [selectedPicks, setSelectedPicks] = useState<Record<string, SelectedPick>>({})
  
  // State for bet slip open/closed
  const [isBetSlipOpen, setIsBetSlipOpen] = useState(false)
  
  // State for bet amount
  const [betAmount, setBetAmount] = useState<number | null>(null)
  
  // State for custom amount input
  const [customAmount, setCustomAmount] = useState("")

  // State for challenge account ID
  const [challengeAccountId, setChallengeAccountId] = useState<string | null>(null)
  const [placingBet, setPlacingBet] = useState(false)
  const [currentPlan, setCurrentPlan] = useState<string | null>(null)

  // State for player props from API
  const [playerProps, setPlayerProps] = useState<PlayerProp[]>([])
  const [loadingProps, setLoadingProps] = useState(false)
  const [propsError, setPropsError] = useState<string | null>(null)
  const [likedPicks, setLikedPicks] = useState<Record<string, PlayerProp>>({})

  // State for category filter (NBA only for beta)
  const selectedSport = "NBA"
  const [selectedCategory, setSelectedCategory] = useState("Spread")
  
  // State for matchup filter (empty array represents "All Games")
  const [selectedMatchups, setSelectedMatchups] = useState<string[]>([])
  const [isMatchupPopupOpen, setIsMatchupPopupOpen] = useState(false)

  // State for active tab (Board or Account)
  const [activeTab, setActiveTab] = useState("Board")

  // Fetch challenge account ID
  useEffect(() => {
    if (session?.user?.id) {
      fetchChallengeAccount()
      fetchUserProfile()
    } else {
      setCurrentPlan(null)
    }
  }, [session])

  const fetchUserProfile = async () => {
    try {
      const response = await fetch('/api/user/profile', {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setCurrentPlan(data.plan || null)
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
    }
  }

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

  // State for refresh
  const [refreshing, setRefreshing] = useState(false)

  // Fetch player props from API
  const loadProps = useCallback(async (forceRefresh = false) => {
    try {
      setLoadingProps(true)
      setPropsError(null)

      const marketType = CATEGORY_TO_MARKET_TYPE[selectedCategory]
      if (!marketType) {
        setPlayerProps([])
        setLoadingProps(false)
        return
      }

      const params = new URLSearchParams({
        sport: selectedSport,
        marketType: marketType
      })

      if (forceRefresh) {
        params.set('refresh', 'true')
      }

      const response = await fetch(`/api/markets?${params}`)
      const data = await response.json()

      if (data.message && data.markets?.length === 0) {
        const isAdmin = session?.user?.role === 'ADMIN'
        const message = isAdmin && data.adminMessage ? data.adminMessage : data.message
        setPropsError(message)
        setPlayerProps([])
        return
      }

      if (data.markets) {
        if (marketType === 'SPREAD') {
          // Map spread markets to PlayerProp format (team-level, not player-level)
          const mappedProps: PlayerProp[] = data.markets.map((market: any) => {
            const odds = market.odds
            const metadata = market._metadata
            const gameDateTime = market.startTime
              ? new Date(market.startTime).toLocaleString('en-US', {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })
              : null

            return {
              id: market.id,
              playerName: `${market.participants[0]} vs ${market.participants[1]}`,
              displayName: `${market.participants[0]} vs ${market.participants[1]}`,
              line: odds?.home?.spread || 0,
              category: 'Spread',
              sport: market.sport,
              jerseyNumber: null,
              team: null,
              matchup: metadata?.matchup || `${market.participants[0]} @ ${market.participants[1]}`,
              gameDateTime: gameDateTime,
              // Store extra spread data for rendering
              _spreadData: {
                home: { team: market.participants[1], spread: odds?.home?.spread, odds: odds?.home?.odds },
                away: { team: market.participants[0], spread: odds?.away?.spread, odds: odds?.away?.odds }
              }
            }
          })
          setPlayerProps(mappedProps)
        } else {
          // Map player prop API response to PlayerProp format
          const mappedProps: PlayerProp[] = data.markets
            .filter((market: any) => market._metadata || market.marketType?.startsWith('PLAYER_'))
            .map((market: any) => {
              const metadata = market._metadata
              const odds = market.odds
              const line = odds?.over?.total || odds?.under?.total || 0

              const gameDateTime = market.startTime
                ? new Date(market.startTime).toLocaleString('en-US', {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })
                : null

              return {
                id: market.id,
                playerName: metadata?.player || market.participants[0] || 'Unknown Player',
                displayName: getShortName(metadata?.player || market.participants[0] || 'Unknown Player'),
                line: line,
                category: selectedCategory,
                sport: market.sport,
                jerseyNumber: metadata?.jersey ?? null,
                team: metadata?.team || market.participants?.[1] || null,
                matchup: metadata?.matchup || `${market.participants[0]} @ ${market.participants[1] || ''}`,
                gameDateTime: gameDateTime
              }
            })

          setPlayerProps(mappedProps)
        }
      } else {
        setPlayerProps([])
      }
    } catch (err) {
      console.error("Failed to load props", err)
      setPropsError("Unable to load props right now.")
      setPlayerProps([])
    } finally {
      setLoadingProps(false)
      setRefreshing(false)
    }
  }, [selectedSport, selectedCategory])

  useEffect(() => {
    loadProps()
  }, [loadProps])

  const isAdmin = session?.user?.role === 'ADMIN' && session?.user?.email === 'admin@profitplay.com'

  const handleRefreshOdds = async () => {
    if (!isAdmin) return
    setRefreshing(true)
    await loadProps(true)
  }

  useEffect(() => {
    try {
      const saved = localStorage.getItem('likedPicks')
      if (saved) {
        setLikedPicks(JSON.parse(saved))
      }
    } catch (error) {
      console.error('Failed to load liked picks:', error)
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('likedPicks', JSON.stringify(likedPicks))
    } catch (error) {
      console.error('Failed to save liked picks:', error)
    }
  }, [likedPicks])

  // Extract unique matchups from players filtered by sport and category
  const availableMatchups = Array.from(new Set(
    playerProps
      .map(prop => prop.matchup)
      .filter(Boolean) // Remove empty strings
  )).sort() // Sort alphabetically for consistent display

  // Filter players based on selected sport, category, and matchup
  const visiblePlayers = playerProps.filter(player => {
    const matchesMatchup = selectedMatchups.length === 0 || selectedMatchups.includes(player.matchup)
    return matchesMatchup
  })


  // Derive active picks from stored selections
  const activePicks = Object.values(selectedPicks)
  const picksCount = activePicks.length

  // Helper function for multiplier logic
  const getMultiplier = (count: number) => {
    switch (count) {
      case 1:
        return null
      case 2:
        return 3
      case 3:
        return 5
      case 4:
        return 12
      case 5:
        return 23
      case 6:
        return 44
      case 7:
        return 88
      case 8:
        return 175
      default:
        return null
    }
  }

  const multiplier = getMultiplier(picksCount)

  // Handler for Over/Under button clicks
  const handleChoice = (player: PlayerProp, choice: string) => {
    const lowerChoice = choice.toLowerCase() as 'over' | 'under'
    const key = getPropKey(player.sport, player.playerName, player.category)
    const currentSelection = selectedPicks[key]?.choice
    
    // Prevent adding more than 8 picks
    if (!currentSelection && picksCount >= 8) {
      console.log("Maximum of 8 picks reached.")
      return
    }

    // Toggle off if clicking the same choice
    if (currentSelection === lowerChoice) {
      setSelectedPicks(prev => {
        const updated = { ...prev }
        delete updated[key]
        console.log("Pick changed:", key, null)
        return updated
      })
    } else {
      // Set the new selection
      setSelectedPicks(prev => {
        const updated = { ...prev }
        updated[key] = {
          ...player,
          choice: lowerChoice,
          marketId: player.id
        }
        console.log("Pick changed:", key, lowerChoice)
        return updated
      })
    }
  }

  const handleSpreadSelection = (game: PlayerProp, team: 'away' | 'home') => {
    const spreadData = (game as any)._spreadData
    if (!spreadData) return

    const teamName = team === 'away' ? spreadData.away.team : spreadData.home.team
    const otherTeamName = team === 'away' ? spreadData.home.team : spreadData.away.team
    const key = getSpreadKey(game.id, teamName)
    const otherKey = getSpreadKey(game.id, otherTeamName)
    const currentSelection = selectedPicks[key]?.choice
    const hasOtherSelection = !!selectedPicks[otherKey]

    if (!currentSelection && !hasOtherSelection && picksCount >= 8) {
      console.log("Maximum of 8 picks reached.")
      return
    }

    if (currentSelection) {
      setSelectedPicks(prev => {
        const updated = { ...prev }
        delete updated[key]
        return updated
      })
      return
    }

    const fakeProp: PlayerProp = {
      ...game,
      playerName: teamName,
      displayName: teamName,
      line: team === 'away' ? spreadData.away.spread : spreadData.home.spread,
      category: 'Spread'
    }

    setSelectedPicks(prev => {
      const updated = { ...prev }
      delete updated[otherKey]
      updated[key] = {
        ...fakeProp,
        choice: 'over',
        marketId: game.id
      }
      return updated
    })
  }

  const toggleLike = (player: PlayerProp) => {
    const key = getPropKey(player.sport, player.playerName, player.category)
    setLikedPicks((prev) => {
      const updated = { ...prev }
      if (updated[key]) {
        delete updated[key]
      } else {
        updated[key] = player
      }
      return updated
    })
  }

  // Handler for bet slip toggle
  const handleBetSlipToggle = () => {
    setIsBetSlipOpen(prev => {
      const newState = !prev
      console.log("Bet slip open:", newState)
      return newState
    })
  }

  // Handler to close bet slip
  const handleCloseBetSlip = () => {
    setIsBetSlipOpen(false)
  }

  // Bet size options
  const betOptions = [5, 10, 20]

  // Handler for preset bet size button clicks
  const handlePresetBetSize = (amount: number) => {
    setBetAmount(amount)
    setCustomAmount("")
  }

  // Handler for custom amount input
  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setCustomAmount(value)
    
    // Parse numeric value
    const numValue = parseFloat(value)
    if (!isNaN(numValue) && numValue > 0) {
      setBetAmount(numValue)
    } else if (value === "") {
      // Allow empty input, but don't set betAmount to 0
      setBetAmount(null)
    }
  }

  // Calculate payout
  const payout = betAmount && multiplier ? betAmount * multiplier : 0

  // Determine if Play button should be disabled
  const isPlayDisabled = picksCount < 2 || multiplier === null || !betAmount || betAmount <= 0

  // Handler for Play button click
  const handlePlay = async () => {
    if (!session) {
      alert('Please log in to place a bet.')
      router.push('/auth/signin')
      return
    }

    if (!currentPlan) {
      alert('Please select a plan before placing a bet.')
      router.push('/pricing')
      return
    }

    if (!challengeAccountId) {
      alert('Please ensure you have an active challenge account.')
      router.push('/pricing')
      return
    }

    if (picksCount < 2 || !betAmount || betAmount <= 0) {
      alert('Please select at least 2 picks and enter a bet amount.')
      return
    }

    setPlacingBet(true)

    try {
      // Generate parlay ID for grouping
      const parlayId = `parlay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // Place parlay bet (all picks together as one parlay)
      const response = await fetch('/api/bets/parlay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          challengeAccountId,
          parlayId,
          picks: activePicks.map(pick => ({
            marketId: pick.marketId,
            selection: pick.choice, // "over" or "under"
          })),
          stake: betAmount, // Full bet amount for the parlay
          multiplier: multiplier || 1
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to place parlay')
      }

      const result = await response.json()
      console.log('Parlay placed successfully:', result)

      // Clear selections and bet slip
        setSelectedPicks({})
      setBetAmount(null)
      setCustomAmount("")
      setIsBetSlipOpen(false)

      // Show success message and redirect to bets page
      alert(`Successfully placed parlay with ${activePicks.length} pick(s)!`)
      router.push('/dashboard/bets')
    } catch (error: any) {
      console.error('Error placing parlay:', error)
      alert(`Failed to place parlay: ${error.message}`)
    } finally {
      setPlacingBet(false)
    }
  }

  // Handler for category change
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category)
    setSelectedMatchups([]) // Reset matchup filter when category changes
  }

  return (
    <div className="App">
      <Header />
      
      {/* Hero Section */}
      <section className="hero-section">
        <h1 className="hero-heading">Earn It.</h1>
        <p className="hero-subtitle">Make your picks. Prove your edge.</p>
      </section>

      {/* Filter Bars */}
      {activeTab === "Board" && (
      <section className="filters-section">
        {/* Category Filter Bar */}
        <div className="category-bar">
          {CATEGORY_OPTIONS.map((category) => (
            <button
              key={category}
              className={`category-pill ${selectedCategory === category ? 'category-pill-selected' : ''}`}
              onClick={() => handleCategoryChange(category)}
            >
              {category}
            </button>
          ))}
          {isAdmin && (
            <button
              className="category-pill"
              style={{ marginLeft: 'auto', fontSize: '0.75rem', opacity: refreshing ? 0.5 : 1 }}
              onClick={handleRefreshOdds}
              disabled={refreshing}
            >
              {refreshing ? 'Refreshing...' : 'Refresh Odds'}
            </button>
          )}
        </div>

        {/* Games Filter Button */}
        {availableMatchups.length > 0 && (
          <div className="games-filter-wrapper">
            <button
              className={`games-filter-btn ${selectedMatchups.length > 0 ? 'games-filter-btn-active' : ''}`}
              onClick={() => setIsMatchupPopupOpen(true)}
            >
              Games {selectedMatchups.length > 0 && `(${selectedMatchups.length})`}
            </button>
          </div>
        )}
      </section>
      )}

      {/* Matchup Selection Popup */}
      {isMatchupPopupOpen && (
        <div 
          className="matchup-popup-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsMatchupPopupOpen(false)
            }
          }}
        >
          <div className="matchup-popup-content">
            <div className="matchup-popup-header">
              <h3 className="matchup-popup-title">Select Games</h3>
              <button 
                className="matchup-popup-close"
                onClick={() => setIsMatchupPopupOpen(false)}
              >
                ×
              </button>
            </div>
            <div className="matchup-popup-body">
              {availableMatchups.map((matchup) => {
                const isSelected = selectedMatchups.includes(matchup)
                return (
                  <button
                    key={matchup}
                    className={`matchup-popup-btn ${isSelected ? 'matchup-popup-btn-selected' : ''}`}
                    onClick={() => {
                      setSelectedMatchups(prev => {
                        if (prev.includes(matchup)) {
                          return prev.filter(m => m !== matchup)
                        } else {
                          return [...prev, matchup]
                        }
                      })
                    }}
                  >
                    {matchup}
                  </button>
                )
              })}
            </div>
            <div className="matchup-popup-footer">
              <button
                className="matchup-popup-clear-btn"
                onClick={() => setSelectedMatchups([])}
              >
                Clear All
              </button>
              <button
                className="matchup-popup-apply-btn"
                onClick={() => setIsMatchupPopupOpen(false)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Liked Picks */}
      {activeTab === "Board" && Object.keys(likedPicks).length > 0 && (
        <section style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem 1.5rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.25rem', color: 'white', marginBottom: '0.25rem' }}>Liked Picks</h2>
            <p style={{ color: '#888888', fontSize: '0.875rem' }}>
              Your saved picks across sports and categories.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
            {Object.values(likedPicks).map((player) => {
              const pickKey = getPropKey(player.sport, player.playerName, player.category)
              const selectedChoice = selectedPicks[pickKey]?.choice
              return (
                <div
                  key={pickKey}
                  style={{
                    backgroundColor: '#1E1E1E',
                    border: '1px solid #333333',
                    borderRadius: '12px',
                    padding: '1rem',
                    position: 'relative'
                  }}
                >
                  <button
                    className={`like-btn ${likedPicks[pickKey] ? 'liked' : ''}`}
                    onClick={() => toggleLike(player)}
                    aria-label="Toggle liked pick"
                  >
                    ♥
                  </button>
                  <div style={{ fontWeight: 600, color: 'white', marginBottom: '0.25rem' }}>
                    {player.playerName}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#cccccc', marginBottom: '0.5rem' }}>
                    {player.line} {player.category} • {player.sport}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      className={`choice-btn player-button over-button ${selectedChoice === 'over' ? 'choice-btn-selected selected' : ''}`}
                      onClick={() => handleChoice(player, 'Over')}
                    >
                      Over
                    </button>
                    <button
                      className={`choice-btn player-button under-button ${selectedChoice === 'under' ? 'choice-btn-selected selected' : ''}`}
                      onClick={() => handleChoice(player, 'Under')}
                    >
                      Under
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Player Cards / Spread Cards Section */}
      {activeTab === "Board" && (
      <section className="players-section">
        {loadingProps && playerProps.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#FFFFFF', padding: '2rem' }}>
            Loading props...
          </div>
        ) : propsError ? (
          <div style={{ textAlign: 'center', color: '#FFFFFF', padding: '2rem' }}>
            {propsError}
          </div>
        ) : visiblePlayers.length === 0 ? (
          <div className="no-props-message">
            No Props Available. Select games in Admin &gt; Manage Games, then click Refresh Odds.
          </div>
        ) : selectedCategory === 'Spread' ? (
          /* Spread cards - show game-level spread lines */
          visiblePlayers.map((game: any) => {
            const spreadData = game._spreadData
            if (!spreadData) return null

            const awayKey = getSpreadKey(game.id, spreadData.away.team)
            const homeKey = getSpreadKey(game.id, spreadData.home.team)
            const awaySelected = selectedPicks[awayKey]?.choice === 'over'
            const homeSelected = selectedPicks[homeKey]?.choice === 'over'

            return (
              <div key={game.id} className="player-card" style={{ minWidth: '300px' }}>
                <div className="player-card-body" style={{ padding: '1rem' }}>
                  <div className="player-matchup-row" style={{ marginBottom: '0.75rem' }}>
                    <span className="player-matchup">{game.matchup}</span>
                    {game.gameDateTime && (
                      <>
                        <span className="matchup-divider">-</span>
                        <span className="player-game-time">{game.gameDateTime}</span>
                      </>
                    )}
                  </div>
                  <div className="player-points-label" style={{ marginBottom: '0.75rem' }}>Spread</div>

                  {/* Away team spread */}
                  <button
                    className={`choice-btn player-button ${awaySelected ? 'choice-btn-selected selected' : ''}`}
                    style={{ width: '100%', marginBottom: '0.5rem', justifyContent: 'space-between', display: 'flex' }}
                    onClick={() => handleSpreadSelection(game, 'away')}
                  >
                    <span>{spreadData.away.team}</span>
                    <span>{spreadData.away.spread > 0 ? '+' : ''}{spreadData.away.spread}</span>
                  </button>

                  {/* Home team spread */}
                  <button
                    className={`choice-btn player-button ${homeSelected ? 'choice-btn-selected selected' : ''}`}
                    style={{ width: '100%', justifyContent: 'space-between', display: 'flex' }}
                    onClick={() => handleSpreadSelection(game, 'home')}
                  >
                    <span>{spreadData.home.team}</span>
                    <span>{spreadData.home.spread > 0 ? '+' : ''}{spreadData.home.spread}</span>
                  </button>
                </div>
              </div>
            )
          })
        ) : (
          /* Player prop cards - Over/Under */
          visiblePlayers.map((player) => {
            const pickKey = getPropKey(player.sport, player.playerName, player.category)
            const selectedChoice = selectedPicks[pickKey]?.choice

            return (
              <div key={player.id} className="player-card">
                <div className="player-card-top" style={{ position: 'relative' }}>
                  <button
                    className={`like-btn ${likedPicks[pickKey] ? 'liked' : ''}`}
                    onClick={() => toggleLike(player)}
                    aria-label="Toggle liked pick"
                  >
                    ♥
                  </button>
                  <div className="player-name">{player.displayName}</div>
                  <div className="player-jersey-wrapper">
                    <JerseyIcon number={player.jerseyNumber} />
                  </div>
                </div>
                <div className="player-card-body">
                  <div className="player-line-value">{player.line}</div>
                  <div className="player-points-label">{player.category}</div>
                  <div className="player-matchup-row">
                    <span className="player-matchup">{player.matchup}</span>
                    {player.gameDateTime && (
                      <>
                        <span className="matchup-divider">-</span>
                        <span className="player-game-time">{player.gameDateTime}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="player-actions">
                  <button
                    className={`choice-btn player-button over-button ${selectedChoice === 'over' ? 'choice-btn-selected selected' : ''}`}
                    onClick={() => handleChoice(player, 'Over')}
                  >
                    Over
                  </button>
                  <button
                    className={`choice-btn player-button under-button ${selectedChoice === 'under' ? 'choice-btn-selected selected' : ''}`}
                    onClick={() => handleChoice(player, 'Under')}
                  >
                    Under
                  </button>
                </div>
              </div>
            )
          })
        )}
      </section>
      )}

      {/* Bet Slip Popup / Panel */}
      {picksCount > 0 && (
        <div className={`bet-slip ${isBetSlipOpen ? 'open' : 'collapsed'}`}>
          {!isBetSlipOpen ? (
            <div className="bet-slip-popup" onClick={handleBetSlipToggle}>
              <div className="bet-slip-left">
                <div className="bet-slip-circle">{picksCount}</div>
                <span className="bet-slip-picks-text">Picks</span>
              </div>
              <div className="bet-slip-right">
                {multiplier !== null ? (
                  <span>{multiplier}x multiplier</span>
                ) : (
                  <span>Select 2–8 picks</span>
                )}
            </div>
            </div>
          ) : (
            <div className="bet-slip-panel">
              {/* Header */}
              <div className="bet-slip-header">
                <h3 className="bet-slip-title">Your Picks</h3>
                <button className="bet-slip-close" onClick={handleCloseBetSlip}>
                  ×
                </button>
              </div>

              {/* Picks List */}
              <div className="bet-slip-body">
                <div className="bet-slip-picks-list">
                  {activePicks.map((pick) => (
                    <div key={pick.id} className="bet-slip-pick-row">
                      <div className="bet-slip-pick-info">
                        <div className="bet-slip-pick-name">{pick.displayName}</div>
                        <div className="bet-slip-pick-line">
                          {pick.line} {pick.category}
                        </div>
                      </div>
                      <div className="bet-slip-pick-choice">
                        {pick.choice === 'over' ? 'Over' : 'Under'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Multiplier and Bet Size Section */}
              <div className="bet-slip-footer">
                <div className="bet-slip-multiplier">
                  {multiplier !== null ? (
                    <span>Multiplier: {multiplier}x</span>
                  ) : (
                    <span>Select 2–8 picks to unlock multiplier</span>
                  )}
            </div>
            
                <div className="bet-slip-bet-sizes">
                  {betOptions.map((option) => (
                    <button
                      key={option}
                      className={`bet-size-btn ${betAmount === option ? 'bet-size-btn-active' : ''}`}
                      onClick={() => handlePresetBetSize(option)}
                    >
                      ${option}
                    </button>
                  ))}
            </div>
            
                <input
                  type="number"
                  className="bet-slip-custom-input"
                  placeholder="Custom amount"
                  value={customAmount}
                  onChange={handleCustomAmountChange}
                />

                <div className="bet-slip-payout">
                  {betAmount && multiplier ? (
                    <span>Payout: ${payout.toFixed(2)}</span>
                  ) : (
                    <span>Payout: $0</span>
                  )}
            </div>
            
                <button
                  className={`bet-slip-play-btn ${isPlayDisabled || placingBet ? 'bet-slip-play-btn-disabled' : ''}`}
                  onClick={handlePlay}
                  disabled={isPlayDisabled || placingBet}
                >
                  {placingBet ? 'Placing Bets...' : 'Play'}
                      </button>
            </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
