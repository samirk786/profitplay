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
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch('/api/admin/stats')
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || 'Failed to load admin stats')
        }
        setStats({
          totalUsers: data.totalUsers || 0,
          activeChallenges: data.activeChallenges || 0,
          pendingSettlements: data.pendingSettlements || 0,
          totalRevenue: data.totalRevenue || 0
        })
      } catch (err: any) {
        setError(err.message || 'Failed to load admin stats')
        setStats({
          totalUsers: 0,
          activeChallenges: 0,
          pendingSettlements: 0,
          totalRevenue: 0
        })
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="admin-page flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 admin-muted">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-page">
      {/* Header */}
      <header className="admin-header">
        <div className="admin-header-inner">
          <Link href="/" className="admin-brand">
            ProfitPlay Admin
          </Link>
          <nav className="admin-nav">
            <Link href="/dashboard" className="admin-nav-link">
              User Dashboard
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
          <h1 className="admin-title">Admin Dashboard</h1>
          <p className="admin-subtitle">
            Manage users, challenges, and platform operations.
          </p>
        </div>

        {error && (
          <div className="admin-alert admin-alert-error mb-6">
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Stats Grid */}
        <div className="admin-grid-4 mb-8">
          <div className="admin-card">
            <h3 className="admin-card-title">Total Users</h3>
            <p className="admin-card-value">{stats?.totalUsers.toLocaleString()}</p>
          </div>
          
          <div className="admin-card">
            <h3 className="admin-card-title">Active Challenges</h3>
            <p className="admin-card-value" style={{ color: '#60a5fa' }}>
              {stats?.activeChallenges.toLocaleString()}
            </p>
          </div>
          
          <div className="admin-card">
            <h3 className="admin-card-title">Pending Settlements</h3>
            <p className="admin-card-value" style={{ color: '#facc15' }}>
              {stats?.pendingSettlements.toLocaleString()}
            </p>
          </div>
          
          <div className="admin-card">
            <h3 className="admin-card-title">Total Revenue</h3>
            <p className="admin-card-value" style={{ color: '#4ade80' }}>
              ${stats?.totalRevenue.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="admin-grid-2 mb-8">
          <div className="admin-card">
            <h3 className="text-lg font-semibold text-white mb-4">User Management</h3>
            <div className="space-y-3">
              <Link
                href="/admin/users"
                className="admin-action-link"
              >
                <div className="admin-action-link-title">View All Users</div>
                <div className="admin-action-link-subtitle">Manage accounts and access</div>
              </Link>
              <Link
                href="/admin/users?filter=active"
                className="admin-action-link"
              >
                <div className="admin-action-link-title">Active Subscribers</div>
                <div className="admin-action-link-subtitle">Currently paying members</div>
              </Link>
              <Link
                href="/admin/users?filter=challenges"
                className="admin-action-link"
              >
                <div className="admin-action-link-title">Users with Challenges</div>
                <div className="admin-action-link-subtitle">Track ongoing evaluations</div>
              </Link>
            </div>
          </div>

          <div className="admin-card">
            <h3 className="text-lg font-semibold text-white mb-4">Challenge Management</h3>
            <div className="space-y-3">
              <Link
                href="/admin/challenges"
                className="admin-action-link"
              >
                <div className="admin-action-link-title">View All Challenges</div>
                <div className="admin-action-link-subtitle">Monitor challenge states</div>
              </Link>
              <Link
                href="/admin/challenges?filter=active"
                className="admin-action-link"
              >
                <div className="admin-action-link-title">Active Challenges</div>
                <div className="admin-action-link-subtitle">In‑progress accounts</div>
              </Link>
              <Link
                href="/admin/challenges?filter=passed"
                className="admin-action-link"
              >
                <div className="admin-action-link-title">Passed Challenges</div>
                <div className="admin-action-link-subtitle">Completed successfully</div>
              </Link>
            </div>
          </div>
        </div>

        {/* Game & Settlement Management */}
        <div className="admin-grid-2 mb-8">
          <div className="admin-card">
            <h3 className="text-lg font-semibold text-white mb-4">Game Management</h3>
            <div className="admin-inline">
              <div>
                <p className="admin-light">
                  Select which NBA games to display
                </p>
                <p className="text-sm admin-muted">
                  Pick up to 2 games for the homepage
                </p>
              </div>
              <Link
                href="/admin/games"
                className="admin-btn admin-btn-success"
              >
                Manage Games
              </Link>
            </div>
          </div>

          <div className="admin-card">
            <h3 className="text-lg font-semibold text-white mb-4">Settlement Management</h3>
            <div className="admin-inline">
              <div>
                <p className="admin-light">
                  {stats?.pendingSettlements} bets awaiting settlement
                </p>
                <p className="text-sm admin-muted">
                  Review and settle pending bets
                </p>
              </div>
              <Link
                href="/admin/settlements"
                className="admin-btn admin-btn-primary"
              >
                Manage Settlements
              </Link>
            </div>
          </div>
        </div>

        {/* System Tools */}
        <div className="admin-card">
          <h3 className="text-lg font-semibold text-white mb-4">System Tools</h3>
          <div className="admin-grid-2">
            <Link href="/admin/logs" className="admin-tile-link" style={{ textAlign: 'center' }}>
              <div className="text-2xl mb-2">📊</div>
              <h4 className="font-medium text-white">Audit Logs</h4>
              <p className="text-sm admin-muted">View system activity</p>
            </Link>
            
            <Link href="/admin/export" className="admin-tile-link" style={{ textAlign: 'center' }}>
              <div className="text-2xl mb-2">📁</div>
              <h4 className="font-medium text-white">Data Export</h4>
              <p className="text-sm admin-muted">Export user data</p>
            </Link>
            
            <Link href="/admin/settings" className="admin-tile-link" style={{ textAlign: 'center' }}>
              <div className="text-2xl mb-2">⚙️</div>
              <h4 className="font-medium text-white">Settings</h4>
              <p className="text-sm admin-muted">Platform configuration</p>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
