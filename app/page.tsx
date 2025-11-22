'use client'

import { useState } from 'react'
import Header from '@/components/Header'

// Mock player data based on the image description
const MOCK_PLAYER_PROPS = [
  {
    id: '1',
    playerName: 'Giannis Antetokounmpo',
    jerseyNumber: 34,
    team: 'MIL',
    position: 'F',
    matchup: 'Milwaukee Bucks @ Dallas Mavericks',
    stat: 'Points',
    value: 30.5,
    odds: -110,
    engagement: '19.5K'
  },
  {
    id: '2',
    playerName: 'Luka Doncic',
    jerseyNumber: 77,
    team: 'DAL',
    position: 'G',
    matchup: 'Milwaukee Bucks @ Dallas Mavericks',
    stat: 'Points',
    value: 32.5,
    odds: -115,
    engagement: '19.2K'
  },
  {
    id: '3',
    playerName: 'Damian Lillard',
    jerseyNumber: 0,
    team: 'MIL',
    position: 'G',
    matchup: 'Milwaukee Bucks @ Dallas Mavericks',
    stat: 'Points',
    value: 25.5,
    odds: -108,
    engagement: '17.8K'
  },
  {
    id: '4',
    playerName: 'Kyrie Irving',
    jerseyNumber: 11,
    team: 'DAL',
    position: 'G',
    matchup: 'Milwaukee Bucks @ Dallas Mavericks',
    stat: 'Points',
    value: 24.5,
    odds: -112,
    engagement: '18.1K'
  },
  {
    id: '5',
    playerName: 'Khris Middleton',
    jerseyNumber: 22,
    team: 'MIL',
    position: 'F',
    matchup: 'Milwaukee Bucks @ Dallas Mavericks',
    stat: 'Points',
    value: 18.5,
    odds: -110,
    engagement: '14.2K'
  }
]

const SPORTS = [
  { key: 'NBA', label: 'NBA', icon: '🏀' },
  { key: 'NFL', label: 'NFL', icon: '🏈' },
  { key: 'MLB', label: 'MLB', icon: '⚾' },
  { key: 'NHL', label: 'NHL', icon: '🏒' },
  { key: 'SOCCER', label: 'SOCCER', icon: '⚽' },
  { key: 'MMA', label: 'MMA', icon: '🥊' }
]

const NBA_STATS = [
  { key: 'POINTS', label: 'Points' },
  { key: 'REBOUNDS', label: 'Rebounds' },
  { key: 'ASSISTS', label: 'Assists' },
  { key: 'STEALS', label: 'Steals' },
  { key: 'BLOCKS', label: 'Blocks' },
  { key: 'FG_PCT', label: 'Field Goal %' },
  { key: 'FT_PCT', label: 'Free Throw %' },
  { key: 'THREES', label: 'Three-Pointers' }
]

export default function Home() {
  const [selectedSport, setSelectedSport] = useState('NBA')
  const [selectedStat, setSelectedStat] = useState('POINTS')

  const formatOdds = (odds: number) => {
    if (odds > 0) return `+${odds}`
    return odds.toString()
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
        {selectedSport === 'NBA' && (
          <div className="flex justify-center gap-3 mb-12 px-4 overflow-x-auto pb-4">
            {NBA_STATS.map((stat) => (
              <button
                key={stat.key}
                onClick={() => setSelectedStat(stat.key)}
                className={`flex-shrink-0 px-6 py-2 rounded-full font-medium transition-all ${
                  selectedStat === stat.key
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-12">
            {MOCK_PLAYER_PROPS.map((player) => (
              <div
                key={player.id}
                className="bg-gray-900 rounded-lg p-4 border border-gray-800 hover:border-gray-600 transition-all"
              >
                {/* Top Section - Jersey & Engagement */}
                <div className="flex items-center justify-between mb-4">
                  <div className="relative">
                    <div className="w-12 h-12 bg-red-600 rounded flex items-center justify-center">
                      <span className="text-white font-bold text-lg">
                        {player.jerseyNumber}
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
                    <span className="text-sm font-medium">{player.engagement}</span>
                  </div>
                </div>

                {/* Middle Section - Player Info */}
                <div className="mb-4">
                  <h3 className="text-white font-semibold text-lg mb-1">
                    {player.playerName}
                  </h3>
                  <p className="text-gray-400 text-sm mb-1">
                    {player.team} - {player.position}
                  </p>
                  <p className="text-gray-500 text-xs">
                    {player.matchup}
                  </p>
                </div>

                {/* Bottom Section - Stat & Odds */}
                <div className="mb-4">
                  <p className="text-gray-400 text-sm mb-2">{player.stat}</p>
                  <p className="text-white font-bold text-3xl mb-1">
                    {player.value}
                  </p>
                  <p className="text-gray-400 text-sm">
                    {formatOdds(player.odds)}
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
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
