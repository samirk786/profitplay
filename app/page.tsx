'use client'

import { useState, useEffect, useCallback } from 'react'
import Header from '@/components/Header'

interface PlayerProp {
  id: string
  sport: string
  league: string
  marketType: string
  participants: string[]
  startTime: string
  odds: {
    over?: { total: number; odds: number }
    under?: { total: number; odds: number }
  } | null
  _metadata?: {
    player: string
    team: string
    jersey: number
    matchup: string
    engagement: string
  }
}

const SPORTS = [
  { key: 'NBA', label: 'NBA', icon: '🏀' },
  { key: 'NFL', label: 'NFL', icon: '🏈' },
  { key: 'MLB', label: 'MLB', icon: '⚾' },
  { key: 'NHL', label: 'NHL', icon: '🏒' },
  { key: 'SOCCER', label: 'SOCCER', icon: '⚽' },
  { key: 'MMA', label: 'MMA', icon: '🥊' }
]

const STAT_CATEGORIES: Record<string, Array<{ key: string; label: string; marketType: string }>> = {
  NBA: [
    { key: 'POINTS', label: 'Points', marketType: 'PLAYER_POINTS' },
    { key: 'REBOUNDS', label: 'Rebounds', marketType: 'PLAYER_REBOUNDS' },
    { key: 'ASSISTS', label: 'Assists', marketType: 'PLAYER_ASSISTS' },
    { key: 'STEALS', label: 'Steals', marketType: 'PLAYER_STEALS' },
    { key: 'BLOCKS', label: 'Blocks', marketType: 'PLAYER_BLOCKS' },
    { key: 'THREES', label: 'Three-Pointers', marketType: 'PLAYER_THREES' }
  ],
  NFL: [
    { key: 'PASS_YDS', label: 'Pass Yards', marketType: 'PLAYER_PASS_YDS' },
    { key: 'PASS_TDS', label: 'Pass TDs', marketType: 'PLAYER_PASS_TDS' },
    { key: 'RUSH_YDS', label: 'Rush Yards', marketType: 'PLAYER_RUSH_YDS' },
    { key: 'REC_YDS', label: 'Rec Yards', marketType: 'PLAYER_REC_YDS' },
    { key: 'REC_RECEPTIONS', label: 'Receptions', marketType: 'PLAYER_REC_RECEPTIONS' },
    { key: 'REC_TDS', label: 'Rec TDs', marketType: 'PLAYER_REC_TDS' }
  ],
  MLB: [
    { key: 'HITS', label: 'Hits', marketType: 'PLAYER_HITS' },
    { key: 'STRIKEOUTS', label: 'Strikeouts', marketType: 'PLAYER_STRIKEOUTS' },
    { key: 'HOME_RUNS', label: 'Home Runs', marketType: 'PLAYER_HOME_RUNS' }
  ],
  NHL: [
    { key: 'POINTS', label: 'Points', marketType: 'PLAYER_POINTS' },
    { key: 'GOALS', label: 'Goals', marketType: 'PLAYER_GOALS' },
    { key: 'ASSISTS', label: 'Assists', marketType: 'PLAYER_ASSISTS' }
  ],
  SOCCER: [
    { key: 'GOALS', label: 'Goals', marketType: 'PLAYER_GOALS' },
    { key: 'ASSISTS', label: 'Assists', marketType: 'PLAYER_ASSISTS' }
  ],
  MMA: [
    { key: 'ROUNDS', label: 'Rounds', marketType: 'PLAYER_ROUNDS' }
  ]
}

