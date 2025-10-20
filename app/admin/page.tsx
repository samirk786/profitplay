'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface AdminStats {
  totalUsers: number
  activeChallenges: number
  pendingSettlements: number
  totalRevenue: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // TODO: Fetch admin stats from API
    // For now, show mock data
    setTimeout(() => {
      setStats({
        totalUsers: 156,
        activeChallenges: 89,
        pendingSettlements: 23,
        totalRevenue: 12450
      })
      setLoading(false)
    }, 1000)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
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
              ProfitPlay Admin
            </Link>
            <nav className="flex space-x-8">
              <Link href="/dashboard" className="text-gray-500 hover:text-gray-900">
                User Dashboard
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
            Admin Dashboard
          </h1>
          <p className="text-gray-600">
            Manage users, challenges, and platform operations.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Total Users</h3>
            <p className="text-3xl font-bold text-gray-900">
              {stats?.totalUsers.toLocaleString()}
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Active Challenges</h3>
            <p className="text-3xl font-bold text-blue-600">
              {stats?.activeChallenges.toLocaleString()}
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Pending Settlements</h3>
            <p className="text-3xl font-bold text-yellow-600">
              {stats?.pendingSettlements.toLocaleString()}
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Total Revenue</h3>
            <p className="text-3xl font-bold text-green-600">
              ${stats?.totalRevenue.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              User Management
            </h3>
            <div className="space-y-3">
              <Link
                href="/admin/users"
                className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-md"
              >
                View All Users
              </Link>
              <Link
                href="/admin/users?filter=active"
                className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-md"
              >
                Active Subscribers
              </Link>
              <Link
                href="/admin/users?filter=challenges"
                className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-md"
              >
                Users with Challenges
              </Link>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Challenge Management
            </h3>
            <div className="space-y-3">
              <Link
                href="/admin/challenges"
                className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-md"
              >
                View All Challenges
              </Link>
              <Link
                href="/admin/challenges?filter=active"
                className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-md"
              >
                Active Challenges
              </Link>
              <Link
                href="/admin/challenges?filter=passed"
                className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-md"
              >
                Passed Challenges
              </Link>
            </div>
          </div>
        </div>

        {/* Settlement Management */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Settlement Management
          </h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600">
                {stats?.pendingSettlements} bets awaiting settlement
              </p>
              <p className="text-sm text-gray-500">
                Review and settle pending bets
              </p>
            </div>
            <Link
              href="/admin/settlements"
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700"
            >
              Manage Settlements
            </Link>
          </div>
        </div>

        {/* System Tools */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            System Tools
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/admin/logs"
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-center"
            >
              <div className="text-2xl mb-2">📊</div>
              <h4 className="font-medium text-gray-900">Audit Logs</h4>
              <p className="text-sm text-gray-600">View system activity</p>
            </Link>
            
            <Link
              href="/admin/export"
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-center"
            >
              <div className="text-2xl mb-2">📁</div>
              <h4 className="font-medium text-gray-900">Data Export</h4>
              <p className="text-sm text-gray-600">Export user data</p>
            </Link>
            
            <Link
              href="/admin/settings"
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-center"
            >
              <div className="text-2xl mb-2">⚙️</div>
              <h4 className="font-medium text-gray-900">Settings</h4>
              <p className="text-sm text-gray-600">Platform configuration</p>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
