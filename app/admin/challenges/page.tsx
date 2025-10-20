'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface ChallengeAccount {
  id: string
  userId: string
  user: {
    name: string
    email: string
  }
  startBalance: number
  equity: number
  highWaterMark: number
  state: string
  startedAt: string
  ruleset: {
    name: string
    profitTargetPct: number
    maxDailyLossPct: number
    maxDrawdownPct: number
  }
}

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState<ChallengeAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    // TODO: Fetch challenges from API
    // For now, show mock data
    setTimeout(() => {
      setChallenges([
        {
          id: '1',
          userId: 'user-1',
          user: { name: 'John Doe', email: 'john@example.com' },
          startBalance: 10000,
          equity: 10250,
          highWaterMark: 10250,
          state: 'ACTIVE',
          startedAt: '2024-01-10T10:00:00Z',
          ruleset: {
            name: 'Standard Plan Rules',
            profitTargetPct: 10,
            maxDailyLossPct: 5,
            maxDrawdownPct: 15
          }
        },
        {
          id: '2',
          userId: 'user-2',
          user: { name: 'Jane Smith', email: 'jane@example.com' },
          startBalance: 10000,
          equity: 9500,
          highWaterMark: 10000,
          state: 'ACTIVE',
          startedAt: '2024-01-12T14:30:00Z',
          ruleset: {
            name: 'Starter Plan Rules',
            profitTargetPct: 8,
            maxDailyLossPct: 5,
            maxDrawdownPct: 15
          }
        },
        {
          id: '3',
          userId: 'user-3',
          user: { name: 'Bob Johnson', email: 'bob@example.com' },
          startBalance: 10000,
          equity: 11200,
          highWaterMark: 11200,
          state: 'PASSED',
          startedAt: '2024-01-05T09:00:00Z',
          ruleset: {
            name: 'Pro Plan Rules',
            profitTargetPct: 12,
            maxDailyLossPct: 5,
            maxDrawdownPct: 15
          }
        }
      ])
      setLoading(false)
    }, 1000)
  }, [])

  const filteredChallenges = challenges.filter(challenge => {
    const matchesFilter = filter === 'ALL' || challenge.state === filter
    const matchesSearch = challenge.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         challenge.user.email.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const getStateColor = (state: string) => {
    switch (state) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800'
      case 'PASSED':
        return 'bg-blue-100 text-blue-800'
      case 'FAILED':
        return 'bg-red-100 text-red-800'
      case 'PAUSED':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const handleResetChallenge = async (challengeId: string) => {
    // TODO: Implement reset API call
    console.log('Resetting challenge:', challengeId)
    
    // Update local state
    setChallenges(prev => prev.map(challenge => 
      challenge.id === challengeId 
        ? { 
            ...challenge, 
            equity: challenge.startBalance, 
            highWaterMark: challenge.startBalance,
            state: 'ACTIVE'
          }
        : challenge
    ))
  }

  const handlePauseChallenge = async (challengeId: string) => {
    // TODO: Implement pause API call
    console.log('Pausing challenge:', challengeId)
    
    // Update local state
    setChallenges(prev => prev.map(challenge => 
      challenge.id === challengeId 
        ? { ...challenge, state: 'PAUSED' }
        : challenge
    ))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading challenges...</p>
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
            Challenge Management
          </h1>
          <p className="text-gray-600">
            Monitor and manage user challenge accounts.
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Challenges
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by user name or email..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
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
                <option value="ACTIVE">Active</option>
                <option value="PASSED">Passed</option>
                <option value="FAILED">Failed</option>
                <option value="PAUSED">Paused</option>
              </select>
            </div>
          </div>
        </div>

        {/* Challenges List */}
        <div className="space-y-4">
          {filteredChallenges.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No challenges found matching your criteria.</p>
            </div>
          ) : (
            filteredChallenges.map((challenge) => {
              const profit = challenge.equity - challenge.startBalance
              const profitPct = (profit / challenge.startBalance) * 100
              const progressToTarget = Math.min((profit / (challenge.startBalance * challenge.ruleset.profitTargetPct / 100)) * 100, 100)

              return (
                <div key={challenge.id} className="bg-white p-6 rounded-lg shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {challenge.user.name}
                      </h3>
                      <p className="text-sm text-gray-600">{challenge.user.email}</p>
                      <p className="text-sm text-gray-500">
                        Started: {formatDate(challenge.startedAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getStateColor(challenge.state)}`}>
                        {challenge.state}
                      </span>
                      <p className="text-sm text-gray-600 mt-1">
                        {challenge.ruleset.name}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-600">Current Balance</p>
                      <p className="text-lg font-semibold">${challenge.equity.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Profit/Loss</p>
                      <p className={`text-lg font-semibold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {profit >= 0 ? '+' : ''}${profit.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Profit %</p>
                      <p className={`text-lg font-semibold ${profitPct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {profitPct >= 0 ? '+' : ''}{profitPct.toFixed(2)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Progress to Target</p>
                      <p className="text-lg font-semibold">{progressToTarget.toFixed(1)}%</p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                      <span>Progress to {challenge.ruleset.profitTargetPct}% target</span>
                      <span>{progressToTarget.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.max(0, Math.min(100, progressToTarget))}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="flex space-x-4">
                    <Link
                      href={`/admin/challenges/${challenge.id}`}
                      className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                    >
                      View Details
                    </Link>
                    {challenge.state === 'ACTIVE' && (
                      <button
                        onClick={() => handlePauseChallenge(challenge.id)}
                        className="text-yellow-600 hover:text-yellow-900 text-sm font-medium"
                      >
                        Pause Challenge
                      </button>
                    )}
                    <button
                      onClick={() => handleResetChallenge(challenge.id)}
                      className="text-red-600 hover:text-red-900 text-sm font-medium"
                    >
                      Reset Challenge
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