export default function Home() {
  const [selectedSport, setSelectedSport] = useState('NBA')
  const [selectedStat, setSelectedStat] = useState<{ key: string; label: string; marketType: string } | null>(
    STAT_CATEGORIES['NBA']?.[0] || null
  )
  const [playerProps, setPlayerProps] = useState<PlayerProp[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Handle both sport and stat changes in one effect to avoid race conditions
    const categories = STAT_CATEGORIES[selectedSport]
    
    // If sport changed and we don't have a valid stat for it, set default stat
    let statToUse = selectedStat
    if (!statToUse || !categories?.some(c => c.key === statToUse?.key)) {
      if (categories && categories.length > 0) {
        statToUse = categories[0]
        setSelectedStat(statToUse)
      } else {
        setSelectedStat(null)
        setPlayerProps([])
        setLoading(false)
        return
      }
    }

    // Fetch data with current sport and stat
    if (!statToUse) {
      setPlayerProps([])
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setPlayerProps([]) // Clear previous results immediately

    const params = new URLSearchParams({
      sport: selectedSport,
      marketType: statToUse.marketType
    })
    
    fetch(`/api/markets?${params}`)
      .then(response => response.json())
      .then(data => {
        if (!cancelled) {
          if (data.markets) {
            setPlayerProps(data.markets || [])
          } else {
            setPlayerProps([])
          }
        }
      })
      .catch(error => {
        if (!cancelled) {
          console.error('Error fetching player props:', error)
          setPlayerProps([])
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    // Cleanup function to cancel fetch if component unmounts or dependencies change
    return () => {
      cancelled = true
    }
  }, [selectedSport, selectedStat])

  const formatOdds = (odds: number) => {
    if (isNaN(odds) || !isFinite(odds)) return 'N/A'
    if (odds > 0) return `+${odds}`
    return odds.toString()
  }

  const formatStatLabel = (statKey: string) => {
    return STAT_CATEGORIES[selectedSport]?.find(s => s.key === statKey)?.label || statKey
  }

  // Get team abbreviation helper
  const getTeamAbbr = (participants: string[]): string => {
    if (participants.length < 2) return ''
    // The second participant is usually the team
    const teamName = participants[1] || ''
    // Extract common abbreviations from team names
    const abbreviations: Record<string, string> = {
      'Milwaukee Bucks': 'MIL',
      'Dallas Mavericks': 'DAL',
      'Los Angeles Lakers': 'LAL',
      'Phoenix Suns': 'PHX',
      'Golden State Warriors': 'GSW',
      'Denver Nuggets': 'DEN',
      'Boston Celtics': 'BOS',
      'Miami Heat': 'MIA',
      'Buffalo Bills': 'BUF',
      'Kansas City Chiefs': 'KC',
      'Baltimore Ravens': 'BAL',
      'Cincinnati Bengals': 'CIN',
      'Dallas Cowboys': 'DAL',
      'Philadelphia Eagles': 'PHI',
      'Miami Dolphins': 'MIA',
      'New York Jets': 'NYJ',
      'San Francisco 49ers': 'SF',
      'Seattle Seahawks': 'SEA',
      'Indianapolis Colts': 'IND',
      'Jacksonville Jaguars': 'JAX',
      'Las Vegas Raiders': 'LV',
      'Los Angeles Chargers': 'LAC',
      'Toronto Blue Jays': 'TOR',
      'New York Yankees': 'NYY',
      'Atlanta Braves': 'ATL',
      'Philadelphia Phillies': 'PHI',
      'Texas Rangers': 'TEX',
      'Houston Astros': 'HOU',
      'Cleveland Guardians': 'CLE',
      'Chicago White Sox': 'CWS',
      'Los Angeles Dodgers': 'LAD',
      'San Francisco Giants': 'SF',
      'Edmonton Oilers': 'EDM',
      'Calgary Flames': 'CGY',
      'Colorado Avalanche': 'COL',
      'Vegas Golden Knights': 'VGK',
      'Toronto Maple Leafs': 'TOR',
      'Montreal Canadiens': 'MTL',
      'Washington Capitals': 'WSH',
      'Pittsburgh Penguins': 'PIT'
    }
    
    // Check if we have metadata with team abbreviation
    // Otherwise try to find abbreviation
    for (const [fullName, abbr] of Object.entries(abbreviations)) {
      if (teamName.includes(fullName) || fullName.includes(teamName)) {
        return abbr
      }
    }
    
    // Fallback: extract first letters or return first 3 chars
    const words = teamName.split(' ')
    if (words.length >= 2) {
      return (words[0].charAt(0) + words[1].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase().slice(0, 3)
    }
    return teamName.substring(0, 3).toUpperCase()
  }

  // Extract position helper (for NBA)
  const getPosition = (participants: string[]): string => {
    // For now, return a default position or extract from metadata
    return 'G' // Default
  }

  return (
    <div className="min-h-screen bg-[#0a1128]">
      <Header />
      
      {/* Main Title */}
      <div className="text-center py-12">
        <h1 className="text-6xl md:text-7xl font-bold text-white mb-8">
          Earn It
        </h1>

        {/* Sport Categories */}
        <div className="flex justify-center gap-4 mb-8 px-4 overflow-x-auto pb-4">
          {SPORTS.map((sport) => (
            <button
              key={sport.key}
              onClick={() => setSelectedSport(sport.key)}
              className={`flex-shrink-0 w-20 h-20 rounded-full flex flex-col items-center justify-center font-medium transition-all ${
                selectedSport === sport.key
                  ? 'bg-white text-[#0a1128]'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <span className="text-2xl mb-1">{sport.icon}</span>
              <span className="text-xs">{sport.label}</span>
            </button>
          ))}
        </div>

        {/* Stat Categories */}
        {STAT_CATEGORIES[selectedSport] && STAT_CATEGORIES[selectedSport].length > 0 && (
          <div className="flex justify-center gap-3 mb-12 px-4 overflow-x-auto pb-4">
            {STAT_CATEGORIES[selectedSport].map((stat) => (
              <button
                key={stat.key}
                onClick={() => setSelectedStat(stat)}
                className={`flex-shrink-0 px-6 py-2 rounded-full font-medium transition-all ${
                  selectedStat?.key === stat.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {stat.label}
              </button>
            ))}
          </div>
        )}

        {/* Player Cards */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
              <p className="text-white mt-4">Loading player props...</p>
            </div>
          ) : playerProps.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400">No player props available for this selection.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 mb-12">
              {playerProps.map((prop) => {
                const metadata = prop._metadata
                const playerName = metadata?.player || prop.participants[0] || 'Unknown Player'
                const team = metadata?.team || getTeamAbbr(prop.participants)
                const jersey = metadata?.jersey || 0
                const matchup = metadata?.matchup || `${prop.participants[0]} @ ${prop.participants[1] || ''}`
                const engagement = metadata?.engagement || '0'
                const statValue = prop.odds?.over?.total || prop.odds?.under?.total || 0
                const odds = prop.odds?.over?.odds || prop.odds?.under?.odds || -110
                const statLabel = selectedStat?.label || 'Stat'

                return (
                  <div
                    key={prop.id}
                    className="bg-gray-900 rounded-lg p-4 border border-gray-800 hover:border-gray-600 transition-all hover:shadow-lg"
                  >
                    {/* Top Section - Jersey & Engagement */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="relative">
                        <div className="w-12 h-12 bg-red-600 rounded flex items-center justify-center">
                          <span className="text-white font-bold text-lg">
                            {jersey || '?'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-orange-400">
                        <svg
                          className="w-4 h-4"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span className="text-sm font-medium">{engagement}</span>
                      </div>
            </div>
            
                    {/* Middle Section - Player Info */}
                    <div className="mb-4">
                      <h3 className="text-white font-semibold text-lg mb-1 line-clamp-1">
                        {playerName}
              </h3>
                      <p className="text-gray-400 text-sm mb-1">
                        {team} {selectedSport === 'NBA' ? '- ' + getPosition(prop.participants) : ''}
                      </p>
                      <p className="text-gray-500 text-xs line-clamp-2">
                        {matchup}
              </p>
            </div>
            
                    {/* Bottom Section - Stat & Odds */}
                    <div className="mb-4">
                      <p className="text-gray-400 text-sm mb-2">{statLabel}</p>
                      <p className="text-white font-bold text-3xl mb-1">
                        {statValue}
                      </p>
                      <p className="text-gray-400 text-sm">
                        {formatOdds(odds)}
              </p>
            </div>
            
                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      <button className="bg-green-600 hover:bg-green-700 text-white py-2 px-3 rounded font-medium text-sm transition-colors">
                        More
                      </button>
                      <button className="bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded font-medium text-sm transition-colors">
                        Less
                      </button>
            </div>
          </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
