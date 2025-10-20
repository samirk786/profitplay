import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { oddsApiService } from '@/lib/odds-api'
import { MarketType } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const { sport = 'basketball_nba' } = await request.json()

    console.log(`🔄 Syncing odds for sport: ${sport}`)

    // Fetch fresh odds data
    const processedMarkets = await oddsApiService.fetchOdds(sport)

    console.log(`📊 Fetched ${processedMarkets.length} events`)

    let marketsCreated = 0
    let oddsSnapshotsCreated = 0

    for (const event of processedMarkets) {
      // Create or update market
      const market = await prisma.market.upsert({
        where: {
          id: event.eventId // Using eventId as our primary key
        },
        update: {
          sport: event.sport,
          league: event.league,
          participants: event.participants,
          startTime: event.startTime,
          status: 'UPCOMING'
        },
        create: {
          id: event.eventId,
          sport: event.sport,
          league: event.league,
          eventId: event.eventId,
          marketType: 'MONEYLINE', // We'll create separate markets for each type
          participants: event.participants,
          startTime: event.startTime,
          status: 'UPCOMING'
        }
      })

      marketsCreated++

      // Create odds snapshots for each market type and bookmaker
      for (const marketData of event.markets) {
        // Create separate market records for different market types
        if (marketData.marketType !== 'MONEYLINE') {
          await prisma.market.upsert({
            where: {
              id: `${event.eventId}-${marketData.marketType}`
            },
            update: {
              sport: event.sport,
              league: event.league,
              participants: event.participants,
              startTime: event.startTime,
              status: 'UPCOMING'
            },
            create: {
              id: `${event.eventId}-${marketData.marketType}`,
              sport: event.sport,
              league: event.league,
              eventId: event.eventId,
              marketType: marketData.marketType as MarketType,
              participants: event.participants,
              startTime: event.startTime,
              status: 'UPCOMING'
            }
          })
        }

        // Create odds snapshot
        await prisma.oddsSnapshot.create({
          data: {
            marketId: marketData.marketType === 'MONEYLINE' ? market.id : `${event.eventId}-${marketData.marketType}`,
            bookmaker: marketData.bookmaker,
            lineJSON: marketData.odds
          }
        })

        oddsSnapshotsCreated++
      }
    }

    console.log(`✅ Sync complete: ${marketsCreated} markets, ${oddsSnapshotsCreated} odds snapshots`)

    // Check API usage
    const usage = await oddsApiService.checkUsage()
    console.log(`📈 API Usage: ${usage.used} used, ${usage.remaining} remaining`)

    return NextResponse.json({
      success: true,
      stats: {
        marketsCreated,
        oddsSnapshotsCreated,
        apiUsage: usage
      }
    })
  } catch (error) {
    console.error('Odds sync error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to sync odds data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check API usage and available sports
    const [usage, sports] = await Promise.all([
      oddsApiService.checkUsage(),
      oddsApiService.fetchSports()
    ])

    const activeSports = sports.filter(sport => sport.active)

    return NextResponse.json({
      apiUsage: usage,
      availableSports: activeSports.map(sport => ({
        key: sport.key,
        title: sport.title
      }))
    })
  } catch (error) {
    console.error('Odds info error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch odds info',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
