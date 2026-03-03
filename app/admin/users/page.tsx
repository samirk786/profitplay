'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface User {
  id: string
  name: string
  email: string
  role: string
  ageVerified: boolean
  createdAt: string
  subscriptions: {
    status: string
    plan: string
  }[]
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')

  useEffect(() => {
    setUsers([])
    setLoading(false)
  }, [])

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = roleFilter === 'ALL' || user.role === roleFilter
    return matchesSearch && matchesRole
  })

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  if (loading) {
    return (
      <div className="admin-page flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 admin-muted">Loading users...</p>
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
          <h1 className="admin-title">User Management</h1>
          <p className="admin-subtitle">Manage users and their subscriptions.</p>
        </div>

        {/* Filters */}
        <div className="admin-card mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium admin-muted mb-2">Search Users</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name or email..."
                className="admin-input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium admin-muted mb-2">Filter by Role</label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="admin-select"
              >
                <option value="ALL">All Roles</option>
                <option value="MEMBER">Members</option>
                <option value="ADMIN">Admins</option>
              </select>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="admin-list-card">
          <div className="admin-list-header">
            <h3 className="text-lg leading-6 font-medium text-white">
              Users ({filteredUsers.length})
            </h3>
          </div>
          <ul>
            {filteredUsers.map((user) => (
              <li key={user.id}>
                <div className="admin-list-row">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-[#2a2a2a] flex items-center justify-center">
                          <span className="text-sm font-medium text-white">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="flex items-center">
                          <p className="text-sm font-medium text-white">
                            {user.name}
                          </p>
                          <span className={`ml-2 admin-badge ${
                            user.role === 'ADMIN'
                              ? 'admin-badge-admin'
                              : 'admin-badge-member'
                          }`}>
                            {user.role}
                          </span>
                        </div>
                        <p className="text-sm admin-muted">{user.email}</p>
                        <p className="text-xs admin-muted">
                          Joined: {formatDate(user.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        {user.subscriptions.length > 0 ? (
                          <div>
                            <p className="text-sm font-medium text-white">
                              {user.subscriptions[0].plan}
                            </p>
                            <p className={`text-xs ${
                              user.subscriptions[0].status === 'ACTIVE'
                                ? 'text-green-400'
                                : 'text-red-400'
                            }`}>
                              {user.subscriptions[0].status}
                            </p>
                          </div>
                        ) : (
                          <p className="text-sm admin-muted">No subscription</p>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <button className="admin-btn admin-btn-neutral admin-btn-small">
                          View Details
                        </button>
                        <button className="admin-btn admin-btn-neutral admin-btn-small">
                          Edit
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <p className="admin-muted">No users found matching your criteria.</p>
          </div>
        )}
      </main>
    </div>
  )
}
