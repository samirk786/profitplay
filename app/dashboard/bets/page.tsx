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
  settledAt?: string
  pnl?: number
}

export default function BetsPage() {
  const [bets, setBets] = useState<Bet[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')
  const [sportFilter, setSportFilter] = useState('ALL')

  useEffect(() => {
    // TODO: Fetch user's bets from API
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
          status: 'WON',
          placedAt: '2024-01-15T19:30:00Z',
          settledAt: '2024-01-15T22:30:00Z',
          pnl: 66.67
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
          status: 'LOST',
          placedAt: '2024-01-15T19:25:00Z',
          settledAt: '2024-01-15T22:30:00Z',
          pnl: -150
        },
        {
          id: '3',
          market: {
            id: 'market-2',
            sport: 'NFL',
            participants: ['Kansas City Chiefs', 'Buffalo Bills'],
            marketType: 'MONEYLINE',
            startTime: '2024-01-16T21:00:00Z'
          },
          selection: 'Kansas City Chiefs',
          stake: 200,
          potentialPayout: 166.67,
          status: 'OPEN',
          placedAt: '2024-01-16T20:30:00Z'
        }
      ])
      setLoading(false)
    }, 1000)
  }, [])

  const filteredBets = bets.filter(bet => {
    const matchesStatus = filter === 'ALL' || bet.status === filter
    const matchesSport = sportFilter === 'ALL' || bet.market.sport === sportFilter
    return matchesStatus && matchesSport
  })

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'WON':
        return 'bg-green-100 text-green-800'
      case 'LOST':
        return 'bg-red-100 text-red-800'
      case 'PUSH':
        return 'bg-gray-100 text-gray-800'
      case 'OPEN':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const totalPnl = bets.reduce((sum, bet) => sum + (bet.pnl || 0), 0)
  const winRate = bets.filter(bet => bet.status === 'WON').length / bets.filter(bet => bet.status !== 'OPEN').length * 100

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your bets...</p>
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
            <Link href="/" className="text-2xl font-bold text-gray-900">
              ProfitPlay
            </Link>
            <nav className="flex space-x-8">
              <Link href="/dashboard" className="text-gray-500 hover:text-gray-900">
                Dashboard
              </Link>
              <Link href="/markets" className="text-gray-500 hover:text-gray-900">
                Markets
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
            My Bets
          </h1>
          <p className="text-gray-600">
            Track your betting history and performance.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Total Bets</h3>
            <p className="text-3xl font-bold text-gray-900">{bets.length}</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Win Rate</h3>
            <p className="text-3xl font-bold text-blue-600">
              {isNaN(winRate) ? '0' : winRate.toFixed(1)}%
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Total P&L</h3>
            <p className={`text-3xl font-bold ${totalPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Open Bets</h3>
            <p className="text-3xl font-bold text-yellow-600">
              {bets.filter(bet => bet.status === 'OPEN').length}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Status
              </label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="OPEN">Open</option>
                <option value="WON">Won</option>
                <option value="LOST">Lost</option>
                <option value="PUSH">Push</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Sport
              </label>
              <select
                value={sportFilter}
                onChange={(e) => setSportFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Sports</option>
                <option value="NBA">NBA</option>
                <option value="NFL">NFL</option>
                <option value="MLB">MLB</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bets List */}
        <div className="space-y-4">
          {filteredBets.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No bets found matching your criteria.</p>
            </div>
          ) : (
            filteredBets.map((bet) => (
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
                      Placed: {formatDate(bet.placedAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(bet.status)}`}>
                      {bet.status}
                    </span>
                    {bet.settledAt && (
                      <p className="text-sm text-gray-500 mt-1">
                        Settled: {formatDate(bet.settledAt)}
                      </p>
                    )}
                  </div>
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
                    <p className="text-sm text-gray-600">P&L</p>
                    <p className={`font-medium ${bet.pnl !== undefined ? (bet.pnl >= 0 ? 'text-green-600' : 'text-red-600') : 'text-gray-500'}`}>
                      {bet.pnl !== undefined ? (bet.pnl >= 0 ? '+' : '') + bet.pnl.toFixed(2) : 'N/A'}
                    </p>
                  </div>
                </div>

                {bet.status === 'OPEN' && (
                  <div className="flex space-x-4">
                    <button className="text-blue-600 hover:text-blue-900 text-sm font-medium">
                      View Market
                    </button>
                    <button className="text-red-600 hover:text-red-900 text-sm font-medium">
                      Cancel Bet
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  )
}
