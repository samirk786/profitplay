import { prisma } from '@/lib/prisma'

/**
 * Auto-deactivate any ActiveEvent whose game date (in US Eastern Time)
 * is before today's date (in US Eastern Time).
 *
 * NBA games are played in US timezones. A game on March 6th should be
 * deactivated at 12:01 AM Eastern on March 7th, regardless of the
 * exact UTC commence_time.
 *
 * Also marks associated Market records as FINISHED for data hygiene,
 * so stale UPCOMING markets don't leak into queries.
 *
 * Returns the number of events deactivated.
 */
export async function autoDeactivateExpiredGames(): Promise<number> {
  // Get today's date string in Eastern Time (e.g., "2026-03-09")
  // 'en-CA' locale produces YYYY-MM-DD format, enabling simple string comparison
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  const todayET = formatter.format(new Date())

  // Find all currently active events
  const activeEvents = await prisma.activeEvent.findMany({
    where: { isActive: true },
  })

  if (activeEvents.length === 0) return 0

  // Determine which are expired: game date in ET is before today in ET
  const expiredIds: string[] = []
  const expiredTeamPairs: Array<{ homeTeam: string; awayTeam: string }> = []

  for (const event of activeEvents) {
    const eventDateET = formatter.format(event.commenceTime)

    if (eventDateET < todayET) {
      expiredIds.push(event.id)
      expiredTeamPairs.push({
        homeTeam: event.homeTeam,
        awayTeam: event.awayTeam,
      })
    }
  }

  if (expiredIds.length === 0) return 0

  // Deactivate expired ActiveEvents
  await prisma.activeEvent.updateMany({
    where: { id: { in: expiredIds } },
    data: { isActive: false },
  })

  // Mark stale UPCOMING markets as FINISHED, but ONLY for past days.
  // We must NOT mark today's live game markets as FINISHED (their startTime
  // is in the past because the game already started, but they're still active).
  // Compute start-of-today in ET as a UTC cutoff: use 5 AM UTC which is
  // midnight EST (conservative — EDT would be 4 AM UTC, so 5 AM is safe).
  const todayParts = todayET.split('-').map(Number)
  const startOfTodayUTC = new Date(Date.UTC(todayParts[0], todayParts[1] - 1, todayParts[2], 5, 0, 0))

  await prisma.market.updateMany({
    where: {
      status: 'UPCOMING',
      startTime: { lt: startOfTodayUTC },
    },
    data: { status: 'FINISHED' },
  })

  console.log(
    `Auto-deactivated ${expiredIds.length} expired game(s): ${expiredTeamPairs
      .map((p) => `${p.awayTeam} @ ${p.homeTeam}`)
      .join(', ')}`
  )

  return expiredIds.length
}
