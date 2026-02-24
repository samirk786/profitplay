import { NextRequest, NextResponse } from 'next/server'
import { oddsApiService } from '@/lib/odds-api'

/**
 * POST: Sync player props for a specific sport and event.
 * Uses the per-event endpoint (1 credit per market per event).
 */
export async function POST(request: NextRequest) {
  try {
    const { sport, eventId, markets } = await request.json()

    if (!sport || !eventId) {
      return NextResponse.json(
        { error: 'sport and eventId are required' },
        { status: 400 }
      )
    }

    const marketKeys = markets || ['player_points', 'player_rebounds', 'player_assists']

    console.log(`Syncing player props for event ${eventId}: ${marketKeys.join(', ')}`)
    const playerPropsData = await oddsApiService.fetchPlayerPropsForEvent(sport, eventId, marketKeys)
    console.log(`Fetched ${playerPropsData.length} player props`)

    const apiUsage = await oddsApiService.checkUsage()

    return NextResponse.json({
      success: true,
      message: 'Player props data fetched successfully',
      stats: {
        playerPropsCount: playerPropsData.length,
        apiUsage
      },
      data: playerPropsData
    })
  } catch (error: any) {
    console.error('Player props sync error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch player props data',
        details: error.message
      },
      { status: 500 }
    )
  }
}

/**
 * GET: Test player props API connectivity.
 * Fetches events list (free) to verify the API key works.
 */
export async function GET() {
  try {
    const events = await oddsApiService.fetchEvents('basketball_nba')
    const apiUsage = await oddsApiService.checkUsage()

    return NextResponse.json({
      success: true,
      message: 'Player props API is working!',
      stats: {
        upcomingEvents: events.length,
        apiUsage
      },
      events: events.slice(0, 5) // Show first 5 events
    })
  } catch (error: any) {
    console.error('Player props test error:', error)
    return NextResponse.json(
      {
        error: 'Player props API test failed',
        details: error.message
      },
      { status: 500 }
    )
  }
}
