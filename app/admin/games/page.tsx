'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface GameEvent {
  eventId: string
  sport: string
  homeTeam: string
  awayTeam: string
  commenceTime: string
  isActive: boolean
}

export default function ManageGamesPage() {
  const [events, setEvents] = useState<GameEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)
  const [activeCount, setActiveCount] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchEvents()
  }, [])

  const fetchEvents = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/games')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch events')
      }

      setEvents(data.events || [])
      setActiveCount(data.activeCount || 0)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const toggleGame = async (event: GameEvent) => {
    setToggling(event.eventId)
    setError(null)
    try {
      const response = await fetch('/api/admin/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: event.eventId,
          sport: event.sport,
          homeTeam: event.homeTeam,
          awayTeam: event.awayTeam,
          commenceTime: event.commenceTime,
          isActive: !event.isActive
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to toggle game')
      }

      // Refresh events list
      await fetchEvents()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setToggling(null)
    }
  }

  const deactivateAll = async () => {
    setError(null)
    try {
      const response = await fetch('/api/admin/games', { method: 'DELETE' })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to deactivate games')
      }

      await fetchEvents()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const formatGameTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    }) + ' at ' + date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="admin-page flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 admin-muted">Loading NBA games...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div className="admin-header-inner">
          <Link href="/admin" className="admin-brand">
            ProfitPlay Admin
          </Link>
          <nav className="admin-nav">
            <Link href="/admin" className="admin-nav-link">
              Dashboard
            </Link>
            <Link href="/admin/settlements" className="admin-nav-link">
              Settlements
            </Link>
          </nav>
        </div>
      </header>

      <main className="admin-container">
        <div className="mb-8 admin-inline">
          <div>
          <h1 className="admin-title">
              Manage NBA Games
            </h1>
          <p className="admin-subtitle">
              Select up to 2 games to display on the homepage. Fetching events is free (0 API credits).
            </p>
          </div>
          <div className="flex items-center space-x-4">
          <span className="text-sm font-medium admin-light">
              {activeCount}/2 games active
            </span>
            {activeCount > 0 && (
              <button
                onClick={deactivateAll}
              className="admin-btn admin-btn-danger"
              >
                Deactivate All
              </button>
            )}
            <button
              onClick={fetchEvents}
            className="admin-btn admin-btn-primary"
            >
              Refresh
            </button>
          </div>
        </div>

        {error && (
        <div className="mb-6 admin-alert admin-alert-error">
          <p className="text-sm">{error}</p>
          </div>
        )}

        {events.length === 0 ? (
        <div className="text-center py-12 admin-card">
          <p className="admin-light text-lg">No upcoming NBA games found.</p>
          <p className="admin-muted text-sm mt-2">Check back when games are scheduled.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <div
                key={event.eventId}
              className={`admin-card ${event.isActive ? '' : ''}`}
              style={{
                borderWidth: '2px',
                borderColor: event.isActive ? 'rgba(34, 197, 94, 0.6)' : 'transparent',
                background: event.isActive ? 'rgba(34, 197, 94, 0.08)' : undefined
              }}
            >
              <div className="flex justify-between items-center">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    {event.isActive && (
                      <span className="admin-pill admin-pill-active">
                        ACTIVE
                      </span>
                    )}
                    <h3 className="text-lg font-semibold text-white">
                      {event.awayTeam} @ {event.homeTeam}
                    </h3>
                  </div>
                  <p className="text-sm admin-muted mt-1">
                    {formatGameTime(event.commenceTime)}
                  </p>
                  <p className="text-xs admin-mono mt-0.5">
                    ID: {event.eventId}
                  </p>
                </div>
                <button
                  onClick={() => toggleGame(event)}
                  disabled={toggling === event.eventId || (!event.isActive && activeCount >= 2)}
                  className={`admin-btn ${
                    event.isActive
                      ? 'admin-btn-danger'
                      : activeCount >= 2
                      ? 'admin-btn-neutral'
                      : 'admin-btn-success'
                  } ${toggling === event.eventId ? 'opacity-50' : ''}`}
                >
                  {toggling === event.eventId
                    ? 'Updating...'
                    : event.isActive
                    ? 'Deactivate'
                    : activeCount >= 2
                    ? 'Max reached'
                    : 'Activate'}
                </button>
              </div>
            </div>
            ))}
          </div>
        )}

        <div className="mt-8 admin-alert" style={{ borderColor: 'rgba(59, 130, 246, 0.35)', background: 'rgba(59, 130, 246, 0.1)', color: '#bfdbfe' }}>
          <h3 className="font-semibold text-sm">API Credit Usage</h3>
          <p className="text-sm mt-1">
            Fetching the events list is free. Once games are activated, refreshing odds on the homepage costs 7 credits:
            1 for spreads + 2 events x 3 player prop markets = 7 total.
          </p>
        </div>
      </main>
    </div>
  )
}
