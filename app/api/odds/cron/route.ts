import { NextRequest, NextResponse } from 'next/server'
import { oddsApiService } from '@/lib/odds-api'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * Cron endpoint for NBA-only beta.
 * Calls /api/odds/sync which handles active-event-only syncing.
 * Costs 7 credits per run (1 spread + 3 props × 2 events).
 */
export async function POST(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.CRON_SECRET

    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if there are active events first
    const activeEvents = await prisma.activeEvent.findMany({
      where: { isActive: true }
    })

    if (activeEvents.length === 0) {
      console.log('Cron: No active games, skipping sync')
      return NextResponse.json({
        success: true,
        message: 'No active games, skipping sync',
        timestamp: new Date().toISOString()
      })
    }

    console.log(`Cron: Starting NBA odds sync for ${activeEvents.length} active game(s)...`)

    // Call the sync endpoint
    const baseUrl = process.env.NEXTAUTH_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

    const response = await fetch(`${baseUrl}/api/odds/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({})
    })

    let result = { success: false, error: 'Unknown error' }
    if (response.ok) {
      result = await response.json()
    } else {
      result = { success: false, error: `Sync returned ${response.status}` }
    }

    console.log('Cron: NBA odds sync completed')

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      result
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
    const [usage, activeEvents] = await Promise.all([
      oddsApiService.checkUsage(),
      prisma.activeEvent.findMany({ where: { isActive: true } })
    ])

    return NextResponse.json({
      status: 'active',
      sport: 'basketball_nba',
      activeGames: activeEvents.length,
      apiUsage: usage,
      creditsPerSync: activeEvents.length > 0 ? 1 + (3 * activeEvents.length) : 0,
      lastChecked: new Date().toISOString()
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
