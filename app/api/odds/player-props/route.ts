import { NextRequest, NextResponse } from 'next/server'
import { oddsApiService } from '@/lib/odds-api'

export async function POST(request: NextRequest) {
  try {
    const { sport } = await request.json()
    
    if (!sport) {
      return NextResponse.json({ error: 'Sport is required' }, { status: 400 })
    }

    console.log(`🏈 Syncing player props for sport: ${sport}`)
    const playerPropsData = await oddsApiService.fetchPlayerProps(sport)
    console.log(`📊 Fetched ${playerPropsData.length} player props events`)

    // Check API usage after successful sync
    const apiUsage = await oddsApiService.checkUsage()

    return NextResponse.json({
      success: true,
      message: 'Player props data synced successfully',
      stats: {
        playerPropsEvents: playerPropsData.length,
        apiUsage
      }
    })
  } catch (error: any) {
    console.error('Player props sync error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to sync player props data', 
        details: error.message 
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Test player props for NFL
    const playerPropsData = await oddsApiService.fetchPlayerProps('americanfootball_nfl')
    const apiUsage = await oddsApiService.checkUsage()

    return NextResponse.json({
      success: true,
      message: 'Player props API is working!',
      stats: {
        playerPropsEvents: playerPropsData.length,
        apiUsage
      },
      sampleData: playerPropsData.slice(0, 3).map(event => ({
        eventId: event.eventId,
        sport: event.sport,
        participants: event.participants,
        marketsCount: event.markets.length,
        sampleMarkets: event.markets.slice(0, 2)
      }))
    })
  } catch (error: any) {
    console.error('Player props test error:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: 'Player props API test failed', 
        details: error.message 
      },
      { status: 500 }
    )
  }
}
