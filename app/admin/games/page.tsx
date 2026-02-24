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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading NBA games...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
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
              <Link href="/admin/settlements" className="text-gray-500 hover:text-gray-900">
                Settlements
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Manage NBA Games
            </h1>
            <p className="text-gray-600">
              Select up to 2 games to display on the homepage. Fetching events is free (0 API credits).
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-700">
              {activeCount}/2 games active
            </span>
            {activeCount > 0 && (
              <button
                onClick={deactivateAll}
                className="bg-red-100 text-red-700 px-4 py-2 rounded-md hover:bg-red-200 text-sm font-medium"
              >
                Deactivate All
              </button>
            )}
            <button
              onClick={fetchEvents}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm font-medium"
            >
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {events.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500 text-lg">No upcoming NBA games found.</p>
            <p className="text-gray-400 text-sm mt-2">Check back when games are scheduled.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <div
                key={event.eventId}
                className={`bg-white p-5 rounded-lg shadow border-2 transition-colors ${
                  event.isActive
                    ? 'border-green-500 bg-green-50'
                    : 'border-transparent hover:border-gray-200'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      {event.isActive && (
                        <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs font-semibold">
                          ACTIVE
                        </span>
                      )}
                      <h3 className="text-lg font-semibold text-gray-900">
                        {event.awayTeam} @ {event.homeTeam}
                      </h3>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {formatGameTime(event.commenceTime)}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 font-mono">
                      ID: {event.eventId}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleGame(event)}
                    disabled={toggling === event.eventId || (!event.isActive && activeCount >= 2)}
                    className={`px-6 py-2.5 rounded-md text-sm font-medium transition-colors ${
                      event.isActive
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : activeCount >= 2
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-green-600 text-white hover:bg-green-700'
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

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-blue-900 font-semibold text-sm">API Credit Usage</h3>
          <p className="text-blue-700 text-sm mt-1">
            Fetching the events list is free. Once games are activated, refreshing odds on the homepage costs 7 credits:
            1 for spreads + 2 events x 3 player prop markets = 7 total.
          </p>
        </div>
      </main>
    </div>
  )
}
