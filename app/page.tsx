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

// Sport and Category Options
const SPORT_OPTIONS = ["NBA", "NFL", "MLB", "NHL"]

const CATEGORY_OPTIONS = {
  NBA: ["Points", "Assists", "Rebounds", "3PT Made", "Pts+Rebs+Asts"],
  NFL: ["Passing Yards", "Rushing Yards", "Receiving Yards", "Receptions"],
  MLB: ["Hits", "Home Runs", "Strikeouts", "RBIs"],
  NHL: ["Goals", "Assists", "Shots on Goal", "Saves"],
}

// Map category to market type
// Note: The API accepts these market types in mock data, but the database schema
// may only have NFL player props. The API will return mock data for NBA/MLB/NHL props.
const CATEGORY_TO_MARKET_TYPE: Record<string, Record<string, string>> = {
  NBA: {
    "Points": "PLAYER_POINTS",
    "Assists": "PLAYER_ASSISTS",
    "Rebounds": "PLAYER_REBOUNDS",
    "3PT Made": "PLAYER_THREES",
    "Pts+Rebs+Asts": "PLAYER_POINTS" // Use points as fallback
  },
  NFL: {
    "Passing Yards": "PLAYER_PASS_YDS",
    "Rushing Yards": "PLAYER_RUSH_YDS",
    "Receiving Yards": "PLAYER_REC_YDS",
    "Receptions": "PLAYER_REC_RECEPTIONS"
  },
  MLB: {
    "Hits": "PLAYER_HITS",
    "Home Runs": "PLAYER_HOME_RUNS",
    "Strikeouts": "PLAYER_STRIKEOUTS",
    "RBIs": "PROPS" // Use PROPS as fallback since RBIs may not be in schema
  },
  NHL: {
    "Goals": "PLAYER_GOALS",
    "Assists": "PLAYER_ASSISTS",
    "Shots on Goal": "PROPS", // Use PROPS as fallback
    "Saves": "PROPS" // Use PROPS as fallback
  }
}

interface PlayerProp {
  id: string
  playerName: string
  displayName: string
  line: number
  category: string
  sport: string
  jerseyNumber: number | null
    matchup: string
  gameDateTime: string | null
}

// Helper function to generate composite key for prop selection
const getPropKey = (sport: string, playerName: string, category: string) => {
  return `${sport}-${playerName}-${category}`
}

