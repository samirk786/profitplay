'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

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
}

export default function SettlementsPage() {
  const [bets, setBets] = useState<Bet[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBet, setSelectedBet] = useState<Bet | null>(null)
  const [settlementResult, setSettlementResult] = useState('')

  useEffect(() => {
    // TODO: Fetch open bets from API
    // For now, show mock data
    setTimeout(() => {
      setBets([
        {
          id: '1',
          market: {
            id: 'market-1',
            sport: 'NBA',
            participants: ['Los Angeles Lakers', 'Golden State Warriors'],
            marketType: 'MONEYLINE',
            startTime: '2024-01-15T20:00:00Z'
          },
          selection: 'Los Angeles Lakers',
          stake: 100,
          potentialPayout: 166.67,
          status: 'OPEN',
          placedAt: '2024-01-15T19:30:00Z'
        },
        {
          id: '2',
          market: {
            id: 'market-1',
            sport: 'NBA',
            participants: ['Los Angeles Lakers', 'Golden State Warriors'],
            marketType: 'SPREAD',
            startTime: '2024-01-15T20:00:00Z'
          },
          selection: 'Golden State Warriors +3.5',
          stake: 150,
          potentialPayout: 136.36,
          status: 'OPEN',
          placedAt: '2024-01-15T19:25:00Z'
        }
      ])
      setLoading(false)
    }, 1000)
  }, [])

  const handleSettleBet = async (betId: string, result: 'WON' | 'LOST' | 'PUSH') => {
    // TODO: Implement settlement API call
    console.log('Settling bet:', betId, 'Result:', result)
    
    // Update local state
    setBets(prev => prev.map(bet => 
      bet.id === betId 
        ? { ...bet, status: result }
        : bet
    ))
    
    setSelectedBet(null)
    setSettlementResult('')
  }

  const formatStartTime = (startTime: string) => {
    const date = new Date(startTime)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading settlements...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <Link href="/admin" className="text-2xl font-bold text-gray-900">
              ProfitPlay Admin
            </Link>
            <nav className="flex space-x-8">
              <Link href="/admin" className="text-gray-500 hover:text-gray-900">
                Dashboard
              </Link>
              <Link href="/auth/signin" className="text-gray-500 hover:text-gray-900">
                Sign Out
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Settlement Management
          </h1>
          <p className="text-gray-600">
            Review and settle pending bets.
          </p>
        </div>

        {/* Bets List */}
        <div className="space-y-4">
          {bets.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No pending settlements.</p>
            </div>
          ) : (
            bets.map((bet) => (
              <div key={bet.id} className="bg-white p-6 rounded-lg shadow">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {bet.market.participants[0]} vs {bet.market.participants[1]}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {bet.market.sport} • {bet.market.marketType}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatStartTime(bet.market.startTime)}
                    </p>
                  </div>
                  <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
                    {bet.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600">Selection</p>
                    <p className="font-medium">{bet.selection}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Stake</p>
                    <p className="font-medium">${bet.stake.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Potential Payout</p>
                    <p className="font-medium">${bet.potentialPayout.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Placed At</p>
                    <p className="font-medium">{formatStartTime(bet.placedAt)}</p>
                  </div>
                </div>

                <div className="flex space-x-4">
                  <button
                    onClick={() => handleSettleBet(bet.id, 'WON')}
                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 text-sm font-medium"
                  >
                    Mark as Won
                  </button>
                  <button
                    onClick={() => handleSettleBet(bet.id, 'LOST')}
                    className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 text-sm font-medium"
                  >
                    Mark as Lost
                  </button>
                  <button
                    onClick={() => handleSettleBet(bet.id, 'PUSH')}
                    className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 text-sm font-medium"
                  >
                    Mark as Push
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  )
}
