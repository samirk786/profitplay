'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

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
  const [challengeAccount, setChallengeAccount] = useState<ChallengeAccount | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // TODO: Fetch user's challenge account from API
    // For now, show mock data
    setTimeout(() => {
      setChallengeAccount({
        id: 'mock-account',
        startBalance: 10000,
        equity: 10250,
        highWaterMark: 10250,
        state: 'ACTIVE',
        ruleset: {
          name: 'Standard Plan Rules',
          profitTargetPct: 10,
          maxDailyLossPct: 5,
          maxDrawdownPct: 15,
          maxStakePct: 3,
        }
      })
      setLoading(false)
    }, 1000)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (!challengeAccount) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              No Active Challenge
            </h1>
            <p className="text-gray-600 mb-8">
              You don't have an active challenge account. Subscribe to a plan to get started.
            </p>
            <Link
              href="/pricing"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700"
            >
              View Plans
            </Link>
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <Link href="/" className="text-2xl font-bold text-gray-900">
              ProfitPlay
            </Link>
            <nav className="flex space-x-8">
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
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to your Challenge
          </h1>
          <p className="text-gray-600">
            Track your progress and manage your simulated performance.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Current Balance</h3>
            <p className="text-3xl font-bold text-gray-900">
              ${challengeAccount.equity.toLocaleString()}
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Profit/Loss</h3>
            <p className={`text-3xl font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {profit >= 0 ? '+' : ''}${profit.toLocaleString()}
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Profit %</h3>
            <p className={`text-3xl font-bold ${profitPct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {profitPct >= 0 ? '+' : ''}{profitPct.toFixed(2)}%
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Status</h3>
            <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
              challengeAccount.state === 'ACTIVE' ? 'bg-green-100 text-green-800' :
              challengeAccount.state === 'PASSED' ? 'bg-blue-100 text-blue-800' :
              challengeAccount.state === 'FAILED' ? 'bg-red-100 text-red-800' :
              'bg-yellow-100 text-yellow-800'
            }`}>
              {challengeAccount.state}
            </span>
          </div>
        </div>

        {/* Progress Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Progress to Target */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Progress to Target
            </h3>
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Current: ${profit.toLocaleString()}</span>
                <span>Target: ${profitTarget.toLocaleString()}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(0, Math.min(100, progressToTarget))}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                {progressToTarget.toFixed(1)}% complete
              </p>
            </div>
          </div>

          {/* Challenge Rules */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Challenge Rules
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Profit Target:</span>
                <span className="font-medium">{challengeAccount.ruleset.profitTargetPct}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Max Daily Loss:</span>
                <span className="font-medium">{challengeAccount.ruleset.maxDailyLossPct}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Max Drawdown:</span>
                <span className="font-medium">{challengeAccount.ruleset.maxDrawdownPct}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Max Stake per Bet:</span>
                <span className="font-medium">{challengeAccount.ruleset.maxStakePct}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Quick Actions
          </h3>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/markets"
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700"
            >
              Browse Markets
            </Link>
            <Link
              href="/dashboard/bets"
              className="bg-gray-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-gray-700"
            >
              View My Bets
            </Link>
            <Link
              href="/dashboard/history"
              className="bg-gray-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-gray-700"
            >
              Performance History
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
