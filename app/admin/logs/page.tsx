'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

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
    // TODO: Fetch logs from API
    // For now, show mock data
    setTimeout(() => {
      setLogs([
        {
          id: '1',
          userId: 'user-1',
          user: { name: 'John Doe', email: 'john@example.com' },
          action: 'BET_PLACED',
          payload: {
            betId: 'bet-1',
            marketId: 'market-1',
            selection: 'Los Angeles Lakers',
            stake: 100,
            potentialPayout: 166.67
          },
          ip: '192.168.1.1',
          createdAt: '2024-01-15T19:30:00Z'
        },
        {
          id: '2',
          userId: 'user-1',
          user: { name: 'John Doe', email: 'john@example.com' },
          action: 'USER_LOGIN',
          payload: {
            loginMethod: 'email'
          },
          ip: '192.168.1.1',
          createdAt: '2024-01-15T19:25:00Z'
        },
        {
          id: '3',
          userId: 'user-2',
          user: { name: 'Jane Smith', email: 'jane@example.com' },
          action: 'SUBSCRIPTION_CREATED',
          payload: {
            subscriptionId: 'sub-1',
            plan: 'STANDARD',
            stripeCustomerId: 'cus_123'
          },
          ip: '192.168.1.2',
          createdAt: '2024-01-15T18:45:00Z'
        },
        {
          id: '4',
          userId: 'system',
          user: null,
          action: 'ADMIN_ACTION',
          payload: {
            action: 'BET_SETTLED',
            betId: 'bet-1',
            result: 'WON'
          },
          ip: '192.168.1.100',
          createdAt: '2024-01-15T20:15:00Z'
        }
      ])
      setTotalPages(1)
      setLoading(false)
    }, 1000)
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
        return 'bg-blue-100 text-blue-800'
      case 'BET_PLACED':
      case 'BET_SETTLED':
        return 'bg-green-100 text-green-800'
      case 'SUBSCRIPTION_CREATED':
      case 'SUBSCRIPTION_UPDATED':
        return 'bg-purple-100 text-purple-800'
      case 'ADMIN_ACTION':
        return 'bg-yellow-100 text-yellow-800'
      case 'RULE_VIOLATION':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading audit logs...</p>
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
            Audit Logs
          </h1>
          <p className="text-gray-600">
            Monitor system activity and user actions.
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Action Type
              </label>
              <select
                value={filters.action}
                onChange={(e) => setFilters(prev => ({ ...prev, action: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                User ID
              </label>
              <input
                type="text"
                value={filters.userId}
                onChange={(e) => setFilters(prev => ({ ...prev, userId: e.target.value }))}
                placeholder="Enter user ID..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date From
              </label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date To
              </label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-between">
            <button
              onClick={() => setFilters({ action: 'ALL', userId: '', dateFrom: '', dateTo: '' })}
              className="px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              Clear Filters
            </button>
            <button
              onClick={exportToCSV}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Export CSV
            </button>
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Audit Logs ({filteredLogs.length})
            </h3>
          </div>
          <ul className="divide-y divide-gray-200">
            {filteredLogs.map((log) => (
              <li key={log.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getActionColor(log.action)}`}>
                          {log.action}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="flex items-center">
                          <p className="text-sm font-medium text-gray-900">
                            {log.user ? log.user.name : 'System'}
                          </p>
                          {log.user && (
                            <p className="ml-2 text-sm text-gray-500">
                              {log.user.email}
                            </p>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
                          {formatDate(log.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">
                        IP: {log.ip || 'N/A'}
                      </p>
                      <details className="mt-1">
                        <summary className="text-sm text-blue-600 hover:text-blue-900 cursor-pointer">
                          View Details
                        </summary>
                        <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
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
            <p className="text-gray-500">No logs found matching your criteria.</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex justify-center">
            <nav className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-2 text-sm font-medium rounded-md ${
                    currentPage === page
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
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
