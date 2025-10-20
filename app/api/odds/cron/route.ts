import { NextRequest, NextResponse } from 'next/server'
import { oddsApiService } from '@/lib/odds-api'

// This endpoint can be called by a cron service like Vercel Cron or GitHub Actions
export async function POST(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request (you can add authentication here)
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.CRON_SECRET
    
    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🕐 Starting scheduled odds update...')

    // Sports to update (you can modify this list)
    const sports = [
      'basketball_nba',
      'americanfootball_nfl', 
      'baseball_mlb',
      'icehockey_nhl'
    ]

    const results = []

    for (const sport of sports) {
      try {
        console.log(`📊 Updating odds for ${sport}...`)
        
        // Call the sync endpoint
        const response = await fetch(`${process.env.NEXTAUTH_URL}/api/odds/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sport })
        })

        if (response.ok) {
          const data = await response.json()
          results.push({ sport, success: true, stats: data.stats })
        } else {
          results.push({ sport, success: false, error: 'Sync failed' })
        }
      } catch (error) {
        console.error(`❌ Failed to update ${sport}:`, error)
        results.push({ 
          sport, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        })
      }
    }

    console.log('✅ Scheduled odds update completed')

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results
    })
  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json(
      { 
        error: 'Cron job failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GET endpoint to check cron status
export async function GET() {
  try {
    const usage = await oddsApiService.checkUsage()
    
    return NextResponse.json({
      status: 'active',
      apiUsage: usage,
      lastRun: new Date().toISOString(),
      nextRun: 'Every 15 minutes' // Adjust based on your cron schedule
    })
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to check cron status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
