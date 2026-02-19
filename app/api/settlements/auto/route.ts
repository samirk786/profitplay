import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { oddsApiService } from '@/lib/odds-api'
import { mapInternalSportToOddsApiKey } from '@/lib/odds-api-mapping'

type ScoreMap = Record<string, number>

type SettlementOutcome = 'WON' | 'LOST' | 'PUSH'

function buildScoreMap(scores: { name: string; score: string }[] | null): ScoreMap | null {
  if (!scores || scores.length === 0) {
    return null
  }

  const result: ScoreMap = {}
  for (const entry of scores) {
    const parsed = Number(entry.score)
    if (!Number.isNaN(parsed)) {
      result[entry.name] = parsed
    }
  }
  return Object.keys(result).length > 0 ? result : null
}

function compareScores(a: number, b: number): SettlementOutcome {
  if (a > b) return 'WON'
  if (a < b) return 'LOST'
  return 'PUSH'
}

function resolveMoneyline(selection: string, home: string, away: string, homeScore: number, awayScore: number): SettlementOutcome | null {
  if (homeScore === awayScore) return 'PUSH'
  const winner = homeScore > awayScore ? home : away
  return selection === winner ? 'WON' : 'LOST'
}

function resolveSpread(
  selection: string,
  home: string,
  away: string,
  homeScore: number,
  awayScore: number,
  homeSpread: number,
  awaySpread: number
): SettlementOutcome | null {
  const homeAdjusted = homeScore + homeSpread
  const awayAdjusted = awayScore + awaySpread
  const isHomePick = selection.includes('home') || selection === home
  const result = compareScores(isHomePick ? homeAdjusted : awayAdjusted, isHomePick ? awayAdjusted : homeAdjusted)
  return result
}

function resolveTotal(selection: string, total: number, homeScore: number, awayScore: number): SettlementOutcome | null {
  const combined = homeScore + awayScore
  if (combined === total) return 'PUSH'
  const isOver = selection === 'over'
  if (isOver) {
    return combined > total ? 'WON' : 'LOST'
  }
  return combined < total ? 'WON' : 'LOST'
}

export async function POST(request: NextRequest) {
  try {
    const { sport, daysFrom = 3, dryRun = false } = await request.json().catch(() => ({}))

    const openBets = await prisma.bet.findMany({
      where: {
        status: 'OPEN',
        market: {
          startTime: {
            lte: new Date()
          }
        }
      },
      include: {
        market: true,
        oddsSnapshot: true
      }
    })

    if (openBets.length === 0) {
      return NextResponse.json({ settled: 0, skipped: 0 })
    }

    const sportsToCheck = new Set<string>()
    for (const bet of openBets) {
      if (sport) {
        sportsToCheck.add(String(sport))
      } else {
        sportsToCheck.add(bet.market.sport)
      }
    }

    const scoreEvents = new Map<string, { home: string; away: string; scores: ScoreMap }>()

    for (const internalSport of sportsToCheck) {
      const sportKey = mapInternalSportToOddsApiKey(internalSport)
      if (!sportKey) {
        continue
      }
      const scores = await oddsApiService.fetchScores(sportKey, daysFrom)
      for (const event of scores) {
        if (!event.completed) continue
        const scoreMap = buildScoreMap(event.scores)
        if (!scoreMap) continue
        scoreEvents.set(event.id, {
          home: event.home_team,
          away: event.away_team,
          scores: scoreMap
        })
      }
    }

    let settled = 0
    let skipped = 0
    const marketsToFinish = new Set<string>()

    for (const bet of openBets) {
      const scoreEvent = scoreEvents.get(bet.market.eventId)
      if (!scoreEvent) {
        skipped++
        continue
      }

      const homeTeam = scoreEvent.home
      const awayTeam = scoreEvent.away
      const homeScore = scoreEvent.scores[homeTeam]
      const awayScore = scoreEvent.scores[awayTeam]

      if (homeScore === undefined || awayScore === undefined) {
        skipped++
        continue
      }

      const oddsData = bet.oddsSnapshot.lineJSON as any
      let outcome: SettlementOutcome | null = null
      let lineValue: number | null = null

      if (bet.market.marketType === 'MONEYLINE') {
        outcome = resolveMoneyline(bet.selection, homeTeam, awayTeam, homeScore, awayScore)
      } else if (bet.market.marketType === 'SPREAD') {
        const homeSpread = oddsData?.home?.spread
        const awaySpread = oddsData?.away?.spread
        if (typeof homeSpread !== 'number' || typeof awaySpread !== 'number') {
          skipped++
          continue
        }
        lineValue = bet.selection.includes('home') || bet.selection === homeTeam ? homeSpread : awaySpread
        outcome = resolveSpread(bet.selection, homeTeam, awayTeam, homeScore, awayScore, homeSpread, awaySpread)
      } else if (bet.market.marketType === 'TOTAL') {
        const total = oddsData?.over?.total ?? oddsData?.under?.total
        if (typeof total !== 'number') {
          skipped++
          continue
        }
        lineValue = total
        outcome = resolveTotal(bet.selection, total, homeScore, awayScore)
      } else {
        skipped++
        continue
      }

      if (!outcome) {
        skipped++
        continue
      }

      marketsToFinish.add(bet.marketId)

      if (!dryRun) {
        await prisma.$transaction([
          prisma.bet.update({
            where: { id: bet.id },
            data: {
              status: outcome,
              settledAt: new Date()
            }
          }),
          prisma.settlement.create({
            data: {
              betId: bet.id,
              source: 'api',
              resultJSON: {
                eventId: bet.market.eventId,
                marketType: bet.market.marketType,
                selection: bet.selection,
                homeTeam,
                awayTeam,
                homeScore,
                awayScore,
                line: lineValue,
                outcome
              }
            }
          })
        ])
      }

      settled++
    }

    if (!dryRun && marketsToFinish.size > 0) {
      await prisma.market.updateMany({
        where: { id: { in: Array.from(marketsToFinish) } },
        data: { status: 'FINISHED' }
      })
    }

    return NextResponse.json({
      settled,
      skipped,
      dryRun
    })
  } catch (error) {
    console.error('Auto settlement error:', error)
    return NextResponse.json({ error: 'Failed to settle bets' }, { status: 500 })
  }
}
