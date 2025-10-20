import { NextRequest, NextResponse } from 'next/server'
import { oddsApiService } from '@/lib/odds-api'

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing Odds API integration...')

    // Test 1: Check API connection
    const sports = await oddsApiService.fetchSports()
    console.log(`✅ Fetched ${sports.length} sports`)

    // Test 2: Fetch NBA odds (if available)
    let nbaOdds = null
    try {
      nbaOdds = await oddsApiService.fetchOdds('basketball_nba')
      console.log(`✅ Fetched ${nbaOdds.length} NBA events`)
    } catch (error) {
      console.log('⚠️ No NBA odds available right now (this is normal)')
    }

    // Test 3: Check API usage
    const usage = await oddsApiService.checkUsage()

    return NextResponse.json({
      success: true,
      message: 'Odds API integration is working!',
      stats: {
        sportsAvailable: sports.length,
        nbaEvents: nbaOdds?.length || 0,
        apiUsage: usage
      },
      sampleSports: sports.slice(0, 5).map(sport => ({
        key: sport.key,
        title: sport.title
      }))
    })
  } catch (error) {
    console.error('❌ Odds API test failed:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Odds API test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
