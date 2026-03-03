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
    setChallenges([])
    setLoading(false)
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
        return 'admin-badge-member'
      case 'PASSED':
        return 'admin-badge-open'
      case 'FAILED':
        return 'admin-badge-lost'
      case 'PAUSED':
        return 'admin-badge-push'
      default:
        return 'admin-badge-push'
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
      <div className="admin-page flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 admin-muted">Loading challenges...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-page">
      {/* Header */}
      <header className="admin-header">
        <div className="admin-header-inner">
          <Link href="/admin" className="admin-brand">
            ProfitPlay Admin
          </Link>
          <nav className="admin-nav">
            <Link href="/admin" className="admin-nav-link">
              Dashboard
            </Link>
            <Link href="/auth/signin" className="admin-nav-link">
              Sign Out
            </Link>
          </nav>
        </div>
      </header>

      <main className="admin-container">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="admin-title">Challenge Management</h1>
          <p className="admin-subtitle">Monitor and manage user challenge accounts.</p>
        </div>

        {/* Filters */}
        <div className="admin-card mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium admin-muted mb-2">Search Challenges</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by user name or email..."
                className="admin-input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium admin-muted mb-2">Filter by Status</label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="admin-select"
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
              <p className="admin-muted">No challenges found matching your criteria.</p>
            </div>
          ) : (
            filteredChallenges.map((challenge) => {
              const profit = challenge.equity - challenge.startBalance
              const profitPct = (profit / challenge.startBalance) * 100
              const progressToTarget = Math.min((profit / (challenge.startBalance * challenge.ruleset.profitTargetPct / 100)) * 100, 100)

              return (
                <div key={challenge.id} className="admin-card">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{challenge.user.name}</h3>
                      <p className="text-sm admin-muted">{challenge.user.email}</p>
                      <p className="text-sm admin-muted">Started: {formatDate(challenge.startedAt)}</p>
                    </div>
                    <div className="text-right">
                      <span className={`admin-badge ${getStateColor(challenge.state)}`}>
                        {challenge.state}
                      </span>
                      <p className="text-sm admin-muted mt-1">{challenge.ruleset.name}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-sm admin-muted">Current Balance</p>
                      <p className="text-lg font-semibold text-white">${challenge.equity.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm admin-muted">Profit/Loss</p>
                      <p className={`text-lg font-semibold ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {profit >= 0 ? '+' : ''}${profit.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm admin-muted">Profit %</p>
                      <p className={`text-lg font-semibold ${profitPct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {profitPct >= 0 ? '+' : ''}{profitPct.toFixed(2)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-sm admin-muted">Progress to Target</p>
                      <p className="text-lg font-semibold text-white">{progressToTarget.toFixed(1)}%</p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between text-sm admin-muted mb-2">
                      <span>Progress to {challenge.ruleset.profitTargetPct}% target</span>
                      <span>{progressToTarget.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-[#2a2a2a] rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.max(0, Math.min(100, progressToTarget))}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="flex space-x-4">
                    <Link
                      href={`/admin/challenges/${challenge.id}`}
                      className="admin-btn admin-btn-neutral admin-btn-small"
                    >
                      View Details
                    </Link>
                    {challenge.state === 'ACTIVE' && (
                      <button
                        onClick={() => handlePauseChallenge(challenge.id)}
                        className="admin-btn admin-btn-neutral admin-btn-small"
                      >
                        Pause Challenge
                      </button>
                    )}
                    <button
                      onClick={() => handleResetChallenge(challenge.id)}
                      className="admin-btn admin-btn-danger admin-btn-small"
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
