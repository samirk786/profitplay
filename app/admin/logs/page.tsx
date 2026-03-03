'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface AuditLog {
  id: string
  userId: string
  user: {
    name: string
    email: string
  } | null
  action: string
  payload: any
  ip: string
  createdAt: string
}

export default function LogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    action: 'ALL',
    userId: '',
    dateFrom: '',
    dateTo: ''
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    setLogs([])
    setTotalPages(1)
    setLoading(false)
  }, [])

  const filteredLogs = logs.filter(log => {
    const matchesAction = filters.action === 'ALL' || log.action === filters.action
    const matchesUser = !filters.userId || log.userId === filters.userId
    const matchesDateFrom = !filters.dateFrom || new Date(log.createdAt) >= new Date(filters.dateFrom)
    const matchesDateTo = !filters.dateTo || new Date(log.createdAt) <= new Date(filters.dateTo)
    
    return matchesAction && matchesUser && matchesDateFrom && matchesDateTo
  })

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'USER_LOGIN':
      case 'USER_SIGNUP':
        return 'admin-badge-open'
      case 'BET_PLACED':
      case 'BET_SETTLED':
        return 'admin-badge-member'
      case 'SUBSCRIPTION_CREATED':
      case 'SUBSCRIPTION_UPDATED':
        return 'admin-badge-admin'
      case 'ADMIN_ACTION':
        return 'admin-badge-push'
      case 'RULE_VIOLATION':
        return 'admin-badge-lost'
      default:
        return 'admin-badge-push'
    }
  }

  const exportToCSV = () => {
    const csvContent = [
      ['Timestamp', 'User', 'Action', 'Details', 'IP Address'],
      ...filteredLogs.map(log => [
        formatDate(log.createdAt),
        log.user ? `${log.user.name} (${log.user.email})` : 'System',
        log.action,
        JSON.stringify(log.payload),
        log.ip || 'N/A'
      ])
    ].map(row => row.map(field => `"${field}"`).join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="admin-page flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 admin-muted">Loading audit logs...</p>
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
          <h1 className="admin-title">Audit Logs</h1>
          <p className="admin-subtitle">Monitor system activity and user actions.</p>
        </div>

        {/* Filters */}
        <div className="admin-card mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium admin-muted mb-2">Action Type</label>
              <select
                value={filters.action}
                onChange={(e) => setFilters(prev => ({ ...prev, action: e.target.value }))}
                className="admin-select"
              >
                <option value="ALL">All Actions</option>
                <option value="USER_LOGIN">User Login</option>
                <option value="USER_SIGNUP">User Signup</option>
                <option value="BET_PLACED">Bet Placed</option>
                <option value="BET_SETTLED">Bet Settled</option>
                <option value="SUBSCRIPTION_CREATED">Subscription Created</option>
                <option value="ADMIN_ACTION">Admin Action</option>
                <option value="RULE_VIOLATION">Rule Violation</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium admin-muted mb-2">User ID</label>
              <input
                type="text"
                value={filters.userId}
                onChange={(e) => setFilters(prev => ({ ...prev, userId: e.target.value }))}
                placeholder="Enter user ID..."
                className="admin-input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium admin-muted mb-2">Date From</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                className="admin-input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium admin-muted mb-2">Date To</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                className="admin-input"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-between">
            <button
              onClick={() => setFilters({ action: 'ALL', userId: '', dateFrom: '', dateTo: '' })}
              className="admin-btn admin-btn-neutral admin-btn-small"
            >
              Clear Filters
            </button>
            <button
              onClick={exportToCSV}
              className="admin-btn admin-btn-primary admin-btn-small"
            >
              Export CSV
            </button>
          </div>
        </div>

        {/* Logs Table */}
        <div className="admin-list-card">
          <div className="admin-list-header">
            <h3 className="text-lg leading-6 font-medium text-white">
              Audit Logs ({filteredLogs.length})
            </h3>
          </div>
          <ul>
            {filteredLogs.map((log) => (
              <li key={log.id}>
                <div className="admin-list-row">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <span className={`admin-badge ${getActionColor(log.action)}`}>
                          {log.action}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="flex items-center">
                          <p className="text-sm font-medium text-white">
                            {log.user ? log.user.name : 'System'}
                          </p>
                          {log.user && (
                            <p className="ml-2 text-sm admin-muted">
                              {log.user.email}
                            </p>
                          )}
                        </div>
                        <p className="text-sm admin-muted">{formatDate(log.createdAt)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm admin-muted">IP: {log.ip || 'N/A'}</p>
                      <details className="mt-1">
                        <summary className="text-sm text-blue-400 hover:text-blue-300 cursor-pointer">
                          View Details
                        </summary>
                        <pre className="mt-2 text-xs bg-[#121212] border border-[#2a2a2a] p-2 rounded overflow-auto text-slate-200">
                          {JSON.stringify(log.payload, null, 2)}
                        </pre>
                      </details>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {filteredLogs.length === 0 && (
          <div className="text-center py-12">
            <p className="admin-muted">No logs found matching your criteria.</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex justify-center">
            <nav className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="admin-btn admin-btn-neutral admin-btn-small"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`admin-btn admin-btn-small ${
                    currentPage === page
                      ? 'admin-btn-primary'
                      : 'admin-btn-neutral'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="admin-btn admin-btn-neutral admin-btn-small"
              >
                Next
              </button>
            </nav>
          </div>
        )}
      </main>
    </div>
  )
}