export default function Home() {
  const { data: session } = useSession()
  const router = useRouter()

  // State to track selected picks - keyed by composite key (sport-playerName-category), values are "over", "under", or null
  const [selectedPicks, setSelectedPicks] = useState<Record<string, 'over' | 'under' | null>>({})
  
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

  // State for sport and category filters
  const [selectedSport, setSelectedSport] = useState("NBA")
  const [selectedCategory, setSelectedCategory] = useState("Points")
  
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

  // Fetch player props from API
  useEffect(() => {
    async function loadProps() {
      try {
        setLoadingProps(true)
        setPropsError(null)
        
        const marketType = CATEGORY_TO_MARKET_TYPE[selectedSport]?.[selectedCategory]
        if (!marketType) {
      setPlayerProps([])
          setLoadingProps(false)
      return
    }

    const params = new URLSearchParams({
      sport: selectedSport,
          marketType: marketType
        })
        
        const response = await fetch(`/api/markets?${params}`)
        const data = await response.json()
        
          if (data.markets) {
          // Map API response to PlayerProp format
          const mappedProps: PlayerProp[] = data.markets
            .filter((market: any) => market._metadata) // Only player props have metadata
            .map((market: any) => {
              const metadata = market._metadata
              const odds = market.odds
              const line = odds?.over?.total || odds?.under?.total || 0
              
              // Format game date/time
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
                playerName: metadata.player || market.participants[0] || 'Unknown Player',
                displayName: getShortName(metadata.player || market.participants[0] || 'Unknown Player'),
                line: line,
                category: selectedCategory,
                sport: market.sport,
                jerseyNumber: metadata.jersey ?? null,
                matchup: metadata.matchup || `${market.participants[0]} @ ${market.participants[1] || ''}`,
                gameDateTime: gameDateTime
              }
            })
          
          setPlayerProps(mappedProps)
        } else {
          setPlayerProps([])
        }
      } catch (err) {
        console.error("Failed to load player points props", err)
        setPropsError("Unable to load player props right now.")
        setPlayerProps([])
      } finally {
        setLoadingProps(false)
      }
    }

    loadProps()
  }, [selectedSport, selectedCategory])

  // Extract unique matchups from players filtered by sport and category
  const availableMatchups = [...new Set(
    playerProps
      .map(prop => prop.matchup)
      .filter(Boolean) // Remove empty strings
  )].sort() // Sort alphabetically for consistent display

  // Filter players based on selected sport, category, and matchup
  const visiblePlayers = playerProps.filter(player => {
    const matchesMatchup = selectedMatchups.length === 0 || selectedMatchups.includes(player.matchup)
    return matchesMatchup
  })

  // Derive active picks with choice field and market ID
  const activePicks = playerProps
    .filter(player => {
      const key = getPropKey(player.sport, player.playerName, player.category)
      return selectedPicks[key]
    })
    .map(player => {
      const key = getPropKey(player.sport, player.playerName, player.category)
      const choice = selectedPicks[key]
      return {
        ...player,
        choice, // "over" or "under"
        marketId: player.id, // Market ID from the API
      }
    })
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
  const handleChoice = (sport: string, playerName: string, category: string, choice: string) => {
    const lowerChoice = choice.toLowerCase() as 'over' | 'under'
    const key = getPropKey(sport, playerName, category)
    const currentSelection = selectedPicks[key]
    
    // Prevent adding more than 8 picks
    if (!currentSelection && picksCount >= 8) {
      console.log("Maximum of 8 picks reached.")
      return
    }

    // Toggle off if clicking the same choice
    if (currentSelection === lowerChoice) {
      setSelectedPicks(prev => {
        const updated = { ...prev }
        updated[key] = null
        console.log("Pick changed:", key, null)
        return updated
      })
    } else {
      // Set the new selection
      setSelectedPicks(prev => {
        const updated = { ...prev }
        updated[key] = lowerChoice
        console.log("Pick changed:", key, lowerChoice)
        return updated
      })
    }
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

  // Handler for sport change
  const handleSportChange = (sport: string) => {
    setSelectedSport(sport)
    // Reset category to first category of the new sport
    const firstCategory = CATEGORY_OPTIONS[sport as keyof typeof CATEGORY_OPTIONS]?.[0]
    if (firstCategory) {
      setSelectedCategory(firstCategory)
    }
    setSelectedMatchups([]) // Reset matchup filter when sport changes
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
        <div style={{ marginTop: '2rem' }}>
          <Link
            href="/pricing"
            className="hero-cta-button"
          >
            View Plans
          </Link>
        </div>
      </section>

      {/* Filter Bars */}
      {activeTab === "Board" && (
      <section className="filters-section">
        {/* Sport Filter Bar */}
        <div className="sport-bar">
          {SPORT_OPTIONS.map((sport) => (
            <button
              key={sport}
              className={`sport-pill ${selectedSport === sport ? 'sport-pill-selected' : ''}`}
              onClick={() => handleSportChange(sport)}
            >
              {sport}
            </button>
          ))}
        </div>

        {/* Category Filter Bar */}
        <div className="category-bar">
          {CATEGORY_OPTIONS[selectedSport as keyof typeof CATEGORY_OPTIONS]?.map((category) => (
            <button
              key={category}
              className={`category-pill ${selectedCategory === category ? 'category-pill-selected' : ''}`}
              onClick={() => handleCategoryChange(category)}
            >
              {category}
            </button>
          ))}
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

      {/* Player Cards Section */}
      {activeTab === "Board" && (
      <section className="players-section">
        {loadingProps && playerProps.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#FFFFFF', padding: '2rem' }}>
            Loading player props…
          </div>
        ) : propsError ? (
          <div style={{ textAlign: 'center', color: '#FFFFFF', padding: '2rem' }}>
            {propsError}
          </div>
        ) : visiblePlayers.length === 0 ? (
          <div className="no-props-message">
            No Player Props Available.
          </div>
        ) : (
          visiblePlayers.map((player) => {
            const pickKey = getPropKey(player.sport, player.playerName, player.category)
            const selectedChoice = selectedPicks[pickKey]
            
            return (
              <div key={player.id} className="player-card">
                <div className="player-card-top">
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
                    onClick={() => handleChoice(player.sport, player.playerName, player.category, 'Over')}
                  >
                    Over
                  </button>
                  <button 
                    className={`choice-btn player-button under-button ${selectedChoice === 'under' ? 'choice-btn-selected selected' : ''}`}
                    onClick={() => handleChoice(player.sport, player.playerName, player.category, 'Under')}
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
