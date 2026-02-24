import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { oddsApiService } from '@/lib/odds-api'

export const dynamic = 'force-dynamic'

/**
 * GET: Fetch available NBA events from Odds API + current active selections.
 * The events endpoint is FREE (0 credits).
 */
export async function GET() {
  try {
    // Fetch upcoming NBA events from the Odds API (free)
    let apiEvents: Array<{
      id: string
      sport_key: string
      sport_title: string
      commence_time: string
      home_team: string
      away_team: string
    }> = []

    try {
      apiEvents = await oddsApiService.fetchEvents('basketball_nba')
    } catch (error) {
      console.warn('Failed to fetch events from Odds API:', error)
    }

    // Get currently active events from database
    const activeEvents = await prisma.activeEvent.findMany({
      where: { isActive: true }
    })

    const activeEventIds = new Set(activeEvents.map(e => e.eventId))

    // Merge: mark which events are currently active
    const events = apiEvents.map(event => ({
      eventId: event.id,
      sport: 'NBA',
      homeTeam: event.home_team,
      awayTeam: event.away_team,
      commenceTime: event.commence_time,
      isActive: activeEventIds.has(event.id)
    }))

    const activeCount = events.filter(e => e.isActive).length

    return NextResponse.json({
      events,
      activeCount,
      maxActive: 2
    })
  } catch (error) {
    console.error('Games fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST: Toggle a game as active/inactive. Max 2 active at a time.
 */
export async function POST(request: NextRequest) {
  try {
    const { eventId, sport, homeTeam, awayTeam, commenceTime, isActive } = await request.json()

    if (!eventId) {
      return NextResponse.json(
        { error: 'eventId is required' },
        { status: 400 }
      )
    }

    // If activating, check we don't exceed max of 2
    if (isActive) {
      const currentActiveCount = await prisma.activeEvent.count({
        where: { isActive: true }
      })

      // Check if this event is already active (toggling same event)
      const existingEvent = await prisma.activeEvent.findUnique({
        where: { eventId }
      })

      const isAlreadyActive = existingEvent?.isActive === true

      if (currentActiveCount >= 2 && !isAlreadyActive) {
        return NextResponse.json(
          { error: 'Maximum of 2 active games allowed. Deactivate a game first.' },
          { status: 400 }
        )
      }
    }

    // Upsert the active event
    const activeEvent = await prisma.activeEvent.upsert({
      where: { eventId },
      update: { isActive },
      create: {
        eventId,
        sport: sport || 'NBA',
        homeTeam: homeTeam || '',
        awayTeam: awayTeam || '',
        commenceTime: new Date(commenceTime || Date.now()),
        isActive: isActive ?? true
      }
    })

    return NextResponse.json({
      success: true,
      activeEvent
    })
  } catch (error) {
    console.error('Games toggle error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE: Deactivate all games.
 */
export async function DELETE() {
  try {
    await prisma.activeEvent.updateMany({
      where: { isActive: true },
      data: { isActive: false }
    })

    return NextResponse.json({ success: true, message: 'All games deactivated' })
  } catch (error) {
    console.error('Games deactivate error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
