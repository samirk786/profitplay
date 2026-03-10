import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN' || session.user.email !== 'admin@profitplay.com') {
    return null
  }
  return session
}

export async function GET() {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: 'DATABASE_URL is not configured on the server.' },
      { status: 500 }
    )
  }

  try {
    const [
      totalUsers,
      activeChallenges,
      pendingSettlements,
      revenueSum
    ] = await Promise.all([
      prisma.user.count(),
      prisma.challengeAccount.count({ where: { state: 'ACTIVE' } }),
      prisma.bet.count({ where: { status: 'OPEN' } }),
      prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { type: 'SUBSCRIPTION' }
      })
    ])

    return NextResponse.json({
      totalUsers,
      activeChallenges,
      pendingSettlements,
      totalRevenue: revenueSum._sum.amount || 0
    })
  } catch (error) {
    console.error('Admin stats error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
