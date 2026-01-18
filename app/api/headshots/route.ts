import { NextRequest, NextResponse } from 'next/server'

const SPORT_MAP: Record<string, string> = {
  NBA: 'nba',
  NFL: 'nfl',
  MLB: 'mlb',
  NHL: 'nhl'
}

const CACHE_TTL_MS = 12 * 60 * 60 * 1000
const playerCache: Record<string, { ts: number; players: any[] }> = {}

const normalizeName = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

const getPlayerName = (player: any) => {
  if (player?.Name) return player.Name
  const first = player?.FirstName || ''
  const last = player?.LastName || ''
  return `${first} ${last}`.trim()
}

const getHeadshotUrl = (player: any) =>
  player?.PreferredHostedHeadshotUrl ||
  player?.HostedHeadshotWithBackgroundUrl ||
  player?.HostedHeadshotNoBackgroundUrl ||
  player?.HeadshotUrl ||
  player?.PhotoUrl ||
  player?.UsaTodayHeadshotUrl ||
  player?.UsaTodayHeadshotNoBackgroundUrl ||
  null

const fetchPlayers = async (sportKey: string, apiKey: string) => {
  const cached = playerCache[sportKey]
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.players
  }

  const endpoints = [
    `https://api.sportsdata.io/v3/${sportKey}/headshots/json/Headshots`,
    `https://api.sportsdata.io/v3/${sportKey}/images/json/Players`,
    `https://api.sportsdata.io/v3/${sportKey}/scores/json/Players`
  ]

  let players: any[] = []
  for (const url of endpoints) {
    const response = await fetch(url, {
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey
      },
      cache: 'no-store'
    })
    if (response.ok) {
      const data = await response.json()
      if (Array.isArray(data)) {
        players = data
        break
      }
    }
  }

  playerCache[sportKey] = { ts: Date.now(), players }
  return players
}

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.SPORTSDATA_API_KEY
    if (!apiKey) {
      return NextResponse.json({ url: null })
    }

    const { searchParams } = new URL(request.url)
    const sport = searchParams.get('sport')?.toUpperCase() || ''
    const playerName = searchParams.get('playerName') || ''
    const team = searchParams.get('team') || ''

    if (!sport || !playerName) {
      return NextResponse.json(
        { error: 'sport and playerName are required' },
        { status: 400 }
      )
    }

    const sportKey = SPORT_MAP[sport]
    if (!sportKey) {
      return NextResponse.json(
        { error: 'Unsupported sport' },
        { status: 400 }
      )
    }

    const players = await fetchPlayers(sportKey, apiKey)
    const targetName = normalizeName(playerName)
    const targetTeam = team.trim().toUpperCase()

    const match = players.find((player) => {
      const name = normalizeName(getPlayerName(player))
      const teamMatch =
        !targetTeam || player?.Team?.toUpperCase?.() === targetTeam
      return name === targetName && teamMatch
    })

    if (!match) {
      return NextResponse.json({ url: null })
    }

    return NextResponse.json({ url: getHeadshotUrl(match) })
  } catch (error) {
    console.error('Headshot lookup error:', error)
    return NextResponse.json({ url: null })
  }
}
